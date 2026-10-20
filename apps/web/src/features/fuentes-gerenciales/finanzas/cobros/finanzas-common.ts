export const LIMITE_FINANZAS = 25
export const textoError = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.'
export const claveIntencion = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
export const isoManagua = (value: string) => new Date(`${value}:00-06:00`).toISOString()
export const inputManagua = (value: string) => new Date(new Date(value).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
export const fechaVisible = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
export const centavos = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0')) }
export const dineroCentavos = (value: bigint) => {
  const sign = value < 0n ? '-' : ''
  const abs = value < 0n ? -value : value
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}
export const dinero = (value: string) => `C$ ${value}`
