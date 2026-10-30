import { getAccessToken } from './api';

export type RealtimeEvent = {
    type: string;
    resource?: string;
    action?: string;
    data?: Record<string, unknown>;
};

export function connectRealtime(onEvent: (event: RealtimeEvent) => void) {
    let socket: WebSocket | null = null;
    let stopped = false;
    let retry: number | undefined;

    const connect = () => {
        const token = getAccessToken();
        if (stopped || !token) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime`, ['trackon', token]);
        socket.onmessage = message => {
            try { onEvent(JSON.parse(message.data as string) as RealtimeEvent); }
            catch { /* Ignora mensajes que no respeten el contrato. */ }
        };
        socket.onclose = () => {
            if (!stopped) retry = window.setTimeout(connect, 2_000);
        };
    };

    connect();
    return () => {
        stopped = true;
        if (retry !== undefined) window.clearTimeout(retry);
        socket?.close();
    };
}
