import { CalculationResult, ProductoConOpcionales } from '../types/calculoTypes'; // Ajustado a la nueva ruta

export interface CotizacionDetails {
  // Define aquí una interfaz básica para los detalles de cotización que enviarás
  // inicialmente. Pueden ser todos opcionales.
  empresaQueCotiza?: string;
  clienteNombre?: string | null;
  clienteRut?: string | null;
  clienteDireccion?: string | null;
  clienteComuna?: string | null;
  clienteCiudad?: string | null;
  clientePais?: string | null;
  clienteContactoNombre?: string | null;
  clienteContactoEmail?: string | null;
  clienteContactoTelefono?: string | null;
  referenciaDocumento?: string | null;
  fechaCreacionCotizacion?: string | Date | null;
  fechaCaducidadCotizacion?: string | Date | null;
  emisorNombre?: string | null;
  emisorAreaComercial?: string | null;
  emisorEmail?: string | null;
  comentariosAdicionales?: string | null;
  terminosPago?: string | null;
  medioPago?: string | null;
  formaPago?: string | null;
  // No incluyas numeroCotizacion, el backend lo genera
}

export interface GuardarCalculoPayload {
  itemsParaCotizar: ProductoConOpcionales[];
  resultadosCalculados: Record<string, CalculationResult>; // O el tipo que usa transformarLineasParaConfiguracion
  selectedProfileId: string | null;
  nombrePerfil: string;
  anoEnCursoGlobal: number;
  cotizacionDetails: CotizacionDetails;
}

export interface GuardarCalculoResponse {
    // Asume que el backend podría devolver el objeto guardado o al menos el ID y el número.
    _id: string;
    numeroCotizacion: number;
    // ...otros campos que el backend devuelva tras guardar.
    // Si el backend solo devuelve el PDF, esta interfaz de respuesta no aplicaría directamente
    // y el manejo en el frontend sería diferente (ej. no esperar un JSON).
    message?: string; // Para mensajes de éxito/error desde el backend que no sean PDF
}


// Esta función asume que el backend podría devolver JSON en caso de éxito (además del PDF)
// o un JSON de error. Si solo devuelve PDF, el manejo de la respuesta debe ser como blob.
export const guardarCalculoHistorial = async (payload: GuardarCalculoPayload): Promise<GuardarCalculoResponse> => {
  const response = await fetch('/api/calculos-historial/guardar-y-exportar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Si el backend SÓLO devuelve PDF y no un JSON de éxito/error, este bloque necesitará cambiar.
  // Por ahora, intentamos parsear como JSON.
  // Si la respuesta es directamente un PDF, Content-Type será 'application/pdf'.
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorData;
    if (contentType && contentType.includes("application/json")) {
      errorData = await response.json();
    } else {
      const errorText = await response.text();
      errorData = { message: errorText || `Error ${response.status} al guardar el cálculo.` };
    }
    console.error('[calculoHistorialService] Error API:', errorData);
    throw new Error(errorData.message || `Error ${response.status} al guardar el cálculo.`);
  }

  // Si la respuesta es OK y es JSON (ej. el backend devuelve el ID y numeroCotizacion)
  if (contentType && contentType.includes("application/json")) {
    return await response.json() as GuardarCalculoResponse;
  } else if (contentType && contentType.includes("application/pdf")) {
    // Si es PDF, el guardado fue implícitamente exitoso en el backend.
    // No podemos retornar un JSON estándar aquí si el cuerpo es el PDF.
    // Podríamos devolver un objeto de éxito simulado si el frontend lo necesita.
    // O el frontend que llama a esto debe estar preparado para manejar un blob.
    // Por ahora, indicamos éxito pero sin datos específicos del objeto guardado si es PDF.
    // idealmente, el backend debería tener un endpoint que solo guarde y devuelva JSON,
    // y otro para obtener el PDF.
    console.warn('[calculoHistorialService] Guardado exitoso, pero la respuesta es un PDF. No se pueden extraer datos del historial guardado del cuerpo de la respuesta.')
    // Se necesitaría una forma de obtener el numeroCotizacion para el mensaje de éxito.
    // Esto podría venir de un header personalizado en la respuesta del backend.
    const numeroCotizacionHeader = response.headers.get('X-Numero-Cotizacion');

    return { 
        _id: response.headers.get('X-Calculo-ID') || 'ID_DESCONOCIDO_VER_HEADERS', // Asumiendo que el backend puede añadir este header
        numeroCotizacion: numeroCotizacionHeader ? parseInt(numeroCotizacionHeader, 10) : 0, // Asumiendo header X-Numero-Cotizacion
        message: "Cálculo guardado exitosamente. El PDF se generó." 
    };
  }

  // Fallback si el content-type no es ni JSON ni PDF pero la respuesta es ok (poco probable)
  return { 
    _id: 'ID_DESCONOCIDO', 
    numeroCotizacion: 0, 
    message: 'Guardado aparentemente exitoso, pero formato de respuesta no reconocido.' 
  } as GuardarCalculoResponse;
}; 