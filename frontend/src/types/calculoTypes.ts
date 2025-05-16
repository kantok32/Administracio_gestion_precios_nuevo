import { Producto } from './product'; // Asumiendo que Producto se define aquí o se reexporta

export interface DatosContables {
    costo_fabrica?: number;
    divisa_costo?: string;
    fecha_cotizacion?: string;
    [key: string]: any;
}

// Si Producto tiene su propia definición más allá de lo que está en product.ts,
// y no es la que se importa, se necesitaría definirla aquí también o ajustar la importación.
// Por ahora, se asume que la importación de './product' es suficiente.

export interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

export interface GroupedPruebaResults {
    costo_producto: Record<string, number | undefined>;
    logistica_seguro: Record<string, number | undefined>;
    importacion: Record<string, number | undefined>;
    landed_cost: Record<string, number | undefined>;
    conversion_margen: Record<string, number | undefined>;
    precios_cliente: Record<string, number | undefined>;
}

export interface CalculationResult {
    inputs?: any; 
    calculados?: GroupedPruebaResults;
    error?: string;
    profileName?: string;
}

// Otros tipos de ResultadosCalculoCostosPanel que podrían ser útiles aquí:
export interface LocationState {
    productosConOpcionalesSeleccionados?: ProductoConOpcionales[];
    selectedProfileId?: string | null;
    nombrePerfil?: string;
}

export interface LineaDeTrabajoConCosto extends ProductoConOpcionales {
    costoBaseTotalEur: number;
    detalleCalculoPrincipal?: CalculationResult;
    detallesCalculoOpcionales?: CalculationResult[];
    precioVentaTotalClienteCLPPrincipal?: number;
} 