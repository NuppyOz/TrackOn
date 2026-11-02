import { Router, type Request } from 'express';
import { AppError } from '../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../infrastructure/idempotencia.js';
import * as schema from '../contracts/gerenciales.schema.js';
import * as service from './contratos.service.js';

export const contratosGerencialesRouter = Router();
const actor = (req: Request) => {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
};

contratosGerencialesRouter.get('/contratos', async (req, res) => res.json({ data: await service.listar(schema.listarContratosSchema.parse(req.query)) }));
contratosGerencialesRouter.get('/contratos/:id', async (req, res) => {
  const { id } = schema.contratoIdSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
});
contratosGerencialesRouter.post('/contratos', async (req, res) => {
  const input = schema.crearContratoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.contratos.crear', key, input, tx => service.crear(input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflictoContrato(error); }
});
contratosGerencialesRouter.post('/contratos/:id/terminar', async (req, res) => {
  const { id } = schema.contratoIdSchema.parse(req.params);
  const input = schema.terminarContratoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.contratos.terminar', key, { id, ...input }, tx => service.terminar(id, input, quien.id, tx));
    res.json({ data });
  } catch (error) { service.conflictoContrato(error); }
});
contratosGerencialesRouter.post('/contratos/:id/renovar', async (req, res) => {
  const { id } = schema.contratoIdSchema.parse(req.params);
  const input = schema.renovarContratoSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.contratos.renovar', key, { id, ...input }, tx => service.renovar(id, input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflictoContrato(error); }
});
