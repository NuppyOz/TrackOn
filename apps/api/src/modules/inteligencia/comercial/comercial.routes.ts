import { Router } from 'express';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';
import * as service from './comercial.service.js';

export const indicadoresComercialesRouter = Router();
indicadoresComercialesRouter.get('/', async (req, res) => {
  const rango = rangoQuerySchema.parse(req.query);
  res.json({ data: await service.obtenerTablero(rango) });
});
