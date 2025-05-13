export interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
  tipo?: string;
  producto?: string;
  pf_eur?: string | number;
  dimensiones?: any;
  peso_kg?: number | string;
  transporte_nacional?: string;
  ay?: string;
  caracteristicas?: {
    nombre_del_producto?: string;
    modelo?: string;
  };
  datos_contables?: {
     costo_fabrica?: number;
     divisa_costo?: string;
     fecha_cotizacion?: string | Date;
  };
  especificaciones_tecnicas?: Record<string, any>;
}