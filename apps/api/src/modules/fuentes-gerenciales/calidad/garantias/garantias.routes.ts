import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './garantias.schema.js';
import * as service from './garantias.service.js';

export const garantiasGerencialesRouter = Router();
function actor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
}

garantiasGerencialesRouter.get('/', async (req, res) => {
  const query = schema.listarGarantiasSchema.parse(req.query);
  res.json({ data: await service.listarGarantias(query) });
});

garantiasGerencialesRouter.get('/:id', async (req, res) => {
  const { id } = schema.garantiaIdParamsSchema.parse(req.params);
  res.json({ data: await service.obtenerGarantia(id) });
});

garantiasGerencialesRouter.post('/', async (req, res) => {
  const input = schema.crearGarantiaSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.garantias.crear', key, input,
      tx => service.crearGarantia(tx, input, quien.id));
    res.status(201).json({ data });
  } catch (error) { service.conflictoGarantia(error); }
});
