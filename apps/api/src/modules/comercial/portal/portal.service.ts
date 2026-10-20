import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import { hashPassword, verifyPassword } from '../../../security/password.js';
import { decidirCotizacion, obtenerCotizacionPortal } from '../cotizaciones/application/cotizaciones.service.js';
import type { EstadoCotizacionPersistido } from '../cotizaciones/domain/estado.js';

const COOKIE = 'trackon_portal';
const COOKIE_LIFETIME = 7 * 24 * 60 * 60 * 1000;
const safeDate = (value: Date | null) => value?.toISOString() ?? null;
const accountDto = (row: { id: number; clienteId: number; identificador: string; activo: boolean; version: number; creadaEn: Date }) => ({
  id: row.id, clienteId: row.clienteId, identificador: row.identificador, activo: row.activo, version: row.version, creadaEn: row.creadaEn.toISOString(),
});
const clientName = (cliente: { persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } | null; organizacion: { nombreComercial: string | null; razonSocial: string } | null }) => cliente.organizacion?.nombreComercial?.trim() || cliente.organizacion?.razonSocial || [cliente.persona?.firstName, cliente.persona?.secondName, cliente.persona?.firstLastName, cliente.persona?.secondLastName].filter(Boolean).join(' ');

export async function obtenerCuentaPortal(clienteId: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  const row = await prisma.cuentaPortal.findUnique({ where: { clienteId } });
  return row ? accountDto(row) : null;
}
export async function crearCuentaPortal(clienteId: number, identificador: string, password: string) {
  try {
    const passwordHash = await hashPassword(password);
    const row = await prisma.$transaction(async tx => {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true, activo: true } });
      if (!cliente) throw new AppError(404, 'El cliente no existe.');
      if (!cliente.activo) throw new AppError(409, 'Solo se puede crear una cuenta para un cliente activo.');
      return tx.cuentaPortal.create({ data: { clienteId, identificador, passwordHash } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return accountDto(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'Ya existe una cuenta o identificador portal.');
    throw error;
  }
}
export async function cambiarEstadoCuentaPortal(clienteId: number, version: number, activo: boolean) {
  return prisma.$transaction(async tx => {
    const account = await tx.cuentaPortal.findUnique({ where: { clienteId } });
    if (!account) throw new AppError(404, 'La cuenta portal no existe.');
    if (account.version !== version) throw new AppError(409, 'La cuenta cambió. Actualiza la página e inténtalo de nuevo.');
    if (activo) {
      const client = await tx.cliente.findUnique({ where: { id: clienteId }, select: { activo: true } });
      if (!client?.activo) throw new AppError(409, 'Solo se puede activar una cuenta para un cliente activo.');
    }
    const changed = await tx.cuentaPortal.updateMany({ where: { id: account.id, version }, data: { activo, version: { increment: 1 } } });
    if (changed.count !== 1) throw new AppError(409, 'La cuenta cambió. Actualiza la página e inténtalo de nuevo.');
    if (!activo) await tx.sesionPortal.updateMany({ where: { cuentaId: account.id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    const row = await tx.cuentaPortal.findUniqueOrThrow({ where: { id: account.id } });
    return accountDto(row);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function restablecerPasswordPortal(clienteId: number, version: number, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async tx => {
    const account = await tx.cuentaPortal.findUnique({ where: { clienteId } });
    if (!account) throw new AppError(404, 'La cuenta portal no existe.');
    const changed = await tx.cuentaPortal.updateMany({ where: { id: account.id, version }, data: { passwordHash, version: { increment: 1 } } });
    if (changed.count !== 1) throw new AppError(409, 'La cuenta cambió. Actualiza la página e inténtalo de nuevo.');
    const now = new Date();
    await tx.sesionPortal.updateMany({ where: { cuentaId: account.id, revocadaEn: null }, data: { revocadaEn: now } });
    return accountDto(await tx.cuentaPortal.findUniqueOrThrow({ where: { id: account.id } }));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function cookieName() { return COOKIE; }
export function cookieHeader(token: string, secure = process.env.NODE_ENV === 'production') {
  return `${COOKIE}=${token}; Path=/api/portal; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(COOKIE_LIFETIME / 1000)}${secure ? '; Secure' : ''}`;
}
export function clearedCookieHeader(secure = process.env.NODE_ENV === 'production') {
  return `${COOKIE}=; Path=/api/portal; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export async function iniciarSesion(identificador: string, password: string) {
  const account = await prisma.cuentaPortal.findUnique({ where: { identificador }, include: { cliente: { include: { persona: true, organizacion: true } } } });
  const valid = account ? await verifyPassword(password, account.passwordHash) : false;
  if (!account || !valid || !account.activo || !account.cliente.activo) throw new AppError(401, 'Identificador o contraseña incorrectos.');
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  try {
    await prisma.$transaction(async tx => {
      const current = await tx.cuentaPortal.findUnique({ where: { id: account.id }, include: { cliente: { select: { activo: true } } } });
      if (!current || current.version !== account.version || current.passwordHash !== account.passwordHash || !current.activo || !current.cliente.activo) {
        throw new AppError(401, 'Identificador o contraseña incorrectos.');
      }
      await tx.sesionPortal.create({ data: { cuentaId: account.id, tokenHash: tokenHash(token), creadaEn: now, expiraEn: new Date(now.getTime() + COOKIE_LIFETIME) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(401, 'Identificador o contraseña incorrectos.');
    throw error;
  }
  return { token, data: { cuenta: { id: account.id, identificador: account.identificador }, cliente: { id: account.clienteId, nombre: clientName(account.cliente) } } };
}
export async function validarSesion(token: string | undefined) {
  if (!token) throw new AppError(401, 'La sesión del portal no está activa.');
  const session = await prisma.sesionPortal.findUnique({ where: { tokenHash: tokenHash(token) }, include: { cuenta: { include: { cliente: { include: { persona: true, organizacion: true } } } } } });
  const now = new Date();
  if (!session || session.revocadaEn || session.expiraEn <= now || !session.cuenta.activo || !session.cuenta.cliente.activo) throw new AppError(401, 'La sesión del portal no está activa.');
  return { cuentaId: session.cuenta.id, clienteId: session.cuenta.clienteId, data: { cuenta: { id: session.cuenta.id, identificador: session.cuenta.identificador }, cliente: { id: session.cuenta.clienteId, nombre: clientName(session.cuenta.cliente) } } };
}
export async function cerrarSesion(token: string | undefined) {
  if (!token) return;
  await prisma.sesionPortal.updateMany({ where: { tokenHash: tokenHash(token), revocadaEn: null }, data: { revocadaEn: new Date() } });
}

const effective = (estado: string, venceEn: Date, now: Date): EstadoCotizacionPersistido | 'VENCIDA' => estado === 'ENVIADA' && venceEn <= now ? 'VENCIDA' : estado as EstadoCotizacionPersistido;
export async function listarCotizacionesPortal(clienteId: number, input: { pagina: number; limite: number; estado?: 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA' }) {
  const now = new Date();
  const states = input.estado === 'VENCIDA' ? [{ estado: 'ENVIADA', venceEn: { lte: now } }]
    : input.estado === 'ENVIADA' ? [{ estado: 'ENVIADA', venceEn: { gt: now } }]
      : input.estado ? [{ estado: input.estado }]
        : [{ estado: { in: ['ENVIADA', 'APROBADA', 'RECHAZADA'] } }];
  const rows = await prisma.cotizacionComercial.findMany({
    where: { clienteId, OR: states },
    orderBy: [{ enviadaEn: 'desc' }, { id: 'desc' }],
    skip: (input.pagina - 1) * input.limite,
    take: input.limite + 1,
    select: { id: true, version: true, estado: true, moneda: true, total: true, venceEn: true, enviadaEn: true, decididaEn: true },
  });
  const visible = rows.slice(0, input.limite).map(row => ({ id: row.id, version: row.version, estadoPersistido: row.estado, estadoEfectivo: effective(row.estado, row.venceEn, now), moneda: row.moneda, total: row.total.toFixed(2), venceEn: safeDate(row.venceEn), enviadaEn: safeDate(row.enviadaEn), decididaEn: safeDate(row.decididaEn), accionesPermitidas: { decidir: row.estado === 'ENVIADA' && row.venceEn > now } }));
  return { items: visible, pagina: input.pagina, limite: input.limite, hayMas: rows.length > input.limite };
}
export async function detalleCotizacionPortal(clienteId: number, id: number) { return obtenerCotizacionPortal(clienteId, id); }
export async function decisionCotizacionPortal(id: number, datos: { version: number; decision: 'APROBADA' | 'RECHAZADA'; comentario?: string }, cuentaId: number, clienteId: number, key: string) {
  return decidirCotizacion(id, datos, { tipo: 'PORTAL', cuentaId, clienteId }, key);
}
