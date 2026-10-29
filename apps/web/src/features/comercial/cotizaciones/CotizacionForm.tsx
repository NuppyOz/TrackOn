import { useEffect, useState, type FormEvent } from 'react'
import { listarContactos, type ContactoComercial } from '../crm/crm.api'
import { listarConceptos, type ConceptoComercial } from '../tarifas/tarifas.api'
import { Button } from '../../../shared/ui'
import type { Cotizacion, CotizacionDraft, CotizacionPatch, LineaCotizacionInput } from './cotizaciones.types'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'

const LIMITE = 25
type LineDraft = { conceptoId: string; cantidad: string; descuento: string }
const cantidadValida = (value: string) => /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(value) && Number(value) > 0
const descuentoValido = (value: string) => /^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(value)
function fechaLocal(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

export function CotizacionForm({ quote, clients, busy, onSave, onCancel }: Readonly<{
  quote: Cotizacion | null; clients: Cliente[]; busy: boolean; onSave: (draft: CotizacionDraft | CotizacionPatch) => Promise<void>; onCancel: () => void
}>) {
  const editing = quote !== null
  const [clientId, setClientId] = useState(quote ? String(quote.clienteId) : '')
  const [contactId, setContactId] = useState(quote?.contactoId ? String(quote.contactoId) : '')
  const [contacts, setContacts] = useState<ContactoComercial[]>([])
  const [contactPage, setContactPage] = useState(1); const [contactMore, setContactMore] = useState(false)
  const [concepts, setConcepts] = useState<ConceptoComercial[]>([])
  const [conceptPage, setConceptPage] = useState(1); const [conceptMore, setConceptMore] = useState(false); const [conceptQ, setConceptQ] = useState('')
  const [lines, setLines] = useState<LineDraft[]>(quote ? quote.lineas.map(line => ({ conceptoId: String(line.conceptoId), cantidad: line.cantidad, descuento: line.descuento })) : [{ conceptoId: '', cantidad: '1', descuento: '0' }])
  const [replaceLines, setReplaceLines] = useState(false); const [error, setError] = useState('')
  const [venceEn, setVenceEn] = useState(quote ? fechaLocal(quote.venceEn) : '')
  const [nota, setNota] = useState(quote?.nota ?? '')

  useEffect(() => {
    if (!clientId) return
    let live = true
    listarContactos(Number(clientId), { pagina: contactPage, limite: LIMITE, sortBy: 'nombre', sortDir: 'asc' })
      .then(result => { if (live) { setContacts(previous => contactPage === 1 ? result.items.filter(item => item.activo) : mergeById(previous, result.items.filter(item => item.activo))); setContactMore(result.hayMas) } })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los contactos.') })
    return () => { live = false }
  }, [clientId, contactPage])
  useEffect(() => {
    let live = true
    listarConceptos({ q: conceptQ.trim().slice(0, 100) || undefined, estado: 'activos', pagina: conceptPage, limite: LIMITE, sortBy: 'nombre', sortDir: 'asc' })
      .then(result => { if (live) { setConcepts(previous => mergeById(previous, result.items)); setConceptMore(result.hayMas) } })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los conceptos.') })
    return () => { live = false }
  }, [conceptQ, conceptPage])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return
    const customerId = Number(clientId); const expiresAt = new Date(venceEn)
    if (!customerId || !Number.isInteger(customerId)) { setError('Selecciona un cliente.'); return }
    if (!venceEn || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) { setError('El vencimiento debe ser una fecha futura válida.'); return }
    if (nota.trim().length > 2000) { setError('La nota admite hasta 2000 caracteres.'); return }
    if ((!editing || replaceLines) && lines.length && !lines.every(line => Number.isInteger(Number(line.conceptoId)) && Number(line.conceptoId) > 0 && cantidadValida(line.cantidad) && descuentoValido(line.descuento))) { setError('Revisa conceptos, cantidades (hasta 3 decimales) y descuentos (hasta 2).'); return }
    const iso = expiresAt.toISOString()
    const inputLines: LineaCotizacionInput[] = lines.map(line => ({ conceptoId: Number(line.conceptoId), cantidad: line.cantidad, descuento: line.descuento }))
    setError('')
    if (quote) {
      const patch: CotizacionPatch = {
        version: quote.version,
        ...(contactId !== String(quote.contactoId ?? '') ? { contactoId: contactId ? Number(contactId) : null } : {}),
        ...(venceEn !== fechaLocal(quote.venceEn) ? { venceEn: iso } : {}),
        ...(nota.trim() !== (quote.nota ?? '') ? { nota: nota.trim() || null } : {}),
        ...(replaceLines ? { lineas: inputLines } : {}),
      }
      if (Object.keys(patch).length === 1) { setError('No hay cambios para guardar.'); return }
      await onSave(patch)
    } else {
      const draft: CotizacionDraft = { clienteId: customerId, ...(contactId ? { contactoId: Number(contactId) } : {}), venceEn: iso, lineas: inputLines, ...(nota.trim() ? { nota: nota.trim() } : {}) }
      await onSave(draft)
    }
  }

  return <section className="cotizaciones__panel"><h2>{quote ? `Editar C-${quote.id}` : 'Nueva cotización'}</h2>{error && <p role="alert">{error}</p>}<form aria-label={quote ? 'Editar cotización' : 'Nueva cotización'} onSubmit={event => void handleSubmit(event)}>
    <fieldset disabled={busy} className="cotizaciones__form-fields"><label>Cliente<select aria-label="Cliente" value={clientId} disabled={editing} onChange={event => { setClientId(event.target.value); setContactId(''); setContacts([]); setContactPage(1) }} required><option value="">Selecciona un cliente</option>{clients.filter(client => client.activo).map(client => <option key={client.id} value={client.id}>{nombreCliente(client)} · {client.codigo}</option>)}</select></label>
    <label>Contacto<select name="contactoId" aria-label="Contacto" value={contactId} onChange={event => setContactId(event.target.value)}><option value="">Sin contacto</option>{quote?.contactoId && !contacts.some(contact => contact.id === quote.contactoId) && <option value={quote.contactoId}>Contacto actual (histórico)</option>}{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.nombre}</option>)}</select></label>
    {contactMore && <Button type="button" onClick={() => setContactPage(value => value + 1)}>Más contactos</Button>}
    <label>Vence en<input name="venceEn" type="datetime-local" step="1" required value={venceEn} onChange={event => setVenceEn(event.target.value)} /></label>
    <label>Nota interna<textarea name="nota" maxLength={2000} value={nota} onChange={event => setNota(event.target.value)} /></label>
    {(!quote || replaceLines) && <fieldset><legend>Líneas ({lines.length}/100)</legend><label>Buscar concepto<input aria-label="Buscar concepto" value={conceptQ} onChange={event => { setConceptQ(event.target.value.slice(0, 100)); setConceptPage(1) }} /></label>{lines.map((line, index) => <div className="cotizaciones__line" key={index}>
      <label>Concepto<select aria-label={`Concepto línea ${index + 1}`} value={line.conceptoId} onChange={event => setLines(value => value.map((current, i) => i === index ? { ...current, conceptoId: event.target.value } : current))}><option value="">Selecciona concepto</option>{line.conceptoId && quote && !concepts.some(concept => concept.id === Number(line.conceptoId)) && <option value={line.conceptoId}>{quote.lineas.find(item => item.conceptoId === Number(line.conceptoId))?.descripcion ?? 'Concepto actual'} (registrado)</option>}{concepts.map(concept => <option key={concept.id} value={concept.id}>{concept.codigo} · {concept.nombre} ({concept.unidad})</option>)}</select></label>
      <label>Cantidad<input aria-label={`Cantidad línea ${index + 1}`} value={line.cantidad} inputMode="decimal" onChange={event => setLines(value => value.map((current, i) => i === index ? { ...current, cantidad: event.target.value } : current))} /></label>
      <label>Descuento NIO<input aria-label={`Descuento línea ${index + 1}`} value={line.descuento} inputMode="decimal" onChange={event => setLines(value => value.map((current, i) => i === index ? { ...current, descuento: event.target.value } : current))} /></label>
      <button type="button" onClick={() => setLines(value => value.filter((_, i) => i !== index))}>Quitar línea</button>
    </div>)}{conceptMore && <Button type="button" onClick={() => setConceptPage(value => value + 1)}>Más conceptos</Button>}{lines.length < 100 && <Button type="button" onClick={() => setLines(value => [...value, { conceptoId: '', cantidad: '1', descuento: '0' }])}>Agregar línea</Button>}<p>Al guardar se aplicarán las tarifas vigentes y se actualizarán los totales.</p></fieldset>}
    {quote && <label className="cotizaciones__warning"><input type="checkbox" checked={replaceLines} onChange={event => setReplaceLines(event.target.checked)} /> Reemplazar líneas y volver a resolver las tarifas. Esta acción actualiza sus precios.</label>}
    </fieldset><div className="cotizaciones__buttons"><Button variant="primary" type="submit" loading={busy}>{quote ? 'Guardar cambios' : 'Crear borrador'}</Button><Button type="button" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
  </form></section>
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map(item => [item.id, item]))
  incoming.forEach(item => byId.set(item.id, item))
  return [...byId.values()]
}
