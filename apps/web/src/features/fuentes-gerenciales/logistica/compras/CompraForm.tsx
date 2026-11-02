import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/ui'
import { listarArticulos } from '../articulos/articulos.api'
import type { Articulo } from '../articulos/articulos.types'
import { aIsoManagua } from '../articulos/fechas'
import type { CompraNueva, LineaCompraNueva } from './compras.types'

const LIMIT = 25
const qty = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/
const cost = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/
type DraftLine = { key: number; articulo: Articulo | null; cantidad: string; costoUnitario: string; prometida: string }
export function CompraForm({ busy, onSave, onCancel }: Readonly<{ busy: boolean; onSave: (payload: CompraNueva) => Promise<boolean>; onCancel: () => void }>) {
  const [supplier, setSupplier] = useState(''); const [reference, setReference] = useState(''); const [date, setDate] = useState(''); const [observation, setObservation] = useState('')
  const [articleQ, setArticleQ] = useState(''); const [articlePage, setArticlePage] = useState(1); const [articleMore, setArticleMore] = useState(false); const [articles, setArticles] = useState<Articulo[]>([])
  const [lines, setLines] = useState<DraftLine[]>([]); const [selectedArticleId, setSelectedArticleId] = useState(''); const [error, setError] = useState('')
  useEffect(() => { let live = true; listarArticulos({ q: articleQ.trim().slice(0, 100) || undefined, pagina: articlePage, limite: LIMIT }).then(data => { if (live) { setArticles(old => articlePage === 1 ? data.items : merge(old, data.items)); setArticleMore(data.hayMas) } }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los artículos.') }); return () => { live = false } }, [articleQ, articlePage])
  const addLine = () => { const article = articles.find(item => String(item.id) === selectedArticleId); if (!article) { setError('Selecciona un artículo del catálogo.'); return }; if (lines.some(line => line.articulo?.id === article.id)) { setError('Cada artículo puede aparecer una sola vez en la compra.'); return }; setLines(old => [...old, { key: Date.now(), articulo: article, cantidad: '', costoUnitario: '', prometida: '' }]); setSelectedArticleId(''); setError('') }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fechaEfectiva = aIsoManagua(date)
    if (!supplier.trim() || supplier.trim().length > 150 || !reference.trim() || reference.trim().length > 100 || !fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now() || lines.length < 1 || lines.length > 100) { setError('Completa proveedor, referencia, fecha válida y agrega entre 1 y 100 líneas.'); return }
    const result: LineaCompraNueva[] = []
    for (const line of lines) {
      const promised = aIsoManagua(line.prometida)
      if (!line.articulo || !qty.test(line.cantidad) || Number(line.cantidad) <= 0 || !cost.test(line.costoUnitario) || !promised || new Date(promised).getTime() < new Date(fechaEfectiva).getTime()) { setError('Cada línea requiere artículo, cantidad positiva, costo y fecha prometida igual o posterior a la compra.'); return }
      result.push({ articuloId: line.articulo.id, cantidad: line.cantidad, costoUnitario: line.costoUnitario, prometidaEn: promised })
    }
    if (observation.trim().length > 1000) { setError('La observación admite hasta 1000 caracteres.'); return }
    setError('')
    await onSave({ proveedor: supplier.trim().toUpperCase(), referencia: reference.trim().toUpperCase(), fechaEfectiva, ...(observation.trim() ? { observacion: observation.trim() } : {}), lineas: result })
  }
  const articleOptions = selectedArticleId && !articles.some(item => String(item.id) === selectedArticleId) ? lines.map(line => line.articulo).filter((item): item is Articulo => Boolean(item)) : articles
  return <section className="logistica__panel"><h2>Registrar compromiso de compra</h2>{error && <p role="alert">{error}</p>}<form aria-label="Nueva compra" onSubmit={event => void submit(event)}>
    <fieldset disabled={busy}><legend>Compromiso</legend><label>Proveedor<input value={supplier} maxLength={150} onChange={event => setSupplier(event.target.value)} required /></label><label>Referencia<input value={reference} maxLength={100} onChange={event => setReference(event.target.value)} required /></label><label>Fecha efectiva<input type="datetime-local" step="1" value={date} onChange={event => setDate(event.target.value)} required /></label><label>Observación (opcional)<textarea maxLength={1000} value={observation} onChange={event => setObservation(event.target.value)} /></label></fieldset>
    <fieldset disabled={busy}><legend>Líneas de compra ({lines.length}/100)</legend><label>Buscar artículo<input value={articleQ} maxLength={100} onChange={event => { setArticleQ(event.target.value); setArticlePage(1) }} /></label><label>Artículo<select aria-label="Artículo" value={selectedArticleId} onChange={event => setSelectedArticleId(event.target.value)}><option value="">Selecciona artículo</option>{articleOptions.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre} ({item.unidad})</option>)}</select></label><Button type="button" disabled={!selectedArticleId || lines.length >= 100} onClick={addLine}>Agregar línea</Button>{articleMore && <Button type="button" onClick={() => setArticlePage(value => value + 1)}>Más artículos</Button>}
      {lines.map(line => <div className="compra-line" key={line.key}><h3>{line.articulo?.codigo} · {line.articulo?.nombre} ({line.articulo?.unidad})</h3><label>Cantidad ({line.articulo?.unidad})<input inputMode="decimal" value={line.cantidad} onChange={event => updateLine(setLines, line.key, { cantidad: event.target.value })} required /></label><label>Costo unitario (hasta 6 decimales, NIO)<input inputMode="decimal" value={line.costoUnitario} onChange={event => updateLine(setLines, line.key, { costoUnitario: event.target.value })} required /></label><label>Fecha prometida<input type="datetime-local" step="1" min={date} value={line.prometida} onChange={event => updateLine(setLines, line.key, { prometida: event.target.value })} required /></label><Button type="button" disabled={busy} onClick={() => setLines(old => old.filter(item => item.key !== line.key))}>Quitar línea</Button></div>)}
    </fieldset><div className="logistica__actions"><Button variant="primary" type="submit" loading={busy}>Registrar compra</Button><Button type="button" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
  </form></section>
}
function updateLine(setLines: React.Dispatch<React.SetStateAction<DraftLine[]>>, key: number, changes: Partial<DraftLine>) { setLines(old => old.map(line => line.key === key ? { ...line, ...changes } : line)) }
function merge<T extends { id: number }>(old: T[], next: T[]) { const map = new Map(old.map(item => [item.id, item])); next.forEach(item => map.set(item.id, item)); return [...map.values()] }
