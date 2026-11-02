import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import * as schema from './documentos.schema.js';
import * as service from './documentos.service.js';

export const comprobantesGerencialesRouter = Router();
const actor = (req: Request) => {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return { tipo: 'USUARIO' as const, id };
};

comprobantesGerencialesRouter.get('/comprobantes', async (req, res) => res.json({ data: await service.listar(schema.listarComprobantesSchema.parse(req.query)) }));
comprobantesGerencialesRouter.get('/comprobantes/:id', async (req, res) => {
  const { id } = schema.comprobanteIdSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
});
comprobantesGerencialesRouter.post('/comprobantes', async (req, res) => {
  const input = schema.crearComprobanteSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.comprobantes.crear', key, input, tx => service.crear(input, quien.id, tx));
    res.status(201).json({ data });
  } catch (error) { service.conflicto(error); }
});
comprobantesGerencialesRouter.post('/comprobantes/:id/anular', async (req, res) => {
  const { id } = schema.comprobanteIdSchema.parse(req.params);
  const input = schema.anularComprobanteSchema.parse(req.body);
  const quien = actor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try {
    const data = await ejecutarIdempotente(quien, 'fuentes.finanzas.comprobantes.anular', key, { id, ...input }, tx => service.anular(id, input, quien.id, tx));
    res.json({ data });
  } catch (error) { service.conflicto(error); }
});
