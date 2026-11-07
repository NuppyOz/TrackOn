import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/security/password.js';

const connectionString = process.env.DATABASE_URL;
const adminPassword = process.env.DEV_ADMIN_PASSWORD;
const technicianPassword = process.env.DEV_TECH_PASSWORD;

if (process.env.NODE_ENV !== 'development') {
    throw new Error('Este comando solo puede ejecutarse con NODE_ENV=development.');
}

if (process.env.TRACKON_ENABLE_DEV_USER_SEED !== '1') {
    throw new Error('La semilla requiere TRACKON_ENABLE_DEV_USER_SEED=1 como confirmación explícita.');
}

if (!connectionString) {
    throw new Error('Falta DATABASE_URL en el entorno.');
}

let databaseHost: string;
try {
    databaseHost = new URL(connectionString).hostname.toLowerCase();
} catch {
    throw new Error('DATABASE_URL no es una URL válida.');
}

if (!['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
    throw new Error('La semilla solo puede conectarse a PostgreSQL local.');
}

for (const [name, value] of [['DEV_ADMIN_PASSWORD', adminPassword], ['DEV_TECH_PASSWORD', technicianPassword]] as const) {
    if (!value || value.length < 12 || value.length > 128) {
        throw new Error(`${name} debe tener entre 12 y 128 caracteres.`);
    }
}

if (adminPassword === technicianPassword) {
    throw new Error('Las contraseñas locales de administrador y técnico deben ser distintas.');
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
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { identificador: cuenta.identificador },
        select: { id: true },
    });

    if (usuarioExistente) return;

    const empleadoExistente = await prisma.empleado.findUnique({
        where: { codEmpleado: cuenta.codEmpleado },
        select: { id: true },
    });

    if (empleadoExistente) {
        throw new Error(`El código local ${cuenta.codEmpleado} ya pertenece a un empleado; no se modificó.`);
    }

    const rol = await prisma.rol.upsert({
        where: { cod: cuenta.rol.cod },
        update: {},
        create: cuenta.rol,
    });

    const empleado = await prisma.empleado.create({
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

    await prisma.usuario.create({
        data: {
            empleadoId: empleado.id,
            rolId: rol.id,
            passwordHash: await hashPassword(cuenta.rol.cod === 'ADMIN' ? adminPassword! : technicianPassword!),
            identificador: cuenta.identificador,
            activo: true,
        },
    });
}

async function main() {
    for (const cuenta of cuentas) {
        await prepararCuenta(cuenta);
    }

    console.log('Cuentas locales creadas si faltaban; las existentes no se modificaron.');
}

main()
    .catch((error: unknown) => {
        console.error('No se pudieron preparar los usuarios locales. Revisa NODE_ENV, la habilitación explícita y la conexión local.');
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
