import type { ChangeEventHandler } from 'react'

export function BusquedaSelector({ label, value, onChange, disabled = false }: Readonly<{ label: string; value: string; onChange: (value: string) => void; disabled?: boolean }>) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = event => onChange(event.currentTarget.value)
  return <label className="finanzas-h6__search">{label}<input type="search" value={value} disabled={disabled} onChange={handleChange} /></label>
}
