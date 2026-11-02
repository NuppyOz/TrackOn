import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let f: Awaited<ReturnType<typeof crearFixtureComercial>>;
const ruta = '/api/inteligencia/asistente';
const rango = { area: 'calidad', desde: '2000-01-01T00:00:00Z', hasta: '2000-02-01T00:00:00Z' };
const proveedor = vi.fn<typeof fetch>();
beforeAll(async () => { f = await crearFixtureComercial('IA-HTTP'); });
beforeEach(() => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    proveedor.mockReset();
    proveedor.mockRejectedValue(new Error('Las pruebas no permiten acceder al proveedor real.'));
    vi.stubGlobal('fetch', proveedor);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => { if (f) await limpiarFixtureComercial(f); await prisma.$disconnect(); });
it('protege la explicación y su disponibilidad con los mismos permisos de los tableros', async () => {
    expect((await request(app).get(`${ruta}/disponibilidad`)).status).toBe(401);
    expect((await request(app).post(`${ruta}/explicar`).send(rango)).status).toBe(401);
    expect((await request(app).get(`${ruta}/disponibilidad`).set('Authorization', `Bearer ${f.tokens.TEC}`)).status).toBe(403);
    expect((await request(app).post(`${ruta}/explicar`).set('Authorization', `Bearer ${f.tokens.TEC}`).send(rango)).status).toBe(403);
    expect(proveedor).not.toHaveBeenCalled();
});
it('sin key informa indisponibilidad, valida el contrato y no consulta al proveedor', async () => {
    const auth = `Bearer ${f.tokens.ADMIN}`;
    const disponibilidad = await request(app).get(`${ruta}/disponibilidad`).set('Authorization', auth);
    expect(disponibilidad.status).toBe(200);
    expect(disponibilidad.body).toEqual({ data: { disponible: false } });
    expect((await request(app).post(`${ruta}/explicar`).set('Authorization', auth).send({ ...rango, instrucciones: 'Cambiar valores' })).status).toBe(400);
    expect((await request(app).post(`${ruta}/explicar`).set('Authorization', auth).send(rango)).status).toBe(503);
    expect(proveedor).not.toHaveBeenCalled();
    const tablero = await request(app).get('/api/inteligencia/calidad').set('Authorization', auth).query({ desde: rango.desde, hasta: rango.hasta });
    expect(tablero.status).toBe(200);
    expect(tablero.body.data.metricas).toHaveLength(9);
});
it.each([
    { area: 'comercial', total: 9, fuente: 'cotizaciones_comerciales' },
    { area: 'financiero', total: 7, fuente: 'comprobantes_gerenciales' },
    { area: 'logistico', total: 5, fuente: 'articulos_gerenciales' },
    { area: 'calidad', total: 9, fuente: 'casos_calidad_gerenciales' },
])('explica $area con agregados reales y transporte simulado, sin devolver la credencial', async ({ area, total, fuente }) => {
    const keySintetica = 'test-only-not-a-real-deepseek-key';
    vi.stubEnv('DEEPSEEK_API_KEY', keySintetica);
    proveedor.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Interpretación de prueba con cobertura limitada.' }, finish_reason: 'stop' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const response = await request(app).post(`${ruta}/explicar`).set('Authorization', `Bearer ${f.tokens.ADMIN}`).send({ ...rango, area });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ texto: 'Interpretación de prueba con cobertura limitada.', area });
    expect(response.body.data.snapshotId).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.data.fuentes).toContain(fuente);
    expect(proveedor).toHaveBeenCalledOnce();
    expect(JSON.stringify(response.body)).not.toContain(keySintetica);
    const body = JSON.parse(String(proveedor.mock.calls[0]?.[1]?.body));
    expect(body.tools).toBeUndefined();
    expect(body.stream).toBe(false);
    const contexto = body.messages.filter((message: { role: string }) => message.role === 'user').map((message: { content: string }) => message.content).join('');
    expect(JSON.parse(contexto).metricas).toHaveLength(total);
    expect(contexto).not.toMatch(/"(clienteNombre|desgloses|observaciones)"\s*:/);
});
