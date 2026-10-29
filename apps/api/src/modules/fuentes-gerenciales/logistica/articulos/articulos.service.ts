import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import { decimalFijo, milesimas, costoMicro } from '../../contracts/precision.js';
import * as repository from './articulos.repository.js';
import type { CrearArticulo, ListarArticulos } from './articulos.schema.js';
import { articuloDto, conflicto } from '../movimientos/movimientos.service.js';
import { valorEntradaNano } from '../movimientos/costeo.js';

export async function listarArticulos(filtros: ListarArticulos) {
  const rows = await repository.listar(filtros);
  return { items: rows.slice(0, filtros.limite).map(articuloDto), pagina: filtros.pagina, limite: filtros.limite, hayMas: rows.length > filtros.limite };
}

export async function obtenerArticulo(id: number) {
  const row = await repository.obtener(id);
  if (!row) throw new AppError(404, 'El artículo no existe.');
  return articuloDto(row);
}

export async function crearArticulo(datos: CrearArticulo, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  try {
    return await ejecutarIdempotente({ tipo: 'USUARIO', id: autorId }, 'fuentes.logistica.articulos.crear', clave, datos, async tx => {
      const ahora = new Date();
      const fecha = new Date(datos.apertura.fechaEfectiva);
      if (fecha.getTime() > ahora.getTime()) throw new AppError(400, 'La fecha efectiva no puede estar en el futuro.');
      let materialId: number | null = null;
      if (datos.materialId !== undefined) {
        const material = await repository.buscarMaterial(datos.materialId, tx);
        if (!material) throw new AppError(404, 'El material seleccionado no existe.');
        if (!material.activo) throw new AppError(409, 'No se puede registrar un artículo para un material inactivo.');
        if (material.articuloGerencial) throw new AppError(409, 'El material ya tiene un artículo gerencial asociado.');
        if (datos.unidad !== material.unidadMedida) throw new AppError(400, 'La unidad debe coincidir con el material seleccionado.');
        materialId = material.id;
      }
      const cantidad = milesimas(datos.apertura.cantidad, true);
      const costo = costoMicro(datos.apertura.costoUnitario);
      const valor = valorEntradaNano(cantidad, costo);
      const articulo = await repository.crear(tx, {
        codigo: datos.codigo, nombre: datos.nombre, unidad: datos.unidad, minimo: datos.minimo,
        saldoCantidad: decimalFijo(cantidad, 3), saldoValor: decimalFijo(valor, 9), ultimaFecha: fecha,
        materialId, version: 1, autorId,
      });
      await tx.movimientoGerencial.create({ data: {
        articuloId: articulo.id, tipo: 'APERTURA', sentido: 1, cantidad: decimalFijo(cantidad, 3), valor: decimalFijo(valor, 9),
        saldoCantidad: decimalFijo(cantidad, 3), saldoValor: decimalFijo(valor, 9), referencia: datos.apertura.referencia,
        fechaEfectiva: fecha, observacion: datos.apertura.observacion ?? '', autorId,
      } });
      return articuloDto(articulo);
    });
  } catch (error) { conflicto(error); }
}
