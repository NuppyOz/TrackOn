import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { bloquearEjecucion, type ActorOrden } from './ordenes.actor.js';
import type { MaterialOrdenInput, ServicioOrdenInput } from './ordenes.trabajo.schema.js';

async function comprobarRegistro(tx: Prisma.TransactionClient, ordenId: number, registroId: number) {
    const registro = await tx.ordenEquipo.findFirst({ where: { id: registroId, ordenId }, select: { id: true } });
    if (!registro) throw new AppError(404, 'El equipo no está registrado en esta orden.');
}

export async function listarTrabajo(ordenId: number, registroId: number) {
    return prisma.$transaction(async tx => {
        await comprobarRegistro(tx, ordenId, registroId);
        const [servicios, materiales] = await Promise.all([
            tx.ordenServicio.findMany({ where: { ordenEquipoId: registroId }, orderBy: { id: 'asc' } }),
            tx.ordenMaterial.findMany({ where: { ordenEquipoId: registroId }, orderBy: { id: 'asc' } }),
        ]);
        return { servicios, materiales };
    });
}

async function auditarTrabajo(tx: Prisma.TransactionClient, actor: ActorOrden, entidad: string, id: number, datos: Prisma.InputJsonObject) {
    await tx.auditoria.create({ data: {
        usuarioId: actor.id, tipoActor: 'USUARIO', entidad, entidadId: String(id),
        accion: 'REGISTRAR', datosNuevos: datos,
    } });
}

export async function registrarServicio(ordenId: number, registroId: number, datos: ServicioOrdenInput, actor: ActorOrden) {
    return prisma.$transaction(async tx => {
        await comprobarRegistro(tx, ordenId, registroId);
        await bloquearEjecucion(tx, ordenId, actor);
        const servicio = await tx.servicio.findFirst({ where: { id: datos.servicioId, activo: true }, select: { nombre: true } });
        if (!servicio) throw new AppError(400, 'El servicio no existe o está inactivo.');
        const registro = await tx.ordenServicio.create({ data: {
            ...datos, ordenEquipoId: registroId, nombreRegistrado: servicio.nombre,
        } });
        await auditarTrabajo(tx, actor, 'ORDEN_SERVICIO', registro.id, { ...datos, ordenEquipoId: registroId });
        return registro;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function registrarMaterial(ordenId: number, registroId: number, datos: MaterialOrdenInput, actor: ActorOrden) {
    return prisma.$transaction(async tx => {
        await comprobarRegistro(tx, ordenId, registroId);
        await bloquearEjecucion(tx, ordenId, actor);
        const material = await tx.material.findFirst({ where: { id: datos.materialId, activo: true }, select: { nombre: true, unidadMedida: true } });
        if (!material) throw new AppError(400, 'El material no existe o está inactivo.');
        const registro = await tx.ordenMaterial.create({ data: {
            ...datos, ordenEquipoId: registroId, nombreRegistrado: material.nombre, unidadRegistrada: material.unidadMedida,
        } });
        await auditarTrabajo(tx, actor, 'ORDEN_MATERIAL', registro.id, { ...datos, ordenEquipoId: registroId });
        return registro;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
