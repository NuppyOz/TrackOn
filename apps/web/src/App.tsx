import "./App.css";
import { useEffect, useState } from "react";
import EquiposManager from "./features/equipos/EquiposManager";
import ServiciosManager from "./features/servicios/ServiciosManager";
import CuadrillasManager from "./features/cuadrillas/CuadrillasManager";
import NotificationsBell from "./features/notificaciones/NotificationsBell";
import LoginPage from "./features/auth/LoginPage";
import { cerrarSesion, puedeAdministrarCatalogos, renovarSesion, type UsuarioSesion } from "./features/auth/auth.api";
import { MainLayout } from "./shared/layout/MainLayout";
import type { Seccion } from "./shared/layout/Sidebar";

interface ModuleContentProps {
    seccion: Seccion;
    puedeGestionar: boolean;
}

function ModuleContent({ seccion, puedeGestionar }: Readonly<ModuleContentProps>) {
    switch (seccion) {
        case "equipos":
            return <EquiposManager puedeGestionar={puedeGestionar} />;

        case "servicios":
            return <ServiciosManager puedeGestionar={puedeGestionar} />;

        case "cuadrillas":
            return puedeGestionar ? (
                <CuadrillasManager />
            ) : (
                <p role="alert">No tienes permisos para acceder a este módulo.</p>
            );
    }
}

export default function App() {
    const [seccion, setSeccion] = useState<Seccion>("equipos");
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
    const [verificando, setVerificando] = useState(true);
    const [cerrando, setCerrando] = useState(false);

    const puedeGestionar = usuario !== null && puedeAdministrarCatalogos(usuario.rol.cod);

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
        };

        window.addEventListener("trackon:session-expired", sesionExpirada);

        return () => {
            vigente = false;

            window.removeEventListener("trackon:session-expired", sesionExpirada);
        };
    }, []);

    function navegar(destino: Seccion) {
        if (destino === "cuadrillas" && !puedeGestionar) {
            return;
        }

        setSeccion(destino);
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
            setMenuAbierto(false);
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

    return (
        <MainLayout
            usuarioNombre={`${nombreUsuario} · ${usuario.rol.nombre}`}
            seccion={seccion}
            menuAbierto={menuAbierto}
            puedeGestionarCuadrillas={puedeGestionar}
            onNavigate={navegar}
            onOpenMenu={() => setMenuAbierto(true)}
            onCloseMenu={() => setMenuAbierto(false)}
            onLogout={() => void salir()}
            accionesHeader={<NotificationsBell habilitada />}
        >
            <ModuleContent seccion={seccion} puedeGestionar={puedeGestionar} />
        </MainLayout>
    );
}
