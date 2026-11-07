import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
beforeAll(async () => { fixture = await crearFixtureComercial('INSIGHT'); });
afterAll(async () => {
  await prisma.reporteGenerado.deleteMany({ where: { usuarioId: { in: fixture.usuarios } } });
  await limpiarFixtureComercial(fixture);
  await prisma.$disconnect();
});

describe('reportes de Insights', () => {
  it('restringe el acceso y conserva historial y CSV con datos persistidos', async () => {
    expect((await request(app).get('/api/insights/reportes')).status).toBe(401);
    expect((await request(app).get('/api/insights/reportes').set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
    const auth = `Bearer ${fixture.tokens.ADMIN}`;
    const created = await request(app).post('/api/insights/reportes').set('Authorization', auth).send({ tipo: 'CLIENTES' });
    expect(created.status).toBe(201);
    expect(created.body.data.filas).toBeGreaterThanOrEqual(2);
    const id = created.body.data.id as number;
    const history = await request(app).get('/api/insights/reportes?pagina=1').set('Authorization', auth);
    expect(history.status).toBe(200);
    expect(history.body.data.items.some((item: { id: number }) => item.id === id)).toBe(true);
    const file = await request(app).get(`/api/insights/reportes/${id}/archivo`).set('Authorization', auth);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toContain('text/csv');
    expect(file.text).toContain(fixture.prefijo);
    expect((await request(app).get('/api/insights/reportes/99999999/archivo').set('Authorization', auth)).status).toBe(404);
  });

  it.each([
    ['OPORTUNIDADES', 'Oportunidad'], ['COTIZACIONES', 'Vigencia'],
    ['VENTAS', 'Total confirmado'], ['ORDENES', 'Solicitud'],
    ['ASIGNACIONES', 'Cuadrilla'], ['EVIDENCIAS', 'Estado de carga'],
    ['CAMBIOS_ESTADO', 'Estado nuevo'],
  ] as const)('genera CSV de %s a partir de su entidad persistida', async (tipo, encabezado) => {
    const auth = `Bearer ${fixture.tokens.ADMIN}`;
    const generated = await request(app).post('/api/insights/reportes').set('Authorization', auth).send({ tipo });
    expect(generated.status).toBe(201);
    const file = await request(app).get(`/api/insights/reportes/${generated.body.data.id}/archivo`).set('Authorization', auth);
    expect(file.status).toBe(200);
    expect(file.text).toContain(encabezado);
  });
});
