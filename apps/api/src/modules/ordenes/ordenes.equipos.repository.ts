import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma.js';
import { AppError } from '../../errors/AppError.js';
import type { RegistrarDiagnosticoInput } from './ordenes.equipos.schema.js';

const equipoSelect = {
    id: true, codigo: true, tipo: true, marca: true, modelo: true,
    numeroSerie: true, ubicacionId: true,
} as const;

const registroSelect = {
    id: true, ordenId: true, equipoId: true,
    tipoRegistrado: true, marcaRegistrada: true,
    modeloRegistrado: true, serieRegistrada: true,
    diagnostico: true, observaciones: true, resultado: true,
    creadaEn: true, actualizadaEn: true,
    equipo: { select: equipoSelect },
} as const;

export async function listarVinculados(ordenId: number) {
    const orden = await prisma.ordenTrabajo.findUnique({
        where: { id: ordenId }, select: { id: true },
    });
    if (!orden) throw new AppError(404, 'La orden no existe.');
    return prisma.ordenEquipo.findMany({
        where: { ordenId }, orderBy: { id: 'asc' }, select: registroSelect,
    });
}

export async function disponibles(ordenId: number) {
    const orden = await prisma.ordenTrabajo.findUnique({
        where: { id: ordenId }, select: { ubicacionId: true },
    });
    if (!orden) throw new AppError(404, 'La orden no existe.');
    return prisma.equipo.findMany({
        where: {
            ubicacionId: orden.ubicacionId,
            activo: true,
            intervenciones: { none: { ordenId } },
        },
        select: equipoSelect,
        orderBy: { codigo: 'asc' },
    });
}

export async function vincular(ordenId: number, equipoId: number) {
    return prisma.$transaction(async tx => {
        const orden = await tx.ordenTrabajo.findUnique({
            where: { id: ordenId },
            select: { ubicacionId: true, estadoCodigo: true },
        });
        if (!orden) throw new AppError(404, 'La orden no existe.');
        if (!['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION'].includes(orden.estadoCodigo)) {
            throw new AppError(409, 'No se pueden agregar equipos en el estado actual.');
        }
        const equipo = await tx.equipo.findFirst({
            where: { id: equipoId, ubicacionId: orden.ubicacionId, activo: true },
            select: equipoSelect,
        });
        if (!equipo) throw new AppError(400, 'El equipo no está activo o no pertenece a la ubicación de esta orden.');
        const existente = await tx.ordenEquipo.findFirst({
            where: { ordenId, equipoId }, select: { id: true },
        });
        if (existente) throw new AppError(409, 'El equipo ya está registrado en esta orden.');
        return tx.ordenEquipo.create({
            data: {
                ordenId, equipoId,
                tipoRegistrado: equipo.tipo,
                marcaRegistrada: equipo.marca,
                modeloRegistrado: equipo.modelo,
                serieRegistrada: equipo.numeroSerie,
            },
            select: registroSelect,
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function guardarDiagnostico(
    ordenId: number,
    registroId: number,
    datos: RegistrarDiagnosticoInput,
    actor: { id: number; empleadoId: number; rol: string },
) {
    return prisma.$transaction(async tx => {
        const orden = await tx.ordenTrabajo.findUnique({
            where: { id: ordenId },
            select: { id: true, estadoCodigo: true, version: true },
        });
        if (!orden) throw new AppError(404, 'La orden no existe.');
        if (orden.estadoCodigo !== 'EN_EJECUCION') {
            throw new AppError(409, 'El diagnóstico se registra únicamente durante la ejecución.');
        }
        const registro = await tx.ordenEquipo.findFirst({
            where: { id: registroId, ordenId },
            select: { id: true, diagnostico: true, observaciones: true, resultado: true },
        });
        if (!registro) throw new AppError(404, 'El equipo no está registrado en esta orden.');

        if (actor.rol === 'TEC') {
            const asignacion = await tx.asignacion.findFirst({
                where: {
                    ordenId, fin: null,
                    OR: [
                        { empleadoResponsableId: actor.empleadoId },
                        { tecnicos: { some: { empleadoId: actor.empleadoId } } },
                        { cuadrilla: { is: { miembros: { some: { empleadoId: actor.empleadoId, fin: null } } } } },
                    ],
                },
                select: { id: true },
            });
            if (!asignacion) throw new AppError(403, 'Solo los técnicos asignados pueden registrar el diagnóstico.');
        }
        const cambio = await tx.ordenTrabajo.updateMany({
            where: { id: ordenId, estadoCodigo: 'EN_EJECUCION', version: orden.version },
            data: { version: { increment: 1 } },
        });
        if (cambio.count !== 1) throw new AppError(409, 'La orden cambió; actualiza su información antes de continuar.');

        const actualizado = await tx.ordenEquipo.update({
            where: { id: registroId },
            data: {
                diagnostico: datos.diagnostico,
                ...(datos.observaciones !== undefined ? { observaciones: datos.observaciones } : {}),
                ...(datos.resultado !== undefined ? { resultado: datos.resultado } : {}),
            },
            select: registroSelect,
        });
        await tx.auditoria.create({
            data: {
                usuarioId: actor.id,
                tipoActor: 'USUARIO',
                entidad: 'ORDEN_EQUIPO',
                entidadId: String(registroId),
                accion: 'REGISTRAR_DIAGNOSTICO',
                datosAnteriores: {
                    diagnostico: registro.diagnostico,
                    observaciones: registro.observaciones,
                    resultado: registro.resultado,
                },
                datosNuevos: {
                    diagnostico: actualizado.diagnostico,
                    observaciones: actualizado.observaciones,
                    resultado: actualizado.resultado,
                },
            },
        });
        return actualizado;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
