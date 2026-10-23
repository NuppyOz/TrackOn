export function isoManagua(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null
  const normalized = value.length === 16 ? `${value}:00` : value
  const [date, time] = normalized.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute, secondText] = time.split(':')
  const [second, fraction = ''] = secondText.split('.')
  const secondNumber = Number(second); const milliseconds = Number(fraction.padEnd(3, '0'))
  const check = new Date(Date.UTC(year, month - 1, day, Number(hour), Number(minute), secondNumber, milliseconds))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || check.getUTCHours() !== Number(hour) || check.getUTCMinutes() !== Number(minute) || check.getUTCSeconds() !== secondNumber || check.getUTCMilliseconds() !== milliseconds) return null
  return new Date(`${normalized}-06:00`).toISOString()
}
export function managuaLocal(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : new Date(parsed.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19)
}
export function fechaHora(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Managua' }).format(parsed)
}
export function initialRange() {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86_400_000)
  const toLocal = (instant: Date) => new Date(instant.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19)
  return { desde: isoManagua(toLocal(from))!, hasta: isoManagua(toLocal(now))! }
}
