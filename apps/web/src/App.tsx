import './App.css'
import { useState } from 'react'

function App() {
  const [mensaje, setMensaje] = useState('Conexión sin comprobar');
  const [cargando, setCargando] = useState(false);

  async function comprobarConexion() {
    setCargando(true);
    setMensaje('Consultando al backend...');

    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok){
        throw new Error(`La API devolvió un error`)
      }

      const data = await response.json();

      if (data.status !== 'ok' || typeof data.message !== 'string') {
        throw new Error(`La respuesta no tiene el formato esperado`)
      }

      setMensaje(data.message);

    } catch {
      setMensaje(
        'No se pudo comprobar la conexión. Revisa que el backend esté funcionando.'
      )
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="section">
      <div className="container">
        <div className="box trackon-welcome">
          <p className="has-text-link has-text-weight-semibold mb-3">
            MULTICAS S.A.</p>
          <h1 className="title is-2">TrackOn</h1>
          <p className="subtitle is-5">Sistemma de gestión de órdenes de trabajo.</p>
          <span className="tag is-link is-light">Uso interno de MULTICAS S.A.</span>
          <hr />
          <p className="mb-4" role="status">
            {mensaje}
          </p>
          <button 
            type="button"
            className="button is-link"
            onClick={comprobarConexion}
            disabled={cargando}>
              {cargando ? 'Comprobando...' : 'Comprobar conexión'}
          </button>
        </div>
      </div>
    </main>
  )
}

export default App
