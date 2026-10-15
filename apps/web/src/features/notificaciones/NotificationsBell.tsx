import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api'
import { contarNoLeidas, listarNotificaciones, marcarNotificacionLeida, type Notificacion } from './notificaciones.api'
import { irA } from '../../shared/navigation'

const fechaRelativa = (date: string) => {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(date))
}

type NotificationsBellProps = Readonly<{ habilitada: boolean }>

export default function NotificationsBell({ habilitada }: NotificationsBellProps) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cursor, setCursor] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [leyendo, setLeyendo] = useState<number | null>(null)

  useEffect(() => {
    if (!habilitada) return
    let activa = true
    let pendiente = false
    async function actualizar() {
      if (pendiente || document.visibilityState === 'hidden') return
      pendiente = true
      try {
        const result = await contarNoLeidas()
        if (activa) setNoLeidas(result.noLeidas)
      } catch { /* La bandeja permite reintentar si la conexión falla. */ }
      finally { pendiente = false }
    }
    void actualizar()
    const intervalo = window.setInterval(() => void actualizar(), 30000)
    window.addEventListener('focus', actualizar)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      activa = false
      window.clearInterval(intervalo)
      window.removeEventListener('focus', actualizar)
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [habilitada])

  async function cargar(siguiente = false) {
    if (cargando) return
    setCargando(true); setError('')
    try {
      const page = await listarNotificaciones(siguiente ? cursor : null)
      setItems((actuales) => siguiente ? [...actuales, ...page.items] : page.items)
      setNoLeidas(page.noLeidas); setCursor(page.nextCursor)
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar las notificaciones.') }
    finally { setCargando(false) }
  }

  async function abrir() {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente && habilitada) await cargar()
  }

  async function leer(notificacion: Notificacion) {
    if (leyendo !== null) return
    setLeyendo(notificacion.id)
    try {
      if (!notificacion.leidaEn) {
        await marcarNotificacionLeida(notificacion.id)
        setItems((actuales) => actuales.map((item) => item.id === notificacion.id ? { ...item, leidaEn: new Date().toISOString() } : item))
        setNoLeidas((actual) => Math.max(0, actual - 1))
      }
      if (notificacion.ordenId) {
        setAbierto(false)
        irA(`/ordenes/${notificacion.ordenId}`)
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo marcar como leída.') }
    finally { setLeyendo(null) }
  }

  function contenidoPanel() {
    if (!habilitada) return <p className="notification-state">Necesitas una sesión activa para consultar tus notificaciones.</p>
    if (error) return <div className="notice error notification-error" role="alert">{error}<button type="button" onClick={() => void cargar()}>Reintentar</button></div>
    if (cargando && items.length === 0) return <p className="notification-state">Cargando notificaciones…</p>
    if (items.length === 0) return <p className="notification-state">No tienes notificaciones.</p>

    return <div className="notification-list">{items.map((item) => {
      const estadoLectura = item.leidaEn ? '' : 'unread'
      const identificadorOrden = item.ordenId ? ` · OT-${item.ordenId}` : ''
      return <button type="button" disabled={leyendo !== null} className={`notification-item ${estadoLectura}`} key={item.id} onClick={() => void leer(item)}>
        <span className="notification-dot" aria-hidden="true">{item.leidaEn ? '○' : '●'}</span>
        <span className="notification-copy"><strong>{item.tipo.replaceAll('_', ' ')}</strong><span>{item.mensaje}</span><small>{fechaRelativa(item.creadaEn)}{identificadorOrden}</small></span>
      </button>
    })}</div>
  }

  const etiquetaCampana = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'
  const subtituloPanel = habilitada ? `${noLeidas} sin leer` : 'Bandeja personal'

  return <div className="notification-area">
    <button type="button" className="notification-button" title="Notificaciones" aria-label={etiquetaCampana} aria-expanded={abierto} onClick={() => void abrir()}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="notification-icon"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {noLeidas > 0 && <span className="notification-count">{noLeidas > 99 ? '99+' : noLeidas}</span>}
    </button>
    {abierto && <>
      <button type="button" className="notification-dismiss" aria-label="Cerrar notificaciones" onClick={() => setAbierto(false)} />
      <section className="notification-panel" aria-label="Notificaciones">
        <header><div><h2>Notificaciones</h2><span>{subtituloPanel}</span></div><div className="notification-panel-actions">{habilitada && <button type="button" aria-label="Actualizar notificaciones" disabled={cargando || leyendo !== null} onClick={() => void cargar()}>Actualizar</button>}<button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)}>×</button></div></header>
        {contenidoPanel()}
        {habilitada && cursor && <button type="button" className="notification-more" disabled={cargando} onClick={() => void cargar(true)}>{cargando ? 'Cargando…' : 'Cargar más'}</button>}
      </section>
    </>}
  </div>
}
