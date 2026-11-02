import { prisma } from '../../../../infrastructure/prisma.js';
import type { ActualizarPerfilInput } from '../../contracts/crm.schema.js';

export async function obtenerPorCliente(clienteId: number) {
    return prisma.perfilComercialCliente.findUnique({ where: { clienteId } });
}

export async function guardarVersionado(clienteId: number, datos: ActualizarPerfilInput) {
    if (datos.version === 0) {
        try {
            return await prisma.perfilComercialCliente.create({
                data: {
                    clienteId,
                    clasificacion: datos.clasificacion ?? null,
                    instruccionesFacturacion: datos.instruccionesFacturacion ?? null,
                },
            });
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return null;
            throw error;
        }
    }

    return prisma.$transaction(async tx => {
        const data = { version: { increment: 1 }, ...(datos.clasificacion !== undefined ? { clasificacion: datos.clasificacion } : {}), ...(datos.instruccionesFacturacion !== undefined ? { instruccionesFacturacion: datos.instruccionesFacturacion } : {}) };
        const cambio = await tx.perfilComercialCliente.updateMany({
            where: { clienteId, version: datos.version },
            data,
        });
        if (cambio.count !== 1) return null;
        return tx.perfilComercialCliente.findUnique({ where: { clienteId } });
    });
}
