import './styles/paginacion.css';
import { LIMITES_PAGINA, paginasVisibles } from './pagination';

export type PaginacionProps = Readonly<{
    pagina: number;
    limite: number;
    hayMas: boolean;
    /** Total de registros según el BE; sin él no se numeran las páginas. */
    total?: number;
    cargando?: boolean;
    etiqueta?: string;
    onPagina: (pagina: number) => void;
    /** Si se omite, no se muestra el selector de registros por página. */
    onLimite?: (limite: number) => void;
}>;

const numero = (valor: number) => valor.toLocaleString('es-NI');

export function Paginacion({ pagina, limite, hayMas, total, cargando = false, etiqueta, onPagina, onLimite }: PaginacionProps) {
    const totalPaginas = total === undefined ? undefined : Math.max(1, Math.ceil(total / limite));
    const sinSiguiente = totalPaginas === undefined ? !hayMas : pagina >= totalPaginas;
    const paginas = totalPaginas === undefined ? [pagina] : paginasVisibles(Math.min(pagina, totalPaginas), totalPaginas);
    const opciones = LIMITES_PAGINA.includes(limite) ? LIMITES_PAGINA : [...LIMITES_PAGINA, limite].sort((a, b) => a - b);
    const desde = total === 0 ? 0 : (pagina - 1) * limite + 1;
    const conteo = total === undefined
        ? `Página ${numero(pagina)}`
        : `Mostrando ${numero(desde)} a ${numero(Math.min(pagina * limite, total))} de ${numero(total)} registros`;

    return (
        <nav className="tk-paginacion" aria-label={etiqueta ?? 'Paginación de resultados'}>
            {onLimite ? (
                <label className="tk-paginacion-limite">Mostrar
                    <select value={limite} disabled={cargando} aria-label="Registros por página"
                        onChange={event => onLimite(Number(event.currentTarget.value))}>
                        {opciones.map(opcion => <option key={opcion} value={opcion}>{opcion}</option>)}
                    </select>
                    registros
                </label>
            ) : <span />}
            <div className="tk-paginacion-paginas">
                <button type="button" className="tk-paginacion-boton" disabled={cargando || pagina <= 1}
                    onClick={() => onPagina(pagina - 1)}>Anterior</button>
                {paginas.map((item, indice) => item === 'gap'
                    ? <span key={`gap-${indice}`} aria-hidden="true">…</span>
                    : <button key={item} type="button" aria-label={`Página ${item}`}
                        className={`tk-paginacion-boton tk-paginacion-numero${item === pagina ? ' is-actual' : ''}`}
                        aria-current={item === pagina ? 'page' : undefined} disabled={cargando}
                        onClick={() => { if (item !== pagina) onPagina(item); }}>{item}</button>)}
                <button type="button" className="tk-paginacion-boton" disabled={cargando || sinSiguiente}
                    onClick={() => onPagina(pagina + 1)}>Siguiente</button>
            </div>
            <span className="tk-paginacion-conteo" aria-live="polite">{conteo}</span>
        </nav>
    );
}
