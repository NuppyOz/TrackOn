import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api'
import { contarNoLeidas, listarNotificaciones, marcarNotificacionLeida, type Notificacion } from './notificaciones.api'

const fechaRelativa = (date: string) => {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(date))
}

export default function NotificationsBell({ habilitada }: { habilitada: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cursor, setCursor] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!habilitada) return
    contarNoLeidas().then((result) => setNoLeidas(result.noLeidas)).catch(() => setError('No se pudo actualizar el contador de notificaciones.'))
  }, [habilitada])

  async function cargar(siguiente = false) {
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
    if (notificacion.leidaEn) return
    try {
      await marcarNotificacionLeida(notificacion.id)
      setItems((actuales) => actuales.map((item) => item.id === notificacion.id ? { ...item, leidaEn: new Date().toISOString() } : item))
      setNoLeidas((actual) => Math.max(0, actual - 1))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo marcar como leída.') }
  }

  return <div className="notification-area"><button className="notification-button" title="Notificaciones" aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`} aria-expanded={abierto} onClick={() => void abrir()}><svg aria-hidden="true" viewBox="0 0 24 24" className="notification-icon"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{noLeidas > 0 && <span className="notification-count">{noLeidas > 99 ? '99+' : noLeidas}</span>}</button>{abierto && <><button className="notification-dismiss" aria-label="Cerrar notificaciones" onClick={() => setAbierto(false)} /><section className="notification-panel" aria-label="Notificaciones"><header><div><h2>Notificaciones</h2><span>{habilitada ? `${noLeidas} sin leer` : 'Bandeja personal'}</span></div><button aria-label="Cerrar" onClick={() => setAbierto(false)}>×</button></header>{!habilitada ? <p className="notification-state">Necesitas una sesión activa para consultar tus notificaciones.</p> : error && <div className="notice error notification-error" role="alert">{error}<button onClick={() => void cargar()}>Reintentar</button></div>}{habilitada && cargando && items.length === 0 ? <p className="notification-state">Cargando notificaciones…</p> : habilitada && items.length === 0 && !error ? <p className="notification-state">No tienes notificaciones.</p> : habilitada && items.length > 0 && <div className="notification-list">{items.map((item) => <button className={`notification-item ${item.leidaEn ? '' : 'unread'}`} key={item.id} onClick={() => void leer(item)}><span className="notification-dot" aria-hidden="true">{item.leidaEn ? '○' : '●'}</span><span className="notification-copy"><strong>{item.tipo.replaceAll('_', ' ')}</strong><span>{item.mensaje}</span><small>{fechaRelativa(item.creadaEn)}{item.ordenId ? ` · OT-${item.ordenId}` : ''}</small></span></button>)}</div>}{habilitada && cursor && <button className="notification-more" disabled={cargando} onClick={() => void cargar(true)}>{cargando ? 'Cargando…' : 'Cargar más'}</button>}</section></>}</div>
}
