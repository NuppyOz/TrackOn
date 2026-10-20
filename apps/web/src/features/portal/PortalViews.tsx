import { useState } from "react";
import Modal from "../../shared/Modal";
import type { CotizacionDetalle, CotizacionLista, EstadoCotizacion } from "./portal.types";
import { portalFecha } from "./portal.utils";

const estados: EstadoCotizacion[] = ["ENVIADA", "APROBADA", "RECHAZADA", "VENCIDA"];

export function PortalLogin({ onLogin, busy, error, expirada }: { onLogin: (id: string, pw: string) => Promise<boolean>; busy: boolean; error: string; expirada: boolean }) {
    const [identificador, setIdentificador] = useState(""); const [password, setPassword] = useState("");
    return <div className="portal portal-scope portal--login"><main className="portal__login-card"><p className="portal__eyebrow">TrackOn · Portal de clientes</p><h1>Mis cotizaciones</h1><p>Ingresa con el acceso que te proporcionó tu empresa.</p>{expirada && <p className="portal__alert" role="alert">Tu sesión expiró. Inicia sesión nuevamente para continuar.</p>}{error && !expirada && <p className="portal__alert" role="alert">{error}</p>}
        <form onSubmit={e => { e.preventDefault(); void onLogin(identificador, password).then(ok => { if (ok) setPassword(""); }); }}><label htmlFor="portal-user">Identificador</label><input id="portal-user" autoComplete="username" required value={identificador} onChange={e => setIdentificador(e.target.value)} /><label htmlFor="portal-pass">Contraseña</label><input id="portal-pass" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><button className="portal__button" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button></form>
    </main></div>;
}
export function PortalList({ items, pagina, hayMas, filter, busy, loaded, error, onFilter, onPage, onOpen }: { items: CotizacionLista[]; pagina: number; hayMas: boolean; filter: string; busy: boolean; loaded: boolean; error: string; onFilter: (f: string) => void; onPage: (p: number) => void; onOpen: (item: CotizacionLista) => void }) {
    return <section><div className="portal__section-head"><div><p className="portal__eyebrow">Cuenta del cliente</p><h1>Mis cotizaciones</h1></div><label>Estado <select value={filter} onChange={e => onFilter(e.target.value)} disabled={busy}><option value="">Todos</option>{estados.map(s => <option key={s}>{s}</option>)}</select></label></div>
        {busy || !loaded ? <p className="portal__loading">Cargando cotizaciones…</p> : error ? <div className="portal__empty"><p role="alert">{error}</p><button className="portal__button portal__button--quiet" onClick={() => onPage(pagina)}>Reintentar</button></div> : items.length ? <div className="portal__quotes">{items.map(item => <article className="portal__quote" key={item.id}><div className="portal__quote-top"><h2>Cotización #{item.id}</h2><PortalStateBadge estado={item.estadoEfectivo} /></div><dl><div><dt>Total</dt><dd>{item.moneda} {item.total}</dd></div><div><dt>Enviada</dt><dd>{portalFecha(item.enviadaEn)}</dd></div><div><dt>Vence</dt><dd>{portalFecha(item.venceEn)}</dd></div></dl><button className="portal__button portal__button--quiet" onClick={() => onOpen(item)}>Ver cotización</button></article>)}</div> : <p className="portal__empty">No hay cotizaciones para mostrar.</p>}
        <nav className="portal__pagination" aria-label="Paginación"><button disabled={pagina <= 1 || busy} onClick={() => onPage(pagina - 1)}>Anterior</button><span>Página {pagina}</span><button disabled={!hayMas || busy} onClick={() => onPage(pagina + 1)}>Siguiente</button></nav>
    </section>;
}
export function PortalDetail({ cotizacion, onBack, onApprove, onReject }: { cotizacion: CotizacionDetalle; onBack: () => void; onApprove: () => void; onReject: () => void }) {
    return <section className="portal__detail"><button className="portal__back" onClick={onBack}>← Volver a mis cotizaciones</button><div className="portal__section-head"><div><p className="portal__eyebrow">Detalle de cotización</p><h1>Cotización #{cotizacion.id}</h1></div><PortalStateBadge estado={cotizacion.estadoEfectivo} /></div><dl className="portal__summary"><div><dt>Enviada</dt><dd>{portalFecha(cotizacion.enviadaEn)}</dd></div><div><dt>Vence</dt><dd>{portalFecha(cotizacion.venceEn)}</dd></div>{cotizacion.decididaEn && <div><dt>Decidida</dt><dd>{portalFecha(cotizacion.decididaEn)}</dd></div>}</dl>
        <div className="portal__table-wrap"><table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>{cotizacion.lineas.map(line => <tr key={line.id}><td>{line.descripcion}<small>{line.unidad}</small></td><td>{line.cantidad}</td><td>{cotizacion.moneda} {line.precio}</td><td>{cotizacion.moneda} {line.total}</td></tr>)}</tbody></table></div><div className="portal__totals"><p>Subtotal <strong>{cotizacion.moneda} {cotizacion.subtotal}</strong></p><p>Descuento <strong>{cotizacion.moneda} {cotizacion.descuento}</strong></p><p>Total <strong>{cotizacion.moneda} {cotizacion.total}</strong></p></div>
        {cotizacion.decisionComentario && <p className="portal__comment"><strong>Comentario de decisión:</strong> {cotizacion.decisionComentario}</p>}
        {cotizacion.accionesPermitidas.decidir && cotizacion.estadoEfectivo === "ENVIADA" && <div className="portal__actions"><button className="portal__button" onClick={onApprove}>Aprobar</button><button className="portal__button portal__button--quiet" onClick={onReject}>Rechazar</button></div>}
    </section>;
}
export function PortalStateBadge({ estado }: { estado: EstadoCotizacion }) { return <span className={`portal__badge portal__badge--${estado.toLowerCase()}`}><span aria-hidden="true">● </span>{estado}</span>; }

export function PortalDecisionDialog({ cotizacionId, decision, comentario, busy, onComentario, onClose, onConfirm }: {
    cotizacionId: number; decision: "APROBADA" | "RECHAZADA"; comentario: string; busy: boolean;
    onComentario: (value: string) => void; onClose: () => void; onConfirm: () => void;
}) {
    return <Modal titulo={decision === "APROBADA" ? "Aprobar cotización" : "Rechazar cotización"}
        descripcion={`Confirma tu decisión para la cotización #${cotizacionId}.`} ocupado={busy} onClose={onClose}>
        <div className="portal__decision-form"><label htmlFor="decision-comentario">Comentario opcional</label>
            <textarea id="decision-comentario" maxLength={1000} value={comentario} onChange={e => onComentario(e.target.value)} />
            <small>{comentario.length}/1000</small><div className="portal__actions">
                <button className="portal__button portal__button--quiet" disabled={busy} onClick={onClose}>Cancelar</button>
                <button className="portal__button" disabled={busy} onClick={onConfirm}>{busy ? "Enviando…" : `Confirmar ${decision === "APROBADA" ? "aprobación" : "rechazo"}`}</button>
            </div>
        </div>
    </Modal>;
}
