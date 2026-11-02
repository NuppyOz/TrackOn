import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/AppError.js';
import { explicarIndicadores, LimiteConcurrenciaAsistente } from '../src/modules/inteligencia/asistente/asistente.service.js';

const input = { area: 'calidad' as const, desde: '2026-01-01T00:00:00Z', hasta: '2026-02-01T00:00:00Z' };
const tablero = {
  desde: '2026-01-01T00:00:00.000Z', hasta: '2026-02-01T00:00:00.000Z', corteEvaluacion: '2026-01-20T00:00:00.000Z',
  cobertura: { estado: 'COMPLETA', desde: '2025-01-01T00:00:00.000Z', hastaVerificada: '2026-01-20T00:00:00.000Z', observaciones: ['private'] },
  metricas: [{ clave: 'garantias_vigentes', valor: 3, unidad: 'cantidad', estado: 'CALCULADO', fuentes: ['garantias_gerenciales'], motivo: null }],
  desgloses: [{ clienteNombre: 'private' }],
};

describe('servicio y concurrencia del asistente', () => {
  it('sin key responde 503 sin consultar el tablero ni el proveedor', async () => {
    const obtenerTablero = vi.fn(async () => tablero);
    const generarTexto = vi.fn(async () => 'nunca');
    await expect(explicarIndicadores(input, { apiKey: '', obtenerTablero, generarTexto })).rejects.toMatchObject<AppError>({ statusCode: 503 });
    expect(obtenerTablero).not.toHaveBeenCalled();
    expect(generarTexto).not.toHaveBeenCalled();
  });

  it('obtiene métricas del servidor, retorna hash/rango y no expone configuración', async () => {
    const obtenerTablero = vi.fn(async (area: string, rango: { desde: string; hasta: string }) => {
      expect(area).toBe('calidad');
      expect(rango).toEqual({ desde: input.desde, hasta: input.hasta });
      return tablero;
    });
    const generarTexto = vi.fn(async () => 'Tres garantías vigentes al corte.');
    const result = await explicarIndicadores(input, { apiKey: 'server-key-only', model: 'test-model', obtenerTablero, generarTexto, reloj: () => new Date('2026-02-01T12:30:00Z') });
    expect(result).toMatchObject({ texto: 'Tres garantías vigentes al corte.', area: 'calidad', corte: '2026-01-20T00:00:00.000Z', generadaEn: '2026-02-01T12:30:00.000Z', fuentes: ['garantias_gerenciales'] });
    expect(result.snapshotId).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toMatch(/server-key-only|private|observaciones/);
    expect(generarTexto).toHaveBeenCalledOnce();
  });

  it('limita a una petición por usuario y dos globales, y libera cuotas al terminar', () => {
    const limite = new LimiteConcurrenciaAsistente();
    expect(limite.adquirir(1)).toBe(true);
    expect(limite.adquirir(1)).toBe(false);
    expect(limite.adquirir(2)).toBe(true);
    expect(limite.adquirir(3)).toBe(false);
    limite.liberar(1);
    expect(limite.adquirir(3)).toBe(true);
    limite.liberar(2);
    limite.liberar(3);
    expect(limite.estado()).toEqual({ activas: 0, usuarios: 0 });
  });
});
