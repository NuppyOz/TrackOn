import { Router } from 'express';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';
import * as service from './logistico.service.js';

export const indicadoresLogisticosRouter = Router();
indicadoresLogisticosRouter.get('/', async (req, res) => {
  const rango = rangoQuerySchema.parse(req.query);
  res.json({ data: await service.obtenerTablero(rango) });
});
