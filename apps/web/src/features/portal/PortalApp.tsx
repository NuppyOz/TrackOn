import { useEffect, useRef, useState } from "react";
import "../erp-ui/tokens.css";
import { portalApi, PortalHttpError } from "./portal.api";
import type { CotizacionDetalle, CotizacionLista, PaginaCotizaciones, PortalSesion } from "./portal.types";
import { PortalLogin, PortalList, PortalDetail, PortalDecisionDialog } from "./PortalViews";
import "./portal.css";


export function PortalApp() {
    const [sesion, setSesion] = useState<PortalSesion | null>(null);
    const [booting, setBooting] = useState(true);
    const [expirada, setExpirada] = useState(false);
    const [error, setError] = useState("");
    const [pagina, setPagina] = useState(1);
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [listado, setListado] = useState<PaginaCotizaciones | null>(null);
    const [seleccion, setSeleccion] = useState<CotizacionDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [decision, setDecision] = useState<"APROBADA" | "RECHAZADA" | null>(null);
    const [comentario, setComentario] = useState("");
    const [confirmar, setConfirmar] = useState(false);
    const [decisionBusy, setDecisionBusy] = useState(false);
    const [intent, setIntent] = useState<{ signature: string; key: string } | null>(null);
    const [listError, setListError] = useState("");
    const requestGeneration = useRef(0);
    const opLock = useRef(false);

    useEffect(() => {
        let alive = true;
        portalApi.me().then(data => { if (alive) setSesion(data); })
            .catch(e => { if (alive && !(e instanceof PortalHttpError && e.status === 401)) setError(mensaje(e)); })
            .finally(() => { if (alive) setBooting(false); });
        return () => { alive = false; };
    }, []);

    const expiredIf401 = (e: unknown) => {
        if (e instanceof PortalHttpError && e.status === 401) { ++requestGeneration.current; setSesion(null); setExpirada(true); setListado(null); setSeleccion(null); }
        setError(mensaje(e));
    };
    const loadList = async (p = pagina, f = estadoFiltro) => {
        const generation = ++requestGeneration.current;
        setLoading(true); setError(""); setListError("");
        try {
            const result = await portalApi.cotizaciones(p, f || undefined);
            if (generation === requestGeneration.current) { setListado(result); setPagina(p); }
        } catch (e) {
            if (generation === requestGeneration.current) {
                if (e instanceof PortalHttpError && e.status === 401) expiredIf401(e);
                else { setListError(mensaje(e)); setListado(null); }
            }
        } finally { if (generation === requestGeneration.current) setLoading(false); }
    };
    useEffect(() => {
        if (!sesion) return;
        const generation = ++requestGeneration.current;
        let active = true;
        portalApi.cotizaciones(1).then(result => {
            if (active && generation === requestGeneration.current) { setListado(result); setPagina(1); setListError(""); }
        }).catch(e => {
            if (!active || generation !== requestGeneration.current) return;
            if (e instanceof PortalHttpError && e.status === 401) expiredIf401(e);
            else { setListError(mensaje(e)); setListado(null); }
        });
        return () => { active = false; };
    }, [sesion]);

    const openDetail = async (item: CotizacionLista) => {
        const generation = ++requestGeneration.current;
        setLoading(true); setError("");
        try {
            const data = await portalApi.detalle(item.id);
            if (generation === requestGeneration.current) { setSeleccion(data); setDecision(null); setComentario(""); setIntent(null); setConfirmar(false); }
        } catch (e) {
            if (generation !== requestGeneration.current) return;
            if (e instanceof PortalHttpError && e.status === 404) setError("Esta cotización ya no está disponible para tu cuenta."); else expiredIf401(e);
        } finally { if (generation === requestGeneration.current) setLoading(false); }
    };
    const doLogin = async (identificador: string, password: string) => {
        if (opLock.current) return false;
        opLock.current = true;
        setError(""); setExpirada(false); setLoading(true);
        try { setSesion(await portalApi.login(identificador, password)); return true; }
        catch (e) { setError(e instanceof PortalHttpError && e.status === 401 ? "Identificador o contraseña incorrectos." : mensaje(e)); return false; }
        finally { opLock.current = false; setLoading(false); }
    };
    const doLogout = async () => {
        if (opLock.current) return;
        opLock.current = true; ++requestGeneration.current; setLoading(true);
        try { await portalApi.logout(); }
        catch (e) { if (!(e instanceof PortalHttpError && e.status === 401)) setError(mensaje(e)); }
        finally { setSesion(null); setListado(null); setSeleccion(null); setLoading(false); setExpirada(false); opLock.current = false; }
    };
    const chooseDecision = (value: "APROBADA" | "RECHAZADA") => {
        if (decision !== value) setIntent(null);
        setDecision(value); setError(""); setConfirmar(true);
    };
    const sendDecision = async () => {
        if (!seleccion || !decision || opLock.current) return;
        opLock.current = true;
        const payload = { version: seleccion.version, decision, ...(comentario ? { comentario } : {}) };
        const signature = JSON.stringify([seleccion.id, payload]);
        const currentIntent = intent?.signature === signature ? intent : { signature, key: uuid() };
        setIntent(currentIntent); setDecisionBusy(true); setError("");
        try {
            const updated = await portalApi.decidir(seleccion.id, payload, currentIntent.key);
            setSeleccion(updated); setDecision(null); setComentario(""); setIntent(null); setConfirmar(false);
            await loadList();
        } catch (e) {
            if (e instanceof PortalHttpError && e.status === 404) setError("Esta cotización ya no está disponible para tu cuenta.");
            else expiredIf401(e);
        } finally { opLock.current = false; setDecisionBusy(false); }
    };
    const changeComentario = (value: string) => { setComentario(value); setIntent(null); };

    if (booting) return <div className="portal portal-scope"><p className="portal__loading">Comprobando tu sesión…</p></div>;
    if (!sesion) return <PortalLogin onLogin={doLogin} busy={loading} error={error} expirada={expirada} />;
    return <div className="portal portal-scope">
        <header className="portal__header"><a className="portal__brand" href="/portal">TrackOn <span>Portal de clientes</span></a><div><span>{sesion.cliente.nombre}</span><button className="portal__link" disabled={loading} onClick={() => void doLogout()}>Salir</button></div></header>
        {error && <p className="portal__alert" role="alert">{error}</p>}
        <main className="portal__main">{seleccion ? <PortalDetail cotizacion={seleccion} onBack={() => { if (!decisionBusy && !loading) { setSeleccion(null); setConfirmar(false); } }} onApprove={() => { if (!decisionBusy && !loading) chooseDecision("APROBADA"); }} onReject={() => { if (!decisionBusy && !loading) chooseDecision("RECHAZADA"); }} /> : <PortalList items={listado?.items ?? []} pagina={pagina} hayMas={listado?.hayMas ?? false} filter={estadoFiltro} busy={loading} loaded={Boolean(listado) || Boolean(listError)} error={listError} onFilter={f => { setEstadoFiltro(f); setPagina(1); void loadList(1, f); }} onPage={p => void loadList(p)} onOpen={openDetail} />}
        {confirmar && decision && seleccion && <PortalDecisionDialog cotizacionId={seleccion.id} decision={decision} comentario={comentario} busy={decisionBusy} onComentario={changeComentario} onClose={() => setConfirmar(false)} onConfirm={() => void sendDecision()} />}
        </main>
    </div>;
}

function mensaje(e: unknown) { return e instanceof Error ? e.message : "No se pudo completar la solicitud."; }
function uuid() { return globalThis.crypto.randomUUID(); }
