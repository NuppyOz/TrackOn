import { Router } from 'express';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';
import * as service from './financiero.service.js';

export const indicadoresFinancierosRouter = Router();
indicadoresFinancierosRouter.get('/', async (req, res) => {
  const rango = rangoQuerySchema.parse(req.query);
  res.json({ data: await service.obtenerTablero(rango) });
});
