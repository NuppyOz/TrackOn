import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../src/errors/AppError.js';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn() }));
vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: { casoCalidadGerencial: { findMany: mocks.findMany, findUnique: mocks.findUnique } } }));

import { cerrarCaso, cerrarCorrectiva, conflictoCaso, crearCaso, crearCorrectiva, crearRetrabajo, listarCasos, obtenerCaso, responderCaso, resolverCaso, validarEquipoGarantia } from '../src/modules/fuentes-gerenciales/calidad/casos/casos.service.js';

const row = (id: number, respondidaEn: Date | null, resueltaEn: Date | null, cerradaEn: Date | null) => ({
  id, referencia: `CAS-${id}`, clienteId: 4,
  cliente: { id: 4, persona: null, organizacion: { razonSocial: 'Taller Central', nombreComercial: null } },
  garantia: null, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', descripcion: 'Fuga en sello',
  equipoId: null, ordenId: null, garantiaId: null, anteriorId: null, abiertaEn: new Date('2025-10-01T12:00:00Z'),
  respuestaLimiteEn: null, resolucionLimiteEn: null, respondidaEn, resueltaEn, cerradaEn,
  resultado: null, causaRaiz: null, registradaEn: new Date('2025-10-01T13:00:00Z'), version: 1,
});
const input = { referencia: 'CAS-NUEVO', clienteId: 4, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', descripcion: 'Fuga en sello', abiertaEn: '2025-10-01T10:00:00-06:00' };
const txBase = (overrides: Record<string, unknown> = {}) => ({
  cliente: { findUnique: vi.fn().mockResolvedValue({ id: 4, persona: null, organizacion: { razonSocial: 'Taller Central', nombreComercial: null } }) },
  equipo: { findUnique: vi.fn().mockResolvedValue({ id: 12, ubicacion: { clienteId: 4 } }) },
  ordenTrabajo: { findUnique: vi.fn().mockResolvedValue({ id: 13, ubicacion: { clienteId: 4 } }) },
  ordenEquipo: { findMany: vi.fn().mockResolvedValue([{ equipoId: 12 }]) },
  garantiaGerencial: { findUnique: vi.fn().mockResolvedValue(null) },
  casoCalidadGerencial: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ ...row(20, null, null, null), retrabajos: [], correctivas: [] }),
  },
  ...overrides,
});
const txAction = (caso: unknown) => ({
  cliente: { findUnique: vi.fn().mockResolvedValue({ id: 4, persona: null, organizacion: { razonSocial: 'Taller Central', nombreComercial: null } }) },
  ordenTrabajo: { findUnique: vi.fn().mockResolvedValue({ id: 13, ubicacion: { clienteId: 4 } }) },
  ordenEquipo: { findMany: vi.fn().mockResolvedValue([]) },
  equipo: { findUnique: vi.fn().mockResolvedValue({ id: 12, ubicacion: { clienteId: 4 } }) },
  empleado: { findUnique: vi.fn().mockResolvedValue({ id: 6, active: true }) },
  casoCalidadGerencial: {
    findUnique: vi.fn().mockResolvedValue(caso),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ ...row(31, null, null, null), retrabajos: [], correctivas: [] }),
  },
  auditoria: { create: vi.fn().mockResolvedValue({}) },
  retrabajoGerencial: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 8, casoId: 31, referenciaTrabajo: 'OT-10', fechaEfectiva: new Date('2025-10-20T16:00:00Z'), motivo: 'Ajustar', ordenId: null, registradoEn: new Date('2025-10-20T16:01:00Z') }) },
  correctivaGerencial: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 9, casoId: 31, descripcion: 'Cambiar sello', responsableId: 6, creadaEn: new Date('2025-10-20T16:00:00Z'), venceEn: new Date('2025-10-21T16:00:00Z'), version: 1, responsable: { id: 6, persona: { firstName: 'Luz', secondName: null, firstLastName: 'Paz', secondLastName: null } } }),
    findUnique: vi.fn().mockResolvedValue({ id: 9, casoId: 31, version: 1, cerradaEn: null, creadaEn: new Date('2025-10-20T16:00:00Z'), resultado: null, descripcion: 'Cambiar sello', responsableId: 6, venceEn: new Date('2025-10-21T16:00:00Z'), caso: { referencia: 'CAS-31' } }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 9, casoId: 31, version: 2, cerradaEn: new Date('2025-10-21T17:00:00Z'), resultado: 'Verificada', creadaEn: new Date('2025-10-20T16:00:00Z'), descripcion: 'Cambiar sello', responsableId: 6, venceEn: new Date('2025-10-21T16:00:00Z'), responsable: { id: 6, persona: { firstName: 'Luz', secondName: null, firstLastName: 'Paz', secondLastName: null } } }),
  },
});

describe('Servicio de casos de calidad', () => {
  beforeEach(() => { mocks.findMany.mockReset(); mocks.findUnique.mockReset(); });

  it('mapea estados, relaciones y todos los filtros opcionales', async () => {
    mocks.findMany.mockResolvedValue([
      row(1, null, null, null),
      row(2, new Date('2025-10-02T12:00:00Z'), null, null),
      row(3, new Date('2025-10-02T12:00:00Z'), new Date('2025-10-03T12:00:00Z'), null),
      row(4, new Date('2025-10-02T12:00:00Z'), new Date('2025-10-03T12:00:00Z'), new Date('2025-10-04T12:00:00Z')),
    ]);
    const filtros = { pagina: 2, limite: 10, clienteId: 4, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', abiertaAntes: '2025-10-10T00:00:00Z', q: 'CAS', estado: 'RESUELTO' as const };
    const result = await listarCasos(filtros);
    expect(result.items.map(item => item.estado)).toEqual(['ABIERTO', 'EN_ATENCION', 'RESUELTO', 'CERRADO']);
    expect(result.items[0]?.clienteNombre).toBe('Taller Central');
    expect(result.items[0]?.garantiaReferencia).toBeNull();
    expect(result).toMatchObject({ pagina: 2, limite: 10, hayMas: false });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        clienteId: 4, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', abiertaEn: { lt: new Date('2025-10-10T00:00:00Z') },
        resueltaEn: { not: null }, cerradaEn: null,
        OR: [
          { referencia: { contains: 'CAS', mode: 'insensitive' } },
          { activoReferencia: { contains: 'CAS', mode: 'insensitive' } },
          { codigoFalla: { contains: 'CAS', mode: 'insensitive' } },
        ],
      }), skip: 10, take: 11,
    }));
  });

  it('omite filtros vacíos y detecta la página siguiente', async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 3 }, (_, index) => row(index + 1, null, null, null)));
    const result = await listarCasos({ pagina: 1, limite: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.hayMas).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0, take: 3 }));
  });

  it.each([
    ['ABIERTO', { respondidaEn: null, resueltaEn: null, cerradaEn: null }],
    ['EN_ATENCION', { respondidaEn: { not: null }, resueltaEn: null, cerradaEn: null }],
    ['CERRADO', { cerradaEn: { not: null } }],
  ] as const)('construye correctamente el filtro de estado %s', async (estado, whereEstado) => {
    mocks.findMany.mockResolvedValue([]);
    await listarCasos({ pagina: 1, limite: 25, estado });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: whereEstado }));
  });

  it('convierte el detalle con eventos, relaciones y nombres opcionales', async () => {
    const opened = new Date('2025-10-01T12:00:00Z');
    mocks.findUnique.mockResolvedValue({
      ...row(9, new Date('2025-10-02T12:00:00Z'), new Date('2025-10-03T12:00:00Z'), null),
      cliente: { id: 4, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null }, organizacion: null },
      garantia: { id: 7, referencia: 'GAR-7' }, equipoId: 12, ordenId: 13, garantiaId: 7, anteriorId: 3,
      respuestaLimiteEn: new Date('2025-10-02T12:00:00Z'), resolucionLimiteEn: null,
      retrabajos: [
        { id: 1, casoId: 9, referenciaTrabajo: 'OT-10', fechaEfectiva: opened, motivo: 'Revisar', ordenId: null, registradoEn: opened },
        { id: 2, casoId: 9, referenciaTrabajo: 'OT-11', fechaEfectiva: opened, motivo: 'Ajustar', ordenId: 15, registradoEn: opened },
      ],
      correctivas: [{
        id: 5, casoId: 9, descripcion: 'Cambiar sello', responsableId: 6, creadaEn: opened, venceEn: opened,
        cerradaEn: null, resultado: null, version: 1,
        responsable: { id: 6, persona: { firstName: 'Luz', secondName: null, firstLastName: 'Paz', secondLastName: null } },
      }],
    });
    const result = await obtenerCaso(9);
    expect(result).toMatchObject({ clienteNombre: 'Ana Ruiz', garantiaReferencia: 'GAR-7', equipoId: 12, ordenId: 13, anteriorId: 3, estado: 'RESUELTO' });
    expect(result.retrabajos.map(item => item.ordenId)).toEqual([null, 15]);
    expect(result.correctivas[0]).toMatchObject({ casoReferencia: 'CAS-9', responsableNombre: 'Luz Paz', cerradaEn: null, resultado: null });
  });

  it('devuelve 404 al consultar un caso inexistente', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(obtenerCaso(404)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('crea un caso con asociaciones ausentes como null y límites opcionales', async () => {
    const tx = txBase();
    const result = await crearCaso(tx as unknown as Prisma.TransactionClient, input, 7, new Date('2025-10-02T00:00:00Z'));
    expect(result).toMatchObject({ referencia: 'CAS-20', estado: 'ABIERTO', retrabajos: [], correctivas: [] });
    expect(tx.casoCalidadGerencial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ equipoId: null, ordenId: null, garantiaId: null, anteriorId: null, respuestaLimiteEn: null, resolucionLimiteEn: null, autorId: 7 }),
    }));
  });

  it('rechaza apertura futura antes de consultar asociaciones', async () => {
    const tx = txBase();
    await expect(crearCaso(tx as unknown as Prisma.TransactionClient, { ...input, abiertaEn: '2025-10-03T00:00:00Z' }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 400 });
    expect(tx.cliente.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza garantías inexistentes y discordantes con el cliente o activo', async () => {
    const missing = txBase();
    await expect(crearCaso(missing as unknown as Prisma.TransactionClient, { ...input, garantiaId: 7 }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 404 });

    const mismatched = txBase({ garantiaGerencial: { findUnique: vi.fn().mockResolvedValue({ id: 7, referencia: 'GAR-7', clienteId: 99, activoReferencia: 'BOMBA-1', equipoId: null, ordenId: null }) } });
    await expect(crearCaso(mismatched as unknown as Prisma.TransactionClient, { ...input, garantiaId: 7 }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });

  it('rechaza equipos discordantes y antecedentes inexistentes o posteriores', async () => {
    const mismatchedEquipment = txBase({ garantiaGerencial: { findUnique: vi.fn().mockResolvedValue({ id: 7, referencia: 'GAR-7', clienteId: 4, activoReferencia: 'BOMBA-1', equipoId: 99, ordenId: null }) } });
    await expect(crearCaso(mismatchedEquipment as unknown as Prisma.TransactionClient, { ...input, garantiaId: 7, equipoId: 12 }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 400 });

    const missingPrevious = txBase();
    await expect(crearCaso(missingPrevious as unknown as Prisma.TransactionClient, { ...input, anteriorId: 3 }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 404 });

    const laterPrevious = txBase({ casoCalidadGerencial: { findUnique: vi.fn().mockResolvedValue({ id: 3, clienteId: 4, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', abiertaEn: new Date('2025-10-01T16:00:00Z') }), create: vi.fn() } });
    await expect(crearCaso(laterPrevious as unknown as Prisma.TransactionClient, { ...input, anteriorId: 3 }, 7, new Date('2025-10-02T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 400 });
    expect(laterPrevious.casoCalidadGerencial.create).not.toHaveBeenCalled();
  });

  it('permite equipo de garantía coincidente o implícito', () => {
    expect(() => validarEquipoGarantia(12, 12)).not.toThrow();
    expect(() => validarEquipoGarantia(undefined, 12)).not.toThrow();
    expect(() => validarEquipoGarantia(12, null)).not.toThrow();
  });

  it.each([
    ['P2002', 409], ['P2003', 400], ['P2034', 409],
  ] as const)('traduce el error de Prisma %s a un error de dominio', (code, statusCode) => {
    const error = new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });
    expect(() => conflictoCaso(error)).toThrowError(AppError);
    expect(() => conflictoCaso(error)).toThrow(expect.objectContaining({ statusCode }));
  });

  it('propaga errores de Prisma que no corresponden a conflictos conocidos', () => {
    const error = new Error('unexpected');
    expect(() => conflictoCaso(error)).toThrow(error);
  });

  it('responde un caso y registra auditoría con la versión incrementada', async () => {
    const opened = new Date('2025-10-20T15:00:00Z');
    const tx = txAction({ id: 31, version: 3, abiertaEn: opened, respondidaEn: null, resueltaEn: null, cerradaEn: null });
    const result = await responderCaso(tx as unknown as Prisma.TransactionClient, 31, { version: 3, respondidaEn: '2025-10-20T16:00:00Z' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result.estado).toBe('ABIERTO');
    expect(tx.casoCalidadGerencial.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 3 }) }));
    expect(tx.auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accion: 'RESPONDER' }) }));
  });

  it.each([
    ['inexistente', null, { version: 3, respondidaEn: '2025-10-20T16:00:00Z' }, 404],
    ['versión obsoleta', { id: 31, version: 4, abiertaEn: new Date('2025-10-20T15:00:00Z'), respondidaEn: null, resueltaEn: null, cerradaEn: null }, { version: 3, respondidaEn: '2025-10-20T16:00:00Z' }, 409],
    ['ya respondido', { id: 31, version: 3, abiertaEn: new Date('2025-10-20T15:00:00Z'), respondidaEn: new Date('2025-10-20T15:30:00Z'), resueltaEn: null, cerradaEn: null }, { version: 3, respondidaEn: '2025-10-20T16:00:00Z' }, 409],
    ['anterior a la apertura', { id: 31, version: 3, abiertaEn: new Date('2025-10-20T15:00:00Z'), respondidaEn: null, resueltaEn: null, cerradaEn: null }, { version: 3, respondidaEn: '2025-10-20T14:00:00Z' }, 400],
    ['futura', { id: 31, version: 3, abiertaEn: new Date('2025-10-20T15:00:00Z'), respondidaEn: null, resueltaEn: null, cerradaEn: null }, { version: 3, respondidaEn: '2025-10-23T14:00:00Z' }, 400],
  ] as const)('rechaza respuesta %s', async (_label, caso, payload, statusCode) => {
    const tx = txAction(caso);
    await expect(responderCaso(tx as unknown as Prisma.TransactionClient, 31, payload, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });

  it('rechaza la respuesta si la versión cambia entre lectura y escritura', async () => {
    const tx = txAction({ id: 31, version: 3, abiertaEn: new Date('2025-10-20T15:00:00Z'), respondidaEn: null, resueltaEn: null, cerradaEn: null });
    tx.casoCalidadGerencial.updateMany.mockResolvedValue({ count: 0 });
    await expect(responderCaso(tx as unknown as Prisma.TransactionClient, 31, { version: 3, respondidaEn: '2025-10-20T16:00:00Z' }, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode: 409 });
  });

  it('resuelve un caso respondido y audita el resultado', async () => {
    const tx = txAction({ id: 31, version: 4, respondidaEn: new Date('2025-10-20T15:00:00Z'), resueltaEn: null, cerradaEn: null, resultado: null, causaRaiz: null });
    const result = await resolverCaso(tx as unknown as Prisma.TransactionClient, 31, { version: 4, resueltaEn: '2025-10-20T16:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result.estado).toBe('ABIERTO');
    expect(tx.casoCalidadGerencial.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resultado: 'PROCEDE', causaRaiz: 'Sello' }) }));
    expect(tx.auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accion: 'RESOLVER' }) }));
  });

  it.each([
    ['inexistente', null, { version: 4, resueltaEn: '2025-10-20T16:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 404],
    ['sin respuesta previa', { id: 31, version: 4, respondidaEn: null, resueltaEn: null, cerradaEn: null }, { version: 4, resueltaEn: '2025-10-20T16:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 409],
    ['ya resuelto', { id: 31, version: 4, respondidaEn: new Date('2025-10-20T15:00:00Z'), resueltaEn: new Date('2025-10-20T15:30:00Z'), cerradaEn: null }, { version: 4, resueltaEn: '2025-10-20T16:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 409],
    ['anterior a la respuesta', { id: 31, version: 4, respondidaEn: new Date('2025-10-20T15:00:00Z'), resueltaEn: null, cerradaEn: null }, { version: 4, resueltaEn: '2025-10-20T14:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 400],
    ['futura', { id: 31, version: 4, respondidaEn: new Date('2025-10-20T15:00:00Z'), resueltaEn: null, cerradaEn: null }, { version: 4, resueltaEn: '2025-10-23T14:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Sello' }, 400],
  ] as const)('rechaza resolución %s', async (_label, caso, payload, statusCode) => {
    const tx = txAction(caso);
    await expect(resolverCaso(tx as unknown as Prisma.TransactionClient, 31, payload, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });

  it('cierra cuando todos los hitos han concluido y registra el evento', async () => {
    const tx = txAction({ id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null });
    tx.retrabajoGerencial.findMany.mockResolvedValue([{ fechaEfectiva: new Date('2025-10-20T16:00:00Z') }]);
    tx.correctivaGerencial.findMany.mockResolvedValue([{ creadaEn: new Date('2025-10-20T16:30:00Z'), cerradaEn: new Date('2025-10-20T17:00:00Z') }]);
    const result = await cerrarCaso(tx as unknown as Prisma.TransactionClient, 31, { version: 5, cerradaEn: '2025-10-20T18:00:00Z' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result.estado).toBe('ABIERTO');
    expect(tx.auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accion: 'CERRAR' }) }));
  });

  it.each([
    ['inexistente', null, '2025-10-20T18:00:00Z', [], [], 404],
    ['sin resolución previa', { id: 31, version: 5, resueltaEn: null, cerradaEn: null }, '2025-10-20T18:00:00Z', [], [], 409],
    ['ya cerrado', { id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: new Date('2025-10-20T16:00:00Z') }, '2025-10-20T18:00:00Z', [], [], 409],
    ['anterior a la resolución', { id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-20T14:00:00Z', [], [], 400],
    ['futuro', { id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-23T14:00:00Z', [], [], 400],
    ['con correctiva abierta', { id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-20T18:00:00Z', [], [{ creadaEn: new Date('2025-10-20T16:00:00Z'), cerradaEn: null }], 409],
    ['antes del último hito', { id: 31, version: 5, resueltaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-20T16:00:00Z', [{ fechaEfectiva: new Date('2025-10-20T17:00:00Z') }], [], 409],
  ] as const)('rechaza cierre %s', async (_label, caso, cerradaEn, retrabajos, correctivas, statusCode) => {
    const tx = txAction(caso);
    tx.retrabajoGerencial.findMany.mockResolvedValue([...retrabajos]);
    tx.correctivaGerencial.findMany.mockResolvedValue([...correctivas]);
    await expect(cerrarCaso(tx as unknown as Prisma.TransactionClient, 31, { version: 5, cerradaEn }, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });

  it('registra retrabajo sin orden o con una orden válida', async () => {
    const opened = new Date('2025-10-20T15:00:00Z');
    const tx = txAction({ id: 31, referencia: 'CAS-31', clienteId: 4, version: 5, abiertaEn: opened, cerradaEn: null });
    const result = await crearRetrabajo(tx as unknown as Prisma.TransactionClient, 31, { referenciaTrabajo: 'OT-10', fechaEfectiva: '2025-10-20T16:00:00Z', motivo: 'Ajustar' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result).toMatchObject({ referenciaTrabajo: 'OT-10', ordenId: null, registradoEn: '2025-10-20T16:01:00.000Z' });
    const withOrder = txAction({ id: 31, referencia: 'CAS-31', clienteId: 4, version: 5, abiertaEn: opened, cerradaEn: null });
    await crearRetrabajo(withOrder as unknown as Prisma.TransactionClient, 31, { referenciaTrabajo: 'OT-11', fechaEfectiva: '2025-10-20T16:00:00Z', motivo: 'Ajustar', ordenId: 13 }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(withOrder.ordenTrabajo.findUnique).toHaveBeenCalled();
  });

  it.each([
    ['inexistente', null, '2025-10-20T16:00:00Z', 404],
    ['cerrado', { id: 31, referencia: 'CAS-31', clienteId: 4, version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: new Date('2025-10-21T00:00:00Z') }, '2025-10-20T16:00:00Z', 409],
    ['versión máxima', { id: 31, referencia: 'CAS-31', clienteId: 4, version: 2_147_483_647, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-20T16:00:00Z', 409],
    ['antes de apertura', { id: 31, referencia: 'CAS-31', clienteId: 4, version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-20T14:00:00Z', 400],
    ['en el futuro', { id: 31, referencia: 'CAS-31', clienteId: 4, version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, '2025-10-23T14:00:00Z', 400],
  ] as const)('rechaza retrabajo %s', async (_label, caso, fechaEfectiva, statusCode) => {
    const tx = txAction(caso);
    await expect(crearRetrabajo(tx as unknown as Prisma.TransactionClient, 31, { referenciaTrabajo: 'OT-10', fechaEfectiva, motivo: 'Ajustar' }, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });

  it('crea correctiva con un responsable activo y devuelve su nombre', async () => {
    const tx = txAction({ id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null });
    const result = await crearCorrectiva(tx as unknown as Prisma.TransactionClient, 31, { descripcion: 'Cambiar sello', responsableId: 6, creadaEn: '2025-10-20T16:00:00Z', venceEn: '2025-10-21T16:00:00Z' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result).toMatchObject({ casoReferencia: 'CAS-31', responsableNombre: 'Luz Paz', cerradaEn: null, resultado: null });
    expect(tx.auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accion: 'REGISTRAR_CORRECTIVA' }) }));
  });

  it.each([
    ['inexistente', null, { id: 6, active: true }, '2025-10-20T16:00:00Z', '2025-10-21T16:00:00Z', 404],
    ['caso cerrado', { id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: new Date('2025-10-21T00:00:00Z') }, { id: 6, active: true }, '2025-10-20T16:00:00Z', '2025-10-21T16:00:00Z', 409],
    ['versión máxima', { id: 31, referencia: 'CAS-31', version: 2_147_483_647, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, { id: 6, active: true }, '2025-10-20T16:00:00Z', '2025-10-21T16:00:00Z', 409],
    ['creación anterior a apertura', { id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, { id: 6, active: true }, '2025-10-20T14:00:00Z', '2025-10-21T16:00:00Z', 400],
    ['vencimiento previo a creación', { id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, { id: 6, active: true }, '2025-10-20T16:00:00Z', '2025-10-20T15:00:00Z', 400],
    ['responsable inexistente', { id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, null, '2025-10-20T16:00:00Z', '2025-10-21T16:00:00Z', 404],
    ['responsable inactivo', { id: 31, referencia: 'CAS-31', version: 5, abiertaEn: new Date('2025-10-20T15:00:00Z'), cerradaEn: null }, { id: 6, active: false }, '2025-10-20T16:00:00Z', '2025-10-21T16:00:00Z', 400],
  ] as const)('rechaza acción correctiva: %s', async (_label, caso, empleado, creadaEn, venceEn, statusCode) => {
    const tx = txAction(caso);
    tx.empleado.findUnique.mockResolvedValue(empleado);
    await expect(crearCorrectiva(tx as unknown as Prisma.TransactionClient, 31, { descripcion: 'Cambiar sello', responsableId: 6, creadaEn, venceEn }, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });

  it('cierra una correctiva, incrementa versión y conserva el responsable', async () => {
    const tx = txAction(null);
    const result = await cerrarCorrectiva(tx as unknown as Prisma.TransactionClient, 9, { version: 1, cerradaEn: '2025-10-21T17:00:00Z', resultado: 'Verificada' }, 7, new Date('2025-10-22T00:00:00Z'));
    expect(result).toMatchObject({ casoReferencia: 'CAS-31', responsableNombre: 'Luz Paz', resultado: 'Verificada', version: 2 });
    expect(tx.auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entidad: 'CorrectivaGerencial', accion: 'CERRAR' }) }));
  });

  it.each([
    ['inexistente', null, { version: 1, cerradaEn: '2025-10-21T17:00:00Z', resultado: 'Verificada' }, 404],
    ['versión obsoleta', { id: 9, version: 2, cerradaEn: null, creadaEn: new Date('2025-10-20T16:00:00Z'), caso: { referencia: 'CAS-31' } }, { version: 1, cerradaEn: '2025-10-21T17:00:00Z', resultado: 'Verificada' }, 409],
    ['ya cerrada', { id: 9, version: 1, cerradaEn: new Date('2025-10-21T16:00:00Z'), creadaEn: new Date('2025-10-20T16:00:00Z'), caso: { referencia: 'CAS-31' } }, { version: 1, cerradaEn: '2025-10-21T17:00:00Z', resultado: 'Verificada' }, 409],
    ['antes de creación', { id: 9, version: 1, cerradaEn: null, creadaEn: new Date('2025-10-20T16:00:00Z'), caso: { referencia: 'CAS-31' } }, { version: 1, cerradaEn: '2025-10-20T15:00:00Z', resultado: 'Verificada' }, 400],
    ['en el futuro', { id: 9, version: 1, cerradaEn: null, creadaEn: new Date('2025-10-20T16:00:00Z'), caso: { referencia: 'CAS-31' } }, { version: 1, cerradaEn: '2025-10-23T15:00:00Z', resultado: 'Verificada' }, 400],
  ] as const)('rechaza cierre de correctiva: %s', async (_label, rowValue, payload, statusCode) => {
    const tx = txAction(null);
    tx.correctivaGerencial.findUnique.mockResolvedValue(rowValue);
    await expect(cerrarCorrectiva(tx as unknown as Prisma.TransactionClient, 9, payload, 7, new Date('2025-10-22T00:00:00Z'))).rejects.toMatchObject<AppError>({ statusCode });
  });
});
