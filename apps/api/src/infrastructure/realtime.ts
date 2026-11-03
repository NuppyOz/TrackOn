import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyAccessToken } from '../security/access-token.js';
import { validarSesionAutenticada } from '../modules/auth/auth.service.js';

export interface RealtimeEvent {
    type: string;
    resource?: string;
    action?: string;
    data?: Record<string, unknown>;
}

const clients = new Map<number, Set<WebSocket>>();

function protocols(request: IncomingMessage) {
    return (request.headers['sec-websocket-protocol'] ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
}

function reject(socket: Duplex, status = '401 Unauthorized') {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
}

function register(ws: WebSocket, usuarioId: number) {
    const userClients = clients.get(usuarioId) ?? new Set<WebSocket>();
    userClients.add(ws);
    clients.set(usuarioId, userClients);
    ws.send(JSON.stringify({ type: 'realtime.ready' }));
    ws.on('close', () => {
        userClients.delete(ws);
        if (userClients.size === 0) clients.delete(usuarioId);
    });
}

export function publishRealtime(event: RealtimeEvent, usuarioIds?: Iterable<number>) {
    const payload = JSON.stringify(event);
    const targets = usuarioIds ? [...usuarioIds].flatMap(id => [...(clients.get(id) ?? [])]) : [...clients.values()].flatMap(set => [...set]);
    for (const ws of targets) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
}

export function attachRealtimeServer(server: Server) {
    const wss = new WebSocketServer({ noServer: true, handleProtocols: requested => requested.has('trackon') ? 'trackon' : false });
    server.on('upgrade', (request, socket, head) => {
        if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/api/realtime') return reject(socket, '404 Not Found');
        const [protocol, token] = protocols(request);
        if (protocol !== 'trackon' || !token) return reject(socket);
        void (async () => {
            try {
                const verified = await verifyAccessToken(token);
                const auth = await validarSesionAutenticada(verified);
                wss.handleUpgrade(request, socket, head, ws => register(ws, auth.usuario.id));
            } catch {
                reject(socket);
            }
        })();
    });

    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }
    }, 30_000);
    server.on('close', () => clearInterval(heartbeat));
    return wss;
}
