/*
Este archivo crea una instancia compartida de Prisma por proceso del servidor.
Los módulos podrán importarla para consultar la base de datos, sin crear conexiones
nuevas en cada petición.
*/

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('Falta DATABASE_URL en el entorno de la API');
}

const adapter = new PrismaPg({ 
    connectionString,
    connectionTimeoutMillis: 3000, // 30 segundos
});

export const prisma = new PrismaClient({ adapter });