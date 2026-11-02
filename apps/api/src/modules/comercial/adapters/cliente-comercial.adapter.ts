import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';

export interface ClienteComercial {
    id: number;
    activo: boolean;
}

/** Adaptador mínimo para validar referencias comerciales sin exponer el modelo completo. */
export async function obtenerClienteComercial(id: number): Promise<ClienteComercial> {
    const cliente = await prisma.cliente.findUnique({
        where: { id },
        select: { id: true, activo: true },
    });
    if (!cliente) throw new AppError(404, 'El cliente no existe.');
    return cliente;
}
