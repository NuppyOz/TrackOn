import { Router, type Request } from 'express';
import { AppError } from '../../../errors/AppError.js';
import * as service from './oportunidades.service.js';
import { actualizarOportunidadSchema, crearOportunidadSchema, listarOportunidadesSchema, oportunidadParamsSchema } from './oportunidades.schema.js';

export const oportunidadesRouter = Router();
function usuarioId(req: Request) {
  const id = req.auth?.usuario?.id;
  if (!Number.isSafeInteger(id) || !id || id < 1) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

oportunidadesRouter.get('/oportunidades', async (req, res) => {
  res.json({ data: await service.listarOportunidades(listarOportunidadesSchema.parse(req.query)) });
});
oportunidadesRouter.post('/oportunidades', async (req, res) => {
  res.status(201).json({ data: await service.crearOportunidad(crearOportunidadSchema.parse(req.body), usuarioId(req)) });
});
oportunidadesRouter.get('/oportunidades/:id', async (req, res) => {
  const { id } = oportunidadParamsSchema.parse(req.params);
  res.json({ data: await service.obtenerOportunidad(id) });
});
oportunidadesRouter.patch('/oportunidades/:id', async (req, res) => {
  const { id } = oportunidadParamsSchema.parse(req.params);
  res.json({ data: await service.actualizarOportunidad(id, actualizarOportunidadSchema.parse(req.body), usuarioId(req)) });
});
