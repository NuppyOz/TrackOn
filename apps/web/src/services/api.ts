import axios from 'axios';


// 1. Creamos la instancia base apuntando a tu backend
export const apiClient = axios.create({
  // ¡Esta línea es la clave para solucionar el error!
  baseURL: 'http://localhost:3000/api', 
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. Interceptor de Petición: Antes de enviar cualquier cosa al backend, inyecta el token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Interceptor de Respuesta: Atrapa los errores globales (como el 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response, // Si todo sale bien, deja pasar la respuesta
  (error) => {
    // Si el backend responde con 401 (Token inválido o expirado)
    if (error.response && error.response.status === 401) {
      console.warn("🚨 Sesión expirada. Redirigiendo al login...");
      localStorage.removeItem('token'); // Borramos el token inválido
      window.location.href = '/login'; // Expulsamos al usuario al login
    }
    return Promise.reject(error);
  }

);