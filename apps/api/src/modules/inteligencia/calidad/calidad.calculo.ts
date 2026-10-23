export type EstadoCoberturaCalidad = 'COMPLETA' | 'PARCIAL' | 'SIN_REGISTROS';
type ClienteNombre = { id: number; persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } | null; organizacion: { razonSocial: string | null; nombreComercial: string | null } | null };
type GarantiaFuente = { id: number; referencia: string; clienteId: number; cliente: ClienteNombre; activoReferencia: string; inicio: Date; fin: Date };
type CasoFuente = { id: number; referencia: string; clienteId: number; cliente: ClienteNombre; activoReferencia: string; codigoFalla: string; abiertaEn: Date; anteriorId: number | null; respondidaEn: Date | null; resueltaEn: Date | null; cerradaEn: Date | null; respuestaLimiteEn: Date | null; resolucionLimiteEn: Date | null };
type RetrabajoFuente = { id: number; casoId: number; referenciaTrabajo: string; fechaEfectiva: Date; ordenId: number | null; caso: { referencia: string } };
type CorrectivaFuente = { id: number; casoId: number; descripcion: string; responsableId: number; responsable: { persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } }; creadaEn: Date; venceEn: Date; cerradaEn: Date | null; caso: { referencia: string } };

export type SnapshotCalidad = {
  desde: Date; hasta: Date; ahora: Date;
  garantias: GarantiaFuente[]; casos: CasoFuente[]; retrabajos: RetrabajoFuente[]; correctivas: CorrectivaFuente[];
  cobertura: { desde: Date; hastaVerificada: Date; observacion: string | null } | null;
  hayFuente: boolean;
};

const iso = (date: Date | null) => date?.toISOString() ?? null;
const nombreCliente = (cliente: ClienteNombre) => cliente.organizacion?.nombreComercial ?? cliente.organizacion?.razonSocial ?? (cliente.persona ? [cliente.persona.firstName, cliente.persona.secondName, cliente.persona.firstLastName, cliente.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${cliente.id}`);
const nombreEmpleado = (empleado: CorrectivaFuente['responsable']) => [empleado.persona.firstName, empleado.persona.secondName, empleado.persona.firstLastName, empleado.persona.secondLastName].filter(Boolean).join(' ');
const enRango = (date: Date, desde: Date, hasta: Date) => date >= desde && date < hasta;

function porcentaje(numerador: number, denominador: number): string | null {
  if (denominador === 0) return null;
  const n = BigInt(numerador) * 10_000n;
  const d = BigInt(denominador);
  const rounded = (n + d / 2n) / d;
  return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, '0')}`;
}

function tasa(clave: string, numerador: number, denominador: number, fuente: string, motivo: string) {
  return { clave, valor: porcentaje(numerador, denominador), unidad: 'porcentaje' as const, estado: denominador ? 'CALCULADO' as const : 'SIN_BASE_DE_CALCULO' as const,
    fuentes: [fuente], motivo: denominador ? null : motivo, base: { numerador, denominador } };
}

function estadoCaso(caso: CasoFuente, corte: Date) {
  if (caso.cerradaEn !== null && caso.cerradaEn < corte) return 'CERRADO' as const;
  if (caso.resueltaEn !== null && caso.resueltaEn < corte) return 'RESUELTO' as const;
  if (caso.respondidaEn !== null && caso.respondidaEn < corte) return 'EN_ATENCION' as const;
  return 'ABIERTO' as const;
}

export function calcularIndicadoresCalidad(snapshot: SnapshotCalidad) {
  const { desde, hasta, ahora } = snapshot;
  const corte = hasta < ahora ? hasta : ahora;
  const sinBaseFutura = desde >= corte;
  const casos = snapshot.casos.filter(caso => caso.abiertaEn < corte);
  const garantias = snapshot.garantias.filter(garantia => garantia.inicio < corte);
  const retrabajos = sinBaseFutura ? [] : snapshot.retrabajos.filter(row => enRango(row.fechaEfectiva, desde, corte));
  const correctivas = snapshot.correctivas.filter(row => row.creadaEn < corte);
  const casosPorId = new Map(casos.map(caso => [caso.id, caso]));
  const reincidencias = sinBaseFutura ? [] : casos.filter(caso => {
    if (!enRango(caso.abiertaEn, desde, corte) || caso.anteriorId === null) return false;
    const anterior = casosPorId.get(caso.anteriorId);
    return anterior !== undefined && anterior.clienteId === caso.clienteId && anterior.activoReferencia === caso.activoReferencia && anterior.codigoFalla === caso.codigoFalla && anterior.abiertaEn < caso.abiertaEn;
  });
  const vigentes = garantias.filter(garantia => garantia.fin >= corte);
  const abiertos = casos.filter(caso => caso.cerradaEn === null || caso.cerradaEn >= corte);
  const correctivasAbiertas = correctivas.filter(row => row.cerradaEn === null || row.cerradaEn >= corte);
  const correctivasVencidas = correctivasAbiertas.filter(row => row.venceEn < corte);

  const grupos = new Map<string, { clienteId: number; activoReferencia: string; codigoFalla: string; casos: CasoFuente[] }>();
  const desde90d = new Date(corte.getTime() - 90 * 86_400_000);
  for (const caso of casos) {
    if (!enRango(caso.abiertaEn, desde90d, corte)) continue;
    const key = `cliente:${caso.clienteId}|activo:${encodeURIComponent(caso.activoReferencia)}|falla:${encodeURIComponent(caso.codigoFalla)}`;
    const grupo = grupos.get(key) ?? { clienteId: caso.clienteId, activoReferencia: caso.activoReferencia, codigoFalla: caso.codigoFalla, casos: [] };
    grupo.casos.push(caso);
    grupos.set(key, grupo);
  }
  const fallasRepetidas = [...grupos.entries()].filter(([, grupo]) => grupo.casos.length >= 2).map(([clave, grupo]) => ({
    tipo: 'FALLA_REPETIDA' as const, clave, clienteId: grupo.clienteId, activoReferencia: grupo.activoReferencia,
    codigoFalla: grupo.codigoFalla, cantidad: grupo.casos.length, casoIds: grupo.casos.map(caso => caso.id).sort((a, b) => a - b),
  }));

  const plazosRespuesta = casos.filter(caso => caso.respuestaLimiteEn !== null && enRango(caso.respuestaLimiteEn, desde, corte));
  const respuestasExitosas = plazosRespuesta.filter(caso => caso.respondidaEn !== null && caso.respondidaEn < corte && caso.respondidaEn <= caso.respuestaLimiteEn!).length;
  const plazosResolucion = casos.filter(caso => caso.resolucionLimiteEn !== null && enRango(caso.resolucionLimiteEn, desde, corte));
  const resolucionesExitosas = plazosResolucion.filter(caso => caso.resueltaEn !== null && caso.resueltaEn < corte && caso.resueltaEn <= caso.resolucionLimiteEn!).length;

  const garantiaRows = garantias.map(garantia => ({ tipo: 'GARANTIA' as const, id: garantia.id, referencia: garantia.referencia, clienteId: garantia.clienteId, clienteNombre: nombreCliente(garantia.cliente), activoReferencia: garantia.activoReferencia, inicio: garantia.inicio.toISOString(), fin: garantia.fin.toISOString(), vigente: garantia.fin >= corte }));
  const casoRows = casos.map(caso => {
    const respuestaEvaluable = caso.respuestaLimiteEn !== null && enRango(caso.respuestaLimiteEn, desde, corte);
    const resolucionEvaluable = caso.resolucionLimiteEn !== null && enRango(caso.resolucionLimiteEn, desde, corte);
    return { tipo: 'CASO' as const, id: caso.id, referencia: caso.referencia, clienteId: caso.clienteId, clienteNombre: nombreCliente(caso.cliente), activoReferencia: caso.activoReferencia,
      codigoFalla: caso.codigoFalla, abiertaEn: caso.abiertaEn.toISOString(), anteriorId: caso.anteriorId, respondidaEn: iso(caso.respondidaEn), resueltaEn: iso(caso.resueltaEn), cerradaEn: iso(caso.cerradaEn),
      respuestaLimiteEn: iso(caso.respuestaLimiteEn), resolucionLimiteEn: iso(caso.resolucionLimiteEn), estadoAlCorte: estadoCaso(caso, corte),
      respuestaEvaluable, respuestaCumple: respuestaEvaluable ? caso.respondidaEn !== null && caso.respondidaEn < corte && caso.respondidaEn <= caso.respuestaLimiteEn! : null,
      resolucionEvaluable, resolucionCumple: resolucionEvaluable ? caso.resueltaEn !== null && caso.resueltaEn < corte && caso.resueltaEn <= caso.resolucionLimiteEn! : null };
  });
  const retrabajoRows = retrabajos.map(row => ({ tipo: 'RETRABAJO' as const, id: row.id, casoId: row.casoId, casoReferencia: row.caso.referencia, referenciaTrabajo: row.referenciaTrabajo, fechaEfectiva: row.fechaEfectiva.toISOString(), ordenId: row.ordenId }));
  const correctivaRows = correctivas.map(row => {
    const abiertaAlCorte = row.cerradaEn === null || row.cerradaEn >= corte;
    return { tipo: 'CORRECTIVA' as const, id: row.id, casoId: row.casoId, casoReferencia: row.caso.referencia, descripcion: row.descripcion,
      responsableId: row.responsableId, responsableNombre: nombreEmpleado(row.responsable), creadaEn: row.creadaEn.toISOString(), venceEn: row.venceEn.toISOString(), cerradaEn: iso(row.cerradaEn),
      abiertaAlCorte, vencidaAlCorte: abiertaAlCorte && row.venceEn < corte };
  });
  const desgloses = [...garantiaRows, ...casoRows, ...retrabajoRows, ...correctivaRows, ...fallasRepetidas].sort((a, b) => {
    const aFecha = 'abiertaEn' in a ? a.abiertaEn : 'fechaEfectiva' in a ? a.fechaEfectiva : 'creadaEn' in a ? a.creadaEn : 'inicio' in a ? a.inicio : '';
    const bFecha = 'abiertaEn' in b ? b.abiertaEn : 'fechaEfectiva' in b ? b.fechaEfectiva : 'creadaEn' in b ? b.creadaEn : 'inicio' in b ? b.inicio : '';
    const aKey = 'id' in a ? String(a.id).padStart(12, '0') : a.clave;
    const bKey = 'id' in b ? String(b.id).padStart(12, '0') : b.clave;
    return bFecha.localeCompare(aFecha) || bKey.localeCompare(aKey);
  });
  const fuentes = {
    garantia: 'garantias_gerenciales', caso: 'casos_calidad_gerenciales', retrabajo: 'retrabajos_gerenciales', correctiva: 'correctivas_gerenciales',
  };
  const metricas = [
    { clave: 'garantias_vigentes', valor: sinBaseFutura ? 0 : vigentes.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.garantia], motivo: null },
    { clave: 'reclamos_abiertos', valor: sinBaseFutura ? 0 : abiertos.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.caso], motivo: null },
    { clave: 'reincidencias', valor: reincidencias.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.caso], motivo: null },
    { clave: 'retrabajos', valor: retrabajos.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.retrabajo], motivo: null },
    { clave: 'fallas_repetidas_grupos', valor: sinBaseFutura ? 0 : fallasRepetidas.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.caso], motivo: null },
    tasa('sla_respuesta_porcentaje', respuestasExitosas, plazosRespuesta.length, fuentes.caso, 'No hay plazos de respuesta vencidos en el rango evaluable.'),
    tasa('sla_resolucion_porcentaje', resolucionesExitosas, plazosResolucion.length, fuentes.caso, 'No hay plazos de resolución vencidos en el rango evaluable.'),
    { clave: 'correctivas_abiertas', valor: sinBaseFutura ? 0 : correctivasAbiertas.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.correctiva], motivo: null },
    { clave: 'correctivas_vencidas', valor: sinBaseFutura ? 0 : correctivasVencidas.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: [fuentes.correctiva], motivo: null },
  ];
  const completa = snapshot.cobertura !== null && snapshot.cobertura.desde <= desde && snapshot.cobertura.hastaVerificada >= corte;
  const coberturaEstado: EstadoCoberturaCalidad = !snapshot.hayFuente ? 'SIN_REGISTROS' : completa ? 'COMPLETA' : 'PARCIAL';
  const observaciones = [snapshot.cobertura?.observacion,
    ...(completa || !snapshot.hayFuente ? [] : ['La cobertura de calidad no está verificada para todo el rango consultado.']),
    ...(hasta > ahora ? [`El rango solicitado llega hasta ${iso(hasta)}; se evaluó hasta ${iso(corte)}.`] : []),
    ...(sinBaseFutura ? ['El rango comienza después del corte de evaluación; no hay base futura para los indicadores de período.'] : []),
  ].filter((value): value is string => Boolean(value));
  const registrosSinAsignar = sinBaseFutura ? 0 : casos.filter(caso => caso.abiertaEn < corte && (caso.respuestaLimiteEn === null || caso.resolucionLimiteEn === null)).length;
  return { desde: iso(desde), hasta: iso(hasta), corteEvaluacion: iso(corte), zonaHoraria: 'America/Managua' as const,
    cobertura: { estado: coberturaEstado, desde: iso(snapshot.cobertura?.desde ?? null), hastaVerificada: iso(snapshot.cobertura?.hastaVerificada ?? null), observaciones },
    metricas, desgloses: sinBaseFutura ? [] : desgloses, registrosSinAsignar };
}
