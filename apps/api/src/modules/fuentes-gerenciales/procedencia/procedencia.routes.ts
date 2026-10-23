import { Router } from 'express';
import { AppError } from '../../../errors/AppError.js';
import { Prisma } from '@prisma/client';
import * as schema from '../contracts/gerenciales.schema.js';
import * as service from './procedencia.service.js';

export const procedenciaRouter = Router();
procedenciaRouter.get('/cobertura', async (_req, res) => res.json({ data: await service.listarCoberturas() }));
procedenciaRouter.put('/cobertura/:area', async (req, res) => {
  const { area } = schema.coberturaParamsSchema.parse(req.params);
  const body = schema.coberturaInputSchema.parse(req.body);
  const usuarioId = req.auth?.usuario.id;
  if (!usuarioId) throw new AppError(401, 'Se requiere autenticación.');
  try { res.json({ data: await service.guardarCobertura(area, body, usuarioId) }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La cobertura ya se creó durante otra operación.');
    throw error;
  }
});
procedenciaRouter.get('/cobertura/:area/historial', async (req, res) => {
  const { area } = schema.historialIdSchema.parse(req.params);
  const { pagina, limite } = schema.historialQuerySchema.parse(req.query);
  res.json({ data: await service.historialCobertura(area, pagina, limite) });
});
