import './App.css'
import { useEffect, useState } from 'react'
import EquiposManager from './features/equipos/EquiposManager'
import ServiciosManager from './features/servicios/ServiciosManager'
import CuadrillasManager from './features/cuadrillas/CuadrillasManager'
import { cerrarSesion, renovarSesion, type UsuarioSesion } from './features/auth/auth.api'
import { AuthenticatedLayout } from './components/AuthenticatedLayout'

export type Seccion = 'equipos' | 'servicios' | 'cuadrillas'

function ModuleContent({ seccion }: Readonly<{ seccion: Seccion }>) {
  switch (seccion) {
    case 'equipos': return <EquiposManager />
    case 'servicios': return <ServiciosManager />
    case 'cuadrillas': return <CuadrillasManager />
  }
}

function App() {
  const [seccion, setSeccion] = useState<Seccion>('equipos')
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)

  function salir() {
    void cerrarSesion().then(() => setUsuario(null))
  }

  useEffect(() => {
    renovarSesion().then(setUsuario).catch(() => setUsuario(null))
  }, [])

  return (
    <AuthenticatedLayout
      usuario={usuario}
      seccionActual={seccion}
      onNavigate={setSeccion}
      onLogout={salir}
    >
      <ModuleContent seccion={seccion} />
    </AuthenticatedLayout>
  )
}

export default App