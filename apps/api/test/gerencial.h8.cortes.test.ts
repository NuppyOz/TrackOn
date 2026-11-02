import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let f: Awaited<ReturnType<typeof crearFixtureComercial>>;
const raiz = '/api/fuentes-gerenciales/calidad';
const fecha = (dia: number, anio = 2012) => `${anio}-01-${String(dia).padStart(2, '0')}T00:00:00Z`;
const post = (ruta: string, body: object) => request(app).post(raiz + ruta).set('Authorization', `Bearer ${f.tokens.ADMIN}`).set('Idempotency-Key', randomUUID()).send(body);
const caso = async (id: number) => (await request(app).get(`${raiz}/casos/${id}`).set('Authorization', `Bearer ${f.tokens.ADMIN}`)).body.data;
beforeAll(async () => { f = await crearFixtureComercial('H8-CORTE'); });
afterAll(async () => {
    if (f) {
        const propios = { autorId: { in: f.usuarios } };
        await prisma.retrabajoGerencial.deleteMany({ where: propios });
        await prisma.correctivaGerencial.deleteMany({ where: propios });
        const casos = await prisma.casoCalidadGerencial.findMany({ where: propios, orderBy: { id: 'desc' }, select: { id: true } });
        for (const registro of casos) await prisma.casoCalidadGerencial.delete({ where: { id: registro.id } });
        await prisma.garantiaGerencial.deleteMany({ where: propios });
        const ubicaciones = await prisma.ubicacion.findMany({ where: { clienteId: { in: f.clientes } }, select: { id: true } });
        const ubicacionIds = ubicaciones.map(u => u.id);
        await prisma.ordenEquipo.deleteMany({ where: { orden: { ubicacionId: { in: ubicacionIds } } } });
        await prisma.ordenTrabajo.deleteMany({ where: { ubicacionId: { in: ubicacionIds } } });
        await prisma.equipo.deleteMany({ where: { ubicacionId: { in: ubicacionIds } } });
        await prisma.ubicacion.deleteMany({ where: { id: { in: ubicacionIds } } });
        await prisma.estadoOrden.deleteMany({ where: { codigo: f.prefijo } });
        await limpiarFixtureComercial(f);
    }
    await prisma.$disconnect();
});
it('conserva historia de calidad, evalúa SLA separados y evita cierres anteriores a dependencias', async () => {
    const activoReferencia = `${f.prefijo}-ACTIVO`;
    const garantia = await post('/garantias', { referencia: f.prefijo, clienteId: f.clientes[0], tipo: 'SERVICIO', activoReferencia, inicio: fecha(1), fin: fecha(30), cobertura: 'Trabajo documentado de prueba' });
    expect(garantia.status).toBe(201);
    const base = { clienteId: f.clientes[0], activoReferencia, codigoFalla: 'FALLA-1', descripcion: 'Incidencia documentada de prueba', garantiaId: garantia.body.data.id };
    const primera = await post('/casos', { ...base, referencia: f.prefijo + '-1', abiertaEn: fecha(1), respuestaLimiteEn: fecha(2), resolucionLimiteEn: fecha(4) });
    expect(primera.status).toBe(201);
    const id = primera.body.data.id;
    const respuesta = await post(`/casos/${id}/responder`, { version: primera.body.data.version, respondidaEn: fecha(3) });
    expect(respuesta.status).toBe(200);
    expect((await post(`/casos/${id}/resolver`, { version: respuesta.body.data.version, resueltaEn: fecha(5), resultado: 'PROCEDE', causaRaiz: 'Causa identificada y documentada' })).status).toBe(200);
    const correctiva = await post(`/casos/${id}/correctivas`, { descripcion: 'Corregir la causa documentada', responsableId: f.empleados[0], creadaEn: fecha(6), venceEn: fecha(8) });
    expect(correctiva.status).toBe(201);
    expect((await post(`/casos/${id}/retrabajos`, { referenciaTrabajo: f.prefijo + '-TRABAJO', fechaEfectiva: fecha(7), motivo: 'Trabajo correctivo realizado y documentado' })).status).toBe(201);
    let actual = await caso(id);
    expect((await post(`/casos/${id}/cerrar`, { version: actual.version, cerradaEn: fecha(10) })).status).toBe(409);
    expect((await post(`/correctivas/${correctiva.body.data.id}/cerrar`, { version: correctiva.body.data.version, cerradaEn: fecha(12), resultado: 'Acción verificada' })).status).toBe(200);
    actual = await caso(id);
    const retroactivo = await post(`/casos/${id}/cerrar`, { version: actual.version, cerradaEn: fecha(10) });
    expect([400, 409]).toContain(retroactivo.status);
    expect((await post(`/casos/${id}/cerrar`, { version: actual.version, cerradaEn: fecha(15) })).status).toBe(200);
    expect((await post(`/casos/${id}/retrabajos`, { referenciaTrabajo: f.prefijo + '-TARDE', fechaEfectiva: fecha(16), motivo: 'No puede agregar trabajo al caso cerrado' })).status).toBe(409);
    const otro = { ...base, referencia: f.prefijo + '-INVALIDO', abiertaEn: fecha(6), anteriorId: id };
    expect((await post('/casos', { ...otro, activoReferencia: activoReferencia + '-DISTINTO', garantiaId: undefined })).status).toBe(400);
    const segunda = await post('/casos', { ...base, referencia: f.prefijo + '-2', abiertaEn: fecha(6), anteriorId: id, respuestaLimiteEn: fecha(7), resolucionLimiteEn: fecha(9) });
    expect(segunda.status).toBe(201);
    const id2 = segunda.body.data.id;
    const respuesta2 = await post(`/casos/${id2}/responder`, { version: segunda.body.data.version, respondidaEn: fecha(6) });
    expect(respuesta2.status).toBe(200);
    const resuelta2 = await post(`/casos/${id2}/resolver`, { version: respuesta2.body.data.version, resueltaEn: fecha(8), resultado: 'NO_PROCEDE', causaRaiz: 'Evaluación explícita fuera de garantía' });
    expect(resuelta2.status).toBe(200);
    expect((await post(`/casos/${id2}/cerrar`, { version: resuelta2.body.data.version, cerradaEn: fecha(8) })).status).toBe(200);
    expect((await post('/casos', { clienteId: f.clientes[0], referencia: f.prefijo + '-SIN-PLAZOS', activoReferencia: activoReferencia + '-B', codigoFalla: 'OTRA', descripcion: 'Caso sin plazos documentados', abiertaEn: fecha(10) })).status).toBe(201);
    const consultar = async (desde: number, hasta: number) => {
        const resultado = await request(app).get('/api/inteligencia/calidad').query({ desde: fecha(desde), hasta: fecha(hasta) }).set('Authorization', `Bearer ${f.tokens.ADMIN}`);
        expect(resultado.status).toBe(200);
        return resultado.body.data;
    };
    const antes = await consultar(1, 11);
    const metricas = Object.fromEntries(antes.metricas.map((m: { clave: string; valor: unknown }) => [m.clave, m.valor]));
    expect(metricas).toMatchObject({ garantias_vigentes: 1, reclamos_abiertos: 2, reincidencias: 1, retrabajos: 1, fallas_repetidas_grupos: 1, sla_respuesta_porcentaje: '50.00', sla_resolucion_porcentaje: '50.00', correctivas_abiertas: 1, correctivas_vencidas: 1 });
    expect(antes.registrosSinAsignar).toBe(1);
    expect(antes.metricas.find((m: { clave: string }) => m.clave === 'sla_respuesta_porcentaje').base).toEqual({ numerador: 1, denominador: 2 });
    expect(antes.desgloses.find((d: { tipo: string; id: number }) => d.tipo === 'CASO' && d.id === id).estadoAlCorte).toBe('RESUELTO');
    const despues = await consultar(11, 20);
    expect(despues.metricas.find((m: { clave: string }) => m.clave === 'reclamos_abiertos').valor).toBe(1);
    expect(despues.metricas.find((m: { clave: string }) => m.clave === 'correctivas_abiertas').valor).toBe(0);
    expect(despues.metricas.find((m: { clave: string }) => m.clave === 'sla_respuesta_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO', base: { numerador: 0, denominador: 0 } });
});
it('crear correctiva y cerrar el caso en paralelo no deja un caso cerrado con acciones abiertas', async () => {
    const creada = await post('/casos', { clienteId: f.clientes[0], referencia: f.prefijo + '-CARRERA', activoReferencia: f.prefijo + '-CARRERA', codigoFalla: 'PRUEBA', descripcion: 'Prueba de cierre concurrente', abiertaEn: fecha(1, 2013) });
    expect(creada.status).toBe(201);
    const id = creada.body.data.id;
    const respondida = await post(`/casos/${id}/responder`, { version: creada.body.data.version, respondidaEn: fecha(2, 2013) });
    expect(respondida.status).toBe(200);
    const resuelta = await post(`/casos/${id}/resolver`, { version: respondida.body.data.version, resueltaEn: fecha(3, 2013), resultado: 'PROCEDE', causaRaiz: 'Prueba de concurrencia' });
    expect(resuelta.status).toBe(200);
    const [accion, cierre] = await Promise.all([
        post(`/casos/${id}/correctivas`, { descripcion: 'Acción concurrente', responsableId: f.empleados[0], creadaEn: fecha(4, 2013), venceEn: fecha(6, 2013) }),
        post(`/casos/${id}/cerrar`, { version: resuelta.body.data.version, cerradaEn: fecha(5, 2013) }),
    ]);
    expect([accion.status, cierre.status].filter(status => status === 409)).toHaveLength(1);
    expect([accion.status, cierre.status].filter(status => status >= 200 && status < 300)).toHaveLength(1);
    const actual = await caso(id);
    if (actual.cerradaEn) expect(actual.correctivas.filter((c: { cerradaEn: string | null }) => c.cerradaEn === null)).toHaveLength(0);
    else expect(actual.correctivas.some((c: { cerradaEn: string | null }) => c.cerradaEn === null)).toBe(true);
});

it('permite una OT de atención distinta del origen y rechaza equipos ajenos a la garantía o a la OT', async () => {
    const ubicacion = await prisma.ubicacion.create({ data: { clienteId: f.clientes[0], nombre: 'Sitio de prueba', direccion: 'Dirección sintética' } });
    const equipo = await prisma.equipo.create({ data: { ubicacionId: ubicacion.id, codigo: f.prefijo + '-E1', tipo: 'Prueba' } });
    const otroEquipo = await prisma.equipo.create({ data: { ubicacionId: ubicacion.id, codigo: f.prefijo + '-E2', tipo: 'Prueba' } });
    await prisma.estadoOrden.create({ data: { codigo: f.prefijo, nombre: 'Estado aislado de prueba' } });
    const ordenes = [];
    for (const equipoId of [equipo.id, equipo.id, otroEquipo.id]) {
        ordenes.push(await prisma.ordenTrabajo.create({ data: { ubicacionId: ubicacion.id, estadoCodigo: f.prefijo, creadaPorId: f.usuarios[0], solicitud: 'Prueba de referencias', clienteNombreRegistrado: 'Cliente sintético', ubicacionNombreRegistrado: 'Sitio', direccionRegistrada: 'Dirección sintética', equipos: { create: { equipoId } } } }));
    }
    const base = { clienteId: f.clientes[0], activoReferencia: f.prefijo + '-ACTIVO-OT' };
    const garantia = await post('/garantias', { ...base, referencia: f.prefijo + '-GAR-OT', tipo: 'SERVICIO', equipoId: equipo.id, ordenId: ordenes[0].id, inicio: fecha(1, 2014), fin: fecha(30, 2014), cobertura: 'Origen distinto de atención' });
    expect(garantia.status).toBe(201);
    const entrada = { ...base, garantiaId: garantia.body.data.id, referencia: f.prefijo + '-CASO-OT', codigoFalla: 'PRUEBA', descripcion: 'Reclamo atendido en otra orden', abiertaEn: fecha(2, 2014) };
    const valida = await post('/casos', { ...entrada, ordenId: ordenes[1].id });
    expect(valida.status).toBe(201);
    expect(valida.body.data.equipoId).toBeNull(); // Validar equipo efectivo no inventa persistencia.
    expect((await post('/casos', { ...entrada, referencia: f.prefijo + '-EQUIPO-INVALIDO', equipoId: otroEquipo.id })).status).toBe(400);
    expect((await post('/casos', { ...entrada, referencia: f.prefijo + '-OT-INVALIDA', ordenId: ordenes[2].id })).status).toBe(400);
});
it('protege todos los registros de calidad y el tablero con permisos administrativos', async () => {
    for (const ruta of [`${raiz}/garantias`, `${raiz}/casos`, `${raiz}/correctivas`, '/api/inteligencia/calidad?desde=2012-01-01T00:00:00Z&hasta=2012-01-11T00:00:00Z']) {
        expect((await request(app).get(ruta)).status).toBe(401);
        expect((await request(app).get(ruta).set('Authorization', `Bearer ${f.tokens.TEC}`)).status).toBe(403);
    }
});
