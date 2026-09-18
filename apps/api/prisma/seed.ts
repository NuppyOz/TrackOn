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
]

async function main() {
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