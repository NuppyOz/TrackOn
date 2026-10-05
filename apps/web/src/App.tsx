import './App.css'
import { useEffect, useState } from 'react'
import EquiposManager from './features/equipos/EquiposManager'
import ServiciosManager from './features/servicios/ServiciosManager'
import CuadrillasManager from './features/cuadrillas/CuadrillasManager'
import NotificationsBell from './features/notificaciones/NotificationsBell'
import { cerrarSesion, renovarSesion, type UsuarioSesion } from './features/auth/auth.api'

type Seccion = 'equipos' | 'servicios' | 'cuadrillas'

function AppHeader({ usuario, onOpenMenu, onLogout }: Readonly<{
  usuario: UsuarioSesion | null
  onOpenMenu: () => void
  onLogout: () => void
}>) {
  const nombre = usuario
    ? `${usuario.empleado.persona.firstName} ${usuario.empleado.persona.firstLastName}`
    : 'Operaciones'
  const iniciales = usuario
    ? `${usuario.empleado.persona.firstName.slice(0, 1)}${usuario.empleado.persona.firstLastName.slice(0, 1)}`
    : 'MC'

  return <header className="topbar">
    <button type="button" className="menu-toggle" aria-label="Abrir navegación" onClick={onOpenMenu}>☰</button>
    <img className="brand-logo" src="/logo-multicas.png" alt="MULTICAS" />
    <div className="brand"><strong>TrackOn</strong><span>MULTICAS S.A.</span></div>
    <div className="topbar-context">
      <span>{nombre}</span>
      <NotificationsBell habilitada={Boolean(usuario)} />
      <button type="button" className="avatar avatar-button" aria-label={usuario ? 'Cerrar sesión' : 'MULTICAS'} title={usuario ? 'Cerrar sesión' : 'MULTICAS'} onClick={usuario ? onLogout : undefined}>{iniciales}</button>
    </div>
  </header>
}

function ModuleContent({ seccion }: Readonly<{ seccion: Seccion }>) {
  switch (seccion) {
    case 'equipos': return <EquiposManager />
    case 'servicios': return <ServiciosManager />
    case 'cuadrillas': return <CuadrillasManager />
  }
}

function App() {
  const [seccion, setSeccion] = useState<Seccion>('equipos')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  function navegar(destino: Seccion) {
    setSeccion(destino)
    setMenuAbierto(false)
  }

  function salir() {
    void cerrarSesion().then(() => setUsuario(null))
  }

  useEffect(() => {
    renovarSesion().then(setUsuario).catch(() => setUsuario(null))
  }, [])

  return (
    <div className="app-shell">
      <AppHeader usuario={usuario} onOpenMenu={() => setMenuAbierto(true)} onLogout={salir} />
      {menuAbierto && <button type="button" className="nav-backdrop" aria-label="Cerrar navegación" onClick={() => setMenuAbierto(false)} />}
      <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`}>
        <div className="sidebar-mobile-title"><strong>TrackOn</strong><button type="button" aria-label="Cerrar navegación" onClick={() => setMenuAbierto(false)}>×</button></div>
        <p>GESTIÓN OPERATIVA</p>
        <button type="button" className={seccion === 'equipos' ? 'selected' : ''} onClick={() => navegar('equipos')}><span>▣</span> Equipos</button>
        <button type="button" className={seccion === 'servicios' ? 'selected' : ''} onClick={() => navegar('servicios')}><span>≡</span> Servicios</button>
        <button type="button" className={seccion === 'cuadrillas' ? 'selected' : ''} onClick={() => navegar('cuadrillas')}><span>♟</span> Cuadrillas</button>
        <div className="sidebar-note"><strong>MULTICAS</strong><span>Gestión técnica centralizada</span></div>
      </aside>
      <main className="workspace"><ModuleContent seccion={seccion} /></main>
    </div>
  )
}

export default App
