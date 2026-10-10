import React from 'react';

type Seccion = 'equipos' | 'servicios' | 'cuadrillas' | 'ordenes';

interface SidebarProps {
  menuAbierto: boolean;
  seccionActual: Seccion;
  onCloseMenu: () => void;
  onNavigate: (destino: Seccion) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuAbierto, seccionActual, onCloseMenu, onNavigate }) => {
  return (
    <>
      {menuAbierto && (
        <button type="button" className="nav-backdrop" aria-label="Cerrar navegación" onClick={onCloseMenu} />
      )}
      <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`}>
        <div className="sidebar-mobile-title">
          <strong>TrackOn</strong>
          <button type="button" aria-label="Cerrar navegación" onClick={onCloseMenu}>×</button>
        </div>
        <p>GESTIÓN OPERATIVA</p>
        <button type="button" className={seccionActual === 'equipos' ? 'selected' : ''} onClick={() => onNavigate('equipos')}><span>▣</span> Equipos</button>
        <button type="button" className={seccionActual === 'servicios' ? 'selected' : ''} onClick={() => onNavigate('servicios')}><span>≡</span> Servicios</button>
        <button type="button" className={seccionActual === 'cuadrillas' ? 'selected' : ''} onClick={() => onNavigate('cuadrillas')}><span>♟</span> Cuadrillas</button>
        <div className="sidebar-note"><strong>MULTICAS</strong><span>Gestión técnica centralizada</span></div>

        <button 
        type="button" 
        className={seccionActual === 'ordenes' ? 'selected' : ''} 
        onClick={() => onNavigate('ordenes')}
        >
        <span>📋</span> Órdenes
        </button>

      </aside>
    </>
  );
};