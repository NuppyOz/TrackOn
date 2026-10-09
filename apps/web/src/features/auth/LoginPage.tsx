import "./LoginPage.css";
import { useState, type SyntheticEvent } from "react";
import { iniciarSesion, type UsuarioSesion } from "./auth.api";

interface Props {
    onLogin: (usuario: UsuarioSesion) => void;
}

export default function LoginPage({ onLogin }: Readonly<Props>) {
    const [identificador, setIdentificador] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");

    async function enviar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (enviando) return;
        if (!identificador.trim() || !password) {
            setError("Introduce tu identificador y contraseña.");
            return;
        }
        setEnviando(true);
        setError("");
        try {
            const usuario = await iniciarSesion(identificador, password);
            onLogin(usuario);
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="auth-screen">
            <aside className="auth-brand-panel" aria-label="Identidad TrackOn">
                <div className="auth-brand-lockup">
                    <div className="auth-brand-company">
                        <strong>MULTICAS</strong>
                        <small>REFRIGERACIÓN Y CLIMATIZACIÓN</small>
                    </div>
                    <span className="auth-brand-divider" aria-hidden="true" />
                    <span className="auth-brand-product">TrackOn</span>
                </div>
                <div className="auth-brand-content">
                    <span className="auth-brand-accent" aria-hidden="true" />
                    <h1>TrackOn</h1>
                    <p>Gestión técnica centralizada para MULTICAS S.A.</p>
                    <div className="auth-brand-illustration" aria-hidden="true">
                        <span /><span /><span /><span />
                    </div>
                </div>
                <p className="auth-brand-footer">MULTICAS S.A. · Refrigeración y climatización</p>
            </aside>

            <section className="auth-login-area" aria-labelledby="login-titulo">
                <div className="auth-mobile-brand">
                    <strong>MULTICAS</strong><span aria-hidden="true">|</span><strong>TrackOn</strong>
                    <small>Portal de acceso</small>
                </div>
                <div className="auth-login-stack">
                    <div className="auth-panel">
                        <h2 id="login-titulo">Iniciar sesión</h2>
                        <p className="auth-description">Ingresa tus credenciales para acceder a TrackOn.</p>
                        {error && <div className="auth-error" role="alert">{error}</div>}
                        <form onSubmit={event => void enviar(event)} className="auth-form">
                            <label htmlFor="login-identificador">Usuario</label>
                            <input
                                id="login-identificador"
                                name="username"
                                autoComplete="username"
                                maxLength={100}
                                required
                                value={identificador}
                                onChange={event => setIdentificador(event.target.value)}
                                placeholder="Ingresa tu usuario"
                                disabled={enviando}
                            />
                            <label htmlFor="login-password">Contraseña</label>
                            <div className="auth-password">
                                <input
                                    id="login-password"
                                    name="password"
                                    type={visible ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    maxLength={128}
                                    value={password}
                                    onChange={event => setPassword(event.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                    disabled={enviando}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible(actual => !actual)}
                                    aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    aria-pressed={visible}
                                    disabled={enviando}
                                >
                                    {visible ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                            <button type="submit" className="auth-submit" disabled={enviando}>
                                {enviando ? "Ingresando…" : "Iniciar sesión"}
                            </button>
                        </form>
                    </div>
                    <p className="auth-help">Acceso interno · MULTICAS S.A.</p>
                </div>
                <p className="auth-mobile-footer">MULTICAS S.A. · Refrigeración y climatización</p>
            </section>
        </main>
    );
}
