import { createHash } from 'node:crypto';
import { Router, type Request } from 'express';
import { AppError } from '../../../errors/AppError.js';
import { claveIdempotencia } from '../../../infrastructure/idempotencia.js';
import { decisionPortalSchema, listadoPortalSchema, loginPortalSchema, portalIdSchema } from './portal.schema.js';
import { cerrarSesion, clearedCookieHeader, cookieHeader, cookieName, decisionCotizacionPortal, detalleCotizacionPortal, iniciarSesion, listarCotizacionesPortal, validarSesion } from './portal.service.js';

export const portalRouter = Router();

function cookie(req: Request) {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName()) continue;
    const value = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }
  return undefined;
}
function requireOrigin(req: Request) {
  const configured = process.env.PORTAL_ALLOWED_ORIGIN ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173');
  if (!configured) throw new Error('PORTAL_ALLOWED_ORIGIN debe configurarse en producción.');
  let trusted: string;
  try {
    const parsed = new URL(configured);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== configured || parsed.username || parsed.password) throw new Error('invalid origin');
    trusted = parsed.origin;
  } catch {
    throw new Error('PORTAL_ALLOWED_ORIGIN debe ser un origen absoluto http(s), sin ruta.');
  }
  const origin = req.get('Origin');
  if (origin !== undefined) {
    if (origin !== trusted) throw new AppError(403, 'El origen de la solicitud no está permitido.');
    return;
  }
  const site = req.get('Sec-Fetch-Site');
  if (site !== undefined && site !== 'same-origin' && site !== 'none') throw new AppError(403, 'El origen de la solicitud no está permitido.');
}

type Attempt = { count: number; expiresAt: number };
const loginAttempts = new Map<string, Attempt>();
const LIMIT = 10_000;
const WINDOW_MS = 15 * 60 * 1000;
function attemptKey(req: Request, identifier: string) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(`${ip}\0${identifier}`).digest('hex');
}
function allowedLogin(key: string) {
  const now = Date.now();
  for (const [entry, value] of loginAttempts) if (value.expiresAt <= now) loginAttempts.delete(entry);
  const found = loginAttempts.get(key);
  if (!found) return true;
  if (found.count >= 5) return false;
  return true;
}
function failedLogin(key: string) {
  const now = Date.now();
  const found = loginAttempts.get(key);
  if (found && found.expiresAt > now) found.count += 1;
  else loginAttempts.set(key, { count: 1, expiresAt: now + WINDOW_MS });
  while (loginAttempts.size > LIMIT) {
    const oldest = loginAttempts.keys().next().value;
    if (oldest === undefined) break;
    loginAttempts.delete(oldest);
  }
}

portalRouter.post('/login', async (req, res) => {
  requireOrigin(req);
  const input = loginPortalSchema.parse(req.body);
  const key = attemptKey(req, input.identificador);
  if (!allowedLogin(key)) {
    res.status(429).json({ error: { message: 'Demasiados intentos. Inténtalo más tarde.' } });
    return;
  }
  try {
    const result = await iniciarSesion(input.identificador, input.password);
    loginAttempts.delete(key);
    res.setHeader('Set-Cookie', cookieHeader(result.token));
    res.json({ data: result.data });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) failedLogin(key);
    throw error;
  }
});
portalRouter.get('/me', async (req, res) => {
  const session = await validarSesion(cookie(req));
  res.json({ data: session.data });
});
portalRouter.post('/logout', async (req, res) => {
  requireOrigin(req);
  await cerrarSesion(cookie(req));
  res.setHeader('Set-Cookie', clearedCookieHeader());
  res.status(204).end();
});
portalRouter.get('/cotizaciones', async (req, res) => {
  const session = await validarSesion(cookie(req));
  const input = listadoPortalSchema.parse(req.query);
  res.json({ data: await listarCotizacionesPortal(session.clienteId, input) });
});
portalRouter.get('/cotizaciones/:id', async (req, res) => {
  const session = await validarSesion(cookie(req));
  const { id } = portalIdSchema.parse(req.params);
  res.json({ data: await detalleCotizacionPortal(session.clienteId, id) });
});
portalRouter.post('/cotizaciones/:id/decision', async (req, res) => {
  requireOrigin(req);
  const session = await validarSesion(cookie(req));
  const { id } = portalIdSchema.parse(req.params);
  const input = decisionPortalSchema.parse(req.body);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.json({ data: await decisionCotizacionPortal(id, input, session.cuentaId, session.clienteId, key) });
});
