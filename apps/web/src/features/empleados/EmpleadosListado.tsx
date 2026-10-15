import { useMemo, useState } from 'react';
import type { EmpleadoResumen, FiltroEstado, FiltroTecnico } from './empleados.types';
import { nombreEmpleado } from './empleados.types';

interface Props {
    empleados: EmpleadoResumen[];
    onVer: (id: number) => void;
    onCrear: () => void;
}

export default function EmpleadosListado({ empleados, onVer, onCrear }: Readonly<Props>) {
    const [busqueda, setBusqueda] = useState('');
    const [estado, setEstado] = useState<FiltroEstado>('todos');
    const [tecnico, setTecnico] = useState<FiltroTecnico>('todos');
    const [pagina, setPagina] = useState(1);
    const limite = 10;
    const resultados = useMemo(() => {
        const termino = busqueda.trim().toLocaleLowerCase('es');
        return empleados.filter(item => {
            if (estado === 'activos' && !item.active) return false;
            if (estado === 'inactivos' && item.active) return false;
            if (tecnico === 'habilitados' && !item.habilitadoComoTecnico) return false;
            if (tecnico === 'no-habilitados' && item.habilitadoComoTecnico) return false;
            return !termino || `${item.codEmpleado} ${nombreEmpleado(item)}`.toLocaleLowerCase('es').includes(termino);
        });
    }, [empleados, busqueda, estado, tecnico]);
    const totalPaginas = Math.max(1, Math.ceil(resultados.length / limite));
    const paginaActual = Math.min(pagina, totalPaginas);
    const visibles = resultados.slice((paginaActual - 1) * limite, paginaActual * limite);
    const activos = empleados.filter(item => item.active).length;
    const habilitados = empleados.filter(item => item.active && item.habilitadoComoTecnico).length;

    function limpiar() { setBusqueda(''); setEstado('todos'); setTecnico('todos'); setPagina(1); }

    return <>
        <div className="tk-employee-stats" aria-label="Resumen de personal">
            <div><span>Total de empleados</span><strong>{empleados.length}</strong></div>
            <div><span>Empleados activos</span><strong>{activos}</strong></div>
            <div><span>Técnicos habilitados</span><strong>{habilitados}</strong></div>
        </div>
        <div className="tk-employee-filters">
            <label><span>Buscar</span><input value={busqueda} placeholder="Código o nombre del empleado"
                onChange={event => { setBusqueda(event.target.value); setPagina(1); }} /></label>
            <label><span>Estado</span><select value={estado} onChange={event => { setEstado(event.target.value as FiltroEstado); setPagina(1); }}>
                <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
            </select></label>
            <label><span>Habilitación técnica</span><select value={tecnico} onChange={event => { setTecnico(event.target.value as FiltroTecnico); setPagina(1); }}>
                <option value="todos">Todos</option><option value="habilitados">Habilitados</option><option value="no-habilitados">No habilitados</option>
            </select></label>
            <button type="button" className="tk-employee-secondary" onClick={limpiar}>Limpiar filtros</button>
        </div>
        <div className="tk-employee-panel tk-employee-list">
            <div className="tk-employee-list-caption">{resultados.length} empleados encontrados</div>
            {resultados.length ? <div className="tk-employee-table-wrap"><table className="tk-employee-table">
                <thead><tr><th>Código</th><th>Empleado</th><th>Estado</th><th>Habilitación técnica</th><th>Acciones</th></tr></thead>
                <tbody>{visibles.map(item => <tr key={item.id}>
                    <td data-label="Código"><strong className="tk-employee-code">{item.codEmpleado}</strong></td>
                    <td data-label="Empleado">{nombreEmpleado(item)}</td>
                    <td data-label="Estado"><span className={`tk-employee-pill ${item.active ? 'is-active' : 'is-inactive'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td data-label="Habilitación técnica"><span className={`tk-employee-pill ${item.habilitadoComoTecnico ? 'is-tech' : 'is-neutral'}`}>{item.habilitadoComoTecnico ? 'Habilitado' : 'No habilitado'}</span></td>
                    <td data-label="Acciones"><button type="button" className="tk-employee-link" onClick={() => onVer(item.id)}>Ver detalle</button></td>
                </tr>)}</tbody>
            </table></div> : <div className="tk-employee-empty">
                <strong>No hay empleados con estos filtros.</strong>
                <p>Prueba otros criterios o registra un empleado.</p>
                {empleados.length === 0 && <button type="button" className="tk-employee-primary" onClick={onCrear}>Registrar empleado</button>}
            </div>}
            {resultados.length > limite && <div className="tk-employee-pagination">
                <button type="button" className="tk-employee-secondary" disabled={paginaActual === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
                <span>Página {paginaActual} de {totalPaginas}</span>
                <button type="button" className="tk-employee-secondary" disabled={paginaActual === totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
            </div>}
        </div>
    </>;
}
