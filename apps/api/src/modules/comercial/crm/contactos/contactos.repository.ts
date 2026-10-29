import { prisma } from '../../../../infrastructure/prisma.js';
import type { ActualizarContactoInput, CrearContactoInput, ListarContactosQuery } from '../../contracts/crm.schema.js';

export async function listar(clienteId: number, filtros: ListarContactosQuery) {
    const q = filtros.q?.trim();
    const where = {
        clienteId,
        ...(q ? { OR: [
            { nombre: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { telefono: { contains: q, mode: 'insensitive' as const } },
            { cargo: { contains: q, mode: 'insensitive' as const } },
        ] } : {}),
    };
    const contactos = await prisma.contactoComercial.findMany({
        where,
        orderBy: [{ [filtros.sortBy]: filtros.sortDir }, { id: 'desc' }],
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    const hayMas = contactos.length > filtros.limite;
    return { items: hayMas ? contactos.slice(0, filtros.limite) : contactos, pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export function crear(clienteId: number, datos: CrearContactoInput) {
    return prisma.contactoComercial.create({
        data: {
            clienteId,
            nombre: datos.nombre,
            email: datos.email ?? null,
            telefono: datos.telefono ?? null,
            cargo: datos.cargo ?? null,
        },
    });
}

export function buscarPorIdCliente(id: number, clienteId: number) {
    return prisma.contactoComercial.findFirst({ where: { id, clienteId } });
}

export async function actualizarVersionado(id: number, clienteId: number, datos: ActualizarContactoInput) {
    const { version, ...campos } = datos;
    return prisma.$transaction(async tx => {
        const cambio = await tx.contactoComercial.updateMany({
            where: { id, clienteId, version },
            data: { ...campos, version: { increment: 1 } },
        });
        if (cambio.count === 1) {
            return { tipo: 'actualizado' as const, contacto: await tx.contactoComercial.findFirst({ where: { id, clienteId } }) };
        }
        const existente = await tx.contactoComercial.findFirst({ where: { id, clienteId }, select: { id: true } });
        return existente ? { tipo: 'conflicto' as const } : { tipo: 'no-encontrado' as const };
    });
}
