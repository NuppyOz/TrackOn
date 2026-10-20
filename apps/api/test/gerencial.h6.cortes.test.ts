import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let f: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
let facturableId: number;
const date = (dia: string) => new Date(`${dia}T00:00:00Z`);
beforeAll(async () => {
    f = await crearFixtureComercial('H6-CORTE');
    conceptoId = (await prisma.conceptoComercial.create({ data: { codigo: f.prefijo, nombre: 'Servicio histórico H6', tipo: 'SERVICIO', unidad: 'hora' } })).id;
    const doc = await prisma.comprobanteGerencial.create({ data: { clienteId: f.clientes[0]!, referencia: f.prefijo, emisor: 'PRUEBA', emitidaEn: date('2002-12-30'), venceEn: date('2003-01-03'), importeFinal: '100.00', autorId: f.usuarios[0]!, anuladaEn: date('2003-01-21'), motivoAnulacion: 'Corrección posterior', version: 2, lineas: { create: { descripcion: 'Servicio realizado', importe: '100.00', conceptoId } } }, include: { lineas: true } });
    await prisma.cobroGerencial.create({ data: { clienteId: f.clientes[0]!, referencia: f.prefijo, fechaEfectiva: date('2003-01-05'), importe: '40.00', autorId: f.usuarios[0]!, revertidoEn: date('2003-01-20'), motivoReversion: 'Corrección posterior', version: 2, aplicaciones: { create: { comprobanteId: doc.id, importe: '40.00' } } } });
    await prisma.costoGerencial.create({ data: { referencia: f.prefijo, fechaEfectiva: date('2003-01-06'), categoria: 'MATERIAL', importe: '30.00', clienteId: f.clientes[0]!, comprobanteId: doc.id, autorId: f.usuarios[0]!, revertidoEn: date('2003-01-20'), motivoReversion: 'Corrección posterior', version: 2 } });
    facturableId = (await prisma.facturableGerencial.create({ data: { clienteId: f.clientes[0]!, conceptoId, referencia: f.prefijo, fechaEfectiva: date('2002-12-31'), cantidad: '1.500', unidad: 'hora', autorId: f.usuarios[0]!, aplicaciones: { create: { lineaComprobanteId: doc.lineas[0]!.id, cantidad: '0.500', fechaEfectiva: date('2003-01-08'), autorId: f.usuarios[0]! } } } })).id;
});
afterAll(async () => {
    if (f) {
        const propios = { autorId: { in: f.usuarios } };
        await prisma.aplicacionFacturableGerencial.deleteMany({ where: { facturable: propios } });
        await prisma.facturableGerencial.deleteMany({ where: propios });
        await prisma.aplicacionCobroGerencial.deleteMany({ where: { cobro: propios } });
        await prisma.cobroGerencial.deleteMany({ where: propios });
        await prisma.costoGerencial.deleteMany({ where: propios });
        await prisma.lineaComprobanteGerencial.deleteMany({ where: { comprobante: propios } });
        await prisma.comprobanteGerencial.deleteMany({ where: propios });
        if (conceptoId) await prisma.conceptoComercial.delete({ where: { id: conceptoId } });
        await limpiarFixtureComercial(f);
    }
    await prisma.$disconnect();
});
it('H6 calcula saldos históricos, flujos del período y pendientes antes y después de reversos', async () => {
    const consultar = async (desde: string, hasta: string) => {
        const response = await request(app).get('/api/inteligencia/financiero').query({ desde: `${desde}T00:00:00Z`, hasta: `${hasta}T00:00:00Z` }).set('Authorization', `Bearer ${f.tokens.ADMIN}`);
        expect(response.status).toBe(200);
        const tablero = response.body.data;
        const metricas = Object.fromEntries(tablero.metricas.map((m: { clave: string; valor: unknown }) => [m.clave, m.valor]));
        const pendiente = tablero.desgloses.find((r: { tipo: string; id: number }) => r.tipo === 'FACTURABLE' && r.id === facturableId)?.pendiente;
        return { metricas, pendiente };
    };
    const antes = await consultar('2003-01-01', '2003-01-15');
    expect(antes.metricas).toMatchObject({ facturacion: '0.00', cobros: '40.00', cuentas_por_cobrar: '60.00', cuentas_vencidas: '60.00', costos: '30.00', resultado_registrado: '-30.00', margen_porcentaje: null });
    expect(antes.pendiente).toBe('1.000');
    const amplio = await consultar('2002-12-01', '2003-01-15');
    expect(amplio.metricas).toMatchObject({ facturacion: '100.00', costos: '30.00', resultado_registrado: '70.00', margen_porcentaje: '70.00' });
    const despues = await consultar('2003-01-16', '2003-02-01');
    expect(despues.metricas).toMatchObject({ facturacion: '-100.00', cobros: '-40.00', cuentas_por_cobrar: '0.00', costos: '-30.00', resultado_registrado: '-70.00', margen_porcentaje: null });
    expect(despues.pendiente).toBe('1.500');
});
