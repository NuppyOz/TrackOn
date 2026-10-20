import { Router, type Request } from 'express';
import { AppError } from '../../../errors/AppError.js';
import { explicarSchema } from './asistente.schema.js';
import { disponible, explicarIndicadores, LimiteConcurrenciaAsistente } from './asistente.service.js';

export const asistenteIndicadoresRouter = Router();
const limite = new LimiteConcurrenciaAsistente();
function actor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

asistenteIndicadoresRouter.get('/disponibilidad', (_req, res) => {
  res.json({ data: { disponible: disponible() } });
});

asistenteIndicadoresRouter.post('/explicar', async (req, res) => {
  const input = explicarSchema.parse(req.body);
  const usuarioId = actor(req);
  if (!disponible()) throw new AppError(503, 'El asistente no está configurado.');
  if (!limite.adquirir(usuarioId)) {
    res.status(429).json({ error: { message: 'El asistente está ocupado. Intenta de nuevo más tarde.' } });
    return;
  }
  try {
    res.json({ data: await explicarIndicadores(input) });
  } finally {
    limite.liberar(usuarioId);
  }
});
