import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function OrdenDetalle() {
  const { id } = useParams(); // Esto captura el número de la orden desde la URL
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/ordenes')}
          className="text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← Volver al listado
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Detalle de la Orden #{id}</h1>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
        <div className="text-gray-400 mb-2 text-5xl">🚧</div>
        <h3 className="text-lg font-medium text-gray-900">Sección en construcción</h3>
        <p className="text-gray-500 text-sm mt-1">
          Aquí irán los detalles completos del trabajo, la cuadrilla asignada y el historial de cambios.
        </p>
      </div>
    </div>
  );
}