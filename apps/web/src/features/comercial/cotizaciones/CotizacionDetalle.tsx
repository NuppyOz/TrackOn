import { useState } from 'react'
import { Button } from '../../../shared/ui'
import { EstadoCotizacionBadge } from './EstadoCotizacionBadge'
import type { Cotizacion } from './cotizaciones.types'

const money = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return `C$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}
const date = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(parsed)
}

export function CotizacionDetalle({ quote, busy, onEdit, onSend, onDecision, onNote, onBack, onConvert, onOpenVenta }: Readonly<{
  quote: Cotizacion; busy: boolean; onEdit: () => void; onSend: () => void; onDecision: (decision: 'APROBADA' | 'RECHAZADA') => void; onNote: (text: string) => Promise<boolean>; onBack: () => void; onConvert?: () => void; onOpenVenta?: () => void
}>) {
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  return <section className="cotizaciones__panel"><div className="cotizaciones__detail-heading"><div><h2>C-{quote.id} · {quote.clienteNombreRegistrado}</h2><EstadoCotizacionBadge estado={quote.estadoEfectivo} /></div><div>{quote.accionesPermitidas.editar && <Button disabled={busy} onClick={onEdit}>Editar borrador</Button>} {quote.accionesPermitidas.enviar && <Button variant="primary" disabled={busy} onClick={onSend}>Enviar cotización</Button>} {quote.accionesPermitidas.decidir && <><Button disabled={busy} onClick={() => onDecision('APROBADA')}>Aprobar</Button><Button variant="danger" disabled={busy} onClick={() => onDecision('RECHAZADA')}>Rechazar</Button></>}{quote.accionesPermitidas.convertirVenta && onConvert && <Button variant="primary" disabled={busy} onClick={onConvert}>Convertir a venta</Button>}{quote.ventaId && onOpenVenta && <Button disabled={busy} onClick={onOpenVenta}>Ver venta V-{quote.ventaId}</Button>}</div></div>
    <dl className="cotizaciones__facts"><div><dt>Identificación registrada</dt><dd>{quote.clienteIdentificacionRegistrada ?? '—'}</dd></div><div><dt>Vence</dt><dd>{date(quote.venceEn)}</dd></div>{quote.enviadaEn && <div><dt>Enviada</dt><dd>{date(quote.enviadaEn)}</dd></div>}{quote.decididaEn && <div><dt>Decidida</dt><dd>{date(quote.decididaEn)}</dd></div>}<div><dt>Venta asociada</dt><dd>{quote.ventaId ?? '—'}</dd></div>{quote.decisionComentario && <div><dt>Comentario de decisión</dt><dd>{quote.decisionComentario}</dd></div>}</dl>
    <div className="cotizaciones__table-wrap"><table><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Total</th></tr></thead><tbody>{quote.lineas.map(line => <tr key={line.id}><td>{line.descripcion}</td><td>{line.cantidad} {line.unidad}</td><td>{money(line.precio)}</td><td>{money(line.descuento)}</td><td>{money(line.total)}</td></tr>)}</tbody></table></div><p className="cotizaciones__total">Total: {money(quote.total)}</p>
    <section><h3>Notas internas</h3>{quote.notas.map(note => <article className="cotizaciones__note" key={note.id}><p>{note.texto}</p><small>{note.autor.nombre} · {date(note.creadaEn)}</small></article>)}{addingNote ? <form onSubmit={event => { event.preventDefault(); void onNote(noteText).then(success => { if (success) { setNoteText(''); setAddingNote(false) } }) }}><label>Agregar nota<textarea aria-label="Agregar nota interna" maxLength={2000} value={noteText} onChange={event => setNoteText(event.target.value)} /></label><Button type="submit" disabled={busy || !noteText.trim()}>Guardar nota</Button><Button type="button" disabled={busy} onClick={() => setAddingNote(false)}>Cancelar</Button></form> : <Button disabled={busy} onClick={() => setAddingNote(true)}>Añadir nota interna</Button>}</section>
    <Button disabled={busy} onClick={onBack}>Volver a cotizaciones</Button>
  </section>
}
