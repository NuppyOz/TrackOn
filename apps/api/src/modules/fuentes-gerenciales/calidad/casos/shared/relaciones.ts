import type { Prisma } from '@prisma/client';
import { AppError } from '../../../../../errors/AppError.js';

export const clienteNombreSelect = {
  id: true,
  persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } },
  organizacion: { select: { razonSocial: true, nombreComercial: true } },
} satisfies Prisma.ClienteSelect;
export type ClienteConNombre = Prisma.ClienteGetPayload<{ select: typeof clienteNombreSelect }>;
export const nombreCliente = (cliente: ClienteConNombre) => cliente.organizacion?.nombreComercial ?? cliente.organizacion?.razonSocial ?? (cliente.persona ? [cliente.persona.firstName, cliente.persona.secondName, cliente.persona.firstLastName, cliente.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${cliente.id}`);

export async function obtenerCliente(tx: Prisma.TransactionClient, clienteId: number) {
  const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: clienteNombreSelect });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  return cliente;
}

/** Comprueba los vínculos operativos reales por ubicación y, cuando existe, OrdenEquipo. */
export async function verificarReferenciasCliente(tx: Prisma.TransactionClient, entrada: { clienteId: number; equipoId?: number; ordenId?: number }) {
  await obtenerCliente(tx, entrada.clienteId);
  let equipoClienteId: number | undefined;
  if (entrada.equipoId !== undefined) {
    const equipo = await tx.equipo.findUnique({ where: { id: entrada.equipoId }, select: { id: true, ubicacion: { select: { clienteId: true } } } });
    if (!equipo) throw new AppError(404, 'El equipo no existe.');
    equipoClienteId = equipo.ubicacion.clienteId;
    if (equipoClienteId !== entrada.clienteId) throw new AppError(400, 'El equipo no pertenece al cliente indicado.');
  }
  if (entrada.ordenId !== undefined) {
    const orden = await tx.ordenTrabajo.findUnique({ where: { id: entrada.ordenId }, select: { id: true, ubicacion: { select: { clienteId: true } } } });
    if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
    if (orden.ubicacion.clienteId !== entrada.clienteId) throw new AppError(400, 'La orden de trabajo no pertenece al cliente indicado.');
    if (entrada.equipoId !== undefined) {
      const equiposOrden = await tx.ordenEquipo.findMany({ where: { ordenId: orden.id }, select: { equipoId: true } });
      const idsRegistrados = equiposOrden.flatMap(row => row.equipoId === null ? [] : [row.equipoId]);
      if (idsRegistrados.length > 0 && !idsRegistrados.includes(entrada.equipoId)) throw new AppError(400, 'El equipo no está registrado en la orden de trabajo indicada.');
    }
  }
  return { equipoClienteId };
}
