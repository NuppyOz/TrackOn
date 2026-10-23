import type { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../infrastructure/idempotencia.js';
import * as repository from './ventas.repository.js';
import type { ListarVentas } from './ventas.schema.js';

const fechaIso = (fecha: Date) => fecha.toISOString();
function decimalFijo(valor: unknown, escala: 2 | 3): string {
    const [entero, fraccion = ''] = String(valor).split('.');
    return `${entero}.${(fraccion + '0'.repeat(escala)).slice(0, escala)}`;
}
function nombreActor(identificador: string, persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } | null) {
    if (!persona) return identificador;
    return [persona.firstName, persona.secondName, persona.firstLastName, persona.secondLastName].filter(Boolean).join(' ');
}

type VentaConCabecera = {
    id: number;
    cotizacionId: number;
    clienteId: number;
    moneda: string;
    total: unknown;
    confirmadaEn: Date;
    cotizacion: { clienteNombreRegistrado: string };
};
function cabeceraDto(venta: VentaConCabecera) {
    return {
        id: venta.id,
        cotizacionId: venta.cotizacionId,
        clienteId: venta.clienteId,
        clienteNombreRegistrado: venta.cotizacion.clienteNombreRegistrado,
        moneda: 'NIO' as const,
        total: decimalFijo(venta.total, 2),
        confirmadaEn: fechaIso(venta.confirmadaEn),
    };
}

function detalleDto(venta: repository.VentaDetalle | null) {
    if (!venta) throw new AppError(404, 'La venta no existe.');
    return {
        ...cabeceraDto(venta),
        confirmadaPor: { id: venta.confirmadaPor.id, nombre: nombreActor(venta.confirmadaPor.identificador, venta.confirmadaPor.empleado.persona) },
        lineas: venta.cotizacion.lineas.map(linea => ({
            id: linea.id,
            descripcion: linea.descripcion,
            tipo: linea.tipo,
            unidad: linea.unidad,
            cantidad: decimalFijo(linea.cantidad, 3),
            precio: decimalFijo(linea.precio, 2),
            descuento: decimalFijo(linea.descuento, 2),
            subtotal: decimalFijo(linea.subtotal, 2),
            total: decimalFijo(linea.total, 2),
        })),
    };
}

function codigoPrisma(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

async function convertirEnTransaccion(cotizacionId: number, version: number, usuarioId: number, tx: Prisma.TransactionClient) {
    const existente = await repository.buscarPorCotizacion(cotizacionId, tx);
    if (existente) return cabeceraDto(existente);

    const cotizacion = await repository.obtenerCotizacionParaVenta(cotizacionId, tx);
    if (!cotizacion) throw new AppError(404, 'La cotización no existe.');
    if (cotizacion.estado !== 'APROBADA') throw new AppError(409, 'Solo se puede convertir a venta una cotización aprobada.');
    if (cotizacion.version !== version) throw new AppError(409, 'La cotización cambió. Actualiza los datos antes de convertirla.');

    const venta = await repository.crearEn(tx, {
        cotizacionId,
        clienteId: cotizacion.clienteId,
        confirmadaPorId: usuarioId,
        moneda: cotizacion.moneda,
        total: decimalFijo(cotizacion.total, 2),
    });
    if (!venta) throw new AppError(409, 'No se pudo recuperar la venta confirmada.');
    return cabeceraDto(venta);
}

export async function convertirVenta(cotizacionId: number, version: number, usuarioId: number, clave: string) {
    const key = claveIdempotencia(clave);
    const payload = { cotizacionId, version };
    const ejecutar = () => ejecutarIdempotente({ tipo: 'USUARIO', id: usuarioId }, 'comercial.cotizaciones.convertirVenta', key, payload,
        tx => convertirEnTransaccion(cotizacionId, version, usuarioId, tx));
    try {
        return await ejecutar();
    } catch (error) {
        const code = codigoPrisma(error);
        if (code === 'P2002' || code === 'P2034') {
            const confirmada = await repository.buscarPorCotizacion(cotizacionId);
            if (confirmada) {
                try {
                    // Reintenta una sola vez dentro del helper para cachear también la clave concurrente.
                    return await ejecutar();
                } catch (retryError) {
                    if (codigoPrisma(retryError) === 'P2002' || codigoPrisma(retryError) === 'P2034') {
                        throw new AppError(409, 'La venta ya se confirmó durante otra operación. Reintenta con la misma clave.');
                    }
                    throw retryError;
                }
            }
            throw new AppError(409, 'La cotización cambió durante la conversión. Actualiza los datos e inténtalo nuevamente.');
        }
        if (code === 'P2003') throw new AppError(400, 'La cotización o el usuario ya no existe.');
        throw error;
    }
}

export async function listarVentas(filtros: ListarVentas) {
    const rows = await repository.listar(filtros);
    const hayMas = rows.length > filtros.limite;
    return {
        items: rows.slice(0, filtros.limite).map(row => cabeceraDto(row)),
        pagina: filtros.pagina,
        limite: filtros.limite,
        hayMas,
    };
}

export async function obtenerVenta(id: number) {
    return detalleDto(await repository.obtenerVenta(id));
}
