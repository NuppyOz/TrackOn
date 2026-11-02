export function aIsoManagua(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null
  const normalized = value.length === 16 ? `${value}:00` : value
  const [datePart, timePart] = normalized.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute || check.getUTCSeconds() !== second) return null
  const parsed = new Date(`${normalized}-06:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function aEntradaManagua(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Date(parsed.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19)
}

export function fechaVisible(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no válida'
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(parsed)
}
