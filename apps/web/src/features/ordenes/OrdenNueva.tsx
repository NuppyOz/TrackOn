import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

export default function OrdenNueva() {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    cliente: '',
    ubicacion: '',
    prioridad: 'NORMAL',
    descripcion: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      // Intento de conexión con la API
      await apiClient.post('/ordenes', formData);
      // Si tiene éxito, regresamos al listado
      navigate('/ordenes');
    } catch (err: any) {
      console.error("Error al crear orden:", err);
      // Como sabemos que tu backend local está rebelde, por ahora solo mostraremos el error visual
      setError(err.response?.data?.message || 'No se pudo conectar con el servidor para crear la orden.');
      setGuardando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/ordenes')}
          className="text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Crear Nueva Orden</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg shadow-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <input 
                required
                type="text" 
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                placeholder="Nombre del cliente o empresa"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad *</label>
              <select 
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación / Dirección *</label>
            <input 
              required
              type="text" 
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              placeholder="Dirección donde se realizará el trabajo"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Trabajo *</label>
            <textarea 
              required
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={4}
              placeholder="Detalla el problema o servicio requerido..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button 
            type="button"
            onClick={() => navigate('/ordenes')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </div>
  );
}