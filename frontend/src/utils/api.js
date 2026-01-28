/**
 * TNA Office - Cliente API Centralizado
 *
 * Este modulo provee un cliente Axios configurado con:
 * - Interceptores de autenticacion (JWT)
 * - Manejo automatico de errores 401 (sesion expirada)
 * - URL base configurada via variable de entorno VITE_API_URL
 *
 * USO:
 * import apiClient from '../utils/api';
 * const response = await apiClient.get('/offices');
 * const data = await apiClient.post('/sales', { ... });
 */

import axios from 'axios';
import { getAuthHeader, logout } from './auth';

// Variable de entorno para Vite (debe comenzar con VITE_)
// En desarrollo: VITE_API_URL=http://localhost:8001/api
// En produccion: VITE_API_URL=https://tu-dominio.com/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// Crear instancia de Axios con configuracion base
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de Request
 * Agrega automaticamente el header de autorizacion JWT a todas las peticiones
 */
apiClient.interceptors.request.use(
  (config) => {
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      config.headers = { ...config.headers, ...authHeader };
    }
    return config;
  },
  (error) => {
    console.error('[API] Error en request:', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Response
 * Maneja automaticamente errores de autenticacion (401)
 * redirigiendo al usuario a la pagina de login
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejar error de sesion expirada o no autorizado
    if (error.response?.status === 401) {
      console.warn('[API] Sesion expirada o no autorizada. Redirigiendo a login...');
      logout();
      window.location.href = '/login';
    }

    // Manejar errores de red
    if (!error.response) {
      console.error('[API] Error de red:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Funcion helper para descargar archivos (reportes, etc.)
 * Maneja blobs y crea links de descarga automaticamente
 *
 * @param {string} endpoint - Endpoint del reporte (ej: '/reports/sales/excel')
 * @param {string} filename - Nombre del archivo a descargar
 * @returns {Promise<void>}
 */
export const downloadFile = async (endpoint, filename) => {
  try {
    const response = await apiClient.get(endpoint, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('[API] Error descargando archivo:', error);
    throw error;
  }
};

// Exportar la URL base para usos especiales (WebSockets, etc.)
export const API_URL = API_BASE_URL;

// Alias para compatibilidad con codigo existente (FanPage, OfficesFanPage, etc.)
export const API = API_BASE_URL;

// Exportar el cliente como default
export default apiClient;
