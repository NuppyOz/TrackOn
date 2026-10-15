import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prisma } from '../src/infrastructure/prisma.js';
import { app } from '../src/app.js';
import { hashPassword } from '../src/security/password.js';

const prefijo = `FLOW-${randomUUID().slice(0, 8)}`;
const password = 'TrackOn-test-password-2026';
const tokens: Record<string, string> = {};
const usuarios: Record<string, number> = {};
let ubicacionId: number;
let equipoId: number;
let cuadrillaId: number;
let almacenamiento: string;

beforeAll(async () => {
    almacenamiento = await mkdtemp(join(tmpdir(), 'trackon-evidencias-test-'));
    process.env.EVIDENCE_STORAGE_DIR = almacenamiento;
    for (const codigo of ['BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA', 'CANCELADA']) {
        await prisma.estadoOrden.upsert({ where: { codigo }, create: { codigo, nombre: codigo }, update: {} });
    }
    const passwordHash = await hashPassword(password);
    for (const [nombre, rolCod] of [['admin', 'ADMIN'], ['gerente', 'GTE_OPE'], ['tecnico', 'TEC'], ['otro', 'TEC']]) {
        const rol = await prisma.rol.upsert({ where: { cod: rolCod! }, create: { cod: rolCod!, nombre: rolCod! }, update: {} });
        const usuario = await prisma.usuario.create({ data: {
            identificador: `${prefijo}-${nombre}`.toLowerCase(), passwordHash, rol: { connect: { id: rol.id } },
            empleado: { create: { codEmpleado: `${prefijo}-${nombre}`, habilitadoComoTecnico: true, persona: { create: { firstName: 'Prueba', firstLastName: nombre! } } } },
        } });
        usuarios[nombre!] = usuario.id;
        const login = await request(app).post('/api/auth/login').send({ identificador: usuario.identificador, password });
        expect(login.status).toBe(200); tokens[nombre!] = login.body.data.accessToken;
        if (nombre === 'tecnico') {
            const cuadrilla = await prisma.cuadrilla.create({ data: { nombre: prefijo, miembros: { create: { empleadoId: usuario.empleadoId, esLider: true } } } });
            cuadrillaId = cuadrilla.id;
        }
    }
    const cliente = await prisma.cliente.create({ data: { codigo: prefijo, persona: { create: { firstName: 'Cliente', firstLastName: 'Operativo' } } } });
    const ubicacion = await prisma.ubicacion.create({ data: { clienteId: cliente.id, nombre: 'Sede operativa', direccion: 'Managua' } });
    ubicacionId = ubicacion.id;
    const equipo = await prisma.equipo.create({ data: { codigo: prefijo, ubicacionId, tipo: 'Aire acondicionado', marca: 'Marca original' } });
    equipoId = equipo.id;
});
afterAll(async () => {
    delete process.env.EVIDENCE_STORAGE_DIR;
    if (almacenamiento) await rm(almacenamiento, { recursive: true, force: true });
    await prisma.$disconnect();
});

const auth = (actor = 'admin') => `Bearer ${tokens[actor]}`;

describe('Flujo operativo real de TrackOn', () => {
    it('edita datos con control de versión, permisos y notificaciones sin cambiar el estado', async () => {
        const nueva = await request(app).post('/api/ordenes').set('Authorization', auth()).send({ ubicacionId, solicitud: 'Orden para probar edición concisa' });
        expect(nueva.status).toBe(201);
        const id = nueva.body.data.id;
        const version = nueva.body.data.version;
        const base = `/api/ordenes/${id}`;
        expect((await request(app).patch(base).set('Authorization', auth('tecnico')).send({ version, prioridad: 'ALTA' })).status).toBe(403);
        expect((await request(app).patch(base).set('Authorization', auth()).send({ version, ubicacionId: 999 })).status).toBe(400);
        const editada = await request(app).patch(base).set('Authorization', auth()).send({ version, prioridad: 'ALTA', fechaProgramada: '2026-10-20T16:00:00Z' });
        expect(editada.status).toBe(200);
        expect(editada.body.data).toMatchObject({ estadoCodigo: 'PENDIENTE', version: version + 1, solicitud: nueva.body.data.solicitud, clienteNombreRegistrado: nueva.body.data.clienteNombreRegistrado });
        expect((await request(app).patch(base).set('Authorization', auth()).send({ version, solicitud: 'Otra modificación desactualizada' })).status).toBe(409);
        const auditoria = await prisma.auditoria.findFirstOrThrow({ where: { entidad: 'ORDEN_TRABAJO', entidadId: String(id), accion: 'ACTUALIZAR' } });
        expect(auditoria.usuarioId).toBe(usuarios.admin);
        expect(auditoria.datosNuevos).toMatchObject({ prioridad: 'ALTA', solicitud: nueva.body.data.solicitud });
        const cuenta = await prisma.notificacion.count({ where: { ordenId: id } });
        expect(await prisma.notificacion.count({ where: { ordenId: id, usuarioId: usuarios.gerente, tipo: 'ACTUALIZACION_ORDEN' } })).toBe(1);
        const repetida = await request(app).patch(base).set('Authorization', auth()).send({ version: editada.body.data.version, prioridad: 'ALTA' });
        expect(repetida.status).toBe(200);
        expect(repetida.body.data.version).toBe(editada.body.data.version);
        expect(await prisma.notificacion.count({ where: { ordenId: id } })).toBe(cuenta);
        expect(await prisma.notificacion.count({ where: { ordenId: id, usuarioId: usuarios.admin } })).toBe(0);
        const bandeja = await request(app).get('/api/notificaciones').set('Authorization', auth('gerente'));
        const aviso = bandeja.body.data.items.find((item: { ordenId: number }) => item.ordenId === id);
        expect(aviso).toBeTruthy();
        expect((await request(app).patch(`/api/notificaciones/${aviso.id}/leida`).set('Authorization', auth('tecnico'))).status).toBe(404);
        expect((await request(app).patch(`/api/notificaciones/${aviso.id}/leida`).set('Authorization', auth('gerente'))).status).toBe(200);
        const leida = await prisma.notificacion.findUniqueOrThrow({ where: { id: aviso.id } });
        expect(leida.leidaEn).not.toBeNull();
        const cancelada = await request(app).patch(`${base}/estado`).set('Authorization', auth()).send({ estado: 'CANCELADA', motivo: 'Termina la prueba de edición' });
        expect(cancelada.status).toBe(200);
        expect((await request(app).patch(base).set('Authorization', auth()).send({ version: cancelada.body.data.version, prioridad: 'URGENTE' })).status).toBe(409);
    });
    it('evita que dos ediciones simultáneas sobrescriban datos', async () => {
        const nueva = await request(app).post('/api/ordenes').set('Authorization', auth()).send({ ubicacionId, solicitud: 'Prueba de edición simultánea' });
        const base = `/api/ordenes/${nueva.body.data.id}`;
        const respuestas = await Promise.all(['ALTA', 'URGENTE'].map(prioridad => request(app).patch(base).set('Authorization', auth()).send({ version: nueva.body.data.version, prioridad })));
        expect(respuestas.map(respuesta => respuesta.status).sort()).toEqual([200, 409]);
        expect((await request(app).get(base).set('Authorization', auth())).body.data.version).toBe(nueva.body.data.version + 1);
    });
    it('integra asignación, trabajo, evidencias, revisión, cierre, snapshots y notificaciones', async () => {
        const material = await request(app).post('/api/materiales').set('Authorization', auth()).send({ codigo: prefijo, nombre: 'Refrigerante', unidadMedida: 'kg' });
        expect(material.status).toBe(201);
        expect((await request(app).post('/api/materiales').set('Authorization', auth('tecnico')).send({ codigo: 'NO', nombre: 'No permitido', unidadMedida: 'u' })).status).toBe(403);
        const servicio = await request(app).post('/api/servicios').set('Authorization', auth()).send({ codigo: prefijo, nombre: 'Mantenimiento original' });
        expect(servicio.status).toBe(201);
        const nueva = await request(app).post('/api/ordenes').set('Authorization', auth()).send({ ubicacionId, solicitud: 'Mantenimiento preventivo general', prioridad: 'URGENTE' });
        expect(nueva.status).toBe(201);
        const ordenId = nueva.body.data.id;
        const base = `/api/ordenes/${ordenId}`;
        const vinculada = await request(app).post(`${base}/equipos`).set('Authorization', auth()).send({ equipoId });
        expect(vinculada.status).toBe(201);
        const trabajo = `${base}/equipos/${vinculada.body.data.id}`;
        expect((await request(app).patch(`${trabajo}/diagnostico`).set('Authorization', auth()).send({ diagnostico: 'Falta refrigerante en el circuito' })).status).toBe(409);
        const asignada = await request(app).post(`${base}/asignacion`).set('Authorization', auth()).send({ cuadrillaId, motivo: 'Atención de mantenimiento' });
        expect(asignada.status).toBe(200);
        expect((await request(app).patch(`${base}/ejecucion`).set('Authorization', auth('otro')).send({ estado: 'EN_EJECUCION', motivo: 'Inicio no autorizado' })).status).toBe(403);
        expect((await request(app).patch(`${base}/ejecucion`).set('Authorization', auth('tecnico')).send({ estado: 'EN_EJECUCION', motivo: 'Inicio de trabajo' })).status).toBe(200);
        expect((await request(app).post(`${trabajo}/servicios`).set('Authorization', auth('otro')).send({ servicioId: servicio.body.data.id, cantidad: 1, descripcionTrabajo: 'Trabajo no autorizado' })).status).toBe(403);
        expect((await request(app).post(`${trabajo}/servicios`).set('Authorization', auth('tecnico')).send({ servicioId: servicio.body.data.id, cantidad: 1, descripcionTrabajo: 'Se realizó limpieza y carga de gas.' })).status).toBe(201);
        expect((await request(app).post(`${trabajo}/materiales`).set('Authorization', auth('tecnico')).send({ materialId: material.body.data.id, cantidad: 1.5 })).status).toBe(201);
        expect((await request(app).post(`${trabajo}/materiales`).set('Authorization', auth('tecnico')).send({ materialId: material.body.data.id, cantidad: 0 })).status).toBe(400);
        await request(app).patch(`/api/servicios/${servicio.body.data.id}`).set('Authorization', auth()).send({ nombre: 'Nombre actualizado' });
        const historicos = await request(app).get(`${trabajo}/trabajo`).set('Authorization', auth());
        expect(historicos.body.data.servicios[0].nombreRegistrado).toBe('Mantenimiento original');
        expect(Number(historicos.body.data.materiales[0].cantidad)).toBe(1.5);
        expect((await request(app).patch(`${base}/ejecucion`).set('Authorization', auth('tecnico')).send({ estado: 'EN_REVISION', motivo: 'Enviar revisión incompleta' })).status).toBe(409);
        await request(app).patch(`${trabajo}/diagnostico`).set('Authorization', auth('tecnico')).send({ diagnostico: 'Se detectó falta de refrigerante.', resultado: 'Equipo funcionando correctamente.' });
        const contenido = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
        const evidencia = await request(app).post(`${trabajo}/evidencias`).set('Authorization', auth('tecnico')).send({ nombreOriginal: 'trabajo.png', tipoArchivo: 'image/png', tamanoBytes: contenido.length, hashArchivo: createHash('sha256').update(contenido).digest('hex') });
        expect(evidencia.status).toBe(201);
        const rutaEvidencia = `${trabajo}/evidencias/${evidencia.body.data.id}`;
        expect((await request(app).put(`${rutaEvidencia}/archivo`).set('Authorization', auth('otro')).set('Content-Type', 'application/octet-stream').send(contenido)).status).toBe(403);
        expect((await request(app).put(`${rutaEvidencia}/archivo`).set('Authorization', auth('tecnico')).set('Content-Type', 'application/octet-stream').send(Buffer.from('incorrecto'))).status).toBe(400);
        const fallida = await request(app).get(`${trabajo}/evidencias`).set('Authorization', auth());
        expect(fallida.body.data[0].estadoCarga).toBe('FALLIDA');
        expect((await request(app).put(`${rutaEvidencia}/archivo`).set('Authorization', auth('tecnico')).set('Content-Type', 'application/octet-stream').send(contenido)).status).toBe(200);
        const descargada = await request(app).get(`${rutaEvidencia}/archivo`).set('Authorization', auth());
        expect(descargada.status).toBe(200); expect(descargada.body).toEqual(contenido);
        expect((await request(app).patch(`${base}/ejecucion`).set('Authorization', auth('tecnico')).send({ estado: 'EN_REVISION', motivo: 'Trabajo completo para revisión' })).status).toBe(200);
        expect((await request(app).post(`${trabajo}/materiales`).set('Authorization', auth('tecnico')).send({ materialId: material.body.data.id, cantidad: 1 })).status).toBe(409);
        expect((await request(app).patch(`${base}/estado`).set('Authorization', auth()).send({ estado: 'CERRADA', motivo: 'Cierre sin aprobar evidencia' })).status).toBe(409);
        expect((await request(app).post(`${rutaEvidencia}/revision`).set('Authorization', auth('tecnico')).send({ decision: 'ACEPTADA' })).status).toBe(403);
        expect((await request(app).post(`${rutaEvidencia}/revision`).set('Authorization', auth()).send({ decision: 'ACEPTADA' })).status).toBe(201);
        const cerrada = await request(app).patch(`${base}/estado`).set('Authorization', auth()).send({ estado: 'CERRADA', motivo: 'Trabajo revisado y aprobado' });
        expect(cerrada.status).toBe(200); expect(cerrada.body.data.cerradaEn).toBeTruthy();
        expect(cerrada.body.data.historial[0].estadoNuevo).toBe('CERRADA');
        expect(await prisma.asignacion.count({ where: { ordenId, fin: null } })).toBe(0);
        expect(await prisma.notificacion.count({ where: { ordenId, usuarioId: usuarios.tecnico } })).toBeGreaterThan(0);
        expect(await prisma.auditoria.count({ where: { entidad: 'ORDEN_TRABAJO', entidadId: String(ordenId) } })).toBeGreaterThan(0);
        const dashboard = await request(app).get('/api/dashboard/resumen').set('Authorization', auth());
        expect(dashboard.status).toBe(200); expect(dashboard.body.data.cerradasHoy).toBeGreaterThan(0);
        expect((await request(app).get('/api/dashboard/resumen').set('Authorization', auth('tecnico'))).status).toBe(403);
        const cambioAcceso = await request(app).patch(`/api/usuarios/${usuarios.otro}`).set('Authorization', auth()).send({ identificador: `${prefijo}-otro-editado`.toLowerCase() });
        expect(cambioAcceso.status).toBe(200);
        const auditoria = await prisma.auditoria.findFirstOrThrow({ where: { entidad: 'USUARIO', entidadId: String(usuarios.otro), accion: 'ACTUALIZAR' } });
        expect(auditoria.usuarioId).toBe(usuarios.admin);
        expect(Object.keys(auditoria.datosNuevos as object).sort()).toEqual(['activo', 'identificador', 'rolId']);
        expect((await request(app).get('/api/auditoria').set('Authorization', auth('tecnico'))).status).toBe(403);
    });
});
