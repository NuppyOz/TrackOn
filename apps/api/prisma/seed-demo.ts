import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

type Acceso = { identificador: string; password: string; rol: string };
const directorio = resolve(process.env.TRACKON_DEMO_OUTPUT ?? '../../.demo');
const archivo = resolve(directorio, 'accesos.json');

async function accesosPrevios(): Promise<Acceso[]> {
    try { return JSON.parse(await readFile(archivo, 'utf8')) as Acceso[]; }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
    }
}

async function crearAcceso(nombre: string, rol: string, accesos: Acceso[]) {
    const identificador = `demo.${nombre}`;
    const existente = await prisma.usuario.findUnique({ where: { identificador } });
    if (existente) return existente;
    const password = randomBytes(18).toString('base64url');
    const passwordHash = await hashPassword(password);
    const usuario = await prisma.usuario.create({ data: {
        identificador, passwordHash, rol: { connect: { cod: rol } },
        empleado: { create: {
            codEmpleado: `DEMO-${nombre.toUpperCase()}`, habilitadoComoTecnico: rol === 'TEC',
            persona: { create: { firstName: 'Demo', firstLastName: nombre } },
        } },
    } });
    accesos.push({ identificador, password, rol });
    await writeFile(archivo, JSON.stringify(accesos, null, 2), { mode: 0o600 });
    return usuario;
}

async function main() {
    if (process.env.TRACKON_ALLOW_DEMO_DATA !== 'true' || process.env.NODE_ENV === 'production') {
        throw new Error('Demo solo en desarrollo: NODE_ENV=development TRACKON_ALLOW_DEMO_DATA=true.');
    }
    await mkdir(directorio, { recursive: true, mode: 0o700 });
    const accesos = await accesosPrevios();
    const admin = await crearAcceso('admin', 'ADMIN', accesos);
    const gerente = await crearAcceso('gerente', 'GTE_OPE', accesos);
    const tecnico = await crearAcceso('tecnico', 'TEC', accesos);
    const cliente = await prisma.cliente.upsert({ where: { codigo: 'DEMO-CLIENTE' }, update: {}, create: {
        codigo: 'DEMO-CLIENTE', organizacion: { create: { razonSocial: 'DEMO Mercado del Frío' } },
        ubicaciones: { create: { nombre: 'DEMO Sucursal Managua', direccion: 'Managua, ubicación ficticia para pruebas', contactoNombre: 'Contacto demo' } },
    } });
    const ubicacion = await prisma.ubicacion.findFirstOrThrow({ where: { clienteId: cliente.id } });
    const equipo = await prisma.equipo.upsert({ where: { codigo: 'DEMO-EQUIPO' }, update: {}, create: {
        codigo: 'DEMO-EQUIPO', ubicacionId: ubicacion.id, tipo: 'Cámara fría', marca: 'Demo', modelo: 'CF-100', numeroSerie: 'DEMO-0001',
    } });
    const servicio = await prisma.servicio.upsert({ where: { codigo: 'DEMO-MANT' }, update: {}, create: {
        codigo: 'DEMO-MANT', nombre: 'DEMO Mantenimiento preventivo', descripcion: 'Limpieza, inspección y verificación de temperatura.',
    } });
    const material = await prisma.material.upsert({ where: { codigo: 'DEMO-REF' }, update: {}, create: {
        codigo: 'DEMO-REF', nombre: 'DEMO Refrigerante', unidadMedida: 'kg',
    } });
    const cuadrilla = await prisma.cuadrilla.upsert({ where: { nombre: 'DEMO Cuadrilla de refrigeración' }, update: {}, create: {
        nombre: 'DEMO Cuadrilla de refrigeración', miembros: { create: { empleadoId: tecnico.empleadoId, esLider: true } },
    } });
    const estados = ['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA'];
    for (const [indice, estado] of estados.entries()) {
        const solicitud = `[DEMO-${estado}] Mantenimiento de cámara fría para probar el flujo operativo.`;
        if (await prisma.ordenTrabajo.findFirst({ where: { solicitud }, select: { id: true } })) continue;
        await prisma.$transaction(async tx => {
            const instante = new Date();
            const completa = indice >= 3;
            const orden = await tx.ordenTrabajo.create({ data: {
                solicitud, estadoCodigo: estado, ubicacionId: ubicacion.id, creadaPorId: admin.id,
                prioridad: indice === 0 ? 'URGENTE' : 'MEDIA', fechaProgramada: new Date(Date.now() + indice * 3600000),
                creadaEn: instante, cerradaEn: estado === 'CERRADA' ? instante : null,
                clienteNombreRegistrado: 'DEMO Mercado del Frío', ubicacionNombreRegistrado: ubicacion.nombre, direccionRegistrada: ubicacion.direccion,
                equipos: { create: {
                    equipoId: equipo.id, tipoRegistrado: equipo.tipo, marcaRegistrada: equipo.marca, modeloRegistrado: equipo.modelo, serieRegistrada: equipo.numeroSerie,
                    diagnostico: completa ? 'Condensador con suciedad acumulada.' : null,
                    resultado: completa ? 'Temperatura estable después del mantenimiento.' : null,
                    ...(completa ? {
                        servicios: { create: { servicioId: servicio.id, nombreRegistrado: servicio.nombre, cantidad: 1, descripcionTrabajo: 'Limpieza de condensador y verificación de funcionamiento.' } },
                        materiales: { create: { materialId: material.id, nombreRegistrado: material.nombre, unidadRegistrada: material.unidadMedida, cantidad: 0.25 } },
                    } : {}),
                } },
                ...(indice > 0 ? { asignaciones: { create: { cuadrillaId: cuadrilla.id, asignadaPorId: admin.id, motivo: 'Asignación de demostración', inicio: instante, fin: estado === 'CERRADA' ? instante : null } } } : {}),
            } });
            let anterior: string | null = null;
            for (const nuevo of estados.slice(0, indice + 1)) {
                await tx.historialEstado.create({ data: { ordenId: orden.id, estadoAnterior: anterior, estadoNuevo: nuevo, cambiadoPorId: admin.id, motivo: 'Datos de demostración' } });
                anterior = nuevo;
            }
            await tx.notificacion.createMany({ data: [admin, gerente, tecnico].map(usuario => ({
                usuarioId: usuario.id, ordenId: orden.id, tipo: 'DEMO_ORDEN', mensaje: `[DEMO] OT-${orden.numero} en ${estado}. Abre esta notificación para inspeccionar la orden.`,
            })) });
            await tx.auditoria.create({ data: { tipoActor: 'SISTEMA', entidad: 'ORDEN_TRABAJO', entidadId: String(orden.id), accion: 'SEED_DEMO' } });
        });
    }
    console.log('Demo disponible: tres accesos, cinco órdenes, cuadrilla, cliente, equipo, servicio, material y notificaciones. Credenciales en el archivo local de accesos; no se imprimen.');
}

main().catch((error: unknown) => {
    const detalle = error as { name?: string; code?: string; meta?: { driverAdapterError?: { cause?: { originalCode?: string; kind?: string } } } };
    console.error('No se pudo cargar la demo. Comprueba catálogos, conexión y permisos del directorio local.', { tipo: detalle.name, codigo: detalle.code, causa: detalle.meta?.driverAdapterError?.cause?.originalCode, clase: detalle.meta?.driverAdapterError?.cause?.kind });
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
