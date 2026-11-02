import { Router } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { authorize } from '../../../../middlewares/authorize.js';
import { ROLE_CODES } from '../../../../security/roles.js';
import { cambiarEstadoCuentaPortal, crearCuentaPortal, obtenerCuentaPortal, restablecerPasswordPortal } from '../portal.service.js';
import { actualizarCuentaPortalSchema, crearCuentaPortalSchema, restablecerCuentaPortalSchema } from '../portal.schema.js';

export const cuentasPortalRouter = Router({ mergeParams: true });
cuentasPortalRouter.use(authorize(ROLE_CODES.ADMIN));
function clienteId(req: { params: Record<string, string | undefined> }) {
  const id = Number(req.params.clienteId);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) throw new AppError(400, 'El cliente indicado no es válido.');
  return id;
}
cuentasPortalRouter.get('/', async (req, res) => {
  res.json({ data: await obtenerCuentaPortal(clienteId(req)) });
});
cuentasPortalRouter.post('/', async (req, res) => {
  const input = crearCuentaPortalSchema.parse(req.body);
  res.status(201).json({ data: await crearCuentaPortal(clienteId(req), input.identificador, input.password) });
});
cuentasPortalRouter.patch('/', async (req, res) => {
  const input = actualizarCuentaPortalSchema.parse(req.body);
  res.json({ data: await cambiarEstadoCuentaPortal(clienteId(req), input.version, input.activo) });
});
cuentasPortalRouter.post('/restablecer', async (req, res) => {
  const input = restablecerCuentaPortalSchema.parse(req.body);
  res.json({ data: await restablecerPasswordPortal(clienteId(req), input.version, input.password) });
});
