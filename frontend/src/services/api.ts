import axios from 'axios';
import type { Producto } from "../types/product";
import type { CurrencyData } from "../types/currency";
import { CostoPerfilData, ProductoData } from '../types';
import { getCurrencyValues } from './currencyService';

// --- INICIO MODIFICACIÓN: Tipo para el payload de calcularCostoProductoConPerfil ---
// Este tipo debe coincidir con lo que espera el backend para /api/costo-perfiles/calcular-producto
interface CalcularCostoProductoPayload {
  profileId: string;
  anoCotizacion: number;
  anoEnCurso: number;
  costoFabricaOriginalEUR: number;
  tipoCambioEurUsdActual: number;
  // tipoCambioUsdClpActual no se envía desde el frontend para esta ruta,
  // el backend lo obtiene con fetchCurrencyValues
}

// Asumo que la respuesta del backend para calcular-producto tiene esta estructura
// (basado en PerfilesPanel y la lógica de backend)
interface GroupedPruebaResults {
    costo_producto: any;
    logistica_seguro: any;
    importacion: any;
    landed_cost: any;
    conversion_margen: any;
    precios_cliente: any;
    // Deberían definirse tipos más específicos para cada sección
}

interface CalcularCostoProductoResponse {
  perfilUsado?: { _id: string; nombre: string };
  resultado: {
    inputs: any; // Datos de entrada que usó el backend
    calculados: GroupedPruebaResults;
  };
  message?: string; // Mensaje de éxito o error
}
// --- FIN MODIFICACIÓN ---

// Establecer URL base según entorno
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'; // Línea original comentada

const API_BASE_PATH = '/api'; // Todas tus rutas de backend comienzan con /api
const VITE_API_URL_ENV = import.meta.env.VITE_API_URL; // Puede ser una URL absoluta ej: https://api.example.com

// Si VITE_API_URL_ENV está definida y no es una cadena vacía (para un backend en otro dominio), úsala tal cual, asegurándote de que no termine con / y luego añade API_BASE_PATH.
// Si no está definida o está vacía, asume que el backend está en el mismo host, bajo API_BASE_PATH (funciona con el proxy de Vite y con backend en mismo dominio/subruta)
let determinedApiUrl: string;
if (VITE_API_URL_ENV && VITE_API_URL_ENV.trim() !== '') {
  // Asegurarse de que no haya una barra inclinada al final de VITE_API_URL_ENV antes de concatenar
  const cleanedViteApiUrl = VITE_API_URL_ENV.endsWith('/') ? VITE_API_URL_ENV.slice(0, -1) : VITE_API_URL_ENV;
  determinedApiUrl = `${cleanedViteApiUrl}${API_BASE_PATH}`;
} else {
  determinedApiUrl = API_BASE_PATH;
}

// Instancia de axios con configuración común
export const apiClient = axios.create({
  baseURL: determinedApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (!error.response) {
      return Promise.reject({
        message: 'Error de conexión. Verifique su conexión a internet o inténtelo más tarde.',
        status: 0,
        data: null
      });
    }
    
    if (error.response.status >= 500) {
      return Promise.reject({
        message: 'Error en el servidor. Por favor, inténtelo más tarde.',
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return Promise.reject({
      message: error.response.data?.message || 'Error en la solicitud.',
      status: error.response.status,
      data: error.response.data
    });
  }
);

// Crear datos de prueba para desarrollo
const mockProducts = {
  total: 5,
  data: [
    {
      codigo_producto: '61103',
      nombre_del_producto: 'Chipeadora PTO A141XL',
      Descripcion: 'Chipeadora de construcción fija, con requerimiento de potencia de 82 [HP]',
      Modelo: 'A141XL',
      categoria: 'Chipeadora PTO',
      pf_eur: '8500',
      dimensiones: '410x300mm',
    },
    {
      codigo_producto: '61166',
      nombre_del_producto: 'Chipeadora Motor A141XL',
      Descripcion: 'Chipeadora con mesa giratoria en 270°, con motor diésel',
      Modelo: 'A141XL - 75 HP',
      categoria: 'Chipeadora Motor',
      pf_eur: '12500',
      dimensiones: '410x300mm',
    },
    {
      codigo_producto: '61134',
      nombre_del_producto: 'Chipeadora PTO A141XL Chasis 25km/h',
      Descripcion: 'Chipeadora de construcción fija, con requerimiento de potencia de 82 [HP]',
      Modelo: 'A141XL - Chasis 25km/h',
      categoria: 'Chipeadora PTO',
      pf_eur: '9800',
      dimensiones: '410x300mm',
    },
    {
      codigo_producto: '61135',
      nombre_del_producto: 'Chipeadora PTO A141XL Chasis 80km/h',
      Descripcion: 'Chipeadora de construcción fija, con requerimiento de potencia de 82 [HP]',
      Modelo: 'A141XL - Chasis 80km/h',
      categoria: 'Chipeadora PTO',
      pf_eur: '10500',
      dimensiones: '410x300mm',
    },
    {
      codigo_producto: '61201',
      nombre_del_producto: 'Chipeadora PTO A231',
      Descripcion: 'Chipeadora de construcción fija, con requerimiento de potencia de 75 [HP]',
      Modelo: 'A231 - 3 Puntos',
      categoria: 'Chipeadora PTO',
      pf_eur: '7500',
      dimensiones: '310x240mm',
    },
  ],
};

const mockCurrencies = {
  currencies: {
    dollar: {
      value: '983.27',
      last_update: new Date().toISOString(),
    },
    euro: {
      value: '1085.15',
      last_update: new Date().toISOString(),
    },
  },
};

// Funciones de API
export const getCachedProducts = async (): Promise<{total: number, data: Producto[]}> => {
  console.log('Fetching products...');
  try {
    const response = await apiClient.get('/products/cached');
    console.log('Products fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching cached products:', error);
    throw error;
  }
};

export const getProducts = async (): Promise<Producto[]> => {
  const response = await apiClient.get('/products');
  return response.data;
};

export const getDollarValue = async () => {
  const response = await apiClient.get('/products/currency/dollar');
  return response.data;
};

export const getEuroValue = async () => {
  const response = await apiClient.get('/products/currency/euro');
  return response.data;
};

// --- INICIO MODIFICACIÓN: Unificar API_BASE_URL para perfiles y cálculos ---
// const API_BASE_URL = 'http://localhost:5001/api'; // Comentado o eliminado
// const COSTO_API_URL = 'http://localhost:5001/api/costo-perfiles'; // Eliminado
// --- FIN MODIFICACIÓN ---

// --- Funciones relacionadas con Perfiles de Costo ---

const fetchAllProfiles = async (): Promise<CostoPerfilData[]> => {
  try {
    const response = await apiClient.get<CostoPerfilData[]>('/costo-perfiles');
    return response.data;
  } catch (error) {
    console.error('Error fetching all cost profiles:', error);
    throw error;
  }
};

const fetchProfileData = async (profileId: string): Promise<CostoPerfilData | null> => {
  if (!profileId) return null;
  try {
    const response = await apiClient.get<CostoPerfilData>(`/costo-perfiles/${profileId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching profile data for ID ${profileId}:`, error);
    // Devolver null o lanzar error según preferencia de manejo
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null; // No encontrado
    }
    throw error;
  }
};

const updateProfile = async (profileId: string, data: Partial<CostoPerfilData>): Promise<CostoPerfilData> => {
  try {
    const response = await apiClient.put<CostoPerfilData>(`/costo-perfiles/${profileId}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating profile ${profileId}:`, error);
    throw error;
  }
};

const createProfile = async (data: Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'>): Promise<CostoPerfilData> => {
  try {
    const response = await apiClient.post<CostoPerfilData>('/costo-perfiles', data);
    return response.data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

const deleteProfile = async (profileId: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/costo-perfiles/${profileId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting profile ${profileId}:`, error);
    throw error;
  }
};

// --- Funciones relacionadas con Productos (Ejemplo) ---
const fetchAllProducts = async (): Promise<ProductoData[]> => {
  try {
    const response = await apiClient.get<ProductoData[]>('/products');
    return response.data;
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};

// --- INICIO MODIFICACIÓN: Nueva función para calcular costo de producto con perfil ---
const calcularCostoProductoConPerfil = async (payload: CalcularCostoProductoPayload): Promise<CalcularCostoProductoResponse> => {
  try {
    const response = await apiClient.post<CalcularCostoProductoResponse>('/costo-perfiles/calcular-producto', payload);
    return response.data;
  } catch (error) {
    console.error('Error calculating product cost:', error);
    throw error;
  }
};
// --- FIN MODIFICACIÓN ---

// Exportar las funciones
export const api = {
  // Perfiles
  fetchAllProfiles,
  fetchProfileData,
  updateProfile,
  createProfile,
  deleteProfile,
  // Productos
  getCachedProducts,
  getProducts,
  fetchAllProducts,
  // Divisas
  getDollarValue, 
  getEuroValue,
  getCurrencyValues,
  // Cálculos
  calcularCostoProductoConPerfil,
};