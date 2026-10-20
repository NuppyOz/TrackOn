import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './costos.schema.js';
import * as service from './costos.service.js';

export const costosGerencialesRouter = Router();
const actor = (req: Request) => {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
};
costosGerencialesRouter.get('/costos', async (req, res) => res.json({ data: await service.listar(schema.listarCostosSchema.parse(req.query)) }));
costosGerencialesRouter.get('/costos/:id', async (req, res) => res.json({ data: await service.obtener(schema.costoIdSchema.parse(req.params).id) }));
costosGerencialesRouter.post('/costos', async (req, res) => {
  const input = schema.crearCostoSchema.parse(req.body), quien = actor(req), key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.costos.crear', key, input, tx => service.crear(input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflicto(error); }
});
costosGerencialesRouter.post('/costos/:id/revertir', async (req, res) => {
  const id = schema.costoIdSchema.parse(req.params).id, input = schema.revertirCostoSchema.parse(req.body), quien = actor(req), key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.costos.revertir', key, { id, ...input }, tx => service.revertir(id, input, quien.id, tx));
    res.json({ data });
  } catch (error) { service.conflicto(error); }
});
