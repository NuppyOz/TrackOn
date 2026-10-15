import { randomUUID, webcrypto } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma.js';
import { almacenamientoEvidencias } from '../../infrastructure/evidence-storage.js';
import { AppError } from '../../errors/AppError.js';
import { bloquearEjecucion, type ActorOrden } from './ordenes.actor.js';
import { tipoRealArchivo, type EvidenciaInput } from './ordenes.evidencias.schema.js';

export function serializarEvidencia<T extends { tamanoBytes: bigint }>(datos: T) {
    return { ...datos, tamanoBytes: Number(datos.tamanoBytes) };
}
export async function listar(ordenId: number, registroId: number) {
    const equipo = await prisma.ordenEquipo.findFirst({ where: { id: registroId, ordenId }, select: { id: true } });
    if (!equipo) throw new AppError(404, 'El equipo no está registrado en esta orden.');
    const items = await prisma.evidenciaEquipo.findMany({ where: { ordenEquipoId: registroId }, orderBy: { id: 'asc' },
        include: { reemplazos: { select: { id: true } }, revisiones: { take: 1, orderBy: [{ revisadaEn: 'desc' }, { id: 'desc' }] } } });
    return items.map(serializarEvidencia);
}
export async function crear(ordenId: number, registroId: number, datos: EvidenciaInput, actor: ActorOrden) {
    return prisma.$transaction(async tx => {
        await bloquearEjecucion(tx, ordenId, actor);
        const equipo = await tx.ordenEquipo.findFirst({ where: { id: registroId, ordenId }, select: { id: true } });
        if (!equipo) throw new AppError(404, 'El equipo no está registrado en esta orden.');
        if (datos.reemplazaAId) {
            const anterior = await obtener(tx, ordenId, registroId, datos.reemplazaAId);
            const reemplazo = await tx.evidenciaEquipo.findFirst({ where: { reemplazaAId: anterior.id }, select: { id: true } });
            if (reemplazo) throw new AppError(409, 'La evidencia ya tiene un reemplazo. Completa la carga más reciente.');
        }
        const item = await tx.evidenciaEquipo.create({ data: {
            ...datos, tamanoBytes: BigInt(datos.tamanoBytes), ordenEquipoId: registroId,
            cargadaPorId: actor.id, claveArchivo: randomUUID(),
        } });
        return serializarEvidencia(item);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function obtener(tx: Prisma.TransactionClient, ordenId: number, registroId: number, evidenciaId: number) {
    const item = await tx.evidenciaEquipo.findFirst({ where: { id: evidenciaId, ordenEquipoId: registroId, ordenEquipo: { ordenId } } });
    if (!item) throw new AppError(404, 'La evidencia no pertenece al equipo de esta orden.');
    return item;
}

export async function cargar(ordenId: number, registroId: number, evidenciaId: number, contenido: Buffer, actor: ActorOrden) {
    const operacion = await prisma.$transaction(async tx => {
        const item = await obtener(tx, ordenId, registroId, evidenciaId);
        if (item.cargadaPorId !== actor.id) throw new AppError(403, 'Solo quien inició la carga puede completarla.');
        if (item.estadoCarga === 'DISPONIBLE') throw new AppError(409, 'La evidencia ya está disponible.');
        await bloquearEjecucion(tx, ordenId, actor);
        const hash = Buffer.from(await webcrypto.subtle.digest('SHA-256', new Uint8Array(contenido))).toString('hex');
        const valida = BigInt(contenido.length) === item.tamanoBytes && hash === item.hashArchivo && tipoRealArchivo(contenido) === item.tipoArchivo;
        if (!valida) {
            await tx.evidenciaEquipo.update({ where: { id: evidenciaId }, data: { estadoCarga: 'FALLIDA' } });
            return { error: 'El tamaño, hash o tipo real del archivo no coincide con la evidencia registrada.' };
        }
        try { await almacenamientoEvidencias().guardar(item.claveArchivo, contenido); }
        catch {
            await tx.evidenciaEquipo.update({ where: { id: evidenciaId }, data: { estadoCarga: 'FALLIDA' } });
            return { error: 'No se pudo almacenar el archivo. Puedes reintentar la carga.' };
        }
        const actualizada = await tx.evidenciaEquipo.update({ where: { id: evidenciaId }, data: { estadoCarga: 'DISPONIBLE', disponibleEn: new Date() } });
        await tx.auditoria.create({ data: { usuarioId: actor.id, tipoActor: 'USUARIO', entidad: 'EVIDENCIA_EQUIPO', entidadId: String(evidenciaId), accion: 'CARGAR', datosNuevos: { hashArchivo: hash, ordenEquipoId: registroId } } });
        return { data: serializarEvidencia(actualizada) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (operacion.error) throw new AppError(400, operacion.error);
    return operacion.data;
}

export async function descargar(ordenId: number, registroId: number, evidenciaId: number) {
    const item = await obtener(prisma, ordenId, registroId, evidenciaId);
    if (item.estadoCarga !== 'DISPONIBLE') throw new AppError(409, 'El archivo todavía no está disponible.');
    try { return { item, contenido: await almacenamientoEvidencias().leer(item.claveArchivo) }; }
    catch { throw new AppError(503, 'El archivo no está disponible en el almacenamiento.'); }
}

export async function revisar(ordenId: number, registroId: number, evidenciaId: number, datos: { decision: 'ACEPTADA' | 'RECHAZADA'; observacion?: string | null }, actor: ActorOrden) {
    return prisma.$transaction(async tx => {
        const item = await obtener(tx, ordenId, registroId, evidenciaId);
        const orden = await tx.ordenTrabajo.findUniqueOrThrow({ where: { id: ordenId }, select: { estadoCodigo: true, version: true } });
        if (orden.estadoCodigo !== 'EN_REVISION' || item.estadoCarga !== 'DISPONIBLE') throw new AppError(409, 'Solo se revisan archivos disponibles de órdenes en revisión.');
        const cambio = await tx.ordenTrabajo.updateMany({ where: { id: ordenId, estadoCodigo: 'EN_REVISION', version: orden.version }, data: { version: { increment: 1 } } });
        if (cambio.count !== 1) throw new AppError(409, 'La orden cambió durante la revisión.');
        const revision = await tx.revisionEvidencia.create({ data: { ...datos, evidenciaId, revisadaPorId: actor.id } });
        await tx.auditoria.create({ data: { usuarioId: actor.id, tipoActor: 'USUARIO', entidad: 'EVIDENCIA_EQUIPO', entidadId: String(evidenciaId), accion: 'REVISAR', datosNuevos: { decision: datos.decision, revisionId: revision.id } } });
        return revision;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
