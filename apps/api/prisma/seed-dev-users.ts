import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/security/password.js';

const connectionString = process.env.DATABASE_URL;
const password = process.env.DEV_USERS_PASSWORD;

if (process.env.NODE_ENV === 'production') {
    throw new Error('Este comando no puede ejecutarse con NODE_ENV=production.');
}

if (!connectionString) {
    throw new Error('Falta DATABASE_URL en el entorno.');
}

if (!password || password.length < 12 || password.length > 128) {
    throw new Error('DEV_USERS_PASSWORD debe tener entre 12 y 128 caracteres.');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

interface DevUser {
    identificador: string;
    codEmpleado: string;
    firstName: string;
    firstLastName: string;
    rol: {
        cod: 'ADMIN' | 'TEC';
        nombre: string;
        descripcion: string;
    };
    habilitadoComoTecnico: boolean;
}

const cuentas: DevUser[] = [
    {
        identificador: 'administrador',
        codEmpleado: 'DEV-ADMIN',
        firstName: 'Administrador',
        firstLastName: 'Local',
        rol: {
            cod: 'ADMIN',
            nombre: 'Administrador',
            descripcion: 'Administra usuarios y la configuración del sistema',
        },
        habilitadoComoTecnico: false,
    },
    {
        identificador: 'tecnico',
        codEmpleado: 'DEV-TEC',
        firstName: 'Técnico',
        firstLastName: 'Local',
        rol: {
            cod: 'TEC',
            nombre: 'Técnico',
            descripcion: 'Ejecuta órdenes, identifica equipos y registra evidencias',
        },
        habilitadoComoTecnico: true,
    },
];

async function prepararCuenta(cuenta: DevUser) {
    const rol = await prisma.rol.upsert({
        where: { cod: cuenta.rol.cod },
        update: {
            nombre: cuenta.rol.nombre,
            descripcion: cuenta.rol.descripcion,
        },
        create: cuenta.rol,
    });

    let empleado = await prisma.empleado.findUnique({
        where: { codEmpleado: cuenta.codEmpleado },
    });

    if (!empleado) {
        empleado = await prisma.empleado.create({
            data: {
                codEmpleado: cuenta.codEmpleado,
                active: true,
                habilitadoComoTecnico: cuenta.habilitadoComoTecnico,
                persona: {
                    create: {
                        firstName: cuenta.firstName,
                        firstLastName: cuenta.firstLastName,
                    },
                },
            },
        });
    } else {
        empleado = await prisma.empleado.update({
            where: { id: empleado.id },
            data: {
                active: true,
                habilitadoComoTecnico: cuenta.habilitadoComoTecnico,
            },
        });
    }

    await prisma.usuario.upsert({
        where: { empleadoId: empleado.id },
        update: {
            identificador: cuenta.identificador,
            rolId: rol.id,
            passwordHash: await hashPassword(password),
            activo: true,
        },
        create: {
            empleadoId: empleado.id,
            rolId: rol.id,
            identificador: cuenta.identificador,
            passwordHash: await hashPassword(password),
            activo: true,
        },
    });
}

async function main() {
    for (const cuenta of cuentas) {
        await prepararCuenta(cuenta);
    }

    console.log(`Usuarios locales listos: ${cuentas.map((cuenta) => cuenta.identificador).join(', ')}`);
}

main()
    .catch((error: unknown) => {
        console.error('No se pudieron preparar los usuarios locales:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
