import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import type { Prisma } from '@prisma/client';
import * as repository from './tarifas.repository.js';
import type { ActualizarConcepto, CambiarEstadoTarifa, CrearConcepto, CrearTarifa, ListarConceptos, ListarTarifas } from './tarifas.schema.js';

const MAX_PRECIO_CENTAVOS = 9_999_999_999_999_999n;

function codigoPrisma(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;
}

function traducirError(error: unknown, contexto: 'concepto' | 'tarifa'): never {
    const code = codigoPrisma(error);
    if (code === 'P2002') {
        throw new AppError(409, contexto === 'concepto'
            ? 'Ya existe un concepto con ese código.'
            : 'Ya existe una tarifa activa para ese concepto y cliente. Desactívala antes de reemplazarla.');
    }
    if (code === 'P2003') throw new AppError(400, 'Una referencia del registro ya no existe.');
    if (code === 'P2025') throw new AppError(404, contexto === 'concepto' ? 'El concepto no existe.' : 'La tarifa no existe.');
    throw error;
}

function normalizarPrecio(valor: string): string {
    if (typeof valor !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(valor)) {
        throw new AppError(400, 'El precio debe ser decimal no negativo con hasta dos decimales.');
    }
    const [entero, fraccion = ''] = valor.split('.');
    const centavos = BigInt(entero) * 100n + BigInt((fraccion + '00').slice(0, 2));
    if (centavos > MAX_PRECIO_CENTAVOS) throw new AppError(400, 'El precio supera el máximo permitido.');
    return `${(centavos / 100n).toString()}.${(centavos % 100n).toString().padStart(2, '0')}`;
}

function paginar<T>(rows: T[], filtros: { pagina: number; limite: number }) {
    const hayMas = rows.length > filtros.limite;
    return { items: rows.slice(0, filtros.limite), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function listarConceptos(filtros: ListarConceptos) {
    return paginar(await repository.listarConceptos(filtros), filtros);
}

export async function crearConcepto(datos: CrearConcepto) {
    if (datos.servicioId != null && !await prisma.servicio.findUnique({ where: { id: datos.servicioId }, select: { id: true } })) {
        throw new AppError(404, 'El servicio de referencia no existe.');
    }
    if (datos.materialId != null && !await prisma.material.findUnique({ where: { id: datos.materialId }, select: { id: true } })) {
        throw new AppError(404, 'El material de referencia no existe.');
    }
    try {
        return await repository.crearConcepto(datos);
    } catch (error) {
        traducirError(error, 'concepto');
    }
}

export async function actualizarConcepto(id: number, datos: ActualizarConcepto) {
    try {
        const resultado = await repository.actualizarConcepto(id, datos);
        if (resultado.tipo === 'no-encontrado') throw new AppError(404, 'El concepto no existe.');
        if (resultado.tipo === 'conflicto') throw new AppError(409, 'El concepto cambió. Actualiza los datos antes de volver a guardar.');
        if (!resultado.concepto) throw new AppError(404, 'El concepto no existe.');
        return resultado.concepto;
    } catch (error) {
        if (error instanceof AppError) throw error;
        traducirError(error, 'concepto');
    }
}

export async function listarTarifas(filtros: ListarTarifas) {
    const rows = await repository.listarTarifas(filtros);
    return paginar(rows.map(row => ({ ...row, precio: normalizarPrecio(row.precio.toString()) })), filtros);
}

export async function crearTarifa(datos: CrearTarifa) {
    const precio = normalizarPrecio(datos.precio);
    const concepto = await prisma.conceptoComercial.findUnique({ where: { id: datos.conceptoId }, select: { id: true, activo: true } });
    if (!concepto) throw new AppError(404, 'El concepto no existe.');
    if (!concepto.activo) throw new AppError(409, 'No se pueden crear tarifas para un concepto inactivo.');
    if (datos.clienteId != null) {
        const cliente = await repository.obtenerCliente(datos.clienteId);
        if (!cliente) throw new AppError(404, 'El cliente no existe.');
        if (!cliente.activo) throw new AppError(409, 'No se pueden crear tarifas para un cliente inactivo.');
    }
    try {
        const tarifa = await repository.crearTarifa({ ...datos, moneda: 'NIO', precio });
        return { ...tarifa, precio: normalizarPrecio(tarifa.precio.toString()) };
    } catch (error) {
        traducirError(error, 'tarifa');
    }
}

export async function cambiarEstadoTarifa(id: number, datos: CambiarEstadoTarifa) {
    try {
        const resultado = await repository.cambiarEstadoTarifa(id, datos);
        if (resultado.tipo === 'no-encontrado') throw new AppError(404, 'La tarifa no existe.');
        if (resultado.tipo === 'conflicto') throw new AppError(409, 'La tarifa cambió. Actualiza los datos antes de volver a guardar.');
        if (!resultado.tarifa) throw new AppError(404, 'La tarifa no existe.');
        return { ...resultado.tarifa, precio: normalizarPrecio(resultado.tarifa.precio.toString()) };
    } catch (error) {
        if (error instanceof AppError) throw error;
        traducirError(error, 'tarifa');
    }
}

export interface TarifaResuelta {
    tarifaId: number;
    conceptoId: number;
    clienteIdSolicitado: number;
    origen: 'CLIENTE' | 'ESTANDAR';
    moneda: 'NIO';
    precio: string;
    concepto: { id: number; codigo: string; nombre: string; unidad: string; tipo: string };
}

/** Resuelve el precio cliente primero y luego el estándar; acepta TransactionClient para conservar atomicidad del consumidor. */
export async function resolverTarifa(clienteId: number, conceptoId: number, tx?: Prisma.TransactionClient): Promise<TarifaResuelta> {
    const cliente = await repository.obtenerCliente(clienteId, tx);
    if (!cliente) throw new AppError(404, 'El cliente no existe.');
    if (!cliente.activo) throw new AppError(409, 'El cliente está inactivo.');
    const concepto = await repository.obtenerConceptoResolver(conceptoId, tx);
    if (!concepto) throw new AppError(404, 'El concepto no existe.');
    if (!concepto.activo) throw new AppError(409, 'El concepto está inactivo.');
    const tarifa = await repository.buscarTarifaCliente(conceptoId, clienteId, tx)
        ?? await repository.buscarTarifaEstándar(conceptoId, tx);
    if (!tarifa) throw new AppError(404, 'No hay una tarifa activa para este concepto y cliente.');
    return {
        tarifaId: tarifa.id,
        conceptoId,
        clienteIdSolicitado: clienteId,
        origen: tarifa.clienteId === null ? 'ESTANDAR' : 'CLIENTE',
        moneda: 'NIO',
        precio: normalizarPrecio(tarifa.precio.toString()),
        concepto: { id: concepto.id, codigo: concepto.codigo, nombre: concepto.nombre, unidad: concepto.unidad, tipo: concepto.tipo },
    };
}

export async function resolverTarifaHttp(clienteId: number, conceptoId: number) {
    const { concepto: _concepto, ...respuesta } = await resolverTarifa(clienteId, conceptoId);
    return respuesta;
}
