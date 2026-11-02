import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DataTable, type DataTableColumn, type SortDirection } from '../../erp-ui/components'
import { crearDocumento, crearNota, listarDocumentos, listarNotas, type DocumentoComercial, type NotaComercial } from './crm.api'
import './notas-documentos.css'

export type NotasDocumentosPanelProps = Readonly<{
  clienteId: number
  activo: boolean
  seccion: 'notas' | 'documentos'
}>

type Resultado<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
type Estado = 'loading' | 'ready' | 'error'
const LIMITE = 10

function fecha(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(parsed)
}

function mensaje(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.'
}

function urlSegura(value: string | null) {
  if (!value) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

export function NotasDocumentosPanel(props: NotasDocumentosPanelProps) {
  return <NotasDocumentosPanelBody key={`${props.clienteId}/${props.seccion}`} {...props} />
}

function NotasDocumentosPanelBody({ clienteId, activo, seccion }: NotasDocumentosPanelProps) {
  const [items, setItems] = useState<Array<NotaComercial | DocumentoComercial>>([])
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [estado, setEstado] = useState<Estado>('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'creadaEn'>('creadaEn')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [texto, setTexto] = useState('')
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [url, setUrl] = useState('')
  const [nota, setNota] = useState('')
  const requestId = useRef(0)
  const submitLock = useRef(false)

  const cargar = useCallback(async (paginaSolicitada = pagina) => {
    const currentRequest = ++requestId.current
    setEstado('loading')
    setError('')
    try {
      const filtros = { q: query.trim() || undefined, pagina: paginaSolicitada, limite: LIMITE, sortBy, sortDir }
      const resultado: Resultado<NotaComercial | DocumentoComercial> = seccion === 'notas'
        ? await listarNotas(clienteId, filtros)
        : await listarDocumentos(clienteId, filtros)
      if (requestId.current !== currentRequest) return
      setItems(resultado.items)
      setPagina(resultado.pagina)
      setHayMas(resultado.hayMas)
      setEstado('ready')
    } catch (cause) {
      if (requestId.current !== currentRequest) return
      setError(mensaje(cause))
      setEstado('error')
    }
  }, [clienteId, pagina, query, seccion, sortBy, sortDir])

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => { if (mounted) void cargar() })
    return () => { mounted = false; requestId.current += 1 }
  }, [cargar])

  const title = seccion === 'notas' ? 'Notas comerciales' : 'Documentos de referencia'
  const openForm = () => {
    setFormError('')
    setSuccess('')
    setFormOpen(true)
  }
  const onSearch = (value: string) => {
    setQuery(value.slice(0, 100))
    setPagina(1)
  }
  const onSort = (key: string, direction: SortDirection) => {
    setSortBy(key as 'id' | 'creadaEn')
    setSortDir(direction)
    setPagina(1)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activo || submitLock.current || saving) return
    setFormError('')
    const cleanTexto = texto.trim()
    const cleanTitulo = titulo.trim()
    const cleanTipo = tipo.trim()
    const cleanUrl = url.trim()
    const cleanNota = nota.trim()
    if (seccion === 'notas') {
      if (!cleanTexto || cleanTexto.length > 2000) { setFormError('Escribe una nota de 1 a 2000 caracteres.'); return }
    } else {
      if (!cleanTitulo || cleanTitulo.length > 150) { setFormError('El título es obligatorio y admite hasta 150 caracteres.'); return }
      if (!cleanTipo || cleanTipo.length > 60) { setFormError('El tipo es obligatorio y admite hasta 60 caracteres.'); return }
      if (cleanNota.length > 500) { setFormError('La nota admite hasta 500 caracteres.'); return }
      if (cleanUrl.length > 2048) { setFormError('La URL admite hasta 2048 caracteres.'); return }
      if (cleanUrl) {
        try {
          if (new URL(cleanUrl).protocol !== 'https:') throw new Error()
        } catch { setFormError('La URL debe ser válida y comenzar con HTTPS.'); return }
      }
    }
    submitLock.current = true
    setSaving(true)
    try {
      if (seccion === 'notas') await crearNota(clienteId, { texto: cleanTexto })
      else await crearDocumento(clienteId, { titulo: cleanTitulo, tipo: cleanTipo, url: cleanUrl || null, nota: cleanNota || null })
      setFormOpen(false)
      setTexto(''); setTitulo(''); setTipo(''); setUrl(''); setNota('')
      setSuccess(seccion === 'notas' ? 'Nota guardada.' : 'Referencia documental guardada.')
      setPagina(1)
      await cargar(1)
    } catch (cause) {
      setFormError(mensaje(cause))
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  const columns = useMemo<readonly DataTableColumn<NotaComercial | DocumentoComercial>[]>(() => seccion === 'notas' ? [
    { key: 'contenido', header: 'Nota', render: (row) => <div className="notas-doc__content"><p>{(row as NotaComercial).texto}</p><small>Autor #{row.autorId}</small></div> },
    { key: 'creadaEn', header: 'Fecha', sortable: true, render: row => fecha(row.creadaEn) },
  ] : [
    { key: 'titulo', header: 'Documento', render: (row) => { const doc = row as DocumentoComercial; return <div className="notas-doc__content"><strong>{doc.titulo}</strong><small>{doc.tipo} · Autor #{doc.autorId}</small>{doc.nota && <p>{doc.nota}</p>}</div> } },
    { key: 'referencia', header: 'Referencia', render: row => { const doc = row as DocumentoComercial; return urlSegura(doc.url) ? <a href={doc.url!} target="_blank" rel="noopener noreferrer">Abrir referencia<span className="notas-doc__sr-only">: {doc.titulo}</span></a> : <span>Sin enlace</span> } },
    { key: 'creadaEn', header: 'Fecha', sortable: true, render: row => fecha(row.creadaEn) },
  ], [seccion])

  const visibleItems = items.filter(item => item.clienteId === clienteId)
  return <section className="notas-doc" aria-label={title}>
    <header className="notas-doc__header">
      <div><h2>{title}</h2><p>{seccion === 'notas' ? 'Seguimiento y contexto de la relación comercial.' : 'Referencias documentales asociadas al cliente.'}</p></div>
      {activo && !formOpen && <button type="button" className="notas-doc__primary" onClick={openForm}>Añadir {seccion === 'notas' ? 'nota' : 'documento'}</button>}
    </header>
    {!activo && <p className="notas-doc__notice" role="status">Cliente inactivo: consulta disponible, escritura deshabilitada.</p>}
    {success && <p className="notas-doc__success" role="status">{success}</p>}
    {formOpen && activo && <form className="notas-doc__form" onSubmit={submit} aria-label={seccion === 'notas' ? 'Añadir nota' : 'Añadir documento'}>
      <h2>{seccion === 'notas' ? 'Nueva nota' : 'Nueva referencia documental'}</h2>
      {seccion === 'notas' ? <label>Nota<textarea autoFocus value={texto} maxLength={2000} onChange={e => setTexto(e.currentTarget.value)} required aria-describedby="notas-doc-count" /><small id="notas-doc-count">{texto.length}/2000</small></label> : <>
        <label>Título<input autoFocus value={titulo} maxLength={150} onChange={e => setTitulo(e.currentTarget.value)} required /></label>
        <label>Tipo<input value={tipo} maxLength={60} onChange={e => setTipo(e.currentTarget.value)} required /></label>
        <label>URL HTTPS (opcional)<input type="url" inputMode="url" value={url} maxLength={2048} onChange={e => setUrl(e.currentTarget.value)} placeholder="https://…" /></label>
        <label>Nota (opcional)<textarea value={nota} maxLength={500} onChange={e => setNota(e.currentTarget.value)} /></label>
      </>}
      {formError && <p className="notas-doc__error" role="alert">{formError}</p>}
      <div className="notas-doc__form-actions"><button type="button" className="notas-doc__secondary" disabled={saving} onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="notas-doc__primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
    </form>}
    <DataTable
      columns={columns}
      rows={visibleItems}
      getRowKey={row => row.id}
      search={{ value: query, onChange: onSearch, label: 'Buscar', placeholder: seccion === 'notas' ? 'Buscar en notas' : 'Buscar documentos' }}
      sort={{ key: sortBy, direction: sortDir, onChange: onSort }}
      pagination={{ pagina, limite: LIMITE, hayMas, onPageChange: setPagina }}
      state={estado}
      error={{ description: error }}
      onRetry={() => void cargar()}
      emptyTitle={query.trim() ? 'No hay resultados' : seccion === 'notas' ? 'Todavía no hay notas' : 'Todavía no hay documentos'}
      emptyDescription={query.trim() ? 'Prueba con otro término de búsqueda.' : activo ? 'Añade el primer registro cuando lo necesites.' : 'Este cliente todavía no tiene registros.'}
    />
  </section>
}
