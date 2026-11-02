import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './facturables.schema.js';
import * as service from './facturables.service.js';

export const facturablesGerencialesRouter = Router();
const actor = (req: Request) => {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
};

facturablesGerencialesRouter.get('/facturables', async (req, res) => res.json({ data: await service.listar(schema.listarFacturablesSchema.parse(req.query)) }));
facturablesGerencialesRouter.get('/facturables/:id', async (req, res) => {
  const { id } = schema.facturableIdSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
});
facturablesGerencialesRouter.post('/facturables', async (req, res) => {
  const input = schema.crearFacturableSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.facturables.crear', key, input, tx => service.crear(input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflicto(error); }
});
facturablesGerencialesRouter.post('/facturables/:id/aplicar', async (req, res) => {
  const { id } = schema.facturableIdSchema.parse(req.params);
  const input = schema.aplicarFacturableSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.facturables.aplicar', key, { id, ...input }, tx => service.aplicar(id, input, quien.id, tx));
    res.json({ data });
  } catch (error) { service.conflicto(error); }
});
