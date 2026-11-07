import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';

export const insightsRouter = Router();
insightsRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));

const filtrosSchema = z.strictObject({
  tipo: z.enum(['CLIENTES', 'OPORTUNIDADES', 'COTIZACIONES', 'VENTAS', 'ORDENES', 'ASIGNACIONES', 'EVIDENCIAS', 'CAMBIOS_ESTADO']),
  desde: z.iso.datetime({ offset: true }).optional(),
  hasta: z.iso.datetime({ offset: true }).optional(),
}).refine(v => !v.desde || !v.hasta || v.desde <= v.hasta, 'La fecha inicial debe ser anterior a la final.');
const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const csv = (headers: string[], rows: unknown[][]) => [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

insightsRouter.post('/reportes', async (req, res, next) => {
  try {
    const input = filtrosSchema.parse(req.body);
    const usuarioId = req.auth!.usuario.id;
    const desde = input.desde ? new Date(input.desde) : undefined;
    const hasta = input.hasta ? new Date(input.hasta) : undefined;
    const rango = { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) };
    let headers: string[];
    let rows: unknown[][];
    if (input.tipo === 'CLIENTES') {
      const data = await prisma.cliente.findMany({ where: { creadoEn: rango }, include: { persona: true, organizacion: true }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Código', 'Cliente', 'Tipo', 'Teléfono', 'Correo', 'Estado', 'Fecha'];
      rows = data.map(c => [c.codigo, c.organizacion?.nombreComercial || c.organizacion?.razonSocial || [c.persona?.firstName, c.persona?.firstLastName].filter(Boolean).join(' '), c.organizacion ? 'Empresa' : 'Persona', c.telefonoComercial || c.persona?.telephone, c.correoComercial || c.persona?.correo, c.activo ? 'Activo' : 'Inactivo', c.creadoEn.toISOString()]);
    } else if (input.tipo === 'ORDENES') {
      const data = await prisma.ordenTrabajo.findMany({ where: { creadaEn: rango }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Cliente', 'Solicitud', 'Estado', 'Prioridad', 'Creada', 'Programada'];
      rows = data.map(o => [o.numero, o.clienteNombreRegistrado, o.solicitud, o.estadoCodigo, o.prioridad, o.creadaEn.toISOString(), o.fechaProgramada?.toISOString()]);
    } else if (input.tipo === 'COTIZACIONES') {
      const data = await prisma.cotizacionComercial.findMany({ where: { creadaEn: rango }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Cliente', 'Estado', 'Moneda', 'Subtotal', 'Descuento', 'Total', 'Creada', 'Vigencia'];
      rows = data.map(c => [c.id, c.clienteNombreRegistrado, c.estado, c.moneda, c.subtotal, c.descuento, c.total, c.creadaEn.toISOString(), c.venceEn.toISOString()]);
    } else if (input.tipo === 'OPORTUNIDADES') {
      const data = await prisma.oportunidadComercial.findMany({ where: { creadaEn: rango }, include: { cliente: { include: { persona: true, organizacion: true } }, responsable: { select: { identificador: true } } }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Oportunidad', 'Cliente', 'Etapa', 'Responsable', 'Valor estimado', 'Próxima actividad', 'Creada'];
      rows = data.map(o => [o.id, o.nombre, o.cliente.organizacion?.nombreComercial || o.cliente.organizacion?.razonSocial || [o.cliente.persona?.firstName, o.cliente.persona?.firstLastName].filter(Boolean).join(' '), o.etapa, o.responsable.identificador, o.valorEstimado, o.proximaActividad?.toISOString(), o.creadaEn.toISOString()]);
    } else if (input.tipo === 'VENTAS') {
      const data = await prisma.ventaComercial.findMany({ where: { confirmadaEn: rango }, include: { cotizacion: { select: { clienteNombreRegistrado: true } } }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Cotización', 'Cliente', 'Moneda', 'Total confirmado', 'Confirmada'];
      rows = data.map(v => [v.id, v.cotizacionId, v.cotizacion.clienteNombreRegistrado, v.moneda, v.total, v.confirmadaEn.toISOString()]);
    } else if (input.tipo === 'ASIGNACIONES') {
      const data = await prisma.asignacion.findMany({ where: { inicio: rango }, include: { orden: { select: { numero: true, clienteNombreRegistrado: true } }, empleadoResponsable: { select: { codEmpleado: true } }, cuadrilla: { select: { nombre: true } } }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Orden', 'Cliente', 'Empleado', 'Cuadrilla', 'Inicio', 'Fin', 'Motivo'];
      rows = data.map(a => [a.id, a.orden.numero, a.orden.clienteNombreRegistrado, a.empleadoResponsable?.codEmpleado, a.cuadrilla?.nombre, a.inicio.toISOString(), a.fin?.toISOString(), a.motivo]);
    } else if (input.tipo === 'EVIDENCIAS') {
      const data = await prisma.evidenciaEquipo.findMany({ where: { creadaEn: rango }, include: { ordenEquipo: { include: { orden: { select: { numero: true, clienteNombreRegistrado: true } } } } }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Orden', 'Cliente', 'Archivo', 'Tipo', 'Estado de carga', 'Tamaño (bytes)', 'Creada'];
      rows = data.map(e => [e.id, e.ordenEquipo.orden.numero, e.ordenEquipo.orden.clienteNombreRegistrado, e.nombreOriginal, e.tipoArchivo, e.estadoCarga, e.tamanoBytes, e.creadaEn.toISOString()]);
    } else {
      const data = await prisma.historialEstado.findMany({ where: { fecha: rango }, include: { orden: { select: { numero: true, clienteNombreRegistrado: true } }, cambiadoPor: { select: { identificador: true } } }, orderBy: { id: 'asc' }, take: 10001 });
      headers = ['Número', 'Orden', 'Cliente', 'Estado anterior', 'Estado nuevo', 'Actor', 'Motivo', 'Fecha'];
      rows = data.map(h => [h.id, h.orden.numero, h.orden.clienteNombreRegistrado, h.estadoAnterior, h.estadoNuevo, h.cambiadoPor.identificador, h.motivo, h.fecha.toISOString()]);
    }
    if (rows.length > 10000) throw new AppError(413, 'El rango supera 10 000 filas. Acota las fechas.');
    const reporte = await prisma.reporteGenerado.create({ data: { tipo: input.tipo, desde, hasta, filas: rows.length, contenido: csv(headers, rows), usuarioId }, select: { id: true, tipo: true, desde: true, hasta: true, filas: true, creadoEn: true } });
    res.status(201).json({ data: reporte });
  } catch (error) { next(error); }
});

insightsRouter.get('/reportes', async (req, res, next) => {
  try {
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.pagina);
    const usuarioId = req.auth!.usuario.id;
    const [items, total] = await prisma.$transaction([
      prisma.reporteGenerado.findMany({ where: { usuarioId }, select: { id: true, tipo: true, desde: true, hasta: true, filas: true, creadoEn: true }, orderBy: { creadoEn: 'desc' }, skip: (page - 1) * 10, take: 10 }),
      prisma.reporteGenerado.count({ where: { usuarioId } }),
    ]);
    res.json({ data: { items, total, pagina: page, limite: 10 } });
  } catch (error) { next(error); }
});

insightsRouter.get('/reportes/:id/archivo', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const reporte = await prisma.reporteGenerado.findFirst({ where: { id, usuarioId: req.auth!.usuario.id } });
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="multicore-${reporte.tipo.toLowerCase()}-${reporte.id}.csv"`);
    res.send(`\uFEFF${reporte.contenido}`);
  } catch (error) { next(error); }
});
