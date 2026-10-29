import type { FormEvent } from 'react'
import { Button } from '../../../../shared/ui'
import type { HerramientaNueva } from './herramientas.types'
export function HerramientaForm({ busy, onSave, onCancel }: Readonly<{ busy: boolean; onSave: (payload: HerramientaNueva) => Promise<boolean>; onCancel: () => void }>) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const codigo = String(data.get('codigo') ?? '').trim().toUpperCase(); const nombre = String(data.get('nombre') ?? '').trim(); if (!codigo || codigo.length > 60 || !nombre || nombre.length > 150) return; await onSave({ codigo, nombre }) }
  return <section className="logistica__panel"><h2>Nueva herramienta</h2><form aria-label="Nueva herramienta" onSubmit={event => void submit(event)}><fieldset disabled={busy}><legend>Identificación</legend><label>Código<input name="codigo" maxLength={60} required /></label><label>Nombre<input name="nombre" maxLength={150} required /></label></fieldset><div className="logistica__actions"><Button type="submit" variant="primary" loading={busy}>Crear herramienta</Button><Button type="button" disabled={busy} onClick={onCancel}>Cancelar</Button></div></form></section>
}
