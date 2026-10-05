export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-800">Panel de Control</h1>
      
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-gray-600">
          Hola, <span className="font-bold text-blue-600">Jeremy</span>
        </div>
        <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
