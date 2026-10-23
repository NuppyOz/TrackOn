import { AppError } from '../../../errors/AppError.js';
import type { ProyeccionAsistente } from './asistente.proyeccion.js';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 32_768;
const MAX_TEXT_CHARS = 4_000;
const SYSTEM_PROMPT = 'Eres un asistente de interpretación de indicadores empresariales. Responde en español con lenguaje claro y breve. Interpreta exclusivamente las métricas agregadas y el rango, corte y cobertura entregados. No recalcules cifras ni inventes causas, comparaciones, pronósticos o hechos ausentes. Si la cobertura es parcial o no hay base de cálculo, dilo claramente. No solicites ni reveles datos personales. No uses herramientas, SQL, acciones ni propongas escrituras. Presenta las cifras exactamente como fueron proporcionadas.';
const MENSAJE_ERROR = 'No se pudo generar la interpretación. Intenta de nuevo más tarde.';

export type DeepSeekFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type DeepSeekDeps = { fetcher?: DeepSeekFetch; timeoutSignal?: (timeoutMs: number) => AbortSignal };

async function leerAcotado(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('oversize');
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('oversize');
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error('oversize');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function extraerTexto(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) throw new Error('invalid');
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) throw new Error('invalid');
  const first = choices[0];
  if (typeof first !== 'object' || first === null || Array.isArray(first)) throw new Error('invalid');
  const message = (first as { message?: unknown }).message;
  if (typeof message !== 'object' || message === null || Array.isArray(message)) throw new Error('invalid');
  const content = (message as { content?: unknown }).content;
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > MAX_TEXT_CHARS) throw new Error('invalid');
  return content.trim();
}

export async function generarTextoDeepSeek(proyeccion: ProyeccionAsistente, apiKey: string, model?: string, deps: DeepSeekDeps = {}): Promise<string> {
  const fetcher = deps.fetcher ?? fetch;
  const modelo = model?.trim() || 'deepseek-flash';
  try {
    const signal = (deps.timeoutSignal ?? AbortSignal.timeout)(TIMEOUT_MS);
    const response = await fetcher(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(proyeccion) },
        ],
        stream: false,
        thinking: { type: 'disabled' },
        max_tokens: 800,
      }),
    });
    if (!response.ok) throw new Error('provider');
    const raw = await leerAcotado(response, MAX_RESPONSE_BYTES);
    return extraerTexto(JSON.parse(raw) as unknown);
  } catch {
    throw new AppError(503, MENSAJE_ERROR);
  }
}

export const mensajeDeepSeekError = MENSAJE_ERROR;
export const deepSeekTimeoutMs = TIMEOUT_MS;
