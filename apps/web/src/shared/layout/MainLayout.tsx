import { NavLink } from 'react-router-dom';

export function Sidebar({ menuAbierto, onCloseMenu }: Readonly<{ 
  menuAbierto: boolean; 
  onCloseMenu: () => void 
}>) {
  return (
    <>
      {menuAbierto && <button type="button" className="nav-backdrop" aria-label="Cerrar navegación" onClick={onCloseMenu} />}
      <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`}>
        <div className="sidebar-mobile-title">
          <strong>TrackOn</strong>
          <button type="button" aria-label="Cerrar navegación" onClick={onCloseMenu}>×</button>
        </div>
        <p>GESTIÓN OPERATIVA</p>
        
        <NavLink to="/ordenes" className={({isActive}) => isActive ? 'selected' : ''} onClick={onCloseMenu}><span>📋</span> Órdenes</NavLink>
        <NavLink to="/equipos" className={({isActive}) => isActive ? 'selected' : ''} onClick={onCloseMenu}><span>▣</span> Equipos</NavLink>
        <NavLink to="/servicios" className={({isActive}) => isActive ? 'selected' : ''} onClick={onCloseMenu}><span>≡</span> Servicios</NavLink>
        <NavLink to="/cuadrillas" className={({isActive}) => isActive ? 'selected' : ''} onClick={onCloseMenu}><span>♟</span> Cuadrillas</NavLink>
        
        <div className="sidebar-note"><strong>MULTICAS</strong><span>Gestión técnica centralizada</span></div>
      </aside>
    </>
  );
}