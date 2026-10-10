import { prisma } from '../../infrastructure/prisma.js';
import { paginaDesde } from '../../shared/pagination.js';
import { AppError } from '../../errors/AppError.js';
import type { CrearOrdenInput, ListarOrdenesInput, EstadoOrdenCodigo } from './ordenes.schema.js';

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
            ...(filtros.buscar ? {
                OR: [
                    { clienteNombreRegistrado: { contains: filtros.buscar, mode: 'insensitive' as const } },
                    { solicitud: { contains: filtros.buscar, mode: 'insensitive' as const } },
                ],
            } : {}),
        },
        select: resumenSelect,
        orderBy: { creadaEn: 'desc' },
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

export async function cambiarEstado(
    id: number,
    estadoActual: EstadoOrdenCodigo,
    nuevoEstado: EstadoOrdenCodigo,
    version: number,
    motivo: string,
    usuarioId: number,
) {
    return prisma.$transaction(async (tx) => {
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
        return tx.ordenTrabajo.findUniqueOrThrow({ where: { id }, select: detalleSelect });
    });
}
