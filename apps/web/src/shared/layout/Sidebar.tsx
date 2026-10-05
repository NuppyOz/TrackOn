import { Link } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-bold tracking-wider text-blue-400">TrackOn</h2>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col gap-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Operaciones</div>
        {/* Enlaces de la Persona 3 */}
        <Link to="/ordenes" className="px-4 py-2 rounded hover:bg-gray-800 transition-colors">Órdenes de Trabajo</Link>
        <Link to="/dashboard" className="px-4 py-2 rounded hover:bg-gray-800 transition-colors">Dashboard</Link>
        
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Catálogos</div>
        {/* Enlaces de la Persona 1 */}
        <Link to="/clientes" className="px-4 py-2 rounded hover:bg-gray-800 transition-colors">Clientes y Equipos</Link>
        {/* Enlaces de la Persona 2 */}
        <Link to="/servicios" className="px-4 py-2 rounded hover:bg-gray-800 transition-colors">Servicios y Materiales</Link>
        <Link to="/cuadrillas" className="px-4 py-2 rounded hover:bg-gray-800 transition-colors">Cuadrillas</Link>
      </nav>
    </aside>
  );
} 
