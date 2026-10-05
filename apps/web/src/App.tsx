import './App.css'
import { useState } from 'react'
import EquiposManager from './features/equipos/EquiposManager'
import ServiciosManager from './features/servicios/ServiciosManager'
import CuadrillasManager from './features/cuadrillas/CuadrillasManager'

type Seccion = 'equipos' | 'servicios' | 'cuadrillas'

function App() {
  const [seccion, setSeccion] = useState<Seccion>('equipos')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const navegar = (destino: Seccion) => { setSeccion(destino); setMenuAbierto(false) }

  return (
    <div className="app-shell">
      <header className="topbar"><button className="menu-toggle" aria-label="Abrir navegación" onClick={() => setMenuAbierto(true)}>☰</button><img className="brand-logo" src="/logo-multicas.png" alt="MULTICAS" /><div className="brand"><strong>TrackOn</strong><span>MULTICAS S.A.</span></div><div className="topbar-context"><span>Operaciones</span><button className="notification-button" aria-label="Notificaciones">♢</button><div className="avatar" aria-label="MULTICAS">MC</div></div></header>
      {menuAbierto && <button className="nav-backdrop" aria-label="Cerrar navegación" onClick={() => setMenuAbierto(false)} />}
      <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`}><div className="sidebar-mobile-title"><strong>TrackOn</strong><button aria-label="Cerrar navegación" onClick={() => setMenuAbierto(false)}>×</button></div><p>GESTIÓN OPERATIVA</p><button className={seccion === 'equipos' ? 'selected' : ''} onClick={() => navegar('equipos')}><span>▣</span> Equipos</button><button className={seccion === 'servicios' ? 'selected' : ''} onClick={() => navegar('servicios')}><span>≡</span> Servicios</button><button className={seccion === 'cuadrillas' ? 'selected' : ''} onClick={() => navegar('cuadrillas')}><span>♟</span> Cuadrillas</button><div className="sidebar-note"><strong>MULTICAS</strong><span>Gestión técnica centralizada</span></div></aside>
      <main className="workspace">{seccion === 'equipos' ? <EquiposManager /> : seccion === 'servicios' ? <ServiciosManager /> : <CuadrillasManager />}</main>
    </div>
  )
}

export default App
