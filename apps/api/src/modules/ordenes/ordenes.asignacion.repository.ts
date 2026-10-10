import { prisma } from '../../infrastructure/prisma.js';
import { AppError } from '../../errors/AppError.js';
import type { AsignarOrdenInput } from './ordenes.asignacion.schema.js';

/** Alta atómica: estado, responsable e historial nunca quedan desincronizados. */
export async function registrarAsignacion(ordenId: number, datos: AsignarOrdenInput, usuarioId: number) {
    return prisma.$transaction(async tx => {
        const orden = await tx.ordenTrabajo.findUnique({
            where: { id: ordenId },
            select: { id: true, version: true, estadoCodigo: true },
        });
        if (!orden) throw new AppError(404, 'La orden no existe.');
        if (orden.estadoCodigo !== 'PENDIENTE') {
            throw new AppError(409, 'Solo se puede asignar una orden pendiente.');
        }

        const cuadrilla = await tx.cuadrilla.findFirst({
            where: { id: datos.cuadrillaId, activa: true },
            select: {
                id: true,
                miembros: {
                    where: { fin: null, esLider: true, empleado: { active: true, habilitadoComoTecnico: true } },
                    select: { empleadoId: true },
                    take: 1,
                },
            },
        });
        if (!cuadrilla) throw new AppError(400, 'La cuadrilla no existe o está inactiva.');
        const lider = cuadrilla.miembros[0];
        if (!lider) throw new AppError(409, 'La cuadrilla necesita un líder técnico activo y habilitado.');

        const cambio = await tx.ordenTrabajo.updateMany({
            where: { id: ordenId, estadoCodigo: 'PENDIENTE', version: orden.version },
            data: {
                estadoCodigo: 'ASIGNADA',
                version: { increment: 1 },
                ...(datos.fechaProgramada ? { fechaProgramada: new Date(datos.fechaProgramada) } : {}),
            },
        });
        if (cambio.count !== 1) {
            throw new AppError(409, 'La orden cambió durante la asignación. Vuelve a cargarla.');
        }

        await tx.asignacion.create({
            data: {
                ordenId,
                cuadrillaId: cuadrilla.id,
                empleadoResponsableId: lider.empleadoId,
                asignadaPorId: usuarioId,
                motivo: datos.motivo,
            },
        });
        await tx.historialEstado.create({
            data: {
                ordenId,
                estadoAnterior: 'PENDIENTE',
                estadoNuevo: 'ASIGNADA',
                cambiadoPorId: usuarioId,
                motivo: datos.motivo,
            },
        });
    });
}
