import { useState } from 'react'
import { listarRoles } from './roles.api'
import type { Rol } from './roles.types'
import { DataTable, TablePagination } from '../../shared/ui'
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination'

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'cargando' }
  | { tipo: 'exito'; roles: Rol[] }
  | { tipo: 'error'; mensaje: string }

export default function RolesList() {
  const [estado, setEstado] = useState<Estado>({
    tipo: 'inicial',
  })
  const [pagina, setPagina] = useState(1)

  async function cargarRoles() {
    setEstado({ tipo: 'cargando' })

    try {
      const roles = await listarRoles()
      setPagina(1)
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
        <div className="roles-table-section">
          <DataTable label="Roles del sistema">
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
              {estado.roles.slice((pagina - 1) * DEFAULT_PAGE_SIZE, pagina * DEFAULT_PAGE_SIZE).map((rol) => (
                <tr key={rol.id}>
                  <td data-label="Código">
                    <span className="tag is-link is-light">
                      {rol.cod}
                    </span>
                  </td>
                  <td data-label="Nombre"><strong>{rol.nombre}</strong></td>
                  <td data-label="Descripción">{rol.descripcion ?? 'Sin descripción'}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePagination pagina={pagina} limite={DEFAULT_PAGE_SIZE} cantidad={Math.min(DEFAULT_PAGE_SIZE, estado.roles.length - (pagina - 1) * DEFAULT_PAGE_SIZE)}
            total={estado.roles.length} hayMas={pagina * DEFAULT_PAGE_SIZE < estado.roles.length} etiqueta="roles" onPagina={setPagina} />
        </div>
      )}
    </section>
  )
}
