import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === 'production') {
    throw new Error('Este comando no puede ejecutarse con NODE_ENV=production.');
}

if (!connectionString) {
    throw new Error('Falta DATABASE_URL en el entorno.');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

async function prepararCliente(datos: {
    codigo: string;
    razonSocial: string;
    nombreComercial: string;
    identificacionTributaria: string;
    telefono: string;
    correo: string;
    ubicaciones: Array<{ nombre: string; direccion: string; referencia: string }>;
}) {
    const organizacion = await prisma.organizacion.upsert({
        where: { identificacionTributaria: datos.identificacionTributaria },
        update: {
            razonSocial: datos.razonSocial,
            nombreComercial: datos.nombreComercial,
        },
        create: {
            razonSocial: datos.razonSocial,
            nombreComercial: datos.nombreComercial,
            identificacionTributaria: datos.identificacionTributaria,
        },
    });

    const cliente = await prisma.cliente.upsert({
        where: { codigo: datos.codigo },
        update: {
            organizacionId: organizacion.id,
            telefonoComercial: datos.telefono,
            correoComercial: datos.correo,
            activo: true,
        },
        create: {
            codigo: datos.codigo,
            organizacionId: organizacion.id,
            telefonoComercial: datos.telefono,
            correoComercial: datos.correo,
        },
    });

    const ubicaciones = [];
    for (const ubicacionDatos of datos.ubicaciones) {
        const existente = await prisma.ubicacion.findFirst({
            where: { clienteId: cliente.id, nombre: ubicacionDatos.nombre },
        });
        const ubicacion = existente
            ? await prisma.ubicacion.update({
                where: { id: existente.id },
                data: { ...ubicacionDatos, activa: true },
            })
            : await prisma.ubicacion.create({
                data: { clienteId: cliente.id, ...ubicacionDatos },
            });
        ubicaciones.push(ubicacion);
    }

    return ubicaciones;
}

async function prepararEmpleado(datos: {
    codEmpleado: string;
    firstName: string;
    firstLastName: string;
    telefono: string;
}) {
    const existente = await prisma.empleado.findUnique({
        where: { codEmpleado: datos.codEmpleado },
    });

    if (existente) {
        await prisma.persona.update({
            where: { id: existente.personaId },
            data: {
                firstName: datos.firstName,
                firstLastName: datos.firstLastName,
                telephone: datos.telefono,
            },
        });
        return prisma.empleado.update({
            where: { id: existente.id },
            data: { active: true, habilitadoComoTecnico: true },
        });
    }

    return prisma.empleado.create({
        data: {
            codEmpleado: datos.codEmpleado,
            active: true,
            habilitadoComoTecnico: true,
            persona: {
                create: {
                    firstName: datos.firstName,
                    firstLastName: datos.firstLastName,
                    telephone: datos.telefono,
                },
            },
        },
    });
}

async function prepararCuadrilla(nombre: string, empleados: number[], liderId: number) {
    const cuadrilla = await prisma.cuadrilla.upsert({
        where: { nombre },
        update: { activa: true },
        create: { nombre },
    });

    for (const empleadoId of empleados) {
        const membresia = await prisma.miembroCuadrilla.findFirst({
            where: { cuadrillaId: cuadrilla.id, empleadoId, fin: null },
        });
        if (!membresia) {
            await prisma.miembroCuadrilla.create({
                data: { cuadrillaId: cuadrilla.id, empleadoId },
            });
        }
    }

    await prisma.miembroCuadrilla.updateMany({
        where: { cuadrillaId: cuadrilla.id, fin: null },
        data: { esLider: false },
    });
    await prisma.miembroCuadrilla.updateMany({
        where: { cuadrillaId: cuadrilla.id, empleadoId: liderId, fin: null },
        data: { esLider: true },
    });
}

async function main() {
    const ubicacionesFrioCentro = await prepararCliente({
        codigo: 'CLI-001',
        razonSocial: 'Frío Centro Nicaragua S.A.',
        nombreComercial: 'FríoCentro',
        identificacionTributaria: 'J0310000000012',
        telefono: '2255-0101',
        correo: 'operaciones@friocentro.example',
        ubicaciones: [
            { nombre: 'Planta Managua', direccion: 'Carretera Norte, km 7', referencia: 'Portón azul, bodega 3' },
            { nombre: 'Sucursal Masaya', direccion: 'Avenida San Jerónimo, Masaya', referencia: 'Contiguo al mercado de artesanías' },
        ],
    });
    const ubicacionesHotel = await prepararCliente({
        codigo: 'CLI-002',
        razonSocial: 'Inversiones Las Palmas S.A.',
        nombreComercial: 'Hotel Las Palmas',
        identificacionTributaria: 'J0310000000029',
        telefono: '2278-4400',
        correo: 'mantenimiento@laspalmas.example',
        ubicaciones: [
            { nombre: 'Hotel Las Palmas', direccion: 'Residencial Las Colinas, Managua', referencia: 'Entrada principal, preguntar por mantenimiento' },
        ],
    });

    const equipos = [
        { codigo: 'EQ-AC-001', ubicacionId: ubicacionesFrioCentro[0].id, tipo: 'Aire acondicionado', marca: 'Carrier', modelo: '42QHC', numeroSerie: 'CAR-2026-001', activo: true },
        { codigo: 'EQ-CF-002', ubicacionId: ubicacionesFrioCentro[0].id, tipo: 'Cuarto frío', marca: 'Danfoss', modelo: 'Optyma Plus', numeroSerie: 'DAN-88421', activo: true },
        { codigo: 'EQ-REF-003', ubicacionId: ubicacionesFrioCentro[1].id, tipo: 'Refrigerador comercial', marca: 'True', modelo: 'T-49', numeroSerie: 'TRU-49073', activo: true },
        { codigo: 'EQ-AC-004', ubicacionId: ubicacionesHotel[0].id, tipo: 'Aire acondicionado', marca: 'LG', modelo: 'Dual Inverter', numeroSerie: 'LG-AC-7781', activo: true },
        { codigo: 'EQ-HIE-005', ubicacionId: ubicacionesHotel[0].id, tipo: 'Máquina de hielo', marca: 'Manitowoc', modelo: 'Indigo NXT', numeroSerie: 'MAN-IC-2109', activo: true },
        { codigo: 'EQ-AC-006', ubicacionId: ubicacionesHotel[0].id, tipo: 'Aire acondicionado', marca: 'Samsung', modelo: 'WindFree', numeroSerie: 'SAM-OLD-015', activo: false },
    ];
    for (const equipo of equipos) {
        await prisma.equipo.upsert({
            where: { codigo: equipo.codigo },
            update: equipo,
            create: equipo,
        });
    }

    const servicios = [
        { codigo: 'SRV-MP', nombre: 'Mantenimiento preventivo', descripcion: 'Limpieza, inspección y ajuste general del equipo.' },
        { codigo: 'SRV-DIAG', nombre: 'Diagnóstico técnico', descripcion: 'Evaluación de fallas y recomendación de reparación.' },
        { codigo: 'SRV-GAS', nombre: 'Carga de refrigerante', descripcion: 'Revisión de fugas y carga del refrigerante indicado.' },
        { codigo: 'SRV-COMP', nombre: 'Cambio de compresor', descripcion: 'Retiro e instalación de compresor compatible.' },
        { codigo: 'SRV-ELEC', nombre: 'Reparación eléctrica', descripcion: 'Diagnóstico y reparación de controles y cableado.' },
        { codigo: 'SRV-INST', nombre: 'Instalación de equipo', descripcion: 'Montaje, conexión y puesta en marcha.' },
    ];
    for (const servicio of servicios) {
        await prisma.servicio.upsert({
            where: { codigo: servicio.codigo },
            update: { ...servicio, activo: true },
            create: servicio,
        });
    }

    const carlos = await prepararEmpleado({ codEmpleado: 'TEC-001', firstName: 'Carlos', firstLastName: 'Méndez', telefono: '8888-1001' });
    const ana = await prepararEmpleado({ codEmpleado: 'TEC-002', firstName: 'Ana', firstLastName: 'López', telefono: '8888-1002' });
    const jose = await prepararEmpleado({ codEmpleado: 'TEC-003', firstName: 'José', firstLastName: 'Rivera', telefono: '8888-1003' });
    await prepararCuadrilla('Cuadrilla Managua', [carlos.id, ana.id], carlos.id);
    await prepararCuadrilla('Emergencias y guardias', [jose.id], jose.id);

    console.log('Datos de ejemplo listos: 2 clientes, 3 ubicaciones, 6 equipos, 6 servicios y 2 cuadrillas.');
}

main()
    .catch((error: unknown) => {
        console.error('No se pudieron preparar los datos de ejemplo:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
