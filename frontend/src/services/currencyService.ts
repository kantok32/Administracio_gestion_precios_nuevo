import { apiClient } from './api';

export interface CurrencyData {
  dollar: {
    value: string;
    fecha: string;
    last_update: string;
  };
  euro: {
    value: string;
    fecha: string;
    last_update: string;
  };
}

export interface CurrencyResponse {
  success: boolean;
  data: CurrencyData;
  last_update: string;
}

export const getCurrencyValues = async (): Promise<CurrencyResponse> => {
  try {
    const response = await apiClient.get('/currency/values');
    return response.data;
  } catch (error) {
    console.error('Error fetching currency values:', error);
    throw error;
  }
}; 