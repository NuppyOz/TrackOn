import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../shared/api'
import { DataTable, type DataTableColumn } from '../../erp-ui/components'
import { SemanticBadge } from '../../erp-ui/components'

type TipoHistorial = 'NOTA' | 'COTIZACION' | 'VENTA'
type HistorialComercial = Readonly<{
  id: string
  tipo: TipoHistorial
  fecha: string
  titulo: string
  descripcion: string
  referenciaId: number
}>
type PaginaHistorial = Readonly<{ items: HistorialComercial[]; pagina: number; limite: number; hayMas: boolean; alcance: 'COMERCIAL' }>
const LIMITE = 25
const nombres: Record<TipoHistorial, string> = { NOTA: 'Nota', COTIZACION: 'Cotización', VENTA: 'Venta' }
const fecha = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(parsed)
}
const mensaje = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo cargar el historial comercial.'

export function HistorialComercialPanel({ clienteId }: Readonly<{ clienteId: number }>) {
  const [items, setItems] = useState<HistorialComercial[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<TipoHistorial | ''>('')
  const [scope, setScope] = useState<PaginaHistorial['alcance']>('COMERCIAL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const load = useCallback(async (requestedPage = page) => {
    const request = ++requestId.current
    setLoading(true); setError('')
    const params = new URLSearchParams({ pagina: String(requestedPage), limite: String(LIMITE) })
    if (q.trim()) params.set('q', q.trim().slice(0, 100))
    if (tipo) params.set('tipo', tipo)
    try {
      const result = await api<PaginaHistorial>(`/api/comercial/clientes/${clienteId}/historial?${params}`)
      if (request !== requestId.current) return
      setItems(result.items); setPage(result.pagina); setHasMore(result.hayMas); setScope(result.alcance)
    } catch (cause) { if (request === requestId.current) setError(mensaje(cause)) }
    finally { if (request === requestId.current) setLoading(false) }
  }, [clienteId, page, q, tipo])

  useEffect(() => {
    let live = true
    queueMicrotask(() => { if (live) void load() })
    return () => { live = false; requestId.current += 1 }
  }, [load])

  const columns: DataTableColumn<HistorialComercial>[] = [
    { key: 'fecha', header: 'Fecha', render: row => fecha(row.fecha) },
    { key: 'tipo', header: 'Origen', render: row => <SemanticBadge label={nombres[row.tipo]} variant={row.tipo === 'NOTA' ? 'neutral' : row.tipo === 'COTIZACION' ? 'info' : 'success'} /> },
    { key: 'titulo', header: 'Registro', render: row => <div><strong>{row.titulo}</strong><small className="crm-muted crm-history__description">{row.descripcion}</small></div> },
    { key: 'referenciaId', header: 'Referencia', render: row => `${row.tipo === 'NOTA' ? 'N' : row.tipo === 'COTIZACION' ? 'C' : 'V'}-${row.referenciaId}` },
  ]
  return <section className="notas-doc crm-history" aria-label="Historial comercial">
    <header className="notas-doc__header"><div><h2>Historial comercial</h2><p>Actividad registrada en notas, cotizaciones y ventas del cliente.</p></div></header>
    <p className="crm-history__scope" role="note"><strong>Alcance: {scope.toLocaleLowerCase('es')}.</strong> Este historial incluye registros comerciales; no incluye servicios, finanzas ni contratos.</p>
    <label className="crm-history__type">Tipo<select aria-label="Filtrar historial por tipo" value={tipo} onChange={event => { setTipo(event.currentTarget.value as TipoHistorial | ''); setPage(1) }}><option value="">Todos los tipos</option><option value="NOTA">Notas</option><option value="COTIZACION">Cotizaciones</option><option value="VENTA">Ventas</option></select></label>
    <DataTable columns={columns} rows={items} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar', placeholder: 'Buscar en el historial' }}
      pagination={{ pagina: page, limite: LIMITE, hayMas: hasMore, onPageChange: value => setPage(value) }}
      state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: 'Historial no disponible', description: error }} onRetry={() => void load()}
      emptyTitle={q || tipo ? 'No hay resultados' : 'Todavía no hay actividad comercial'} emptyDescription={q || tipo ? 'Prueba con otro término o tipo de registro.' : 'Las notas, cotizaciones y ventas aparecerán aquí.'} />
  </section>
}
