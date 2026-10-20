export const LIMITE_CALIDAD = 25
export function managuaAhora(): string {
  const instant = new Date()
  return new Date(instant.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
}
export function managuaIso(value: string): string {
  if (!value) return ''
  const date = new Date(`${value}:00-06:00`)
  return Number.isNaN(date.getTime()) ? '' : `${value}:00-06:00`
}
export function fechaManagua(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(date)
}
export function validarId(value: number): boolean { return Number.isInteger(value) && value > 0 && value <= 2_147_483_647 }
export function nuevaClave(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}` }
