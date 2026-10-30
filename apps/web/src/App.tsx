import "./App.css";
import "./shared/styles/ordenes-equipos.css";
import "./shared/styles/clientes.css";
import "./shared/styles/empleados.css";
import "./shared/styles/figma-ui.css";
import "./shared/styles/responsive.css";
import "./shared/styles/asignaciones.css";
import "./shared/styles/operacion.css";
import { useEffect, useState } from "react";
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
import { irA, leerRuta } from './shared/navigation';
import Agenda from './features/agenda/Agenda';
import UsuariosManager from './features/administracion/UsuariosManager';
import AuditoriaManager from './features/administracion/AuditoriaManager';
import ConfirmDialog from './shared/ConfirmDialog';

interface ModuleContentProps {
    seccion: Seccion;
    puedeGestionar: boolean;
    ordenInicial?: number;
    onOrden: (id?: number) => void;
    onCuadrillas: () => void;
    ruta: string;
    ordenNueva: boolean;
    puedeAdministrar: boolean;
}

function ModuleContent({ seccion, puedeGestionar, ordenInicial, onOrden, onCuadrillas, ruta, ordenNueva, puedeAdministrar }: Readonly<ModuleContentProps>) {
    switch (seccion) {
        case "agenda": return <Agenda onOrden={onOrden} />;
        case "administracion": return puedeAdministrar ? <UsuariosManager /> : <p role="alert">No tienes permisos para acceder a este módulo.</p>;
        case "auditoria": return puedeAdministrar ? <AuditoriaManager /> : <p role="alert">No tienes permisos para acceder a este módulo.</p>;
        case "dashboard":
            return puedeGestionar ? <Dashboard onOrden={onOrden} onCuadrillas={onCuadrillas} /> : <p role="alert">No tienes permisos para acceder a este módulo.</p>;
        case "materiales":
            return <MaterialesManager puedeGestionar={puedeGestionar} />;
        case "clientes":
            return <ClientesManager puedeGestionar={puedeGestionar} />;

        case "empleados":
            return puedeGestionar ? <EmpleadosManager /> : <p role="alert">No tienes permisos para acceder a este módulo.</p>;

        case "equipos":
            return <EquiposManager puedeGestionar={puedeGestionar} />;

        case "servicios":
            return <ServiciosManager puedeGestionar={puedeGestionar} />;

        case "ordenes":
            return <OrdenesManager key={ruta} puedeGestionar={puedeGestionar} ordenInicial={ordenInicial} crearInicial={ordenNueva} />;

        case "cuadrillas":
            return puedeGestionar ? (
                <CuadrillasManager />
            ) : (
                <p role="alert">No tienes permisos para acceder a este módulo.</p>
            );
    }
}

export default function App() {
    const [seccion, setSeccion] = useState<Seccion>(() => leerRuta().seccion);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
    const [verificando, setVerificando] = useState(true);
    const [cerrando, setCerrando] = useState(false);
    const [confirmandoSalida, setConfirmandoSalida] = useState(false);
    const [ordenInicial, setOrdenInicial] = useState<number | undefined>(() => leerRuta().ordenId);
    const [ruta, setRuta] = useState(() => leerRuta().ruta);

    useEffect(() => {
        function actualizarRuta() { const rutaActual = leerRuta(); setSeccion(rutaActual.seccion); setOrdenInicial(rutaActual.ordenId); setRuta(rutaActual.ruta); setMenuAbierto(false); }
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
                if (vigente) setUsuario(usuarioRecuperado);
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
            setConfirmandoSalida(false);
        };

        window.addEventListener("trackon:session-expired", sesionExpirada);

        return () => {
            vigente = false;

            window.removeEventListener("trackon:session-expired", sesionExpirada);
        };
    }, []);

    function navegar(destino: Seccion) {
        if (['administracion', 'auditoria'].includes(destino) && !puedeAdministrar) return;
        if (["dashboard", "cuadrillas", "empleados"].includes(destino) && !puedeGestionar) {
            return;
        }

        setSeccion(destino);
        setOrdenInicial(undefined);
        irA(`/${destino}`);
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
        return <LoginPage onLogin={setUsuario} />;
    }

    const nombreUsuario = usuario.empleado.persona
        ? `${usuario.empleado.persona.firstName} ${usuario.empleado.persona.firstLastName}`
        : usuario.identificador;

    return <>
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
                ruta={ruta} ordenNueva={ruta === '/ordenes/nueva'}
                puedeAdministrar={puedeAdministrar}
                onOrden={id => { navegar("ordenes"); setOrdenInicial(id); if (id) irA(`/ordenes/${id}`); }} onCuadrillas={() => navegar("cuadrillas")} />
        </MainLayout>
        {confirmandoSalida && <ConfirmDialog
            titulo="Cerrar sesión"
            descripcion="Tu sesión actual se cerrará y volverás a la pantalla de acceso."
            etiquetaConfirmar="Sí, cerrar sesión"
            variante="danger"
            procesando={cerrando}
            onCancel={() => setConfirmandoSalida(false)}
            onConfirm={() => void salir()}
        />}
    </>;
}
