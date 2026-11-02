import { describe, expect, it } from 'vitest';
import { calcularIndicadoresLogisticos, type LogisticoSnapshot } from '../src/modules/inteligencia/logistico/logistico.calculo.js';

const d = (day: number) => new Date(`2011-01-${String(day).padStart(2, '0')}T00:00:00.000Z`);
const movement = (id: number, day: number, tipo: string, cantidad: string, saldoCantidad: string, saldoValor = '0.000000000', origenTipo: string | null = null) => ({ id, fechaEfectiva: d(day), tipo, cantidad, valor: '0.000000000', saldoCantidad, saldoValor, origenTipo });
const base = (): LogisticoSnapshot => ({ desde: d(1), hasta: d(11), ahora: d(12), articulos: [], lineas: [], recepciones: [], prestamos: [], coverage: { desde: d(1), hastaVerificada: d(11), observacion: null } });

describe('BH07 cálculo histórico de logística', () => {
  it('integra stock por tiempo y excluye movimientos efectivos al corte o posteriores', () => {
    const snapshot = base();
    snapshot.articulos = [{ id: 1, codigo: 'A', nombre: 'Artículo A', unidad: 'unidad', minimo: '2.000', movimientos: [
      movement(1, 1, 'APERTURA', '10.000', '10.000', '20.000000000'),
      movement(2, 6, 'CONSUMO', '4.000', '6.000', '12.000000000'),
      movement(3, 11, 'ENTRADA', '2.000', '8.000', '17.333333333'),
    ] }];
    const result = calcularIndicadoresLogisticos(snapshot);
    const articulo = result.desgloses.find(row => row.tipo === 'ARTICULO');
    expect(articulo).toMatchObject({ stock: '6.000', valor: '12.000000000', consumoNeto: '4.000', stockMedio: '8.000000', rotacion: '0.500000' });
    expect(result.metricas.map(row => row.clave)).toEqual(['stock_critico_cantidad', 'compras_pendientes_cantidad', 'herramientas_prestadas', 'herramientas_vencidas', 'inventario_valorizado']);
    expect(result.metricas[0]!.valor).toBe(0); // el indicador cuenta artículos críticos, no suma unidades incompatibles
  });

  it('netea devoluciones y reversos de consumo; no inventa historia antes de la apertura', () => {
    const snapshot = base();
    snapshot.articulos = [
      { id: 1, codigo: 'A', nombre: 'A', unidad: 'unidad', minimo: '0.000', movimientos: [
        movement(1, 1, 'APERTURA', '7.000', '7.000'), movement(2, 3, 'CONSUMO', '4.000', '3.000'),
        movement(3, 4, 'REVERSO', '1.000', '4.000', '0.000000000', 'CONSUMO'), movement(4, 5, 'DEVOLUCION', '1.000', '5.000'),
        movement(5, 6, 'REVERSO', '1.000', '4.000', '0.000000000', 'DEVOLUCION'),
      ] },
      { id: 2, codigo: 'B', nombre: 'B', unidad: 'kg', minimo: '1.000', movimientos: [movement(6, 5, 'APERTURA', '3.000', '3.000')] },
      { id: 3, codigo: 'C', nombre: 'C', unidad: 'l', minimo: '1.000', movimientos: [movement(7, 1, 'APERTURA', '0.000', '0.000')] },
    ];
    const result = calcularIndicadoresLogisticos(snapshot);
    const rows = result.desgloses.filter(row => row.tipo === 'ARTICULO');
    expect(rows).toHaveLength(3);
    expect(rows.find(row => row.id === 1)).toMatchObject({ consumoNeto: '3.000', stockMedio: '4.600000', rotacion: '0.652174' });
    expect(rows.find(row => row.id === 2)).toMatchObject({ stockMedio: null, rotacion: null, motivo: 'SIN_COBERTURA_ARTICULO' });
    expect(rows.find(row => row.id === 3)).toMatchObject({ stockMedio: '0.000000', rotacion: null, motivo: 'SIN_BASE_DE_CALCULO' });
  });

  it('calcula compromisos, recepciones y préstamos tal como estaban al corte', () => {
    const snapshot = base();
    snapshot.lineas = [{ id: 9, compraId: 8, compraReferencia: 'OC-1', proveedor: 'PROVEEDOR', articuloId: 1, articuloCodigo: 'A', unidad: 'unidad', cantidad: '5.000', cantidadCancelada: '1.000', canceladaEn: d(11), prometidaEn: d(4), compraFecha: d(1), recepciones: [{ cantidad: '2.000', fechaEfectiva: d(5) }] }];
    snapshot.recepciones = [{ id: 3, referencia: 'REC-1', compraId: 8, compraReferencia: 'OC-1', proveedor: 'PROVEEDOR', articuloId: 1, articuloCodigo: 'A', unidad: 'unidad', cantidad: '2.000', fechaEfectiva: d(5), prometidaEn: d(4) }];
    snapshot.prestamos = [{ id: 6, herramientaId: 7, codigo: 'T-1', nombre: 'Taladro', empleadoId: 2, empleadoNombre: 'Empleado', prestadaEn: d(1), previstaEn: d(8), devueltaEn: d(11) }];
    const result = calcularIndicadoresLogisticos(snapshot);
    expect(result.metricas.find(row => row.clave === 'compras_pendientes_cantidad')?.valor).toBe(1);
    expect(result.metricas.find(row => row.clave === 'herramientas_vencidas')?.valor).toBe(1);
    expect(result.desgloses.find(row => row.tipo === 'COMPRA_LINEA')).toMatchObject({ recibido: '2.000', cancelado: '0.000', pendiente: '3.000' });
    expect(result.desgloses.find(row => row.tipo === 'RECEPCION')).toMatchObject({ tardia: true });
    expect(result.desgloses.find(row => row.tipo === 'HERRAMIENTA')).toMatchObject({ id: 7, prestamoId: 6, vencida: true });
  });

  it('limita la evaluación al reloj y no presenta valores de períodos futuros como rotación calculada', () => {
    const snapshot = base();
    snapshot.desde = d(12); snapshot.hasta = d(13);
    snapshot.articulos = [{ id: 1, codigo: 'A', nombre: 'A', unidad: 'unidad', minimo: '1.000', movimientos: [movement(1, 1, 'APERTURA', '2.000', '2.000')] }];
    const result = calcularIndicadoresLogisticos(snapshot);
    expect(result.corteEvaluacion).toBe(d(12).toISOString());
    expect(result.cobertura.estado).toBe('PARCIAL');
    expect(result.desgloses.find(row => row.tipo === 'ARTICULO')).toMatchObject({ stockMedio: null, rotacion: null, motivo: 'SIN_BASE_DE_CALCULO' });
  });

  it('calcula rotación desde la integral exacta aunque stockMedio redondee a cero', () => {
    const snapshot = base();
    const inicio = d(1), unMilisegundo = new Date(inicio.getTime() + 1);
    snapshot.articulos = [{ id: 1, codigo: 'NANO', nombre: 'Muestra nanométrica', unidad: 'unidad', minimo: '0.000', movimientos: [
      { ...movement(1, 1, 'APERTURA', '0.001', '0.001'), fechaEfectiva: inicio },
      { ...movement(2, 1, 'CONSUMO', '0.001', '0.000'), fechaEfectiva: unMilisegundo },
    ] }];
    const articulo = calcularIndicadoresLogisticos(snapshot).desgloses.find(row => row.tipo === 'ARTICULO');
    expect(articulo?.stockMedio).toBe('0.000000');
    expect(articulo?.rotacion).toBe('864000000.000000');
  });

  it('conserva cobertura histórica cuando solo hubo préstamos ya devueltos al corte', () => {
    const snapshot = base();
    snapshot.coverage = null;
    snapshot.prestamos = [{ id: 1, herramientaId: 9, codigo: 'H-9', nombre: 'Herramienta', empleadoId: 4, empleadoNombre: 'Empleado', prestadaEn: d(2), previstaEn: d(4), devueltaEn: d(5) }];
    const result = calcularIndicadoresLogisticos(snapshot);
    expect(result.cobertura.estado).toBe('PARCIAL');
    expect(result.metricas.find(row => row.clave === 'herramientas_prestadas')?.valor).toBe(0);
    expect(result.desgloses.some(row => row.tipo === 'HERRAMIENTA')).toBe(false);
  });
});
