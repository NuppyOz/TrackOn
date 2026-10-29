import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './cobros.schema.js';
import * as service from './cobros.service.js';

export const cobrosGerencialesRouter = Router();
const actor = (req: Request) => {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
};
cobrosGerencialesRouter.get('/cobros', async (req, res) => res.json({ data: await service.listar(schema.listarCobrosSchema.parse(req.query)) }));
cobrosGerencialesRouter.get('/cobros/:id', async (req, res) => res.json({ data: await service.obtener(schema.cobroIdSchema.parse(req.params).id) }));
cobrosGerencialesRouter.post('/cobros', async (req, res) => {
  const input = schema.crearCobroSchema.parse(req.body), quien = actor(req), key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.cobros.crear', key, input, tx => service.crear(input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflicto(error); }
});
cobrosGerencialesRouter.post('/cobros/:id/revertir', async (req, res) => {
  const id = schema.cobroIdSchema.parse(req.params).id, input = schema.revertirCobroSchema.parse(req.body), quien = actor(req), key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.cobros.revertir', key, { id, ...input }, tx => service.revertir(id, input, quien.id, tx));
    res.json({ data });
  } catch (error) { service.conflicto(error); }
});
