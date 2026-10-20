import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ detalle: vi.fn(), actualizar: vi.fn(), listar: vi.fn() }));
vi.mock('../src/modules/comercial/cotizaciones/infrastructure/cotizaciones.repository.js', () => repo);
vi.mock('../src/infrastructure/idempotencia.js', () => ({ claveIdempotencia: (v: string) => v, ejecutarIdempotente: vi.fn() }));

import { actualizarCotizacion, listarCotizaciones, obtenerCotizacionPortal } from '../src/modules/comercial/cotizaciones/application/cotizaciones.service.js';

const base = (overrides: Record<string, unknown> = {}) => ({
  id: 9, clienteId: 3, clienteNombreRegistrado: 'Cliente Ejemplo', clienteIdentificacionRegistrada: 'J-123', contactoId: null,
  estado: 'BORRADOR', decisionOrigen: null, decisionComentario: null, moneda: 'NIO', subtotal: '0.00', descuento: '0.00', total: '0.00',
  venceEn: new Date('2026-11-01T00:00:00Z'), version: 2, creadaEn: new Date('2026-10-20T00:00:00Z'), actualizadaEn: new Date('2026-10-20T00:00:00Z'),
  enviadaEn: null, decididaEn: null, venta: null, nota: null, creadaPorId: 7, lineas: [], notas: [], ...overrides,
});

describe('BE06/BE07 cotizaciones application', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('PATCH sin lineas conserva la línea del caso de uso y normaliza importes en DTO', async () => {
    const row = base({ estado: 'BORRADOR', lineas: [{ id: 10, posicion: 1, conceptoId: 8, descripcion: 'Servicio', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.500', precio: '12.50', descuento: '0.50', subtotal: '18.75', total: '18.25' }] });
    repo.actualizar.mockResolvedValue({ tipo: 'actualizada', cotizacion: row });
    const dto = await actualizarCotizacion(9, { version: 2, nota: 'Ajuste' });
    expect(repo.actualizar).toHaveBeenCalledWith(9, { version: 2, nota: 'Ajuste' });
    expect(dto.lineas).toEqual([{ id: 10, posicion: 1, conceptoId: 8, descripcion: 'Servicio', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.500', precio: '12.50', descuento: '0.50', subtotal: '18.75', total: '18.25' }]);
    expect(dto.total).toBe('0.00');
    expect(dto.accionesPermitidas.editar).toBe(true);
  });

  it('lista filtra y ordena usando el reloj antes de proyectar acciones', async () => {
    const now = new Date();
    repo.listar.mockResolvedValue([base({ estado: 'ENVIADA', venceEn: new Date(now.getTime() + 60_000), venta: { id: 22 } })]);
    const page = await listarCotizaciones({ pagina: 1, limite: 10, sortBy: 'creadaEn', sortDir: 'desc' });
    expect(repo.listar).toHaveBeenCalledWith(expect.objectContaining({ limite: 10 }), expect.any(Date));
    expect(page.items[0]?.ventaId).toBe(22);
    expect(page.items[0]?.accionesPermitidas.convertirVenta).toBe(false);
  });

  it('proyección portal deniega borradores y elimina identificación, nota interna y contacto', async () => {
    repo.detalle.mockResolvedValueOnce(base());
    await expect(obtenerCotizacionPortal(3, 9)).rejects.toMatchObject({ statusCode: 404 });
    repo.detalle.mockResolvedValueOnce(base({ estado: 'ENVIADA', decisionComentario: 'interno', nota: 'privada', contactoId: 44,
      lineas: [{ id: 10, posicion: 1, conceptoId: 8, descripcion: 'Servicio', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1', precio: '12.50', descuento: '0.00', subtotal: '12.50', total: '12.50' }] }));
    const dto = await obtenerCotizacionPortal(3, 9);
    expect(dto).not.toHaveProperty('clienteIdentificacionRegistrada');
    expect(dto).not.toHaveProperty('nota');
    expect(dto).not.toHaveProperty('contactoId');
    expect(dto.decisionComentario).toBeNull();
  });
});
