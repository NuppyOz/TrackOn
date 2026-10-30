import { api } from '../../shared/api';

export interface GoogleCalendarStatus {
    configurado: boolean;
    conectado: boolean;
    calendarId: string | null;
    actualizadoEn: string | null;
}

export function estadoGoogleCalendar() {
    return api<GoogleCalendarStatus>('/api/integraciones/google-calendar/status');
}

export function conectarGoogleCalendar() {
    return api<{ url: string }>('/api/integraciones/google-calendar/connect', { method: 'POST' });
}

export function desconectarGoogleCalendar() {
    return api<{ desconectado: boolean }>('/api/integraciones/google-calendar/connection', { method: 'DELETE' });
}

export function sincronizarGoogleCalendar(dia: string) {
    return api<{ jobId: string; estado: string }>('/api/integraciones/google-calendar/sync', {
        method: 'POST', body: JSON.stringify({ dia }),
    });
}
