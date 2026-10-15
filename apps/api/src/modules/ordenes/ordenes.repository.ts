import { prisma } from '../../infrastructure/prisma.js';
import { Prisma } from '@prisma/client';
import { validarTrabajoCompleto } from './ordenes.revision.js';
import { autorizarTecnico, type ActorOrden } from './ordenes.actor.js';
import { registrarEdicionOrden, registrarEventoOrden } from './ordenes.eventos.js';
import { paginaDesde } from '../../shared/pagination.js';
import { AppError } from '../../errors/AppError.js';
import type { CrearOrdenInput, EditarOrdenInput, ListarOrdenesInput, EstadoOrdenCodigo } from './ordenes.schema.js';

const resumenSelect = {
    id: true,
    numero: true,
    ubicacionId: true,
    estadoCodigo: true,
    solicitud: true,
    prioridad: true,
    fechaProgramada: true,
    creadaEn: true,
    actualizadaEn: true,
    cerradaEn: true,
    version: true,
    clienteNombreRegistrado: true,
    ubicacionNombreRegistrado: true,
    direccionRegistrada: true,
    asignaciones: {
        where: { fin: null },
        orderBy: { inicio: 'desc' as const },
        take: 1,
        select: {
            id: true, inicio: true, motivo: true,
            cuadrilla: { select: { id: true, nombre: true } },
            empleadoResponsable: {
                select: { id: true, persona: { select: { firstName: true, firstLastName: true } } },
            },
        },
    },
} as const;

const detalleSelect = {
    ...resumenSelect,
    clienteIdentificacionRegistrada: true,
    creadaPor: { select: { id: true, identificador: true } },
    historial: {
        select: { id: true, estadoAnterior: true, estadoNuevo: true, motivo: true, fecha: true },
        orderBy: { fecha: 'desc' },
    },
} as const;

export function buscarUbicacionActiva(id: number) {
    return prisma.ubicacion.findFirst({
        where: { id, activa: true, cliente: { activo: true } },
        select: {
            id: true,
            nombre: true,
            direccion: true,
            cliente: {
                select: {
                    persona: { select: { firstName: true, firstLastName: true, numberDocument: true } },
                    organizacion: { select: { razonSocial: true, identificacionTributaria: true } },
                },
            },
        },
    });
}

interface DatosHistoricos {
    clienteNombre: string;
    clienteIdentificacion: string | null;
    ubicacionNombre: string;
    direccion: string;
}

export function crear(datos: CrearOrdenInput, usuarioId: number, historicos: DatosHistoricos) {
    return prisma.ordenTrabajo.create({
        data: {
            ubicacionId: datos.ubicacionId,
            solicitud: datos.solicitud,
            prioridad: datos.prioridad,
            fechaProgramada: datos.fechaProgramada ? new Date(datos.fechaProgramada) : null,
            creadaPorId: usuarioId,
            estadoCodigo: 'PENDIENTE',
            clienteNombreRegistrado: historicos.clienteNombre,
            clienteIdentificacionRegistrada: historicos.clienteIdentificacion,
            ubicacionNombreRegistrado: historicos.ubicacionNombre,
            direccionRegistrada: historicos.direccion,
            historial: {
                create: { estadoNuevo: 'PENDIENTE', cambiadoPorId: usuarioId, motivo: 'Registro inicial de la orden.' },
            },
        },
        select: detalleSelect,
    });
}

export async function listar(filtros: ListarOrdenesInput) {
    const items = await prisma.ordenTrabajo.findMany({
        where: {
            ...(filtros.estado ? { estadoCodigo: filtros.estado } : {}),
            ...(filtros.prioridad ? { prioridad: filtros.prioridad } : {}),
            ...(filtros.clienteId ? { ubicacion: { clienteId: filtros.clienteId } } : {}),
            ...((filtros.desde || filtros.hasta) ? { fechaProgramada: {
                ...(filtros.desde ? { gte: new Date(`${filtros.desde}T00:00:00-06:00`) } : {}),
                ...(filtros.hasta ? { lt: new Date(new Date(`${filtros.hasta}T00:00:00-06:00`).getTime() + 86400000) } : {}),
            } } : {}),
            ...(filtros.buscar ? {
                OR: [
                    { clienteNombreRegistrado: { contains: filtros.buscar, mode: 'insensitive' as const } },
                    { solicitud: { contains: filtros.buscar, mode: 'insensitive' as const } },
                ],
            } : {}),
        },
        select: resumenSelect,
        orderBy: filtros.desde || filtros.hasta ? [{ fechaProgramada: 'asc' }, { id: 'asc' }] : [{ creadaEn: 'desc' }, { id: 'desc' }],
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return paginaDesde(items, filtros);
}

export function buscarPorId(id: number) {
    return prisma.ordenTrabajo.findUnique({ where: { id }, select: detalleSelect });
}

export function tieneAsignacionVigente(id: number) {
    return prisma.asignacion.findFirst({
        where: { ordenId: id, fin: null }, select: { id: true },
    });
}

export async function editar(id: number, datos: EditarOrdenInput, usuarioId: number) {
    return prisma.$transaction(async tx => {
        const orden = await tx.ordenTrabajo.findUnique({ where: { id }, select: detalleSelect });
        if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
        const editables = ['BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION'];
        if (!editables.includes(orden.estadoCodigo)) throw new AppError(409, 'Esta orden está en revisión o finalizada y no admite edición.');
        if (orden.version !== datos.version) throw new AppError(409, 'La orden cambió. Cierra el formulario y actualiza el listado antes de editar.');
        const anteriores = { solicitud: orden.solicitud, prioridad: orden.prioridad, fechaProgramada: orden.fechaProgramada?.toISOString() ?? null };
        const nuevos = {
            solicitud: datos.solicitud ?? anteriores.solicitud,
            prioridad: datos.prioridad ?? anteriores.prioridad,
            fechaProgramada: datos.fechaProgramada === undefined ? anteriores.fechaProgramada : datos.fechaProgramada === null ? null : new Date(datos.fechaProgramada).toISOString(),
        };
        if (JSON.stringify(anteriores) === JSON.stringify(nuevos)) return orden;
        const resultado = await tx.ordenTrabajo.updateMany({
            where: { id, version: datos.version, estadoCodigo: { in: editables } },
            data: { ...nuevos, fechaProgramada: nuevos.fechaProgramada ? new Date(nuevos.fechaProgramada) : null, version: { increment: 1 } },
        });
        if (resultado.count !== 1) throw new AppError(409, 'La orden cambió durante la operación. Vuelve a cargarla.');
        await registrarEdicionOrden(tx, id, usuarioId, anteriores, nuevos);
        return tx.ordenTrabajo.findUniqueOrThrow({ where: { id }, select: detalleSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cambiarEstado(
    id: number,
    estadoActual: EstadoOrdenCodigo,
    nuevoEstado: EstadoOrdenCodigo,
    version: number,
    motivo: string,
    usuarioId: number,
    actor?: ActorOrden,
) {
    return prisma.$transaction(async (tx) => {
        if (actor) await autorizarTecnico(tx, id, actor);
        if (nuevoEstado === 'EN_REVISION' || nuevoEstado === 'CERRADA') await validarTrabajoCompleto(tx, id, nuevoEstado === 'CERRADA');
        const resultado = await tx.ordenTrabajo.updateMany({
            where: { id, estadoCodigo: estadoActual, version },
            data: {
                estadoCodigo: nuevoEstado,
                version: { increment: 1 },
                ...(nuevoEstado === 'CERRADA' ? { cerradaEn: new Date() } : {}),
            },
        });
        if (resultado.count !== 1) {
            throw new AppError(409, 'La orden cambió durante la operación. Vuelve a cargarla.');
        }
        await tx.historialEstado.create({
            data: { ordenId: id, estadoAnterior: estadoActual, estadoNuevo: nuevoEstado, motivo, cambiadoPorId: usuarioId },
        });
        await registrarEventoOrden(tx, id, estadoActual, nuevoEstado, usuarioId, motivo);
        if (nuevoEstado === 'CERRADA' || nuevoEstado === 'CANCELADA') {
            await tx.asignacion.updateMany({ where: { ordenId: id, fin: null }, data: { fin: new Date() } });
        }
        return tx.ordenTrabajo.findUniqueOrThrow({ where: { id }, select: detalleSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
