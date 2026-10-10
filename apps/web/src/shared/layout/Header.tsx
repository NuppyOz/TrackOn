import NotificationsBell from '../../features/notificaciones/NotificationsBell';
import { type UsuarioSesion } from '../../features/auth/auth.api';

export function Header({ usuario, onOpenMenu, onLogout }: Readonly<{
  usuario: UsuarioSesion | null;
  onOpenMenu: () => void;
  onLogout: () => void;
}>) {
  const nombre = usuario
    ? `${usuario.empleado.persona.firstName} ${usuario.empleado.persona.firstLastName}`
    : 'Operaciones';
  const iniciales = usuario
    ? `${usuario.empleado.persona.firstName.slice(0, 1)}${usuario.empleado.persona.firstLastName.slice(0, 1)}`
    : 'MC';

  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" aria-label="Abrir navegación" onClick={onOpenMenu}>☰</button>
      <img className="brand-logo" src="/logo-multicas.png" alt="MULTICAS" />
      <div className="brand"><strong>TrackOn</strong><span>MULTICAS S.A.</span></div>
      <div className="topbar-context">
        <span>{nombre}</span>
        <NotificationsBell habilitada={Boolean(usuario)} />
        <button type="button" className="avatar avatar-button" aria-label={usuario ? 'Cerrar sesión' : 'MULTICAS'} title={usuario ? 'Cerrar sesión' : 'MULTICAS'} onClick={usuario ? onLogout : undefined}>
          {iniciales}
        </button>
      </div>
    </header>
  );
}