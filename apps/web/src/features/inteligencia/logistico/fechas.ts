export function isoManagua(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null
  const normalized = value.length === 16 ? `${value}:00` : value
  const [date, time] = normalized.split('T'); const [year, month, day] = date.split('-').map(Number); const [hour, minute, second] = time.split(':').map(Number)
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute || check.getUTCSeconds() !== second) return null
  return new Date(`${normalized}-06:00`).toISOString()
}
export function entradaManagua(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19)
}
export function ahoraManaguaIso() { return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19) }
export function fechaHora(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(parsed)
}
