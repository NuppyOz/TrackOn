import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { type UsuarioSesion } from '../features/auth/auth.api';

type Seccion = 'equipos' | 'servicios' | 'cuadrillas' | 'ordenes';

interface AuthenticatedLayoutProps {
  usuario: UsuarioSesion | null;
  seccionActual: Seccion;
  onNavigate: (destino: Seccion) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  usuario,
  seccionActual,
  onNavigate,
  onLogout,
  children
}) => {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleNavigate = (destino: Seccion) => {
    onNavigate(destino);
    setMenuAbierto(false); // Cierra el menú móvil al navegar
  };

  return (
    <div className="app-shell">
      <Header 
        usuario={usuario} 
        onOpenMenu={() => setMenuAbierto(true)} 
        onLogout={onLogout} 
      />
      <Sidebar 
        menuAbierto={menuAbierto} 
        seccionActual={seccionActual} 
        onCloseMenu={() => setMenuAbierto(false)} 
        onNavigate={handleNavigate} 
      />
      <main className="workspace">
        {children}
      </main>
    </div>
  );
};