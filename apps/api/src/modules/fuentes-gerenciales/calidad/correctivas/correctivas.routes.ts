import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './correctivas.schema.js';
import * as service from './correctivas.service.js';
import * as casosService from '../casos/casos.service.js';

export const correctivasGerencialesRouter = Router();
function actor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
}

correctivasGerencialesRouter.get('/', async (req, res) => {
  const query = schema.listarCorrectivasSchema.parse(req.query);
  res.json({ data: await service.listarCorrectivas(query) });
});

correctivasGerencialesRouter.get('/:id', async (req, res) => {
  const { id } = schema.correctivaIdParamsSchema.parse(req.params);
  res.json({ data: await service.obtenerCorrectiva(id) });
});

correctivasGerencialesRouter.post('/:id/cerrar', async (req, res) => {
  const { id } = schema.correctivaIdParamsSchema.parse(req.params);
  const input = schema.cerrarCorrectivaSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.correctivas.cerrar', key, { id, ...input },
      tx => casosService.cerrarCorrectiva(tx, id, input, quien.id));
    res.json({ data });
  } catch (error) { service.conflictoCorrectiva(error); }
});
