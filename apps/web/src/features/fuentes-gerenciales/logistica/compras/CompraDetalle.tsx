import { useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { SemanticBadge } from '../../../erp-ui/components'
import { aEntradaManagua, aIsoManagua, fechaVisible } from '../articulos/fechas'
import type { CancelacionNueva, Compra, RecepcionNueva } from './compras.types'

type LineAction = { kind: 'receive' | 'cancel'; lineId: number } | null
export function CompraDetalle({ compra, busy, onBack, onReceive, onCancelPending }: Readonly<{ compra: Compra; busy: boolean; onBack: () => void; onReceive: (lineId: number, payload: RecepcionNueva) => Promise<boolean>; onCancelPending: (lineId: number, payload: CancelacionNueva) => Promise<boolean> }>) {
  const [action, setAction] = useState<LineAction>(null); const [reference, setReference] = useState(''); const [date, setDate] = useState(''); const [quantity, setQuantity] = useState(''); const [observation, setObservation] = useState(''); const [reason, setReason] = useState(''); const [error, setError] = useState('')
  const begin = (kind: 'receive' | 'cancel', lineId: number) => { setAction({ kind, lineId }); setReference(''); setDate(aEntradaManagua(new Date().toISOString())); setQuantity(''); setObservation(''); setReason(''); setError('') }
  const close = () => { if (busy) return; setAction(null); setError('') }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!action || busy) return
    const line = compra.lineas.find(item => item.id === action.lineId); if (!line) return
    const fechaEfectiva = aIsoManagua(date)
    if (action.kind === 'receive') {
      if (!reference.trim() || reference.trim().length > 100 || !fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now() || !quantityPattern.test(quantity) || Number(quantity) <= 0 || quantityToMilli(quantity) > quantityToMilli(line.pendiente) || observation.trim().length > 1000) { setError('Completa referencia, fecha, cantidad disponible y observación válida.'); return }
      if (new Date(fechaEfectiva).getTime() < new Date(compra.fechaEfectiva).getTime()) { setError('La recepción no puede ser anterior a la compra.'); return }
      const last = compra.recepciones.filter(item => item.lineaId === line.id).reduce<string | null>((value, item) => !value || new Date(item.fechaEfectiva).getTime() > new Date(value).getTime() ? item.fechaEfectiva : value, null)
      if (last && new Date(fechaEfectiva).getTime() < new Date(last).getTime()) { setError('La recepción debe ser igual o posterior a la última recepción de esta línea.'); return }
      if (!window.confirm(`Se recibirán ${quantity} ${line.unidad} de ${line.articuloCodigo} y se actualizará el saldo del artículo. ¿Continuar?`)) return
      const ok = await onReceive(line.id, { version: line.version, referencia: reference.trim().toUpperCase(), fechaEfectiva, cantidad: quantity, ...(observation.trim() ? { observacion: observation.trim() } : {}) })
      if (ok) setAction(null)
    } else {
      if (!fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now() || !reason.trim() || reason.trim().length > 1000) { setError('Indica una fecha válida y el motivo de cancelación (hasta 1000 caracteres).'); return }
      const last = compra.recepciones.filter(item => item.lineaId === line.id).reduce<string | null>((value, item) => !value || new Date(item.fechaEfectiva).getTime() > new Date(value).getTime() ? item.fechaEfectiva : value, null)
      const minimum = last ?? compra.fechaEfectiva
      if (new Date(fechaEfectiva).getTime() < new Date(minimum).getTime()) { setError('La cancelación debe ser igual o posterior a la compra y sus recepciones.'); return }
      if (!window.confirm(`Se cancelarán los ${line.pendiente} ${line.unidad} pendientes de ${line.articuloCodigo}. Lo recibido se conservará. ¿Continuar?`)) return
      const ok = await onCancelPending(line.id, { version: line.version, fechaEfectiva, motivo: reason.trim() })
      if (ok) setAction(null)
    }
  }
  const activeLine = action ? compra.lineas.find(item => item.id === action.lineId) : null
  return <section className="logistica__panel"><header className="logistica__detail-head"><div><h2>{compra.referencia} · {compra.proveedor}</h2><SemanticBadge label={compra.lineas.some(line => quantityToMilli(line.pendiente) > 0) ? 'Con pendientes' : 'Completada'} icon={compra.lineas.some(line => quantityToMilli(line.pendiente) > 0) ? '↗' : '✓'} variant={compra.lineas.some(line => quantityToMilli(line.pendiente) > 0) ? 'info' : 'success'} /></div><Button disabled={busy} onClick={onBack}>Volver a compras</Button></header>
    <dl className="logistica__facts"><div><dt>Fecha efectiva</dt><dd>{fechaVisible(compra.fechaEfectiva)}</dd></div><div><dt>Registrado</dt><dd>{fechaVisible(compra.registradoEn)}</dd></div><div><dt>Observación</dt><dd>{compra.observacion || 'Sin observación'}</dd></div></dl>
    {error && <p role="alert">{error}</p>}<h3>Líneas comprometidas</h3><div className="erp-ui__table-scroll" role="region" aria-label="Líneas de compra"><table className="erp-ui__table"><thead><tr><th>Artículo</th><th>Cantidad</th><th>Recibido</th><th>Pendiente</th><th>Costo unitario (NIO)</th><th>Prometida</th><th>Acciones</th></tr></thead><tbody>{compra.lineas.map(line => <tr key={line.id}><td>{line.articuloCodigo} · {line.articuloNombre} ({line.unidad})</td><td>{line.cantidad}</td><td>{line.recibido}</td><td>{line.pendiente}{line.cancelado !== '0.000' && ` · ${line.cancelado} cancelado`}</td><td>{line.costoUnitario}</td><td>{fechaVisible(line.prometidaEn)}</td><td><ActionMenu label={`Acciones para ${line.articuloCodigo}`}><button type="button" disabled={busy || quantityToMilli(line.pendiente) <= 0} onClick={() => begin('receive', line.id)}>Registrar recepción</button><button type="button" disabled={busy || quantityToMilli(line.pendiente) <= 0} onClick={() => begin('cancel', line.id)}>Cancelar pendiente</button></ActionMenu></td></tr>)}</tbody></table></div>
    {activeLine && action && <form className="logistica-b2__action-form" aria-label={action.kind === 'receive' ? 'Registrar recepción' : 'Cancelar pendiente'} onSubmit={event => void submit(event)}><h3>{action.kind === 'receive' ? `Recibir ${activeLine.articuloCodigo}` : `Cancelar pendiente de ${activeLine.articuloCodigo}`}</h3><fieldset disabled={busy}><legend>{action.kind === 'receive' ? `Pendiente: ${activeLine.pendiente} ${activeLine.unidad}` : `Se conservarán ${activeLine.recibido} ${activeLine.unidad} recibidos`}</legend>{action.kind === 'receive' ? <><label>Referencia de recepción<input value={reference} maxLength={100} onChange={event => setReference(event.target.value)} required /></label><label>Fecha efectiva<input type="datetime-local" step="1" min={aEntradaManagua(compra.fechaEfectiva)} value={date} onChange={event => setDate(event.target.value)} required /></label><label>Cantidad a recibir<input inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label><label>Observación (opcional)<textarea maxLength={1000} value={observation} onChange={event => setObservation(event.target.value)} /></label></> : <><label>Fecha de cancelación<input type="datetime-local" step="1" min={aEntradaManagua(compra.fechaEfectiva)} value={date} onChange={event => setDate(event.target.value)} required /></label><label>Motivo<textarea maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} required /></label></>}</fieldset>{error && <p role="alert">{error}</p>}<div className="logistica__actions"><Button type="submit" variant="primary" loading={busy}>{action.kind === 'receive' ? 'Confirmar recepción' : 'Confirmar cancelación'}</Button><Button type="button" disabled={busy} onClick={close}>Cancelar</Button></div></form>}
    <h3>Recepciones registradas</h3>{compra.recepciones.length ? <ul>{compra.recepciones.map(item => <li key={item.id}>{item.referencia} · {item.articuloCodigo}: {item.cantidad} {item.unidad} · {fechaVisible(item.fechaEfectiva)}{item.observacion ? ` · ${item.observacion}` : ''}</li>)}</ul> : <p>No hay recepciones registradas.</p>}
  </section>
}
const quantityPattern = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/
function quantityToMilli(value: string) { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 1000n + BigInt(fraction.padEnd(3, '0')) }
