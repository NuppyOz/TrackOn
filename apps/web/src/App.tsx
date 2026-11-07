import "./App.css";
import "./shared/styles/ordenes-equipos.css";
import "./shared/styles/clientes.css";
import "./shared/styles/empleados.css";
import "./shared/styles/figma-ui.css";
import "./shared/styles/responsive.css";
import "./shared/styles/asignaciones.css";
import "./shared/styles/operacion.css";
import "./shared/styles/erp-reference.css";
import { lazy, Suspense, useEffect, useState } from "react";
import EquiposManager from "./features/equipos/EquiposManager";
import ClientesManager from "./features/clientes/ClientesManager";
import EmpleadosManager from "./features/empleados/EmpleadosManager";
import ServiciosManager from "./features/servicios/ServiciosManager";
import OrdenesManager from "./features/ordenes/OrdenesManager";
import CuadrillasManager from "./features/cuadrillas/CuadrillasManager";
import NotificationsBell from "./features/notificaciones/NotificationsBell";
import LoginPage from "./features/auth/LoginPage";
import { cerrarSesion, puedeAdministrarCatalogos, renovarSesion, type UsuarioSesion } from "./features/auth/auth.api";
import { MainLayout } from "./shared/layout/MainLayout";
import type { Seccion } from "./shared/layout/Sidebar";
import MaterialesManager from "./features/materiales/MaterialesManager";
import Dashboard from "./features/dashboard/Dashboard";
import { irA, leerRuta, RUTA_INICIAL_POR_SECCION, RUTAS } from './shared/navigation';
import Agenda from './features/agenda/Agenda';
import AdministracionWorkspace from './features/administracion/AdministracionWorkspace';
import AuditoriaManager from './features/administracion/AuditoriaManager';
import ConfirmDialog from './shared/ConfirmDialog';
const ComercialWorkspace = lazy(() => import('./features/comercial/ComercialWorkspace').then(module => ({ default: module.ComercialWorkspace })));
const InteligenciaWorkspace = lazy(() => import('./features/inteligencia/InteligenciaWorkspace').then(module => ({ default: module.InteligenciaWorkspace })));
const OperacionesWorkspace = lazy(() => import('./features/operaciones/OperacionesWorkspace'));
const FieldWorkspace = lazy(() => import('./features/field/FieldWorkspace'));

interface ModuleContentProps {
    seccion: Seccion;
    puedeGestionar: boolean;
    ordenInicial?: number;
    onOrden: (id?: number) => void;
    onCuadrillas: () => void;
    ruta: string;
    rutaValida: boolean;
    ordenNueva: boolean;
    puedeAdministrar: boolean;
}

const accessDenied = <p role="alert">No tienes permisos para acceder a este módulo.</p>;
function protectedContent(allowed: boolean, content: React.ReactNode) {
    return allowed ? content : accessDenied;
}

function ModuleContent({ seccion, puedeGestionar, ordenInicial, onOrden, onCuadrillas, ruta, rutaValida, ordenNueva, puedeAdministrar }: Readonly<ModuleContentProps>) {
    if (!rutaValida) return <section aria-labelledby="ruta-no-encontrada"><h2 id="ruta-no-encontrada">No encontramos esta página</h2><p>Revisa la dirección o vuelve al inicio del sistema.</p><button type="button" onClick={() => irA(RUTAS.dashboard)}>Ir al resumen general</button></section>;
    switch (seccion) {
        case "comercial": return protectedContent(puedeGestionar, <Suspense fallback={<p role="status">Cargando Comercial…</p>}><ComercialWorkspace ruta={ruta} puedeAdministrar={puedeAdministrar} /></Suspense>);
        case "inteligencia": return protectedContent(puedeGestionar, <Suspense fallback={<p role="status">Cargando IA y negocio…</p>}><InteligenciaWorkspace ruta={ruta} onOrden={id => onOrden(id)} /></Suspense>);
        case "operaciones": return protectedContent(puedeGestionar, <Suspense fallback={<p role="status">Cargando operaciones…</p>}><OperacionesWorkspace ruta={ruta} puedeGestionar={puedeGestionar} onOrden={onOrden} /></Suspense>);
        case "field": return <Suspense fallback={<p role="status">Cargando TrackOn Field…</p>}><FieldWorkspace ruta={ruta} onOrden={id => onOrden(id)} /></Suspense>;
        case "agenda": return <Agenda onOrden={onOrden} />;
        case "administracion": return protectedContent(puedeAdministrar, <AdministracionWorkspace ruta={ruta} />);
        case "auditoria": return protectedContent(puedeAdministrar, <AuditoriaManager />);
        case "dashboard":
            return protectedContent(puedeGestionar, <Dashboard onOrden={onOrden} onCuadrillas={onCuadrillas} />);
        case "materiales":
            return <MaterialesManager puedeGestionar={puedeGestionar} />;
        case "clientes":
            return <ClientesManager puedeGestionar={puedeGestionar} />;

        case "empleados":
            return protectedContent(puedeGestionar, <EmpleadosManager />);

        case "equipos":
            return <EquiposManager puedeGestionar={puedeGestionar} />;

        case "servicios":
            return <ServiciosManager puedeGestionar={puedeGestionar} />;

        case "ordenes":
            return <OrdenesManager key={ruta} puedeGestionar={puedeGestionar} ordenInicial={ordenInicial} crearInicial={ordenNueva} />;

        case "cuadrillas":
            return protectedContent(puedeGestionar, <CuadrillasManager />);
    }
}

export default function App() {
    const [seccion, setSeccion] = useState<Seccion>(() => leerRuta().seccion);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [confirmandoSalida, setConfirmandoSalida] = useState(false);
    const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
    const [verificando, setVerificando] = useState(true);
    const [cerrando, setCerrando] = useState(false);
    const [ordenInicial, setOrdenInicial] = useState<number | undefined>(() => leerRuta().ordenId);
    const [ruta, setRuta] = useState(() => leerRuta().ruta);
    const [rutaValida, setRutaValida] = useState(() => leerRuta().valida);

    useEffect(() => {
        function actualizarRuta() { const rutaActual = leerRuta(); setSeccion(rutaActual.seccion); setOrdenInicial(rutaActual.ordenId); setRuta(rutaActual.ruta); setRutaValida(rutaActual.valida); setMenuAbierto(false); }
        window.addEventListener('popstate', actualizarRuta);
        window.addEventListener('trackon:navigate', actualizarRuta);
        return () => { window.removeEventListener('popstate', actualizarRuta); window.removeEventListener('trackon:navigate', actualizarRuta); };
    }, []);

    const puedeGestionar = usuario !== null && puedeAdministrarCatalogos(usuario.rol.cod);
    const puedeAdministrar = usuario?.rol.cod === 'ADMIN';

    useEffect(() => {
        let vigente = true;

        void renovarSesion()
            .then(usuarioRecuperado => {
                if (vigente) {
                    setUsuario(usuarioRecuperado);
                    if (usuarioRecuperado && window.location.pathname === '/') {
                        irA(puedeAdministrarCatalogos(usuarioRecuperado.rol.cod) ? '/dashboard' : '/field');
                    }
                }
            })
            .catch(() => {
                if (vigente) setUsuario(null);
            })
            .finally(() => {
                if (vigente) {
                    setVerificando(false);
                }
            });

        const sesionExpirada = () => {
            setUsuario(null);
            setMenuAbierto(false);
        };

        window.addEventListener("trackon:session-expired", sesionExpirada);

        return () => {
            vigente = false;

            window.removeEventListener("trackon:session-expired", sesionExpirada);
        };
    }, []);

    function navegar(destino: Seccion) {
        if (['administracion', 'auditoria'].includes(destino) && !puedeAdministrar) return;
        if (["dashboard", "cuadrillas", "empleados", "comercial", "inteligencia", "operaciones"].includes(destino) && !puedeGestionar) {
            return;
        }

        setSeccion(destino);
        setOrdenInicial(undefined);
        irA(RUTA_INICIAL_POR_SECCION[destino]);
        setMenuAbierto(false);
    }

    async function salir() {
        if (cerrando) return;

        setCerrando(true);

        try {
            await cerrarSesion();
        } catch {
            // El servidor podría no haber revocado la sesión.
            // La interfaz se cerrará de todos modos.
        } finally {
            setUsuario(null);
            setSeccion("equipos");
            irA('/equipos');
            setMenuAbierto(false);
            setConfirmandoSalida(false);
            setCerrando(false);
        }
    }

    if (verificando) {
        return (
            <main className="auth-screen">
                <output>Verificando sesión…</output>
            </main>
        );
    }

    if (!usuario) {
        return <LoginPage onLogin={cuenta => {
            setUsuario(cuenta);
            const rutaActual = leerRuta();
            const puedeGestionarCuenta = puedeAdministrarCatalogos(cuenta.rol.cod);
            const esRutaAdmin = ['administracion', 'auditoria'].includes(rutaActual.seccion) || rutaActual.ruta === RUTAS.comercial['portal-cuentas'];
            const esRutaGerencial = ['dashboard', 'empleados', 'cuadrillas', 'comercial', 'inteligencia', 'operaciones'].includes(rutaActual.seccion);
            const conservarRuta = rutaActual.valida && rutaActual.ruta !== '/' && (!esRutaAdmin || cuenta.rol.cod === 'ADMIN') && (!esRutaGerencial || puedeGestionarCuenta);
            irA(conservarRuta ? rutaActual.ruta : puedeGestionarCuenta ? RUTAS.dashboard : RUTAS.field.misOrdenes);
        }} />;
    }

    const nombreUsuario = usuario.empleado.persona
        ? `${usuario.empleado.persona.firstName} ${usuario.empleado.persona.firstLastName}`
        : usuario.identificador;

    return (
        <>
        <MainLayout
            usuarioNombre={`${nombreUsuario} · ${usuario.rol.nombre}`}
            seccion={seccion}
            menuAbierto={menuAbierto}
            puedeGestionarCuadrillas={puedeGestionar}
            puedeAdministrar={puedeAdministrar}
            onNavigate={navegar}
            onOpenMenu={() => setMenuAbierto(true)}
            onCloseMenu={() => setMenuAbierto(false)}
            onLogout={() => setConfirmandoSalida(true)}
            accionesHeader={<NotificationsBell habilitada />}
        >
            <ModuleContent seccion={seccion} puedeGestionar={puedeGestionar} ordenInicial={ordenInicial}
                ruta={ruta} rutaValida={rutaValida} ordenNueva={ruta === '/ordenes/nueva'}
                puedeAdministrar={puedeAdministrar}
                onOrden={id => { navegar("ordenes"); setOrdenInicial(id); if (id) irA(`/ordenes/${id}`); }} onCuadrillas={() => navegar("cuadrillas")} />
        </MainLayout>
        {confirmandoSalida && <ConfirmDialog
            titulo="¿Quieres cerrar sesión?"
            descripcion="Volverás a la pantalla de acceso."
            etiquetaConfirmar="Cerrar sesión"
            variante="danger"
            procesando={cerrando}
            onCancel={() => setConfirmandoSalida(false)}
            onConfirm={() => void salir()}
        />}
        </>
    );
}
