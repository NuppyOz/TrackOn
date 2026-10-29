import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';
import { calcularIndicadoresLogisticos, type ArticuloLogistico, type LineaCompraLogistico, type MovimientoLogistico, type PrestamoLogistico, type RecepcionLogistico } from './logistico.calculo.js';

type Rango = { desde: string; hasta: string };
const iso = (date: Date) => date.toISOString();
function nombreEmpleado(employee: { persona: { firstName: string | null; secondName: string | null; firstLastName: string | null; secondLastName: string | null } | null }, empleadoId: number) {
  const name = [employee.persona?.firstName, employee.persona?.secondName, employee.persona?.firstLastName, employee.persona?.secondLastName].filter(Boolean).join(' ');
  return name || `Empleado ${empleadoId}`;
}

export async function obtenerTablero(rango: Rango, reloj: () => Date = () => new Date()) {
  const validado = rangoQuerySchema.parse(rango);
  const desde = new Date(validado.desde), hasta = new Date(validado.hasta), ahora = reloj();
  if (desde >= hasta || hasta.getTime() - desde.getTime() > 366 * 86_400_000) throw new AppError(400, 'El rango debe ser creciente y no superar 366 días.');
  const corte = hasta < ahora ? hasta : ahora;
  const snapshot = await prisma.$transaction(async tx => {
    const [articulosDb, lineasDb, recepcionesDb, prestamosDb, coverage] = await Promise.all([
      tx.articuloGerencial.findMany({
        where: { movimientos: { some: { tipo: 'APERTURA', fechaEfectiva: { lt: corte } } } },
        select: { id: true, codigo: true, nombre: true, unidad: true, minimo: true, movimientos: {
          where: { fechaEfectiva: { lt: corte } }, orderBy: [{ fechaEfectiva: 'asc' }, { id: 'asc' }],
          select: { id: true, tipo: true, cantidad: true, valor: true, saldoCantidad: true, saldoValor: true, fechaEfectiva: true, origen: { select: { tipo: true } } },
        } }, orderBy: [{ codigo: 'asc' }, { id: 'asc' }],
      }),
      tx.lineaCompraGerencial.findMany({
        where: { compra: { fechaEfectiva: { lt: corte } } },
        select: { id: true, compraId: true, cantidad: true, cantidadCancelada: true, canceladaEn: true, prometidaEn: true,
          compra: { select: { id: true, referencia: true, proveedor: true, fechaEfectiva: true } },
          articulo: { select: { id: true, codigo: true, unidad: true } },
          recepciones: { where: { fechaEfectiva: { lt: corte } }, select: { cantidad: true, fechaEfectiva: true } },
        }, orderBy: [{ compra: { fechaEfectiva: 'asc' } }, { id: 'asc' }],
      }),
      tx.recepcionGerencial.findMany({
        where: { fechaEfectiva: { gte: desde, lt: corte } },
        select: { id: true, referencia: true, cantidad: true, fechaEfectiva: true, linea: { select: {
          prometidaEn: true, articulo: { select: { id: true, codigo: true, unidad: true } },
          compra: { select: { id: true, referencia: true, proveedor: true } },
        } } }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }],
      }),
      tx.prestamoHerramientaGerencial.findMany({
        where: { prestadaEn: { lt: corte } },
        select: { id: true, herramientaId: true, empleadoId: true, prestadaEn: true, previstaEn: true, devueltaEn: true,
          herramienta: { select: { codigo: true, nombre: true } },
          empleado: { select: { persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } },
        }, orderBy: [{ prestadaEn: 'desc' }, { id: 'desc' }],
      }),
      tx.coberturaGerencial.findUnique({ where: { area: 'LOGISTICO' }, select: { desde: true, hastaVerificada: true, observacion: true } }),
    ]);
    const articulos: ArticuloLogistico[] = articulosDb.map(row => ({
      id: row.id, codigo: row.codigo, nombre: row.nombre, unidad: row.unidad, minimo: row.minimo.toFixed(3),
      movimientos: row.movimientos.map((movement): MovimientoLogistico => ({ id: movement.id, tipo: movement.tipo, cantidad: movement.cantidad.toFixed(3), valor: movement.valor.toFixed(9), saldoCantidad: movement.saldoCantidad.toFixed(3), saldoValor: movement.saldoValor.toFixed(9), fechaEfectiva: movement.fechaEfectiva, origenTipo: movement.origen?.tipo ?? null })),
    }));
    const lineas: LineaCompraLogistico[] = lineasDb.map(line => ({
      id: line.id, compraId: line.compra.id, compraReferencia: line.compra.referencia, proveedor: line.compra.proveedor,
      articuloId: line.articulo.id, articuloCodigo: line.articulo.codigo, unidad: line.articulo.unidad,
      cantidad: line.cantidad.toFixed(3), cantidadCancelada: line.cantidadCancelada.toFixed(3), canceladaEn: line.canceladaEn,
      prometidaEn: line.prometidaEn, compraFecha: line.compra.fechaEfectiva,
      recepciones: line.recepciones.map(r => ({ cantidad: r.cantidad.toFixed(3), fechaEfectiva: r.fechaEfectiva })),
    }));
    const recepciones: RecepcionLogistico[] = recepcionesDb.map(receipt => ({
      id: receipt.id, referencia: receipt.referencia, compraId: receipt.linea.compra.id, compraReferencia: receipt.linea.compra.referencia,
      proveedor: receipt.linea.compra.proveedor, articuloId: receipt.linea.articulo.id, articuloCodigo: receipt.linea.articulo.codigo,
      unidad: receipt.linea.articulo.unidad, cantidad: receipt.cantidad.toFixed(3), fechaEfectiva: receipt.fechaEfectiva, prometidaEn: receipt.linea.prometidaEn,
    }));
    const prestamos: PrestamoLogistico[] = prestamosDb.map(loan => ({
      id: loan.id, herramientaId: loan.herramientaId, codigo: loan.herramienta.codigo, nombre: loan.herramienta.nombre,
      empleadoId: loan.empleadoId, empleadoNombre: nombreEmpleado(loan.empleado, loan.empleadoId),
      prestadaEn: loan.prestadaEn, previstaEn: loan.previstaEn, devueltaEn: loan.devueltaEn,
    }));
    return { articulos, lineas, recepciones, prestamos, coverage };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return calcularIndicadoresLogisticos({ desde, hasta, ahora, ...snapshot });
}
