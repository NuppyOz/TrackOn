import { AppError } from '../../../errors/AppError.js';
import * as comercial from '../comercial/comercial.service.js';
import * as financiero from '../financiero/financiero.service.js';
import * as logistico from '../logistico/logistico.service.js';
import * as calidad from '../calidad/calidad.service.js';
import { generarTextoDeepSeek, type DeepSeekDeps } from './deepseek.client.js';
import { explicarSchema, type ExplicarInput } from './asistente.schema.js';
import { proyectarTablero } from './asistente.proyeccion.js';

type Rango = { desde: string; hasta: string };
type Dependencias = DeepSeekDeps & {
  apiKey?: string;
  model?: string;
  reloj?: () => Date;
  obtenerTablero?: (area: ExplicarInput['area'], rango: Rango) => Promise<unknown>;
  generarTexto?: typeof generarTextoDeepSeek;
};

export function disponible(apiKey = process.env.DEEPSEEK_API_KEY) {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

async function obtenerTablero(area: ExplicarInput['area'], rango: Rango) {
  switch (area) {
    case 'comercial': return comercial.obtenerTablero(rango);
    case 'financiero': return financiero.obtenerTablero(rango);
    case 'logistico': return logistico.obtenerTablero(rango);
    case 'calidad': return calidad.obtenerTablero(rango);
  }
}

export async function explicarIndicadores(input: ExplicarInput, deps: Dependencias = {}) {
  const validado = explicarSchema.parse(input);
  const apiKey = deps.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!disponible(apiKey)) throw new AppError(503, 'El asistente no está configurado.');
  const tablero = await (deps.obtenerTablero ?? obtenerTablero)(validado.area, { desde: validado.desde, hasta: validado.hasta });
  const { proyeccion, snapshotId, fuentes } = proyectarTablero(validado.area, tablero);
  const texto = await (deps.generarTexto ?? generarTextoDeepSeek)(proyeccion, apiKey!.trim(), deps.model ?? process.env.DEEPSEEK_MODEL, deps);
  const generadaEn = (deps.reloj ?? (() => new Date()))().toISOString();
  return { texto, snapshotId, area: validado.area, desde: proyeccion.desde, hasta: proyeccion.hasta, corte: proyeccion.corte, fuentes, generadaEn };
}

export class LimiteConcurrenciaAsistente {
  private readonly usuarios = new Set<number>();
  private activas = 0;

  adquirir(usuarioId: number) {
    if (this.activas >= 2 || this.usuarios.has(usuarioId)) return false;
    this.activas += 1;
    this.usuarios.add(usuarioId);
    return true;
  }

  liberar(usuarioId: number) {
    if (!this.usuarios.delete(usuarioId)) return;
    this.activas -= 1;
  }

  estado() { return { activas: this.activas, usuarios: this.usuarios.size }; }
}
