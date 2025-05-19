import { Producto } from '../types/product'; // Corrected import path

export const fetchProductByCode = async (codigo: string): Promise<Producto | null> => {
  // Construct URL with query parameter
  const response = await fetch(`/api/products/detail?codigo=${encodeURIComponent(codigo)}`);

  if (!response.ok) {
    // Handle specific errors like 404 for not found, or throw a generic error
    if (response.status === 404) {
      console.warn(`[productService] Producto con código ${codigo} no encontrado (404).`);
      return null; // Or throw new Error(`Producto con código ${codigo} no encontrado.`);
    }
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `Error ${response.status} al obtener el producto ${codigo}.`);
  }

  const result = await response.json();
  
  // The actual product data might be nested, e.g., in result.data.product
  if (result.success && result.data && result.data.product) {
    return result.data.product as Producto;
  }
  // If the structure is flat and result itself is the product and it was a 200 OK:
  // return result as Producto; 
  // Adjust based on the actual API response structure of /api/products/detail
  
  console.warn(`[productService] Producto con código ${codigo} no encontrado en la respuesta exitosa o estructura inesperada.`, result);
  return null; // Or throw an error if product is expected but not in the correct structure
};

// You can add other product-related service functions here, for example:
// export const fetchAllProducts = async (): Promise<Producto[]> => { ... };
// export const updateProductDetails = async (productId: string, updates: Partial<Producto>): Promise<Producto> => { ... };

export const fetchFilteredProducts = async (searchTerm: string): Promise<Producto[]> => {
  if (!searchTerm.trim()) {
    return [];
  }
  // Backend's /api/products/filter expects 'codigo', 'modelo', or 'categoria'.
  // For a general search, we'll try with 'codigo'. 
  // A more advanced implementation might allow user to specify field or try multiple.
  const response = await fetch(`/api/products/filter?codigo=${encodeURIComponent(searchTerm)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `Error ${response.status} al buscar productos.`);
  }

  const data = await response.json();
  // The backend for /api/products/filter (fetchFilteredProductsController)
  // calls a utility fetchFilteredProducts(query) which likely returns an array directly.
  if (Array.isArray(data)) {
    return data as Producto[];
  } else if (data && Array.isArray(data.products)) { 
    return data.products as Producto[];
  } else if (data && Array.isArray(data.data)) { 
    return data.data as Producto[];
  }
  
  console.warn('[productService] fetchFilteredProducts: La respuesta no es un array de productos o estructura inesperada.', data);
  return []; 
}; 