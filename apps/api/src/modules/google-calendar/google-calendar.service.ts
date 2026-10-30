import { randomBytes } from 'node:crypto';
import { AppError } from '../../errors/AppError.js';
import { prisma } from '../../infrastructure/prisma.js';
import { decryptToken, encryptToken } from './google-calendar.crypto.js';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TIME_ZONE = 'America/Managua';

function config() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri, webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:5173' };
}

function requireConfig() {
    const value = config();
    if (!value) throw new AppError(503, 'Google Calendar no está configurado en el servidor.');
    return value;
}

async function tokenRequest(parameters: URLSearchParams) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: parameters,
        signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string };
    if (!response.ok || !body.access_token) throw new AppError(502, body.error_description ?? 'Google no pudo autorizar la conexión.');
    return body;
}

export async function status(usuarioId: number) {
    const integration = await prisma.integracionGoogleCalendar.findUnique({
        where: { usuarioId }, select: { actualizadaEn: true, calendarId: true },
    });
    return { configurado: config() !== null, conectado: integration !== null, calendarId: integration?.calendarId ?? null, actualizadoEn: integration?.actualizadaEn ?? null };
}

export async function authorizationUrl(usuarioId: number) {
    const cfg = requireConfig();
    await prisma.estadoOAuthGoogle.deleteMany({ where: { expiraEn: { lt: new Date() } } });
    const state = randomBytes(32).toString('base64url');
    await prisma.estadoOAuthGoogle.create({ data: { id: state, usuarioId, expiraEn: new Date(Date.now() + 10 * 60_000) } });
    const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
        state,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
}

export async function completeAuthorization(code: string, state: string) {
    const cfg = requireConfig();
    const oauthState = await prisma.estadoOAuthGoogle.findUnique({ where: { id: state } });
    if (!oauthState || oauthState.expiraEn <= new Date()) throw new AppError(400, 'La solicitud de conexión con Google expiró o no es válida.');
    await prisma.estadoOAuthGoogle.delete({ where: { id: state } });
    const tokens = await tokenRequest(new URLSearchParams({
        code, client_id: cfg.clientId, client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri, grant_type: 'authorization_code',
    }));
    const existing = await prisma.integracionGoogleCalendar.findUnique({ where: { usuarioId: oauthState.usuarioId } });
    await prisma.integracionGoogleCalendar.upsert({
        where: { usuarioId: oauthState.usuarioId },
        create: {
            usuarioId: oauthState.usuarioId,
            accessTokenCifrado: encryptToken(tokens.access_token!),
            refreshTokenCifrado: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
            expiraEn: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            scope: tokens.scope ?? SCOPE,
        },
        update: {
            accessTokenCifrado: encryptToken(tokens.access_token!),
            refreshTokenCifrado: tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.refreshTokenCifrado,
            expiraEn: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            scope: tokens.scope ?? SCOPE,
        },
    });
    return cfg.webAppUrl;
}

export async function disconnect(usuarioId: number) {
    await prisma.integracionGoogleCalendar.deleteMany({ where: { usuarioId } });
    return { desconectado: true };
}

async function accessToken(usuarioId: number) {
    const integration = await prisma.integracionGoogleCalendar.findUnique({ where: { usuarioId } });
    if (!integration) throw new AppError(409, 'Primero conecta tu cuenta de Google Calendar.');
    if (!integration.expiraEn || integration.expiraEn.getTime() > Date.now() + 60_000) {
        return { integration, token: decryptToken(integration.accessTokenCifrado) };
    }
    if (!integration.refreshTokenCifrado) throw new AppError(409, 'Google requiere que vuelvas a conectar tu cuenta.');
    const cfg = requireConfig();
    const tokens = await tokenRequest(new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: decryptToken(integration.refreshTokenCifrado),
        grant_type: 'refresh_token',
    }));
    const updated = await prisma.integracionGoogleCalendar.update({
        where: { id: integration.id },
        data: {
            accessTokenCifrado: encryptToken(tokens.access_token!),
            expiraEn: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
    });
    return { integration: updated, token: tokens.access_token! };
}

type GoogleEventResponse = { id?: string; error?: { message?: string } };
async function googleEvent(token: string, url: string, method: 'POST' | 'PATCH', body: object) {
    const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as GoogleEventResponse;
    if (!response.ok || !result.id) throw new AppError(502, result.error?.message ?? 'No se pudo sincronizar una cita con Google Calendar.');
    return result.id;
}

export async function syncDay(usuarioId: number, dia: string) {
    const { integration, token } = await accessToken(usuarioId);
    const start = new Date(`${dia}T00:00:00-06:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60_000);
    const orders = await prisma.ordenTrabajo.findMany({
        where: { fechaProgramada: { gte: start, lt: end }, estadoCodigo: { not: 'CANCELADA' } },
        select: { id: true, numero: true, solicitud: true, fechaProgramada: true, clienteNombreRegistrado: true, ubicacionNombreRegistrado: true, direccionRegistrada: true },
        orderBy: { fechaProgramada: 'asc' },
    });
    let synchronized = 0;
    for (const order of orders) {
        if (!order.fechaProgramada) continue;
        const mapping = await prisma.eventoGoogleCalendar.findUnique({
            where: { integracionId_ordenId: { integracionId: integration.id, ordenId: order.id } },
        });
        const event = {
            summary: `TrackOn · OT-${order.numero}`,
            description: order.solicitud,
            location: `${order.ubicacionNombreRegistrado} · ${order.direccionRegistrada}`,
            start: { dateTime: order.fechaProgramada.toISOString(), timeZone: TIME_ZONE },
            end: { dateTime: new Date(order.fechaProgramada.getTime() + 60 * 60_000).toISOString(), timeZone: TIME_ZONE },
            extendedProperties: { private: { trackonOrdenId: String(order.id), trackonCliente: order.clienteNombreRegistrado } },
        };
        const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.calendarId)}/events`;
        const eventId = mapping
            ? await googleEvent(token, `${base}/${encodeURIComponent(mapping.googleEventId)}`, 'PATCH', event)
            : await googleEvent(token, base, 'POST', event);
        await prisma.eventoGoogleCalendar.upsert({
            where: { integracionId_ordenId: { integracionId: integration.id, ordenId: order.id } },
            create: { integracionId: integration.id, ordenId: order.id, googleEventId: eventId },
            update: { googleEventId: eventId, sincronizadoEn: new Date() },
        });
        synchronized++;
    }
    return { dia, sincronizadas: synchronized };
}
