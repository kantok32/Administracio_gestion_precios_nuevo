// Interface for the 'costos' sub-document
/*
export interface CostosData {
  tipo_cambio_eur_usd?: number;
  buffer_eur_usd?: number;
  dolar_observado_actual?: number;
  buffer_usd_clp?: number;
  tasa_seguro?: number;
  margen_adicional_total?: number;
  costo_fabrica_original_eur?: number;
  descuento_fabricante?: number;
  factor_actualizacion_anual?: number;
  transporte_local_eur?: number;
  gasto_importacion_eur?: number;
  flete_maritimo_usd?: number;
  recargos_destino_usd?: number;
  honorarios_agente_aduana_usd?: number;
  gastos_portuarios_otros_usd?: number;
  transporte_nacional_clp?: number;
  derecho_ad_valorem?: number;
  iva?: number;
  buffer_transporte?: number; // Added field
  fecha_ultima_actualizacion_transporte_local?: string | Date | null; // Added field (use string for ISO date format)
}
*/

// Interface for the main PricingOverride document
/*
export interface PricingOverrideData {
  _id: string; // Perfil ID (e.g., 'global', 'cat_123', 'prod_456')
  nivel: 'global' | 'categoria' | 'producto';
  costos: CostosData;
  metadata: {
    ultima_actualizacion: string | Date; // ISO date string or Date object
    actualizado_por: string;
  };
  categoryId?: string; // Optional, only for nivel 'categoria'
  productId?: string; // Optional, only for nivel 'producto'
  createdAt?: string | Date; // Added by timestamps: true
  updatedAt?: string | Date; // Added by timestamps: true

  // Add any other fields that might be present but not strictly defined in the schema if necessary
  // Example: nombre_perfil?: string; // If you add a display name later
}
*/

// You can add other type definitions for your application below 

// --- Nueva Interfaz para CostoPerfil --- 
export interface CostoPerfilData {
  _id: string; // ID de Mongoose
  nombre_perfil: string;
  descripcion?: string;

  // --- Seccion: Descuentos y Buffers (%) --- Ajustado para claridad
  descuento_fabrica_pct: number;
  buffer_eur_usd_pct: number;
  buffer_usd_clp_pct: number;
  tasa_seguro_pct: number;
  margen_adicional_pct: number;
  descuento_cliente_pct: number;

  // --- Seccion: Costos Operacionales (Valores Fijos) --- Ajustado para claridad
  costo_logistica_origen_eur: number;
  flete_maritimo_usd: number;
  recargos_destino_usd: number;
  costo_agente_aduana_usd: number;
  gastos_portuarios_otros_usd: number;
  transporte_nacional_clp: number;

  // --- Seccion: Impuestos (%) --- Ajustado para claridad
  derecho_advalorem_pct: number;
  iva_pct: number;

  // Timestamps
  createdAt?: string; 
  updatedAt?: string; 
  activo?: boolean; // Añadido para el campo "activo"
}


// --- Mantener otras interfaces si son necesarias ---
// Por ejemplo, si tienes una interfaz para Productos:
export interface ProductoData { 
  _id: string;
  Codigo_Producto: string;
  nombre_del_producto: string;
  modelo: string;
  categoria: string;
  // ... otros campos del producto
  costo_lista_original_eur?: number; // Dato específico del producto
  fecha_costo_original?: string; // Necesario para calcular antigüedad
  costoPerfilId?: string; // ID del perfil asignado (opcional)
}

// Interfaz para los datos de la conversación del chatbot
export interface ChatMessage {
  userInput: string;
  agentResponse: string;
  timestamp?: string; // O Date si lo manejas como objeto Date
}

export interface ConversationData {
  _id: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
} 