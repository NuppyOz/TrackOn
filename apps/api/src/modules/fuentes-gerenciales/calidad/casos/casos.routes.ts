import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './casos.schema.js';
import * as service from './casos.service.js';

export const casosCalidadGerencialesRouter = Router();
function actor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
}

casosCalidadGerencialesRouter.get('/', async (req, res) => {
  const query = schema.listarCasosSchema.parse(req.query);
  res.json({ data: await service.listarCasos(query) });
});

casosCalidadGerencialesRouter.get('/:id', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  res.json({ data: await service.obtenerCaso(id) });
});

casosCalidadGerencialesRouter.post('/', async (req, res) => {
  const input = schema.crearCasoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.crear', key, input,
      tx => service.crearCaso(tx, input, quien.id));
    res.status(201).json({ data });
  } catch (error) { service.conflictoCaso(error); }
});

casosCalidadGerencialesRouter.post('/:id/responder', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  const input = schema.responderCasoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.responder', key, { id, ...input },
      tx => service.responderCaso(tx, id, input, quien.id));
    res.json({ data });
  } catch (error) { service.conflictoCaso(error); }
});

casosCalidadGerencialesRouter.post('/:id/resolver', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  const input = schema.resolverCasoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.resolver', key, { id, ...input },
      tx => service.resolverCaso(tx, id, input, quien.id));
    res.json({ data });
  } catch (error) { service.conflictoCaso(error); }
});

casosCalidadGerencialesRouter.post('/:id/cerrar', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  const input = schema.cerrarCasoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.cerrar', key, { id, ...input },
      tx => service.cerrarCaso(tx, id, input, quien.id));
    res.json({ data });
  } catch (error) { service.conflictoCaso(error); }
});

casosCalidadGerencialesRouter.post('/:id/retrabajos', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  const input = schema.crearRetrabajoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.retrabajos.crear', key, { id, ...input },
      tx => service.crearRetrabajo(tx, id, input, quien.id));
    res.status(201).json({ data });
  } catch (error) { service.conflictoCaso(error); }
});

casosCalidadGerencialesRouter.post('/:id/correctivas', async (req, res) => {
  const { id } = schema.casoIdParamsSchema.parse(req.params);
  const input = schema.crearCorrectivaSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.calidad.casos.correctivas.crear', key, { id, ...input },
      tx => service.crearCorrectiva(tx, id, input, quien.id));
    res.status(201).json({ data });
  } catch (error) { service.conflictoCaso(error); }
});
