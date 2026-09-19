import { useState } from 'react'
import { listarRoles } from './roles.api'
import type { Rol } from './roles.types'

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'cargando' }
  | { tipo: 'exito'; roles: Rol[] }
  | { tipo: 'error'; mensaje: string }

export default function RolesList() {
  const [estado, setEstado] = useState<Estado>({
    tipo: 'inicial',
  })

  async function cargarRoles() {
    setEstado({ tipo: 'cargando' })

    try {
      const roles = await listarRoles()
      setEstado({ tipo: 'exito', roles })
    } catch {
      setEstado({
        tipo: 'error',
        mensaje: 'No se pudieron cargar los roles. Inténtalo nuevamente.',
      })
    }
  }

  const cargando = estado.tipo === 'cargando'

  return (
    <section className="box" aria-labelledby="roles-titulo">
      <h2 id="roles-titulo" className="title is-4">
        Roles del sistema
      </h2>

      <p className="mb-4">
        Consulta los perfiles registrados en TrackOn.
      </p>

      <button
        type="button"
        className="button is-link mb-4"
        onClick={cargarRoles}
        disabled={cargando}
      >
        {cargando ? 'Cargando…' : 'Consultar roles'}
      </button>

      <div role="status">
        {estado.tipo === 'inicial' && (
          <p>Presiona el botón para consultar los roles.</p>
        )}

        {cargando && <p>Consultando los roles…</p>}

        {estado.tipo === 'exito' && (
          <p className="mb-3">
            {estado.roles.length === 0
              ? 'No hay roles registrados.'
              : `Roles encontrados: ${estado.roles.length}.`}
          </p>
        )}
      </div>

      {estado.tipo === 'error' && (
        <div className="notification is-danger is-light" role="alert">
          {estado.mensaje}
        </div>
      )}

      {estado.tipo === 'exito' && estado.roles.length > 0 && (
        <div className="table-container">
          <table className="table is-fullwidth is-striped is-hoverable">
            <caption className="has-text-left mb-2">
              Perfiles y descripción de sus funciones
            </caption>

            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Descripción</th>
              </tr>
            </thead>

            <tbody>
              {estado.roles.map((rol) => (
                <tr key={rol.id}>
                  <td>
                    <span className="tag is-link is-light">
                      {rol.cod}
                    </span>
                  </td>
                  <th scope="row">{rol.nombre}</th>
                  <td>{rol.descripcion ?? 'Sin descripción'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}