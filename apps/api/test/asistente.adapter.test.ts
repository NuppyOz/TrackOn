import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/AppError.js';
import { deepSeekTimeoutMs, generarTextoDeepSeek, mensajeDeepSeekError, type DeepSeekFetch } from '../src/modules/inteligencia/asistente/deepseek.client.js';
import type { ProyeccionAsistente } from '../src/modules/inteligencia/asistente/asistente.proyeccion.js';

const proyeccion: ProyeccionAsistente = { area: 'comercial', desde: '2026-01-01T00:00:00.000Z', hasta: '2026-02-01T00:00:00.000Z', corte: '2026-01-20T00:00:00.000Z', cobertura: { estado: 'PARCIAL', desde: null, hastaVerificada: null }, metricas: [{ clave: 'ventas_importe', valor: '125.00', unidad: 'NIO', estado: 'CALCULADO' }] };
const respuesta = (content: unknown, init?: ResponseInit) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), init);

describe('adaptador DeepSeek', () => {
  it('envía HTTPS fijo, bearer sólo en header, sin streaming y con razonamiento desactivado', async () => {
    let recibido: { url: string; init: RequestInit } | undefined;
    const fetcher: DeepSeekFetch = async (url, init) => { recibido = { url: String(url), init: init! }; return respuesta('Ventas registradas en el período.'); };
    await expect(generarTextoDeepSeek(proyeccion, 'secreto-de-prueba', undefined, { fetcher })).resolves.toBe('Ventas registradas en el período.');
    expect(recibido?.url).toBe('https://api.deepseek.com/chat/completions');
    expect(recibido?.init.headers).toMatchObject({ Authorization: 'Bearer secreto-de-prueba', 'Content-Type': 'application/json' });
    const body = JSON.parse(String(recibido?.init.body)) as { model: string; stream: boolean; thinking: { type: string }; max_tokens: number; messages: { content: string }[] };
    expect(body).toMatchObject({ model: 'deepseek-flash', stream: false, thinking: { type: 'disabled' } });
    expect(body.max_tokens).toBeLessThanOrEqual(800);
    expect(JSON.stringify(body.messages)).not.toContain('secreto-de-prueba');
    expect((recibido?.init.signal as AbortSignal).aborted).toBe(false);
  });

  it('aplica timeout máximo de 15 segundos y oculta proveedor, JSON y errores de transporte', async () => {
    const timeoutSignal = vi.fn((_ms: number) => new AbortController().signal);
    const fetcher: DeepSeekFetch = async () => { throw new Error('secret provider payload'); };
    await expect(generarTextoDeepSeek(proyeccion, 'secret', undefined, { fetcher, timeoutSignal })).rejects.toMatchObject<AppError>({ statusCode: 503, message: mensajeDeepSeekError });
    expect(timeoutSignal).toHaveBeenCalledWith(15_000);
    expect(deepSeekTimeoutMs).toBe(15_000);
    await expect(generarTextoDeepSeek(proyeccion, 'secret', undefined, { fetcher: async () => new Response('{"vendor":"key=secret"', { status: 200 }) })).rejects.toMatchObject({ message: mensajeDeepSeekError });
    await expect(generarTextoDeepSeek(proyeccion, 'secret', undefined, { fetcher: async () => respuesta('x'.repeat(4_001)) })).rejects.toMatchObject({ message: mensajeDeepSeekError });
  });

  it('oculta respuestas HTTP 401/429 y corta respuestas sobredimensionadas', async () => {
    for (const status of [401, 429]) {
      await expect(generarTextoDeepSeek(proyeccion, 'secret', undefined, { fetcher: async () => new Response('provider key=secret detail', { status }) })).rejects.toMatchObject({ statusCode: 503, message: mensajeDeepSeekError });
    }
    const oversized = new Response('x'.repeat(40_000), { status: 200, headers: { 'content-type': 'application/json', 'content-length': '40000' } });
    await expect(generarTextoDeepSeek(proyeccion, 'secret', undefined, { fetcher: async () => oversized })).rejects.toMatchObject({ statusCode: 503, message: mensajeDeepSeekError });
  });
});
