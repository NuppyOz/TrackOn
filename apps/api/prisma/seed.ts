import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('Falta DATABASE_URL en el entorno de la API');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter});

const roles = [
    {
        cod: 'ADMIN',
        nombre: 'Administrador',
        descripcion: 'Administra usuarios y la configuración del sistema',
    },
    {
        cod: 'GTE_OPE',
        nombre: 'Gerente Operativo',
        descripcion: 'Programa y asigna órdenes, revisa trabajos y aprueba cierres',
    },
    {
        cod: 'TEC',
        nombre: 'Técnico',
        descripcion: 'Ejecuta órdenes, identifica equipos y registra evidencias',
    },
];

const estados = [
        { codigo: 'BORRADOR', nombre: 'Borrador' },
        { codigo: 'PENDIENTE', nombre: 'Pendiente' },
        { codigo: 'ASIGNADA', nombre: 'Asignada' },
        { codigo: 'EN_EJECUCION', nombre: 'En ejecución' },
        { codigo: 'EN_REVISION', nombre: 'En revisión' },
        { codigo: 'CERRADA', nombre: 'Cerrada' },
        { codigo: 'CANCELADA', nombre: 'Cancelada' },
    ];

async function main() {
    // 1. Registrar o actualizar los roles
    await prisma.$transaction(
       roles.map((rol) =>
        prisma.rol.upsert({
            where: { cod: rol.cod },
            update: {
                nombre: rol.nombre,
                descripcion: rol.descripcion,
            },
            create: rol,
        }),
        ),
    )

     // 2. Registrar o actualizar los estados.
    await prisma.$transaction(
        estados.map((estado) =>
            prisma.estadoOrden.upsert({
                where: { codigo: estado.codigo },
                update: {
                    nombre: estado.nombre,
                },
                create: estado,
            }),
        ),
    );

    console.log('Seed completado: los tres roles iniciales están registrados.')
}

main()
    .catch((error: unknown) => {
        console.error('No se pudo completar el seed:', error);
        process.exitCode = 1;
    })
    .finally(async () =>{
        await prisma.$disconnect();
    })