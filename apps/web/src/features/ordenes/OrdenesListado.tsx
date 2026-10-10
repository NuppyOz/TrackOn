import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

export default function OrdenesListado() {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/ordenes')
      .then(res => {
        setOrdenes(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('No se pudieron cargar las órdenes de trabajo.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO Y BOTÓN (Siempre visibles) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los servicios y mantenimientos</p>
        </div>
        <button 
          onClick={() => navigate('/ordenes/nueva')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Nueva Orden
        </button>
      </div>

      {/* 2. ÁREA DE ESTADO (Error, Cargando o Tabla) */}
      {error ? (
        <div className="bg-red-50 p-8 text-center rounded-xl border border-red-100">
          <p className="text-red-600 font-medium mb-1">Error de conexión</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-white p-8 text-center rounded-xl border border-gray-200">
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {ordenes.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="text-gray-400 mb-2 text-4xl">📋</div>
              <h3 className="text-lg font-medium text-gray-900">No hay órdenes</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">Crea una nueva orden para comenzar</p>
              
              {/* BOTÓN DE PRUEBA TEMPORAL */}
              <button 
                onClick={() => navigate('/ordenes/101')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline transition-colors"
              >
                🔍 Ver detalle de una orden de prueba (ID: 101)
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">Aquí irá la tabla de órdenes...</div>
          )}
        </div>
      )}
    </div>
  );
}