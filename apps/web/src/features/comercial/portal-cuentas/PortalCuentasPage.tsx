import { useCallback, useEffect, useRef, useState } from "react";
import "../../erp-ui/tokens.css";
import { cambiarEstadoCuentaPortal, crearCuentaPortal, obtenerCuentaPortal, restablecerCuentaPortal } from "./portal-cuentas.api";
import type { CuentaPortal } from "./portal-cuentas.types";
import { listarClientes } from "../../clientes/clientes.api";
import { nombreCliente } from "../../clientes/clientes.types";
import type { Cliente } from "../../clientes/clientes.types";
import "./portal-cuentas.css";

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

export interface PortalCuentasPageProps {
    /** Root debe pasar true solo para una sesión ADMIN. */
    puedeGestionar?: boolean;
}

export function PortalCuentasPage({ puedeGestionar = false }: PortalCuentasPageProps) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteId, setClienteId] = useState("");
    const [cuenta, setCuenta] = useState<CuentaPortal | null>(null);
    const [cargando, setCargando] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [identificador, setIdentificador] = useState("");
    const [password, setPassword] = useState("");
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const getGeneration = useRef(0);
    const operationLock = useRef(false);



    const cargar = useCallback(async (id: string) => {
        const generation = ++getGeneration.current;
        if (!id) { setCuenta(null); setCargando(false); return; }
        setCargando(true);
        setError("");
        try {
            const result = await obtenerCuentaPortal(Number(id));
            if (generation === getGeneration.current) setCuenta(result);
        } catch (e) {
            if (generation === getGeneration.current) { setCuenta(null); setError(mensaje(e)); }
        } finally { if (generation === getGeneration.current) setCargando(false); }
    }, []);

    useEffect(() => {
        if (!puedeGestionar) return;
        let vigente = true;
        listarClientes().then(items => {
            if (!vigente) return;
            setClientes(items);
            if (items.length) {
                const firstId = String(items[0].id);
                setClienteId(firstId);
                void cargar(firstId);
            } else setCargando(false);
        }).catch(e => {
            if (vigente) { setError(mensaje(e)); setCargando(false); }
        });
        return () => { vigente = false; };
    }, [puedeGestionar, cargar]);

    const limpiarSecreto = () => setPassword("");
    const cerrarFormulario = () => { setMostrarFormulario(false); setIdentificador(""); limpiarSecreto(); };
    const guardarNueva = async (event: React.FormEvent) => {
        event.preventDefault();
        if (operationLock.current || !puedeGestionar || !clienteId || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return;
        operationLock.current = true; setBusy(true); setError("");
        try {
            await crearCuentaPortal(Number(clienteId), identificador, password);
            cerrarFormulario();
            await cargar(clienteId);
        } catch (e) { setError(mensaje(e)); }
        finally { operationLock.current = false; setBusy(false); }
    };
    const cambiarEstado = async () => {
        if (operationLock.current || !puedeGestionar || !cuenta) return;
        const nextActive = !cuenta.activo;
        if (!window.confirm(`${nextActive ? "Activar" : "Desactivar"} el acceso de ${cuenta.identificador}? ${nextActive ? "" : "Esto cerrará sus sesiones activas."}`)) return;
        operationLock.current = true; setBusy(true); setError("");
        try { await cambiarEstadoCuentaPortal(cuenta, nextActive); await cargar(clienteId); }
        catch (e) { setError(mensaje(e)); }
        finally { operationLock.current = false; setBusy(false); }
    };
    const restablecer = async (event: React.FormEvent) => {
        event.preventDefault();
        if (operationLock.current || !puedeGestionar || !cuenta || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return;
        if (!window.confirm(`Restablecer la contraseña de ${cuenta.identificador}? Esto cerrará sus sesiones activas.`)) return;
        operationLock.current = true; setBusy(true); setError("");
        try { await restablecerCuentaPortal(cuenta, password); cerrarFormulario(); await cargar(clienteId); }
        catch (e) { setError(mensaje(e)); }
        finally { operationLock.current = false; setBusy(false); }
    };

    if (!puedeGestionar) return <main className="portal-admin comercial-scope"><p role="alert">No tienes permiso para administrar cuentas del portal.</p></main>;
    const clienteSeleccionado = clientes.find(c => String(c.id) === clienteId);
    const mostrarAlta = mostrarFormulario && !cuenta;
    const mostrarReset = mostrarFormulario && Boolean(cuenta);
    return <main className="portal-admin comercial-scope">
        <header className="portal-admin__header"><div><p className="portal-admin__eyebrow">Comercial / Acceso de clientes</p><h1>Cuenta del portal</h1><p>Administra el acceso del cliente a sus cotizaciones.</p></div>
            <button className="portal-admin__button portal-admin__button--quiet" disabled={busy || cargando || !clienteId} onClick={() => void cargar(clienteId)}>Actualizar</button>
        </header>
        {error && <p className="portal-admin__alert" role="alert">{error}</p>}
        <section className="portal-admin__card">
            <label htmlFor="portal-cliente">Cliente</label>
            <select id="portal-cliente" disabled={busy} value={clienteId} onChange={e => { setClienteId(e.target.value); cerrarFormulario(); setError(""); void cargar(e.target.value); }}>
                {clientes.length === 0 && <option value="">No hay clientes</option>}
                {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{nombreCliente(cliente)}</option>)}
            </select>
            {clienteSeleccionado && <p className="portal-admin__subtle">{clienteSeleccionado.activo ? "Cliente activo" : "Cliente inactivo"}</p>}
        </section>
        <section className="portal-admin__card" aria-live="polite">
            {cargando ? <p>Cargando cuenta…</p> : cuenta ? <>
                <div className="portal-admin__row"><div><h2>{cuenta.identificador}</h2><p className="portal-admin__subtle">Acceso {cuenta.activo ? "activo" : "desactivado"}</p></div><span className={`portal-admin__badge ${cuenta.activo ? "is-active" : "is-inactive"}`}><span aria-hidden="true">● </span>{cuenta.activo ? "Activa" : "Inactiva"}</span></div>
                <p className="portal-admin__subtle">Creada {new Date(cuenta.creadaEn).toLocaleDateString("es-NI", { timeZone: "America/Managua" })}</p>
                {error ? <button className="portal-admin__button portal-admin__button--quiet" disabled={busy} onClick={() => void cargar(clienteId)}>Reintentar</button> : null}
                {puedeGestionar && !error && <div className="portal-admin__actions">
                    <button className="portal-admin__button portal-admin__button--quiet" disabled={busy || (!cuenta.activo && !clienteSeleccionado?.activo)} onClick={() => void cambiarEstado()}>{cuenta.activo ? "Desactivar acceso" : "Activar acceso"}</button>
                    <button className="portal-admin__button" disabled={busy} onClick={() => { if (mostrarReset) cerrarFormulario(); else setMostrarFormulario(true); }}>{mostrarReset ? "Cancelar" : "Restablecer contraseña"}</button>
                </div>}
                {mostrarReset && puedeGestionar && <form className="portal-admin__form" onSubmit={restablecer}><PasswordInput value={password} onChange={setPassword} />
                    <div className="portal-admin__actions"><button type="button" className="portal-admin__button portal-admin__button--quiet" disabled={busy} onClick={() => { cerrarFormulario(); }}>Cancelar</button><button className="portal-admin__button" disabled={busy || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX}>{busy ? "Guardando…" : "Guardar contraseña"}</button></div></form>}
            </> : error ? <><h2>No se pudo cargar la cuenta</h2><button className="portal-admin__button portal-admin__button--quiet" disabled={busy} onClick={() => void cargar(clienteId)}>Reintentar</button></> : <>
                <h2>Sin cuenta de portal</h2><p className="portal-admin__subtle">{clienteSeleccionado?.activo ? "Crea un acceso para que este cliente consulte sus cotizaciones." : "Activa al cliente antes de crear una cuenta."}</p>
                {puedeGestionar && <button className="portal-admin__button" disabled={busy || !clienteSeleccionado?.activo} onClick={() => { if (mostrarAlta) cerrarFormulario(); else setMostrarFormulario(true); }}>{mostrarAlta ? "Cancelar" : "Crear cuenta"}</button>}
                {mostrarAlta && puedeGestionar && <form className="portal-admin__form" onSubmit={guardarNueva}><label htmlFor="portal-identificador">Identificador</label><input id="portal-identificador" autoComplete="username" required minLength={3} maxLength={100} pattern="[a-zA-Z0-9._-]+" value={identificador} onChange={e => setIdentificador(e.target.value)} />
                    <PasswordInput value={password} onChange={setPassword} /><div className="portal-admin__actions"><button type="button" className="portal-admin__button portal-admin__button--quiet" disabled={busy} onClick={cerrarFormulario}>Cancelar</button><button className="portal-admin__button" disabled={busy || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX}>{busy ? "Creando…" : "Crear cuenta"}</button></div></form>}
            </>}
        </section>
    </main>;
}

function PasswordInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return <><label htmlFor="portal-password">Nueva contraseña</label><input id="portal-password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} required value={value} onChange={e => onChange(e.target.value)} /><small>Entre 12 y 128 caracteres.</small></>;
}
function mensaje(error: unknown) { return error instanceof Error ? error.message : "No se pudo completar la operación."; }
