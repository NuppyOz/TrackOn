import './App.css'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import EquiposManager from './features/equipos/EquiposManager'
import ServiciosManager from './features/servicios/ServiciosManager'
import CuadrillasManager from './features/cuadrillas/CuadrillasManager'
import OrdenesListado from './features/ordenes/OrdenesListado'
import { cerrarSesion, renovarSesion, type UsuarioSesion } from './features/auth/auth.api'
import { AuthenticatedLayout } from './components/AuthenticatedLayout'
import OrdenNueva from './features/ordenes/OrdenNueva'
import OrdenDetalle from './features/ordenes/OrdenDetalle';

// Necesitamos este componente intermedio para poder usar los hooks de enrutamiento (useNavigate, useLocation)
function RouterApp() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  function salir() {
    void cerrarSesion().then(() => setUsuario(null))
  }

  useEffect(() => {
    renovarSesion().then(setUsuario).catch(() => setUsuario(null))
  }, [])

  // Extraemos la sección de la URL actual (ej: "/equipos" -> "equipos")
  const rutaActual = location.pathname.split('/')[1] || 'equipos'

  return (
    <AuthenticatedLayout
      usuario={usuario}
      seccionActual={rutaActual as any}
      onNavigate={(destino) => navigate(`/${destino}`)}
      onLogout={salir}
    >
      <Routes>
        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/ordenes" replace />} />
        
        {/* Rutas clásicas de tu equipo */}
        <Route path="/equipos" element={<EquiposManager />} />
        <Route path="/servicios" element={<ServiciosManager />} />
        <Route path="/cuadrillas" element={<CuadrillasManager />} />
        
        {/* Nuevas rutas del TK-16 */}
        <Route path="/ordenes" element={<OrdenesListado />} />
        <Route path="/ordenes/nueva" element={<OrdenNueva />} /> {/* <-- Cambiamos esta línea */}
        <Route path="/ordenes/:id" element={<div className="p-8">Pantalla Detalle de Orden (Próximamente)</div>} />
        
        {/* Fases 2 y 3 del TK-16 (Placeholders temporales) */}
        <Route path="/ordenes/nueva" element={<div className="p-8">Pantalla Crear Orden (Próximamente)</div>} />
        <Route path="/ordenes/:id" element={<OrdenDetalle />} />
      </Routes>
    </AuthenticatedLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RouterApp />
    </BrowserRouter>
  )
}

export default App