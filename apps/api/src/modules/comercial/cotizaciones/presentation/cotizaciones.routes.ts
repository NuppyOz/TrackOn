import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import * as service from '../application/cotizaciones.service.js';
import { actualizarCotizacionSchema, crearCotizacionSchema, decisionCotizacionSchema, enviarCotizacionSchema, idParamsSchema, listarCotizacionesSchema, notaCotizacionSchema } from '../application/cotizaciones.schema.js';

export const cotizacionesRouter = Router();
function usuario(req: Request) {
  if (!req.auth?.usuario?.id) throw new AppError(401, 'Se requiere autenticación.');
  return req.auth.usuario.id;
}
function clave(req: Request) { return claveIdempotencia(req.get('Idempotency-Key')); }

cotizacionesRouter.get('/cotizaciones', async (req, res) => {
  const filtros = listarCotizacionesSchema.parse(req.query);
  res.json({ data: await service.listarCotizaciones(filtros) });
});
cotizacionesRouter.post('/cotizaciones', async (req, res) => {
  const datos = crearCotizacionSchema.parse(req.body);
  res.status(201).json({ data: await service.crearCotizacion(datos, usuario(req), clave(req)) });
});
cotizacionesRouter.get('/cotizaciones/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await service.obtenerCotizacion(id) });
});
cotizacionesRouter.patch('/cotizaciones/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const datos = actualizarCotizacionSchema.parse(req.body);
  res.json({ data: await service.actualizarCotizacion(id, datos) });
});
cotizacionesRouter.post('/cotizaciones/:id/enviar', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const { version } = enviarCotizacionSchema.parse(req.body);
  res.json({ data: await service.enviarCotizacionPorId(id, version, usuario(req), clave(req)) });
});
cotizacionesRouter.post('/cotizaciones/:id/decision', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const datos = decisionCotizacionSchema.parse(req.body);
  res.json({ data: await service.decidirCotizacion(id, datos, { tipo: 'USUARIO', usuarioId: usuario(req) }, clave(req)) });
});
cotizacionesRouter.post('/cotizaciones/:id/notas', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const { texto } = notaCotizacionSchema.parse(req.body);
  res.status(201).json({ data: await service.crearNotaCotizacion(id, texto, usuario(req), clave(req)) });
});
