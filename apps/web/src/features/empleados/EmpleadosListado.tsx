import type { PaginaEmpleados } from './empleados.api';
import type { FiltrosEmpleados } from './empleados.types';
import { nombreEmpleado } from './empleados.types';
import { DataTable, TablePagination } from '../../shared/ui';

interface Props {
    datos: PaginaEmpleados;
    filtros: FiltrosEmpleados;
    cargando: boolean;
    onFiltros: (filtros: FiltrosEmpleados, esperar?: boolean) => void;
    onPagina: (pagina: number) => void;
    onLimite: (limite: number) => void;
    onVer: (id: number) => void;
    onCrear: () => void;
}

export default function EmpleadosListado({ datos, filtros, cargando, onFiltros, onPagina, onLimite, onVer, onCrear }: Readonly<Props>) {
    const { items: empleados, resumen } = datos;
    const cambiar = (cambios: Partial<FiltrosEmpleados>, esperar = false) =>
        onFiltros({ ...filtros, ...cambios, pagina: 1 }, esperar);
    const limpiar = () => onFiltros({ buscar: '', estado: 'todos', tecnico: 'todos', pagina: 1, limite: filtros.limite });

    return <>
        <div className="tk-employee-stats" aria-label="Resumen de personal">
            <div><span>Total de empleados</span><strong>{resumen.total}</strong></div>
            <div><span>Empleados activos</span><strong>{resumen.activos}</strong></div>
            <div><span>Técnicos habilitados</span><strong>{resumen.tecnicosHabilitados}</strong></div>
        </div>
        <div className="tk-employee-filters">
            <label><span>Buscar</span><input value={filtros.buscar} placeholder="Código o nombre del empleado"
                onChange={event => cambiar({ buscar: event.target.value }, true)} /></label>
            <label><span>Estado</span><select value={filtros.estado} onChange={event => cambiar({ estado: event.target.value as FiltrosEmpleados['estado'] })}>
                <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
            </select></label>
            <label><span>Habilitación técnica</span><select value={filtros.tecnico} onChange={event => cambiar({ tecnico: event.target.value as FiltrosEmpleados['tecnico'] })}>
                <option value="todos">Todos</option><option value="habilitados">Habilitados</option><option value="no-habilitados">No habilitados</option>
            </select></label>
            <button type="button" className="tk-employee-secondary" onClick={limpiar}>Limpiar filtros</button>
        </div>
        <div className="tk-employee-panel tk-employee-list" aria-busy={cargando}>
            <div className="tk-employee-list-caption">{datos.total} empleados encontrados</div>
            <TablePagination pagina={datos.pagina} limite={datos.limite} hayMas={datos.hayMas} cargando={cargando}
                cantidad={empleados.length} etiqueta="empleados" onPagina={onPagina} onLimite={onLimite} />
            {empleados.length ? <DataTable className="tk-employee-table" label="Empleados">
                <thead><tr><th>Código</th><th>Empleado</th><th>Estado</th><th>Habilitación técnica</th><th>Acciones</th></tr></thead>
                <tbody>{empleados.map(item => <tr key={item.id}>
                    <td data-label="Código"><strong className="tk-employee-code">{item.codEmpleado}</strong></td>
                    <td data-label="Empleado">{nombreEmpleado(item)}</td>
                    <td data-label="Estado"><span className={`tk-employee-pill ${item.active ? 'is-active' : 'is-inactive'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td data-label="Habilitación técnica"><span className={`tk-employee-pill ${item.habilitadoComoTecnico ? 'is-tech' : 'is-neutral'}`}>{item.habilitadoComoTecnico ? 'Habilitado' : 'No habilitado'}</span></td>
                    <td data-label="Acciones"><button type="button" className="tk-employee-link" onClick={() => onVer(item.id)}>Ver detalle</button></td>
                </tr>)}</tbody>
            </DataTable> : <div className="tk-employee-empty">
                <strong>No hay empleados con estos filtros.</strong>
                <p>Prueba otros criterios o registra un empleado.</p>
                {resumen.total === 0 && <button type="button" className="tk-employee-primary" onClick={onCrear}>Registrar empleado</button>}
            </div>}
        </div>
    </>;
}
