import { useEffect, useState } from 'react';
import {
    BriefcaseIcon,
    ClockIcon,
    CheckIcon,
    CurrencyCircleDollarIcon,
    FileTextIcon,
    CubeIcon,
    CaretRightIcon,
    ArrowsClockwiseIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { obtenerResumen, type ResumenOperativo } from './dashboard.api';
import { Button, StatePanel } from '../../shared/ui';
import { irA } from '../../shared/navigation';
const dinero = (valor: string) =>
    new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 0 }).format(
        Number(valor),
    );
const estado = (valor: string) =>
    ({
        PENDIENTE: 'Pendiente',
        ASIGNADA: 'Asignada',
        EN_EJECUCION: 'En proceso',
        EN_REVISION: 'En revisión',
        CERRADA: 'Finalizada',
        CANCELADA: 'Cancelada',
        BORRADOR: 'Borrador',
    })[valor] ?? valor;
export default function Dashboard({
    onOrden,
    onCuadrillas,
}: Readonly<{ onOrden: (id?: number) => void; onCuadrillas: () => void }>) {
    const [datos, setDatos] = useState<ResumenOperativo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('mes');
    useEffect(() => {
        let vigente = true;
        void obtenerResumen(periodo)
            .then((d) => {
                if (vigente) {
                    setDatos(d);
                    setError(null);
                }
            })
            .catch((e) => {
                if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen.');
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [recarga, periodo]);
    return (
        <section className="erp-overview" aria-labelledby="dashboard-titulo">
            <div className="tk-context-breadcrumb">
                Inicio <CaretRightIcon size={12} />
                <strong>Resumen general</strong>
            </div>
            <div className="erp-overview-heading">
                <div>
                    <h1 id="dashboard-titulo">Resumen general</h1>
                    <p>Visión consolidada de la operación y los asuntos que requieren atención.</p>
                </div>
                <div className="erp-periods" aria-label="Período del resumen">
                    {(['hoy', 'semana', 'mes'] as const).map((p) => (
                        <button
                            type="button"
                            key={p}
                            aria-pressed={periodo === p}
                            onClick={() => {
                                if (p === periodo) return;
                                setCargando(true);
                                setPeriodo(p);
                            }}
                        >
                            {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                    <button
                        type="button"
                        aria-label="Actualizar"
                        disabled={cargando}
                        onClick={() => {
                            setCargando(true);
                            setRecarga((n) => n + 1);
                        }}
                    >
                        <ArrowsClockwiseIcon size={18} />
                    </button>
                </div>
            </div>
            {error && (
                <StatePanel
                    type="error"
                    title={error}
                    action={
                        <Button
                            onClick={() => {
                                setCargando(true);
                                setRecarga((n) => n + 1);
                            }}
                        >
                            Reintentar
                        </Button>
                    }
                />
            )}
            {cargando && (
                <p role="status" className="erp-loading">
                    Actualizando el centro operativo…
                </p>
            )}
            {datos && <Contenido datos={datos} onOrden={onOrden} onCuadrillas={onCuadrillas} />}
        </section>
    );
}
function Contenido({
    datos: d,
    onOrden,
    onCuadrillas,
}: Readonly<{ datos: ResumenOperativo; onOrden: (id?: number) => void; onCuadrillas: () => void }>) {
    const tarjetas = [
        {
            titulo: 'Órdenes activas',
            valor: d.abiertas,
            nota: 'En seguimiento',
            icono: BriefcaseIcon,
            tono: 'info',
        },
        {
            titulo: 'Órdenes pendientes',
            valor: d.pendientes,
            nota: 'Pendientes de asignación',
            icono: ClockIcon,
            tono: 'warning',
        },
        {
            titulo: 'Servicios finalizados',
            valor: d.cerradas,
            nota: `${d.cerradasHoy} finalizados hoy`,
            icono: CheckIcon,
            tono: 'success',
        },
        {
            titulo: 'Facturación',
            valor: dinero(d.finanzas?.facturacion ?? '0'),
            nota: 'Comprobantes del período',
            icono: CurrencyCircleDollarIcon,
            tono: 'neutral',
        },
        {
            titulo: 'Cuentas por cobrar',
            valor: dinero(d.finanzas?.porCobrar ?? '0'),
            nota: `${dinero(d.finanzas?.vencido ?? '0')} vencidos`,
            icono: FileTextIcon,
            tono: 'danger',
        },
        {
            titulo: 'Inventario crítico',
            valor: d.stockCritico ?? 0,
            nota: 'Debajo del stock mínimo',
            icono: CubeIcon,
            tono: 'danger',
        },
    ];
    const operaciones =
        d.operacionHoy ??
        d.proximas.map((o) => ({
            ...o,
            solicitud: 'Servicio técnico programado',
            responsable: 'Cuadrilla asignada',
        }));
    return (
        <>
            <div className="erp-overview-kpis">
                {tarjetas.map((t) => (
                    <article key={t.titulo} className="erp-stat">
                        <span className={`erp-stat-icon ${t.tono}`}>
                            <t.icono size={21} />
                        </span>
                        <div>
                            <h2>{t.titulo}</h2>
                            <strong>{t.valor}</strong>
                            <small>{t.nota}</small>
                        </div>
                    </article>
                ))}
            </div>
            <div className="erp-overview-grid">
                <section className="erp-panel erp-today">
                    <div className="erp-panel-heading">
                        <div>
                            <h2>Operación de hoy</h2>
                            <p>
                                {d.programadasHoy} atenciones programadas · {d.abiertas} órdenes activas
                            </p>
                        </div>
                        <button type="button" className="erp-text-action" onClick={() => onOrden()}>
                            Ver todas <CaretRightIcon size={16} />
                        </button>
                    </div>
                    <div className="erp-operation-states">
                        {[
                            { nombre: 'Programadas', cantidad: d.porEstado.ASIGNADA ?? 0, tono: 'neutral' },
                            { nombre: 'Pendientes', cantidad: d.pendientes, tono: 'info' },
                            { nombre: 'En proceso', cantidad: d.enProceso, tono: 'info' },
                            { nombre: 'En revisión', cantidad: d.enRevision, tono: 'success' },
                            { nombre: 'Atrasadas', cantidad: d.atrasadas ?? 0, tono: 'danger' },
                        ].map((e) => (
                            <div key={e.nombre}>
                                <span className={`erp-state-count ${e.tono}`}>{e.cantidad}</span>
                                <small>{e.nombre}</small>
                            </div>
                        ))}
                    </div>
                    {operaciones.length === 0 && (
                        <p className="erp-panel-empty">No hay más atenciones programadas para hoy.</p>
                    )}
                    {operaciones.map((o) => (
                        <button
                            type="button"
                            className="erp-operation-row"
                            key={o.id}
                            onClick={() => onOrden(o.id)}
                        >
                            <span className="erp-operation-time">
                                <strong>
                                    {o.fechaProgramada
                                        ? new Intl.DateTimeFormat('es-NI', {
                                              timeStyle: 'short',
                                              timeZone: d.zonaHoraria,
                                          }).format(new Date(o.fechaProgramada))
                                        : '—'}
                                </strong>
                                <small>Programación</small>
                            </span>
                            <span className="erp-operation-title">
                                <strong>{o.solicitud.replace(/^DEMO-OT-\d+ · /, '')}</strong>
                                <small>
                                    OT-{o.numero} · {o.clienteNombreRegistrado}
                                </small>
                            </span>
                            <span className="erp-operation-owner">
                                <span className="erp-account-avatar">
                                    {o.responsable.replace('DEMO ', '').slice(0, 2).toUpperCase()}
                                </span>
                                <span>
                                    <strong>{o.responsable.replace('DEMO ', '')}</strong>
                                    <small>Responsable asignado</small>
                                </span>
                            </span>
                            <span
                                className={`erp-status ${o.estadoCodigo === 'EN_EJECUCION' ? 'info' : 'neutral'}`}
                            >
                                {estado(o.estadoCodigo)}
                            </span>
                            <span className="sr-only">Consultar</span>
                        </button>
                    ))}
                </section>
                <section className="erp-panel">
                    <div className="erp-panel-heading">
                        <div>
                            <h2>Requieren atención</h2>
                            <p>Prioridad según impacto y vencimiento</p>
                        </div>
                    </div>
                    <div className="erp-alerts">
                        <button type="button" onClick={() => onOrden()}>
                            <span className="erp-stat-icon warning">
                                <ClockIcon size={20} />
                            </span>
                            <span>
                                <strong>{d.urgentes} órdenes urgentes abiertas</strong>
                                <small>Revisar prioridad y programación</small>
                            </span>
                            <CaretRightIcon size={17} />
                        </button>
                        <button type="button" onClick={() => irA('/inteligencia/origen/logistica')}>
                            <span className="erp-stat-icon danger">
                                <CubeIcon size={20} />
                            </span>
                            <span>
                                <strong>{d.stockCritico ?? 0} artículos en stock crítico</strong>
                                <small>Revisar disponibilidad de materiales</small>
                            </span>
                            <CaretRightIcon size={17} />
                        </button>
                        <button type="button" onClick={() => irA('/inteligencia/origen/finanzas')}>
                            <span className="erp-stat-icon danger">
                                <FileTextIcon size={20} />
                            </span>
                            <span>
                                <strong>{dinero(d.finanzas?.vencido ?? '0')} en facturas vencidas</strong>
                                <small>Seguimiento de cuentas por cobrar</small>
                            </span>
                            <CaretRightIcon size={17} />
                        </button>
                        <button type="button" onClick={() => irA('/inteligencia/origen/calidad')}>
                            <span className="erp-stat-icon warning">
                                <WarningCircleIcon size={20} />
                            </span>
                            <span>
                                <strong>Reclamos y garantías</strong>
                                <small>Consultar casos y acciones correctivas</small>
                            </span>
                            <CaretRightIcon size={17} />
                        </button>
                        <button
                            className="erp-text-action"
                            type="button"
                            onClick={() => irA('/inteligencia/operacion/resumen')}
                        >
                            Ver centro de alertas
                        </button>
                    </div>
                </section>
            </div>
            <section className="erp-panel erp-recent">
                <div className="erp-panel-heading">
                    <div>
                        <h2>Actividad reciente</h2>
                        <p>Últimos cambios relevantes en la operación</p>
                    </div>
                </div>
                <div className="erp-recent-list">
                    {(d.actividadReciente ?? []).map((a) => (
                        <button type="button" key={a.id} onClick={() => onOrden(a.orden.id)}>
                            <span className="erp-stat-icon info">
                                <CheckIcon size={17} />
                            </span>
                            <span>
                                <strong>
                                    OT-{a.orden.numero} · {estado(a.estadoNuevo)}
                                </strong>
                                <small>
                                    {a.orden.clienteNombreRegistrado} · {a.motivo}
                                </small>
                            </span>
                            <time>
                                {new Intl.DateTimeFormat('es-NI', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                    timeZone: d.zonaHoraria,
                                }).format(new Date(a.fecha))}
                            </time>
                            <CaretRightIcon size={16} />
                        </button>
                    ))}
                </div>
            </section>
            <div className="erp-overview-grid erp-overview-secondary">
                <section className="erp-panel">
                    <div className="erp-panel-heading">
                        <div>
                            <h2>Órdenes por atender</h2>
                            <p>Solicitudes pendientes de asignación o revisión</p>
                        </div>
                        <button className="erp-text-action" type="button" onClick={() => onOrden()}>
                            Ver órdenes
                        </button>
                    </div>
                    {d.requierenAtencion.length === 0 && (
                        <p className="erp-panel-empty">Sin órdenes pendientes de atención</p>
                    )}
                    {d.requierenAtencion.slice(0, 5).map((o) => (
                        <div className="erp-attention-row" key={o.id}>
                            <span>
                                <strong>
                                    OT-{o.numero} · {o.clienteNombreRegistrado}
                                </strong>
                                <small>{o.solicitud}</small>
                            </span>
                            <Button onClick={() => onOrden(o.id)}>
                                {o.estadoCodigo === 'EN_REVISION' ? 'Revisar' : 'Asignar'}
                            </Button>
                        </div>
                    ))}
                </section>
                <section className="erp-panel">
                    <div className="erp-panel-heading">
                        <div>
                            <h2>Carga de cuadrillas</h2>
                            <p>
                                {d.cuadrillas.filter((c) => c.ordenesActivas === 0).length} de{' '}
                                {d.cuadrillas.length} cuadrillas sin órdenes activas
                            </p>
                        </div>
                    </div>
                    {!d.cuadrillas.length && <p className="erp-panel-empty">No hay cuadrillas activas.</p>}
                    {d.cuadrillas.slice(0, 5).map((c) => (
                        <div className="erp-attention-row" key={c.id}>
                            <strong>{c.nombre.replace('DEMO ', '')}</strong>
                            <span>{c.ordenesActivas} órdenes</span>
                        </div>
                    ))}
                    <Button onClick={onCuadrillas}>Ver cuadrillas</Button>
                </section>
            </div>
        </>
    );
}
