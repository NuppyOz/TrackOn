import './App.css'
import { useState } from 'react'
import EquiposManager from './features/equipos/EquiposManager'
import ServiciosManager from './features/servicios/ServiciosManager'

type Seccion = 'equipos' | 'servicios'

function App() {
  const [seccion, setSeccion] = useState<Seccion>('equipos')

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand-mark">T</div><div className="brand"><strong>TrackOn</strong><span>MULTICAS S.A.</span></div><div className="topbar-context"><span>Operaciones</span><div className="avatar">MC</div></div></header>
      <aside className="sidebar"><p>GESTIÓN</p><button className={seccion === 'equipos' ? 'selected' : ''} onClick={() => setSeccion('equipos')}><span>▣</span> Inventario de equipos</button><button className={seccion === 'servicios' ? 'selected' : ''} onClick={() => setSeccion('servicios')}><span>≡</span> Catálogo de servicios</button><div className="sidebar-note"><strong>TrackOn</strong><span>Gestión técnica centralizada</span></div></aside>
      <main className="workspace">{seccion === 'equipos' ? <EquiposManager /> : <ServiciosManager />}</main>
    </div>
  )
}

export default App
