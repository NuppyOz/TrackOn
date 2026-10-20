import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { AppError } from '../errors/AppError.js';

export type ActorOperacion = Readonly<{ tipo: 'USUARIO' | 'PORTAL'; id: number }>;

export function claveIdempotencia(valor: unknown): string {
    if (typeof valor !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,99}$/.test(valor)) {
        throw new AppError(400, 'Se requiere una Idempotency-Key válida de 16 a 100 caracteres.');
    }
    return valor;
}

function ordenar(valor: unknown): unknown {
    if (Array.isArray(valor)) return valor.map(ordenar);
    if (valor !== null && typeof valor === 'object') {
        return Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, ordenar(v)]));
    }
    return valor;
}

/** El callback devuelve un DTO JSON, sin BigInt ni credenciales. Reserva y negocio son atómicos. */
export async function ejecutarIdempotente<T>(
    actor: ActorOperacion,
    operacion: string,
    clave: string,
    payload: unknown,
    ejecutar: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    claveIdempotencia(clave);
    if (!Number.isSafeInteger(actor.id) || actor.id < 1 || !['USUARIO', 'PORTAL'].includes(actor.tipo)) {
        throw new AppError(401, 'Se requiere un actor autenticado.');
    }
    if (!operacion || operacion.length > 100) throw new Error('Operación de idempotencia inválida.');
    const datosCanonicos = ordenar(JSON.parse(JSON.stringify(payload)));
    const payloadHash = createHash('sha256').update(JSON.stringify(datosCanonicos)).digest('hex');
    const where = { tipoActor_actorId_operacion_clave: { tipoActor: actor.tipo, actorId: actor.id, operacion, clave } };
    function recuperar(registro: { payloadHash: string; resultado: Prisma.JsonValue }): T {
        if (registro.payloadHash !== payloadHash) throw new AppError(409, 'Esta clave de operación ya se utilizó con datos diferentes.');
        return registro.resultado as T;
    }
    const previa = await prisma.operacionIdempotente.findUnique({ where });
    if (previa) return recuperar(previa);
    try {
        return await prisma.$transaction(async tx => {
            const reserva = await tx.operacionIdempotente.create({ data: {
                tipoActor: actor.tipo, actorId: actor.id, operacion, clave, payloadHash, resultado: {},
            } });
            const dto = JSON.parse(JSON.stringify(await ejecutar(tx))) as T;
            await tx.operacionIdempotente.update({ where: { id: reserva.id }, data: {
                resultado: dto === null ? Prisma.JsonNull : dto as Prisma.InputJsonValue,
            } });
            return dto;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
            const completada = await prisma.operacionIdempotente.findUnique({ where });
            if (completada) return recuperar(completada);
        }
        throw error;
    }
}
