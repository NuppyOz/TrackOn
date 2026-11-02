import { Router } from 'express';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';
import * as service from './calidad.service.js';

export const indicadoresCalidadRouter = Router();
indicadoresCalidadRouter.get('/', async (req, res) => {
  const rango = rangoQuerySchema.parse(req.query);
  res.json({ data: await service.obtenerTablero(rango) });
});
