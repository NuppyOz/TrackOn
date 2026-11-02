import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../src/errors/AppError.js';
import { verificarReferenciasCliente } from '../src/modules/fuentes-gerenciales/calidad/casos/shared/relaciones.js';
import { validarEquipoGarantia } from '../src/modules/fuentes-gerenciales/calidad/casos/casos.service.js';

describe('H8 vínculos operativos de calidad', () => {
  it('permite que la OT de origen de una garantía difiera de la OT de atención si el equipo corresponde', async () => {
    const tx = {
      cliente: { findUnique: vi.fn().mockResolvedValue({ id: 8 }) },
      equipo: { findUnique: vi.fn().mockResolvedValue({ id: 91, ubicacion: { clienteId: 8 } }) },
      ordenTrabajo: { findUnique: vi.fn().mockResolvedValue({ id: 202, ubicacion: { clienteId: 8 } }) },
      ordenEquipo: { findMany: vi.fn().mockResolvedValue([{ equipoId: 91 }]) },
    } as unknown as Prisma.TransactionClient;

    await expect(verificarReferenciasCliente(tx, { clienteId: 8, equipoId: 91, ordenId: 202 })).resolves.toEqual({ equipoClienteId: 8 });
  });

  it('rechaza un equipo efectivo que no está registrado en la OT de atención', async () => {
    const tx = {
      cliente: { findUnique: vi.fn().mockResolvedValue({ id: 8 }) },
      equipo: { findUnique: vi.fn().mockResolvedValue({ id: 91, ubicacion: { clienteId: 8 } }) },
      ordenTrabajo: { findUnique: vi.fn().mockResolvedValue({ id: 202, ubicacion: { clienteId: 8 } }) },
      ordenEquipo: { findMany: vi.fn().mockResolvedValue([{ equipoId: 77 }]) },
    } as unknown as Prisma.TransactionClient;

    await expect(verificarReferenciasCliente(tx, { clienteId: 8, equipoId: 91, ordenId: 202 })).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });

  it('rechaza equipos explícitos distintos entre garantía y caso aunque no haya equipos asociados a la OT', () => {
    expect(() => validarEquipoGarantia(91, 77)).toThrowError(AppError);
    expect(() => validarEquipoGarantia(91, 77)).toThrow(/no coincide/);
  });
});
