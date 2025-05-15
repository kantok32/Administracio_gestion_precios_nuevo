import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, ArrowLeft, ArrowRight, Check, MessageCircle, PlusCircle, FileEdit, Trash2, RefreshCw, ListFilter, Mail, Edit3, ChevronDown, Info, Settings2, Archive, ArchiveRestore } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import DetallesCargaPanel from './DetallesCargaPanel';
import DetallesEnvioPanel from './DetallesEnvioPanel';
// import type { Producto } from '../types/product'; 
import { motion } from 'framer-motion';
import EquipoEditModal from '../components/EquipoEditModal'; // <<< IMPORTACIÓN ASEGURADA

// Interfaces (copiadas de App.tsx)
interface ApiResponse {
  success: boolean;
  data: {
    currencies: {
      dollar: {
        value: number | null;
        last_update: string | null;
        fecha: string | null;
      };
      euro: {
        value: number | null;
        last_update: string | null;
        fecha: string | null;
      };
    };
    products: {
      total: number;
      data: Producto[];
    };
  };
  timestamp: string;
  message?: string;
  error?: string;
}

interface EspecificacionTecnica {
  caracteristica: string;
  especificacion: string;
}

// Interfaz para la respuesta de opcionales
interface OpcionalesResponse {
  total: number;
  products: Producto[];
}

// Definición de la interfaz ProductoConOpcionales (puede estar en un archivo de tipos más adelante)
interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

// Interfaz para los datos del formulario de equipo (puede expandirse)
interface EquipoFormData {
  Codigo_Producto?: string;
  categoria?: string; // Categoría principal a nivel raíz
  peso_kg?: number | string;
  // Agrega más campos de nivel raíz aquí según sea necesario
  caracteristicas?: {
    nombre_del_producto?: string;
    modelo?: string;
    descripcion?: string;
    categoria?: string; // Categoría interna, si es diferente
    // Agrega más campos de caracteristicas aquí
  };
  dimensiones?: {
    largo_cm?: number | string;
    ancho_cm?: number | string;
    alto_cm?: number | string;
    // Agrega más campos de dimensiones aquí
  };
  // Añade otros campos principales como clasificacion_easysystems, codigo_ea, proveedor, procedencia, etc.
  clasificacion_easysystems?: string;
  codigo_ea?: string;
  proveedor?: string;
  procedencia?: string;
  es_opcional?: boolean;
  tipo?: string;
  // ...otros campos que tu API de creación espere
}

// Interfaz Producto (Asegúrate de que esta es la principal que se usa)
// Esta es una copia de la que estaba más arriba, ajustada.
// Si tienes una central en src/types/product.ts, modifica esa.
interface Producto {
  _id?: string; // A menudo presente desde MongoDB
  id?: string; // A veces usado como alias o transformación
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string; // Usado en la tabla principal y modal de opcionales
  categoria?: string; // Usado en la tabla principal
  tipo?: string; // Para "opcional" u otros tipos, usado en la tabla principal
  producto?: string; // <--- CAMPO CLAVE PARA OPCIONALES Y LINTER
  peso_kg?: number;
  especificaciones_tecnicas?: any; // O una interfaz más detallada
  caracteristicas?: {
    nombre_del_producto?: string;
    modelo?: string;
    descripcion?: string;
    categoria?: string;
    [key: string]: any; // Para otros campos dentro de caracteristicas
  };
  datos_contables?: {
    costo_fabrica_original_eur?: number;
    costo_ano_cotizacion?: number;
    [key: string]: any; // Para otros campos dentro de datos_contables
  };
  dimensiones?: {
    largo_mm?: number;
    ancho_mm?: number;
    alto_mm?: number;
    [key: string]: any; // Para otros campos dentro de dimensiones
  };
  // Otros campos que puedas tener a nivel raíz
  clasificacion_easysystems?: string;
  codigo_ea?: string;
  proveedor?: string;
  procedencia?: string;
  es_opcional?: boolean;
  familia?: string;
  nombre_comercial?: string;
  detalles?: any; // O una interfaz más detallada
  [key: string]: any; // Para permitir otros campos no explícitamente definidos
}

// --- Placeholder para la función API --- 
// Deberás implementar esto en tu archivo de servicios API (ej. frontend/src/services/api.ts)
const api = {
  calculatePricing: async (body: { productCode: string; [key: string]: any }) => {
    console.log("[API Placeholder] Calling calculatePricing with body:", body);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
    return { 
      inputsUsed: { productCode: body.productCode, categoryId: 'simulated_category', totalMarginPercent: 0.35, landedCostUSD: 124112.35, appliedUsdClpRate: 978.5, netSalePriceCLP: 163954687, finalSalePriceCLP: 195106078 }, 
      calculations: { landedCostUSD: 124112.35, appliedUsdClpRate: 978.5, landedCostCLP: 121447916, marginAmountCLP: 42506771, netSalePriceCLP: 163954687, saleIvaAmountCLP: 31151391, finalSalePriceCLP: 195106078 }
    }; 
  }
};
// --- Fin Placeholder API ---

// --- Helper function para renderizar especificaciones anidadas ---
const renderSpecifications = (specs: any) => {
  if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
    return <p style={{ fontSize: '13px', color: '#6B7280' }}>No hay especificaciones técnicas detalladas disponibles.</p>;
  }

  // Orden específico deseado para las categorías principales
  const categoryOrder = [
    'DIMENSIONES', 
    'SISTEMA DE POTENCIA', 
    'SISTEMA DE ALIMENTACIÓN', 
    'SISTEMA DE CORTE', 
    'CARACTERÍSTICAS CHASIS Y ACCESORIOS', 
    'EXIGENCIAS Y SISTEMA DE SEGURIDAD', 
    'GRUA' 
    // Añadir otras categorías si existen y se requiere un orden específico
  ];

  const sortedCategories = Object.keys(specs).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    // Poner categorías conocidas al principio, en el orden definido
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1; // a viene antes si está en la lista y b no
    if (indexB !== -1) return 1;  // b viene antes si está en la lista y a no
    // Ordenar alfabéticamente las categorías no especificadas
    return a.localeCompare(b); 
  });

  return sortedCategories.map((category) => {
    const details = specs[category];
    // No renderizar si la categoría está vacía o no es un objeto válido
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
      return null; 
    }
    
    return (
      <div key={category} style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e88e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px', marginBottom: '12px' }}>
          {category.replace(/_/g, ' ')} {/* Reemplazar guiones bajos por espacios */}
        </h4>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
          {Object.entries(details).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{key.replace(/_/g, ' ')}:</dt>
              <dd style={{ fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' }}>
                {/* Manejar booleanos, nulos o undefined de forma explícita */}
                {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value === null || value === undefined ? '-' : String(value)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }).filter(Boolean); // Filtrar elementos null si alguna categoría estaba vacía
};
// --- Fin Helper function ---

// Estilo para los inputs de filtro en la cabecera de la tabla
const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: '12px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
};

const normalizeModeloString = (str: string) => { // <<< CORRECCIÓN DE TIPADO
  if (!str) return "";
  return str.toLowerCase().replace(/[\s-]+/g, ''); // Convierte a minúsculas y quita espacios y guiones
};

export default function EquiposPanel() {
  // Estados principales (movidos de App.tsx)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosOriginales, setProductosOriginales] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMostrado, setTotalMostrado] = useState(0); // X (productos que cumplen búsqueda Y no son opcionales)
  const [totalEquiposNoOpcionales, setTotalEquiposNoOpcionales] = useState(0); // Y (productos originales que NO son opcionales)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({}); // Para filtros de columna
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState<Producto | null>(null);

  // Estados para el modal de "Ver Opcionales" (el que se abre desde el botón de información en cada fila)
  const [showVistaOpcionalesModal, setShowVistaOpcionalesModal] = useState(false);
  const [productoParaVistaOpcionales, setProductoParaVistaOpcionales] = useState<Producto | null>(null);
  const [vistaOpcionalesData, setVistaOpcionalesData] = useState<Producto[]>([]);
  const [vistaOpcionalesLoading, setVistaOpcionalesLoading] = useState(false);
  const [vistaOpcionalesError, setVistaOpcionalesError] = useState<string | null>(null);
  const [loadingOpcionalesBtn, setLoadingOpcionalesBtn] = useState<string | null>(null);
  const [loadingDescontinuado, setLoadingDescontinuado] = useState<string | null>(null); // Nuevo estado

  // --- NUEVO: Estados para el Flujo de Cotización ---
  const [pasoCotizacion, setPasoCotizacion] = useState<number>(0); // 0: Tabla Equipos, 1: Detalles Carga, ...
  const [opcionalesConfirmados, setOpcionalesConfirmados] = useState<Producto[]>([]); // Guarda los opcionales seleccionados

  // --- NUEVO: Estados para el Resultado del Cálculo --- 
  const [pricingResult, setPricingResult] = useState<any>(null); // Almacenará la respuesta completa del cálculo
  const [pricingLoading, setPricingLoading] = useState<boolean>(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  // -------------------------------------------------------

  // --- Estado para el modo de selección de equipos para cotización ---
  const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
  // --- Estado para almacenar los códigos de los productos seleccionados para cotizar ---
  const [productosSeleccionadosParaCotizar, setProductosSeleccionadosParaCotizar] = useState<Set<string>>(new Set());
  // --- NUEVO: Estado para la configuración secuencial de opcionales ---
  const [indiceProductoActualParaOpcionales, setIndiceProductoActualParaOpcionales] = useState<number | null>(null);
  const [opcionalesSeleccionadosPorProducto, setOpcionalesSeleccionadosPorProducto] = useState<Record<string, Producto[]>>({});
  // --- NUEVO: Estado para pasar datos estructurados a DetallesCargaPanel ---
  const [datosParaDetallesCarga, setDatosParaDetallesCarga] = useState<ProductoConOpcionales[]>([]);
  // --- NUEVO: Estado para el producto principal cuyos opcionales se están configurando ---
  const [productoActualConfigurandoOpcionales, setProductoActualConfigurandoOpcionales] = useState<Producto | null>(null);

  // --- ESTADOS ADICIONALES PARA EL FLUJO DE CONFIGURACIÓN DE OPCIONALES DEL MODAL ---
  const [showOpcionalesConfigModal, setShowOpcionalesConfigModal] = useState<boolean>(false);
  const [productosParaConfigurarOpcionales, setProductosParaConfigurarOpcionales] = useState<Producto[]>([]);
  const [productoPrincipalActualParaOpcionales, setProductoPrincipalActualParaOpcionales] = useState<Producto | null>(null);
  const [opcionalesDisponiblesParaPrincipalActual, setOpcionalesDisponiblesParaPrincipalActual] = useState<Producto[]>([]);
  const [loadingOpcionalesParaPrincipal, setLoadingOpcionalesParaPrincipal] = useState<boolean>(false);
  // --- FIN ESTADOS ADICIONALES ---

  // --- NUEVO: Estados para los datos del OpcionalesCotizacionModal ---
  // Estos se llenarán dinámicamente para el productoActualConfigurandoOpcionales
  const [opcionalesDataModal, setOpcionalesDataModal] = useState<Producto[]>([]);
  const [opcionalesLoadingModal, setOpcionalesLoadingModal] = useState(false);
  const [opcionalesErrorModal, setOpcionalesErrorModal] = useState<string | null>(null);

  // --- NUEVO ESTADO PARA VISIBILIDAD DEL MODAL DE SELECCIÓN DE OPCIONALES ---
  const [showSeleccionOpcionalesModal, setShowSeleccionOpcionalesModal] = useState<boolean>(false);
  // --- FIN NUEVO ESTADO ---

  // --- ESTADO PARA ALMACENAR OPCIONALES CARGADOS POR CADA PRODUCTO PRINCIPAL ---
  type OpcionalesPrincipalState = {
    data: Producto[];
    isLoading: boolean;
    error: string | null;
  };
  const [opcionalesPorPrincipal, setOpcionalesPorPrincipal] = useState<Record<string, OpcionalesPrincipalState>>({});
  // --- FIN ESTADO PARA OPCIONALES CARGADOS ---

  // --- ESTADO PARA LAS SELECCIONES DE OPCIONALES DENTRO DEL MODAL ---
  const [opcionalesSeleccionadosEnModal, setOpcionalesSeleccionadosEnModal] = useState<Record<string, Set<string>>>({});
  // --- FIN ESTADO PARA SELECCIONES EN MODAL ---

  // --- NUEVO: Estados para el Modal de EDITAR Equipo (los estados del formulario interno se eliminan) ---
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [equipoParaEditar, setEquipoParaEditar] = useState<Producto | null>(null);
  // ELIMINADOS: const [editEquipoForm, setEditEquipoForm] = useState<EquipoFormData>({});
  // ELIMINADOS: const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  // ELIMINADOS: const [editError, setEditError] = useState<string | null>(null); 

  // --- NUEVO: Estados para el Modal de CONFIRMAR ELIMINACIÓN ---
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
  const [equipoParaEliminar, setEquipoParaEliminar] = useState<Producto | null>(null); // Renombrado para evitar conflicto si se usa 'equipoParaEliminar' como prop
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Estilos Unificados (Basados en Ver Detalle) ---
  const unifiedModalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1040 };
  const unifiedModalContentStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' };
  const unifiedHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#EBF8FF' }; // Azul claro header
  const unifiedTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e88e5' }; // Reducido a 16px
  const unifiedCloseButtonStyle: React.CSSProperties = { backgroundColor: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', color: '#1e40af' };
  const unifiedBodyStyle: React.CSSProperties = { flexGrow: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F9FAFB' }; // Gris claro body
  const unifiedTableContainerStyle: React.CSSProperties = { overflowX: 'auto' }; // Contenedor tabla por si acaso
  const unifiedTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
  const unifiedThStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', backgroundColor: '#f3f4f6' }; // Mantenido (o 13px si se prefiere)
  const unifiedTdStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', fontSize: '13px', color: '#4B5563' }; // Reducido a 13px
  const unifiedFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' }; // Gris claro footer, justifyContent cambiado a flex-end
  const unifiedSecondaryButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 }; // Reducido a 13px
  const unifiedDisabledSecondaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' };
  // --- AÑADIR ESTILOS PRIMARIOS FALTANTES ---
  const unifiedPrimaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };
  const unifiedDisabledPrimaryButtonStyle: React.CSSProperties = { ...unifiedPrimaryButtonStyle, backgroundColor: '#a5d8ff', color: '#e0e0e0', cursor: 'not-allowed', borderColor: '#a5d8ff' };
  // --- FIN AÑADIR ESTILOS PRIMARIOS ---

  // Estilo para el botón flotante de chat
  const [isHoveringChat, setIsHoveringChat] = useState(false);
  const chatButtonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: isHoveringChat ? '#1d4ed8' : '#2563eb',
    color: 'white',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    zIndex: 1000,
    transform: isHoveringChat ? 'scale(1.05)' : 'scale(1)'
  };

  // Funciones (movidas de App.tsx)
  const handleVerDetalle = async (producto: Producto) => {
     setLoadingDetail(producto.codigo_producto || null);
    try {
      if (!producto.codigo_producto) {
        throw new Error('El código de producto es requerido');
      }
      console.log(`Obteniendo detalles para producto ${producto.codigo_producto}`);
      const response = await fetch(`http://localhost:5001/api/products/detail?codigo=${producto.codigo_producto}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setDetalleProducto(data.data.product);
        setShowDetalleModal(true);
        console.log('Detalles del producto recibidos:', data.data.product);
      } else {
        throw new Error('Producto no encontrado o formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error al obtener detalles del producto:', error);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleOpcionales = async (producto: Producto) => {
    console.log("Obteniendo opcionales (vista simple) para:", producto.codigo_producto, "Tipo DB:", producto.tipo, "Nombre:", producto.nombre_del_producto);
    setProductoParaVistaOpcionales(producto);
    // setShowVistaOpcionalesModal(true); // Mostrar modal solo si hay algo que cargar o un mensaje claro
    
    setVistaOpcionalesLoading(true);
    setVistaOpcionalesError(null);
    setVistaOpcionalesData([]);
    setLoadingOpcionalesBtn(producto.codigo_producto || null);

    // Lógica de doble verificación para determinar si es opcional
    const esTipoOpcionalDirecto = producto.tipo === 'opcional';
    const tieneNombreOpcional = producto.nombre_del_producto && producto.nombre_del_producto.toLowerCase().includes('opcional');

    if (esTipoOpcionalDirecto || (!esTipoOpcionalDirecto && tieneNombreOpcional) ) {
      // Si el tipo es 'opcional' O (el tipo no es 'opcional' PERO el nombre contiene 'opcional')
      console.log("El producto se considera opcional (por tipo directo o por nombre). No se buscarán más opcionales para la vista simple.");
      setVistaOpcionalesError('Este producto ya es un opcional y no tiene sub-opcionales.');
      setVistaOpcionalesData([]);
      setVistaOpcionalesLoading(false);
      setLoadingOpcionalesBtn(null);
      setShowVistaOpcionalesModal(true); // Mostrar modal para ver el mensaje
      return;
    }

    try {
      if (!producto.codigo_producto) { // Solo el código del producto es necesario ahora
        throw new Error('Falta el código del producto principal para obtener opcionales.');
      }
      const params = new URLSearchParams();
      params.append('codigo', producto.codigo_producto);
      // El modelo y la categoría ya no se envían como parámetros.
      const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
      console.log('Consultando opcionales (vista simple):', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor al obtener opcionales (vista simple): ${response.status}`);
      }
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.products)) {
        setVistaOpcionalesData(data.data.products);
      } else {
        throw new Error('Formato de respuesta de opcionales inválido (vista simple)');
      }
    } catch (error: any) {
      console.error('Error al obtener opcionales (vista simple):', error);
      let errorMessageToShow;
      const specificErrorMessageText = 'El producto principal no tiene un valor en el campo "producto" o "caracteristicas.nombre_del_producto" para buscar opcionales.';
      
      if (error.name === 'AbortError') {
         errorMessageToShow = 'La solicitud tardó demasiado.';
      } else if (error.message && error.message.includes('Failed to fetch')) {
        errorMessageToShow = 'Error de conexión al obtener opcionales.';
      } else if (error.message && error.message.includes(specificErrorMessageText)) {
        errorMessageToShow = 'No se encuentran opcionales disponibles';
      } else {
         errorMessageToShow = error instanceof Error ? error.message : 'Error desconocido';
      }
      setVistaOpcionalesError(errorMessageToShow);
      setVistaOpcionalesData([]);
    } finally {
      setVistaOpcionalesLoading(false);
      setLoadingOpcionalesBtn(null);
      setShowVistaOpcionalesModal(true); // Asegurar que el modal se muestre
    }
  };

  const handleConfigurar = async (producto: Producto) => {
    console.log("Abriendo selección de opcionales para:", producto.nombre_del_producto);
    setProductoActualConfigurandoOpcionales(producto);
    setOpcionalesLoadingModal(true); // Mostrar loading en el modal mientras carga
    setOpcionalesErrorModal(null);
    setOpcionalesDataModal([]);

    try {
      if (!producto.codigo_producto || !producto.Modelo /* || !producto.categoria */) { // categoria ya no se usa
         throw new Error('Faltan parámetros requeridos (código, modelo)');
      }
      const params = new URLSearchParams();
      params.append('codigo', producto.codigo_producto);
      params.append('modelo', producto.Modelo);
      // params.append('categoria', producto.categoria); // Eliminado
      const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data.products)) {
        setOpcionalesDataModal(data.data.products); // Cargar datos para el modal
      } else {
         throw new Error('Formato de respuesta inválido');
      }
    } catch (error: any) {
       console.error('Error al obtener opcionales para modal configuración:', error);
       let errorMessageToShow;
       const specificErrorMessageText = 'El producto principal no tiene un valor en el campo "producto" o "caracteristicas.nombre_del_producto" para buscar opcionales.';

       if (error.message && error.message.includes(specificErrorMessageText)) {
           errorMessageToShow = 'No se encuentran opcionales disponibles';
       } else if (error.name === 'AbortError') {
           errorMessageToShow = 'La solicitud para obtener opcionales tardó demasiado.';
       } else {
           errorMessageToShow = error instanceof Error ? error.message : 'Error desconocido';
       }
       setOpcionalesErrorModal(errorMessageToShow);
    } finally {
       setOpcionalesLoadingModal(false); // Terminar carga del modal
    }
  };
  
  const handleCloseModal = () => {
    setShowVistaOpcionalesModal(false);
    setProductoParaVistaOpcionales(null);
    setVistaOpcionalesData([]);
    setVistaOpcionalesError(null);
  };
  
  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    console.log("Obteniendo productos del caché...");
    try {
      const res = await fetch('http://localhost:5001/api/products/cache/all');
      if (!res.ok) throw new Error(`Error en la respuesta del servidor: ${res.status}`);
      const response: ApiResponse = await res.json();
      console.log("Datos recibidos del caché:", response);
      if (!response.success) {
        throw new Error(response.message || 'Error en la respuesta del servidor');
      }
      const productosRecibidos = response.data.products.data;
      console.log(`Se encontraron ${productosRecibidos.length} productos recibidos inicialmente.`);

      // --- INICIO: Diagnóstico de duplicados por codigo_producto ---
      if (productosRecibidos && productosRecibidos.length > 0) {
        const codigos = productosRecibidos.map(p => p.codigo_producto);
        const codigosUnicos = new Set(codigos);
        if (codigos.length !== codigosUnicos.size) {
          console.warn('¡ALERTA! Se detectaron codigo_producto duplicados en productosRecibidos del backend:');
          const conteoCodigos: Record<string, number> = {};
          codigos.forEach(codigo => {
            if (codigo) { // Contar solo si el código existe
              conteoCodigos[codigo] = (conteoCodigos[codigo] || 0) + 1;
            }
          });
          for (const codigo in conteoCodigos) {
            if (conteoCodigos[codigo] > 1) {
              console.warn(` - Código: ${codigo}, Ocurrencias: ${conteoCodigos[codigo]}`);
              // Opcional: Loguear los objetos completos que tienen este código duplicado
              // productosRecibidos.filter(p => p.codigo_producto === codigo).forEach(dup => console.log('Objeto duplicado:', dup));
            }
          }
        } else {
          console.log('Diagnóstico: No se detectaron codigo_producto duplicados en productosRecibidos del backend.');
        }
      } else {
        console.log('Diagnóstico: No hay productos recibidos o el array está vacío para verificar duplicados.');
      }
      // --- FIN: Diagnóstico de duplicados ---

      setProductosOriginales(productosRecibidos);
      setProductos(productosRecibidos); // Inicialmente, antes de filtros, productos es igual a originales
      setTotalMostrado(productosRecibidos.length);
    } catch (error) {
      console.error('Error al cargar productos del caché:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al acceder al caché');
      setProductos([]);
      setProductosOriginales([]);
      setTotalMostrado(0);
    } finally {
      setLoading(false);
    }
  };

  // useEffects (movidos de App.tsx)
  useEffect(() => {
    console.log("Iniciando carga de productos...");
    fetchProductos();
  }, []);
  
  useEffect(() => {
    // Paso 1: Filtrar productosOriginales para obtener solo los que NO son opcionales
    const equiposNoOpcionalesList = productosOriginales.filter(producto => {
      const nombreProductoNormalizado = producto.nombre_del_producto?.toLowerCase() || '';
      const tipoProductoNormalizado = producto.tipo?.toLowerCase() || '';
      const esOpcionalPorNombre = nombreProductoNormalizado.includes('opcional');
      const esOpcionalPorTipoDirecto = tipoProductoNormalizado === 'opcional';
      return !(esOpcionalPorNombre || esOpcionalPorTipoDirecto);
    });
    setTotalEquiposNoOpcionales(equiposNoOpcionalesList.length); // Este es nuestro 'Y'

    // Paso 2: De esta lista de equiposNoOpcionales, aplicar el filtro de búsqueda global
    let productosVisiblesEnTabla = [...equiposNoOpcionalesList];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      productosVisiblesEnTabla = equiposNoOpcionalesList.filter(
        producto => 
          producto.codigo_producto?.toLowerCase().includes(lowerSearchTerm) || 
          producto.nombre_del_producto?.toLowerCase().includes(lowerSearchTerm) ||
          producto.Modelo?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Paso 3: Aplicar filtros de columna
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) { // Solo si hay un valor de filtro para esta columna
        const lowerFilterValue = filterValue.toLowerCase();
        productosVisiblesEnTabla = productosVisiblesEnTabla.filter(producto => {
          let valorColumna = '';
          // Determinar el valor de la columna para el producto actual
          if (columnKey === 'codigo_producto') valorColumna = producto.codigo_producto || '';
          else if (columnKey === 'nombre_del_producto') valorColumna = producto.nombre_del_producto || '';
          else if (columnKey === 'descripcion') valorColumna = producto.descripcion || '';
          else if (columnKey === 'Modelo') valorColumna = producto.Modelo || '';
          else if (columnKey === 'tipo') {
            // Re-calcular displayTipo para este producto para poder filtrar sobre él
            const nombreProductoNormalizado = producto.nombre_del_producto?.toLowerCase() || '';
            const tipoProductoNormalizado = producto.tipo?.toLowerCase() || '';
            const esOpcionalPorNombre = nombreProductoNormalizado.includes('opcional');
            const esOpcionalPorTipoDirecto = tipoProductoNormalizado === 'opcional';

            if (esOpcionalPorNombre || esOpcionalPorTipoDirecto) {
              valorColumna = 'Opcional';
            } else {
              if (tipoProductoNormalizado === 'osi' || tipoProductoNormalizado === '') {
                valorColumna = 'Equipo';
              } else {
                valorColumna = producto.tipo!.charAt(0).toUpperCase() + producto.tipo!.slice(1);
              }
            }
          }
          return valorColumna.toLowerCase().includes(lowerFilterValue);
        });
      }
    });
    
    setProductos(productosVisiblesEnTabla); // Productos que realmente se muestran
    setTotalMostrado(productosVisiblesEnTabla.length); // Este es nuestro 'X'
  }, [searchTerm, productosOriginales, columnFilters]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
         if (showVistaOpcionalesModal) { handleCloseModal(); }
         if (showDetalleModal) { handleCloseDetalleModal(); }
         if (showEditModal) { handleCloseEditModal(); } // <<< Cerrar el modal de edición con ESC
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => { window.removeEventListener('keydown', handleEscKey); };
  }, [showVistaOpcionalesModal, showDetalleModal, showEditModal]); // <<< Añadir showEditModal a dependencias

  const handleCloseDetalleModal = () => {
    setShowDetalleModal(false);
    setDetalleProducto(null);
  };

  // --- NUEVA FUNCIÓN PARA EL MODAL DE EDICIÓN EXTERNO ---
  const handleSaveSuccessEquipoEditModal = () => {
    refreshProductos(); // Actualiza la lista de productos
    handleCloseEditModal(); // Cierra el modal de edición
    // Aquí podrías añadir una notificación de éxito si lo deseas
    console.log("Equipo guardado exitosamente a través de EquipoEditModal y lista actualizada.");
  };
  // --- FIN NUEVA FUNCIÓN ---

  // --- NUEVO: Función para avanzar en la configuración de opcionales o finalizar ---
  const avanzarConfiguracionOpcionales = (guardarOpcionalesActuales: Producto[] | null = null) => {
    if (indiceProductoActualParaOpcionales === null) return; // No debería pasar si se llama correctamente

    // Convertir el Set a un array para acceder por índice
    const arrayProductosSeleccionadosParaCotizar = Array.from(productosSeleccionadosParaCotizar);
    const codigoProductoActual = arrayProductosSeleccionadosParaCotizar[indiceProductoActualParaOpcionales];

    if (codigoProductoActual && guardarOpcionalesActuales) {
      setOpcionalesSeleccionadosPorProducto(prev => ({
        ...prev,
        [codigoProductoActual]: guardarOpcionalesActuales
      }));
    } else if (codigoProductoActual && guardarOpcionalesActuales === null) { // Modal cerrado sin confirmar
      setOpcionalesSeleccionadosPorProducto(prev => ({
        ...prev,
        [codigoProductoActual]: prev[codigoProductoActual] || [] // Mantener opcionales previos o array vacío si no hay
      }));
    }

    const siguienteIndice = indiceProductoActualParaOpcionales + 1;

    // Usar .size para Set, o .length si se refiere al array convertido
    if (siguienteIndice < arrayProductosSeleccionadosParaCotizar.length) {
      setIndiceProductoActualParaOpcionales(siguienteIndice);
      const siguienteCodigoProducto = arrayProductosSeleccionadosParaCotizar[siguienteIndice];
      const siguienteProducto = productosOriginales.find(p => p.codigo_producto === siguienteCodigoProducto);
      if (siguienteProducto) {
        console.log("Configurando opcionales para el SIGUIENTE producto:", siguienteProducto.nombre_del_producto);
        // Asegurarse de que el modal de opcionales se limpie y recargue para el nuevo producto
        setOpcionalesDataModal([]); // Limpiar datos de opcionales del producto anterior
        setOpcionalesErrorModal(null);
        handleConfigurar(siguienteProducto); // Abre el modal para el siguiente producto
      } else {
        console.error("Error: Siguiente producto para configurar no encontrado.");
        // Considerar cómo manejar este error (ej. finalizar prematuramente)
        setIndiceProductoActualParaOpcionales(null);
        setPasoCotizacion(0); // Volver a la tabla de equipos
      }
    } else {
      // Todos los productos seleccionados han sido configurados (o se les dio la oportunidad)
      console.log("Configuración de opcionales finalizada.");
      console.log("Productos Principales Seleccionados (códigos):", productosSeleccionadosParaCotizar);
      console.log("Opcionales Seleccionados por Producto:", opcionalesSeleccionadosPorProducto);
      
      const itemsParaDetalleCarga: ProductoConOpcionales[] = Array.from(productosSeleccionadosParaCotizar).map((codigoPrincipal: string) => {
        const principal = productosOriginales.find(p => p.codigo_producto === codigoPrincipal);
        const opcionales = opcionalesSeleccionadosPorProducto[codigoPrincipal] || [];
        return {
          principal: principal || {} as Producto, // Evitar undefined si no se encuentra
          opcionales: opcionales
        };
      }).filter((item: ProductoConOpcionales) => item.principal && item.principal.codigo_producto); // Asegurarse que el principal es válido

      console.log("Datos preparados para DetallesCargaPanel:", itemsParaDetalleCarga);
      setDatosParaDetallesCarga(itemsParaDetalleCarga);
      
      setPasoCotizacion(1); // Transición a DetallesCargaPanel
      setIndiceProductoActualParaOpcionales(null); // Resetear índice
    }
  };

  // --- useEffect para cargar opcionales cuando productoActualConfigurandoOpcionales cambia y estamos en paso 1 ---
  // ESTE useEffect YA NO ES NECESARIO O DEBE SER REENFOCADO, LA LÓGICA DE CARGA DEL MODAL SERÁ DIFERENTE
  /*
  useEffect(() => {
    const fetchOpcionalesParaProductoActual = async () => {
      // ... (lógica anterior que cargaba en opcionalesDataModal)
    };

    if (pasoCotizacion === 1 && productoActualConfigurandoOpcionales) { // Esta condición ya no aplica para el modal nuevo
      fetchOpcionalesParaProductoActual();
    }
  }, [productoActualConfigurandoOpcionales, pasoCotizacion]);
  */

  // --- NUEVO useEffect PARA CARGAR OPCIONALES CUANDO SE ABRE EL MODAL DE SELECCIÓN ---
  useEffect(() => {
    if (showSeleccionOpcionalesModal && productosParaConfigurarOpcionales.length > 0) {
      console.log("Modal de selección de opcionales abierto. Cargando opcionales para:", productosParaConfigurarOpcionales);
      const initialOpcionalesState: Record<string, OpcionalesPrincipalState> = {};
      productosParaConfigurarOpcionales.forEach(principal => {
        initialOpcionalesState[principal.codigo_producto!] = { data: [], isLoading: true, error: null };
      });
      setOpcionalesPorPrincipal(initialOpcionalesState);
      setOpcionalesSeleccionadosEnModal({}); // Resetear selecciones del modal

      productosParaConfigurarOpcionales.forEach(async (principal) => {
        if (!principal.codigo_producto || !principal.Modelo) {
          console.error("Producto principal sin código o modelo:", principal);
          setOpcionalesPorPrincipal(prev => ({
            ...prev,
            [principal.codigo_producto!]: { data: [], isLoading: false, error: 'Faltan datos del producto principal para cargar opcionales.' }
          }));
          return;
        }

        try {
          const params = new URLSearchParams();
          params.append('codigo', principal.codigo_producto);
          params.append('modelo', principal.Modelo);
          // params.append('categoria', principal.categoria || ''); // Categoria ya no se usa en la API de opcionales
          const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
          console.log(`Cargando opcionales para ${principal.codigo_producto} desde ${url}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout de 15s

          const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Intentar parsear error, si falla, objeto vacío
            throw new Error(errorData.message || `Error del servidor: ${response.status}`);
          }
          const apiResponse = await response.json();

          if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data.products)) {
            console.log(`Opcionales recibidos para ${principal.codigo_producto}:`, apiResponse.data.products);
            setOpcionalesPorPrincipal(prev => ({
              ...prev,
              [principal.codigo_producto!]: { data: apiResponse.data.products, isLoading: false, error: null }
            }));
          } else {
            throw new Error('Formato de respuesta de opcionales inválido.');
          }
        } catch (err: any) {
          console.error(`Error al obtener opcionales para ${principal.codigo_producto}:`, err);
          let errorMessageToShow = 'Error desconocido.';
          if (err.name === 'AbortError') {
            errorMessageToShow = 'La solicitud tardó demasiado.';
          } else if (err.message) {
            errorMessageToShow = err.message;
          }
          setOpcionalesPorPrincipal(prev => ({
            ...prev,
            [principal.codigo_producto!]: { data: [], isLoading: false, error: errorMessageToShow }
          }));
        }
      });
    }
  }, [showSeleccionOpcionalesModal, productosParaConfigurarOpcionales]); // Dependencias del efecto
  // --- FIN NUEVO useEffect ---

  // --- MODIFICADO: Función llamada desde OpcionalesCotizacionModal --- 
  // Esta función se llama cuando el usuario confirma la selección de opcionales DENTRO DEL MODAL
  // para el producto principal que se está mostrando actualmente en ese modal.
  const handleConfirmarOpcionalesParaPrincipalActual = (codigosOpcionalesSeleccionados: string[]) => {
    if (!productoActualConfigurandoOpcionales || !productoActualConfigurandoOpcionales.codigo_producto) {
      console.error("Error: No hay producto principal actual para confirmar opcionales.");
      setOpcionalesLoadingModal(false); // Asegurarse de que el loading se detenga
      setShowOpcionalesConfigModal(false); // Cerrar el modal de configuración de opcionales
      return;
    }
    const codigoPrincipalActual = productoActualConfigurandoOpcionales.codigo_producto;
    console.log(`Opcionales confirmados para ${codigoPrincipalActual}:`, codigosOpcionalesSeleccionados);
    
    setOpcionalesLoadingModal(true); // Iniciar loading para el proceso de confirmación

    const seleccionadosCompletos = opcionalesDataModal.filter(op => 
        op.codigo_producto && codigosOpcionalesSeleccionados.includes(op.codigo_producto)
    );

    setOpcionalesSeleccionadosPorProducto(prev => ({
      ...prev,
      [codigoPrincipalActual]: seleccionadosCompletos
    }));

    setOpcionalesLoadingModal(false); 

    if (productosParaConfigurarOpcionales.length > 0 && indiceProductoActualParaOpcionales !== null && indiceProductoActualParaOpcionales < productosParaConfigurarOpcionales.length - 1) {
      // Si hay más productos en la lista de selección múltiple por configurar, avanzar al siguiente.
      console.log("Avanzando al siguiente producto para configurar opcionales.");
      avanzarAlSiguientePrincipalParaOpcionales(); 
    } else if (productosParaConfigurarOpcionales.length > 0 && indiceProductoActualParaOpcionales !== null && indiceProductoActualParaOpcionales === productosParaConfigurarOpcionales.length - 1) {
      // Este era el último producto de la lista de selección múltiple.
      console.log("Último producto de selección múltiple configurado. Cerrando modal y procediendo a consolidar.");
      setShowOpcionalesConfigModal(false);
      handleCerrarProcesoSeleccionOpcionalesGlobal(); // Esta función consolidará y cambiará a DetallesCargaPanel
    } else if (productosParaConfigurarOpcionales.length === 0) {
      // Flujo de configuración para un solo producto (no iniciado por "X Seleccionados" o handleConfigurar directo)
      // o un caso donde la lista de selección múltiple se vació inesperadamente.
      console.log("Configuración para un solo producto o fin de flujo no estándar. Procediendo a DetallesCargaPanel.");
      setShowOpcionalesConfigModal(false);
      
      const itemsParaDetalleCargaUnico: ProductoConOpcionales[] = [{
        principal: productoActualConfigurandoOpcionales,
        opcionales: seleccionadosCompletos
      }];
      setDatosParaDetallesCarga(itemsParaDetalleCargaUnico);
      setPasoCotizacion(2); // Ir a DetallesCargaPanel

    } else {
      // Caso residual o inesperado.
      console.warn("handleConfirmarOpcionalesParaPrincipalActual: Caso no manejado.", {
        productosParaConfigurarOpcionalesLength: productosParaConfigurarOpcionales.length,
        indiceProductoActualParaOpcionales: indiceProductoActualParaOpcionales
      });
      setShowOpcionalesConfigModal(false); // Cerrar modal
      // Considerar resetear a la tabla de equipos.
      setPasoCotizacion(0); 
    }
  };

  // --- MODIFICADO: Al cerrar el modal de cotización/opcionales (OpcionalesCotizacionModal) ---
  // Esto se llama si el usuario cierra el modal (ej. con su botón 'X') ANTES de completar la selección de todos los productos,
  // O cuando se han configurado opcionales para TODOS los productos seleccionados en un flujo múltiple.
  const handleCerrarProcesoSeleccionOpcionalesGlobal = () => { 
    setShowOpcionalesConfigModal(false); // Asegurarse que el modal de opcionales esté cerrado
    // setProductoPrincipalActualParaOpcionales(null); // Ya no es necesario configurar más opcionales aquí
    // setProductosParaConfigurarOpcionales([]); // Limpiar la lista de configuración

    console.log("Cerrando proceso global de selección de opcionales. Preparando datos para DetallesCargaPanel.");
    console.log("Productos seleccionados para cotizar (códigos):", Array.from(productosSeleccionadosParaCotizar));
    console.log("Opcionales seleccionados por producto:", opcionalesSeleccionadosPorProducto);

    const itemsParaDetalleCarga: ProductoConOpcionales[] = Array.from(productosSeleccionadosParaCotizar).map(codigoPrincipal => {
      const principal = productosOriginales.find(p => p.codigo_producto === codigoPrincipal);
      const opcionales = opcionalesSeleccionadosPorProducto[codigoPrincipal] || [];
      // Asegurarse de que el principal se encontró; si no, es un problema de datos.
      if (!principal) {
        console.error(`No se encontró el producto principal con código ${codigoPrincipal} en productosOriginales.`);
        return null; // Se filtrará más abajo
      }
      return { principal, opcionales };
    }).filter(item => item !== null) as ProductoConOpcionales[]; // Filtrar nulos y asegurar tipo

    console.log("Datos finales para DetallesCargaPanel:", itemsParaDetalleCarga);
    
    if (itemsParaDetalleCarga.length === 0 && productosSeleccionadosParaCotizar.size > 0) {
        console.warn("Se seleccionaron productos para cotizar, pero no se pudieron construir los items para DetallesCargaPanel. Puede que los productos principales no se encontraran.");
        // Decidir si mostrar error o volver a la tabla. Por ahora, volver a la tabla.
        setPasoCotizacion(0);
        // Resetear estados de selección
        setProductosSeleccionadosParaCotizar(new Set());
        setOpcionalesSeleccionadosPorProducto({});
        setProductosParaConfigurarOpcionales([]);
        setIndiceProductoActualParaOpcionales(null);
        setProductoActualConfigurandoOpcionales(null);
        return;
    }
    
    setDatosParaDetallesCarga(itemsParaDetalleCarga);
    
    // Una vez consolidados, podemos avanzar al siguiente paso.
    // Aquí, avanzamos a DetallesCargaPanel (paso 2)
    setPasoCotizacion(2); 
    console.log("Transición a DetallesCargaPanel (paso 2) iniciada.");

    // No es necesario resetear productosSeleccionadosParaCotizar u opcionalesSeleccionadosPorProducto aquí,
    // ya que DetallesCargaPanel los podría necesitar o se podrían limpiar al volver a la tabla (`handleVolverDesdeDetalles`).
    // Sí resetear el índice y la lista de configuración actual.
    setIndiceProductoActualParaOpcionales(null);
    setProductosParaConfigurarOpcionales([]); // Limpiar la lista de configuración actual
    setProductoActualConfigurandoOpcionales(null);
  };

  // --- NUEVA: Función para avanzar al siguiente producto principal para la selección de opcionales ---
  const avanzarAlSiguientePrincipalParaOpcionales = () => {
    const currentIndex = productosParaConfigurarOpcionales.findIndex((p: Producto) => p.codigo_producto === productoPrincipalActualParaOpcionales?.codigo_producto);
    if (currentIndex + 1 < productosParaConfigurarOpcionales.length) {
      setProductoPrincipalActualParaOpcionales(productosParaConfigurarOpcionales[currentIndex + 1]);
    } else {
      // Todos los principales han sido configurados
      handleCerrarProcesoSeleccionOpcionalesGlobal();
    }
  };

  // --- MODIFICADO: Función para proceder a la selección de opcionales (cuando se hace clic en "Cotizar X Equipos")
  const handleProceedToOptionSelection = () => {
    const productosPrincipalesSeleccionados = productosOriginales.filter(p => 
      productosSeleccionadosParaCotizar.has(p.codigo_producto!) && !p.es_opcional
    );

    if (productosPrincipalesSeleccionados.length === 0) {
      console.log("No hay productos principales seleccionados para configurar opcionales.");
      // Opcional: Mostrar una alerta o notificación al usuario.
      // alert("Por favor, seleccione al menos un equipo principal para configurar.");
      return; 
    }

    console.log("Procediendo a la selección de opcionales con:", productosPrincipalesSeleccionados);
    setProductosParaConfigurarOpcionales(productosPrincipalesSeleccionados);
    // setProductoPrincipalActualParaOpcionales(productosPrincipalesSeleccionados[0]); // Podríamos no necesitar este si el nuevo modal itera
    setIndiceProductoActualParaOpcionales(0); // Opcional, dependiendo de cómo el nuevo modal maneje la iteración

    // --- CAMBIO CLAVE: Mostrar el nuevo modal en lugar de cambiar pasoCotizacion --- 
    setShowSeleccionOpcionalesModal(true); 
    // setPasoCotizacion(1); // Ya no cambiamos el paso aquí
  };

  // --- Función para eliminar un opcional confirmado (desde DetallesCargaPanel) ---
  // Esta es la versión correcta que actualiza los estados relevantes
  const handleEliminarOpcionalConfirmado = (codigoPrincipal: string, codigoOpcionalAEliminar: string) => {
    console.log(`Eliminando opcional ${codigoOpcionalAEliminar} del principal ${codigoPrincipal}`);
    setOpcionalesSeleccionadosPorProducto(prevOpcionalesPorProducto => {
      const nuevosOpcionalesParaPrincipal = (prevOpcionalesPorProducto[codigoPrincipal] || []).filter(
        op => op.codigo_producto !== codigoOpcionalAEliminar
      );
      return {
        ...prevOpcionalesPorProducto,
        [codigoPrincipal]: nuevosOpcionalesParaPrincipal
      };
    });
    // Actualizar datosParaDetallesCarga para que la UI de DetallesCargaPanel refleje el cambio
    setDatosParaDetallesCarga(prevDatos => prevDatos.map(item => {
      if (item.principal.codigo_producto === codigoPrincipal) {
        return {
          ...item,
          opcionales: (item.opcionales || []).filter(op => op.codigo_producto !== codigoOpcionalAEliminar)
        };
      }
      return item;
    }).filter(item => item.principal.codigo_producto)); // Asegurar que no queden items sin principal
  };

  // --- Función para alternar el modo de selección de equipos ---
  const toggleSelectionMode = () => {
    setIsSelectionModeActive(prevIsActive => {
      if (prevIsActive) { 
        // Al salir del modo de selección, limpiar los equipos previamente seleccionados.
        setProductosSeleccionadosParaCotizar(new Set());
      }
      return !prevIsActive;
    });
  };

  // --- Función para manejar la selección/deselección de un producto para cotizar ---
  const handleToggleProductoParaCotizar = (codigoProducto: string) => {
    setProductosSeleccionadosParaCotizar(prevSeleccionados => {
      const nuevosSeleccionados = new Set(prevSeleccionados);
      if (nuevosSeleccionados.has(codigoProducto)) {
        nuevosSeleccionados.delete(codigoProducto);
      } else {
        nuevosSeleccionados.add(codigoProducto);
      }
      return nuevosSeleccionados;
    });
  }; 

   const handleVolverDesdeDetalles = () => {
    setPasoCotizacion(0); // Volver a la tabla de equipos
    // Limpiar estados relacionados con pasos posteriores si es necesario
    // setDatosParaDetallesCarga([]); // Si esto se usa para pasar datos a DetallesCargaPanel
    // setPricingResult(null);
    // setPricingError(null);
  };

  const handleSiguienteDesdeDetalles = async () => {
    // Esta función se llama desde DetallesCargaPanel.
    // En el nuevo flujo, después de DetallesCargaPanel, iríamos a DetallesEnvioPanel.
    console.log("Pasando de Detalles de Carga a Detalles de Envío...");
    setPasoCotizacion(2); // Asumiendo que 2 es DetallesEnvioPanel
    
    // Aquí NO se llama a la API de precios. Se haría en un paso posterior o donde corresponda.
    // La lógica de precios que estaba aquí antes ha sido eliminada porque no pertenece a este manejador de navegación.
  };

  // Refrescar productos (reutilizable)
  const refreshProductos = useCallback(() => {
    fetchProductos(); // fetchProductos ya existe y carga de /api/products/cache/all
  }, []); // fetchProductos debería estar envuelto en useCallback si es dependencia de otros useEffects, o ser estable.

  // --- NUEVO: Handlers para CREAR Equipo ---
  // const handleOpenCreateModal = () => {
  //   setNewEquipoForm({}); // Limpiar formulario
  //   setCreateError(null);
  //   setShowCreateModal(true);
  // };

  // const handleCloseCreateModal = () => {
  //   setShowCreateModal(false);
  // };

  // const handleNewEquipoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  //   const { name, value, type } = e.target;
  //   // Para checkboxes
  //   const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
  //   // Manejar campos anidados (ej. caracteristicas.nombre_del_producto)
  //   if (name.includes('.')) {
  //     const [objKey, fieldKey] = name.split('.');
  //     setNewEquipoForm(prev => ({
  //       ...prev,
  //       [objKey]: {
  //         ...(prev[objKey as keyof EquipoFormData] as object || {}),
  //         [fieldKey]: val
  //       }
  //     }));
  //   } else {
  //     setNewEquipoForm(prev => ({ ...prev, [name]: val }));
  //   }
  // };

  // const handleCreateEquipoSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsSubmittingCreate(true);
  //   setCreateError(null);
  //   try {
  //     // Aquí puedes añadir transformaciones si los campos numéricos están como string
  //     const payload = { ...newEquipoForm };
  //     if (payload.peso_kg) payload.peso_kg = parseFloat(payload.peso_kg as string);
  //     if (payload.dimensiones?.largo_cm) payload.dimensiones.largo_cm = parseFloat(payload.dimensiones.largo_cm as string);
  //     if (payload.dimensiones?.ancho_cm) payload.dimensiones.ancho_cm = parseFloat(payload.dimensiones.ancho_cm as string);
  //     if (payload.dimensiones?.alto_cm) payload.dimensiones.alto_cm = parseFloat(payload.dimensiones.alto_cm as string);

  //     const response = await fetch('http://localhost:5001/api/products', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload)
  //     });
  //     const responseData = await response.json();
  //     if (!response.ok) {
  //       throw new Error(responseData.message || `Error del servidor: ${response.status}`);
  //     }
  //     console.log('Producto creado:', responseData.data);
  //     alert('¡Equipo creado exitosamente!'); // Reemplazar con una notificación mejor
  //     handleCloseCreateModal();
  //     refreshProductos(); // Refrescar la lista de productos
  //   } catch (error: any) {
  //     console.error('Error al crear equipo:', error);
  //     setCreateError(error.message || 'Ocurrió un error al crear el equipo.');
  //   } finally {
  //     setIsSubmittingCreate(false);
  //   }
  // };

  // --- NUEVO: Estados para el Modal de EDITAR Equipo (los estados del formulario interno se eliminan) ---
  const handleOpenEditModal = (producto: Producto) => {
    console.log("Abrir modal para editar:", producto);
    setEquipoParaEditar(producto); // Establece el producto para editar
    setShowEditModal(true); // Muestra el modal
    // La lógica de pre-llenar el formulario y manejar errores ahora reside en EquipoEditModal
  };

  const handleCloseEditModal = () => setShowEditModal(false);

  const handleOpenConfirmDeleteModal = (producto: Producto) => {
    console.log("Abrir modal para eliminar:", producto);
    setEquipoParaEliminar(producto); 
    setShowConfirmDeleteModal(true);
  };
  const handleCloseConfirmDeleteModal = () => setShowConfirmDeleteModal(false);
  const handleConfirmDelete = async () => { 
    if (!equipoParaEliminar || !equipoParaEliminar.codigo_producto) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`http://localhost:5001/api/products/code/${equipoParaEliminar.codigo_producto}`, {
        method: 'DELETE'
      });
      const responseData = await response.json(); 
      if (!response.ok) {
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }
      // ELIMINADO: No hay 'success' o 'data' en la respuesta DELETE que se usa aquí
      // if (responseData.success) { 
      alert('¡Equipo eliminado exitosamente!');
      handleCloseConfirmDeleteModal();
      refreshProductos();
      // } else { throw new Error(responseData.message || 'Error al eliminar equipo.'); }
    } catch (error: any) {
      setDeleteError(error.message || 'Error al eliminar equipo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleColumnFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setColumnFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleDescontinuado = async (productoAActualizar: Producto) => {
    if (!productoAActualizar.codigo_producto) {
      console.error("El producto no tiene código para actualizar su estado de descontinuado.");
      // Podrías mostrar una notificación de error aquí
      return;
    }

    setLoadingDescontinuado(productoAActualizar.codigo_producto);
    const nuevoEstadoDescontinuado = !productoAActualizar.descontinuado;

    console.log(`Simulando actualización para ${productoAActualizar.codigo_producto}: descontinuado = ${nuevoEstadoDescontinuado}`);

    // --- INICIO: Simulación de llamada API ---
    // En un caso real, aquí harías la llamada a tu backend:
    // try {
    //   const response = await fetch(`/api/products/code/${productoAActualizar.codigo_producto}/toggle-discontinued`, { // O el endpoint que tengas
    //     method: 'PUT', // o 'PATCH'
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ descontinuado: nuevoEstadoDescontinuado }),
    //   });
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.message || 'Error al actualizar el estado del producto.');
    //   }
    //   // const updatedProduct = await response.json(); // Si el backend devuelve el producto actualizado
    //   console.log('Producto actualizado (simulado) en backend');
    //   refreshProductos(); // O actualizar el estado local de forma más específica
    // } catch (error) {
    //   console.error('Error al cambiar estado descontinuado:', error);
    //   // Mostrar notificación de error al usuario
    // } finally {
    //   setLoadingDescontinuado(null);
    // }
    // --- FIN: Simulación de llamada API ---

    // --- INICIO: Actualización local para simulación (REEMPLAZAR CON LLAMADA API REAL) ---
    await new Promise(resolve => setTimeout(resolve, 700)); // Simular delay de red

    setProductosOriginales(prev => 
      prev.map(p => 
        p.codigo_producto === productoAActualizar.codigo_producto 
          ? { ...p, descontinuado: nuevoEstadoDescontinuado } 
          : p
      )
    );
    // Nota: setProductos se actualizará automáticamente por el useEffect que depende de productosOriginales.
    
    setLoadingDescontinuado(null);
    console.log(`Estado local de ${productoAActualizar.codigo_producto} cambiado a descontinuado: ${nuevoEstadoDescontinuado}`);
    // Aquí podrías mostrar una notificación de éxito
    // --- FIN: Actualización local para simulación ---
  };

  // --- NUEVA FUNCIÓN DE RENDERIZADO PARA SELECCIÓN DE OPCIONALES (AHORA PARA UN MODAL) ---
  const renderSeleccionOpcionalesModalContent = () => { // Renombrada para claridad
    if (productosParaConfigurarOpcionales.length === 0) { 
      return (
        <div style={{padding: '20px', textAlign: 'center'}}>
          <p>No hay productos principales seleccionados para configurar opcionales.</p>
        </div>
      );
    }
    
    return (
      <>
        {productosParaConfigurarOpcionales.map((principal: Producto) => { // Tipar principal y corregir el map duplicado
          const estadoOpcionales = opcionalesPorPrincipal[principal.codigo_producto!] || { data: [], isLoading: true, error: null };
          return (
            <div key={principal.codigo_producto} style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e88e5', marginBottom: '12px' }}>
                Equipo Principal: {principal.nombre_del_producto} ({principal.codigo_producto})
              </h3>
              {estadoOpcionales.isLoading && <p style={{color: '#757575'}}>Cargando opcionales...</p>}
              {estadoOpcionales.error && <p style={{color: 'red'}}>Error al cargar opcionales: {estadoOpcionales.error}</p>}
              {!estadoOpcionales.isLoading && !estadoOpcionales.error && estadoOpcionales.data.length === 0 && (
                <p style={{color: '#757575'}}>No se encontraron opcionales para este equipo.</p>
              )}
              {!estadoOpcionales.isLoading && !estadoOpcionales.error && estadoOpcionales.data.length > 0 && (
                <div style={{ marginTop: '12px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '50px' }}>Sel.</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Opcional</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Modelo</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Costo Fáb. (EUR)</th>
                        {/* Puedes añadir más columnas para otros datos contables si es necesario */}
                        {/* <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Costo Año Cot.</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {estadoOpcionales.data.map((opcional: Producto) => (
                        <tr key={opcional.codigo_producto} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              style={{ transform: 'scale(1.2)' }} 
                              checked={opcionalesSeleccionadosEnModal[principal.codigo_producto!]?.has(opcional.codigo_producto!) || false}
                              onChange={() => handleToggleOpcionalEnModal(principal.codigo_producto!, opcional.codigo_producto!)}
                              disabled={!principal.codigo_producto || !opcional.codigo_producto} // Deshabilitar si falta algún código
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {opcional.nombre_del_producto || opcional.codigo_producto}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {opcional.Modelo || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', color: '#347aeb' }}>
                            {typeof opcional.datos_contables?.costo_fabrica_original_eur === 'number' 
                              ? opcional.datos_contables.costo_fabrica_original_eur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'
                            }
                          </td>
                          {/*
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', color: '#28a745' }}>
                            {typeof opcional.datos_contables?.costo_ano_cotizacion === 'number' 
                              ? opcional.datos_contables.costo_ano_cotizacion.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'
                            }
                          </td>
                          */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };
  // --- FIN NUEVA FUNCIÓN DE RENDERIZADO ---

  // JSX (movido de App.tsx, corresponde al <main>...</main>)
  // Ya no se usa pasoCotizacion === 1 para renderizar una página completa de opcionales
  // if (pasoCotizacion === 1) { 
  //   return renderSeleccionOpcionales(); // Lógica anterior
  // }

  if (pasoCotizacion === 2) {
    // PASO 2: Detalles de la Carga
    // Renderizar el panel de Detalles de la Carga con todos los productos y sus opcionales seleccionados
    return (
      <DetallesCargaPanel 
        itemsParaCotizar={datosParaDetallesCarga} 
        onVolver={handleVolverDesdeDetalles}
        onSiguiente={handleSiguienteDesdeDetalles}
        onEliminarOpcionalDePrincipal={handleEliminarOpcionalConfirmado}
      />
    );
  }

  // PASO 0: Tabla de Equipos (renderizado por defecto)
  return (
    <div style={{padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>EQUIPOS</h1>
    
      {/* Barra de búsqueda y filtros con los botones actualizados */}

      <div style={{ 
        display: 'flex', 
        marginBottom: '24px', 
        gap: '16px', 
        alignItems: 'center',
        
        // animation: 'slideIn 0.5s ease-out' // Eliminada animación por simplicidad, puede reintroducirse
      }}>
        <div style={{ position: 'relative', flex: '1' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 38px', border: '1px solid #D1D5DB', borderRadius: '5px', fontSize: '13px', outline: 'none' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '0', fontSize: '16px' }}>
                <X size={18}/>
              </button>
            )}
        </div>

        {/* BOTÓN ACTUALIZAR CACHÉ */}
        <motion.button 
          onClick={refreshProductos} 
          className="button-hover" 
          title="Actualizar lista desde el caché" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid #1e88e5', color: '#1e88e5', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
          whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }} // Ligero movimiento hacia arriba y escala
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (<><div style={{ width: '16px', height: '16px', border: '2px solid #E5E7EB', borderTopColor: '#1e88e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>Actualizando...</>) : (<><RefreshCw size={16} />Actualizar</>)}
        </motion.button>
        
        {/* BOTÓN SELECCIONAR PARA COTIZAR / CANCELAR SELECCIÓN */}
        {(() => {
          let buttonText;
          let buttonIcon;
          let buttonAction;
          let currentButtonStyle = {}; // Para sobreescribir colores/bordes específicos

          if (isSelectionModeActive) {
            if (productosSeleccionadosParaCotizar.size > 0) {
              const count = productosSeleccionadosParaCotizar.size;
              if (count === 1) {
                buttonText = "1 Seleccionado";
              } else {
                buttonText = `${count} Seleccionados`;
              }
              buttonIcon = <Check size={18} />;
              buttonAction = handleProceedToOptionSelection;
              currentButtonStyle = {
                backgroundColor: '#22c55e', // Verde para cotizar
                borderColor: '#16a34a',
                color: 'white',
              };
            } else {
              buttonText = "Cancelar Selección";
              buttonIcon = <X size={16} />; // Icono X para cancelar
              buttonAction = toggleSelectionMode; // Desactiva el modo de selección
              currentButtonStyle = {
                backgroundColor: '#ef4444', // Rojo para cancelar
                borderColor: '#dc2626',
                color: 'white',
              };
            }
          } else {
            buttonText = "Seleccionar";
            buttonIcon = <Mail size={16} />;
            buttonAction = toggleSelectionMode; // Activa el modo de selección
            currentButtonStyle = {
                backgroundColor: 'white',
                border: '1px solid #1e88e5', // Estilo original "Seleccionar"
                color: '#1e88e5',
            };
          }

          return (
            <motion.button 
              onClick={buttonAction} 
              className="button-hover" 
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease',
                ...currentButtonStyle // Aplicar estilos dinámicos
              }}
              whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              {buttonIcon}
              {buttonText}
            </motion.button>
          );
        })()}

        {/* Botón para CREAR Equipo con icono PlusCircle --- ASEGURARSE QUE ESTÁ ELIMINADO O COMENTADO */}
        {/*
        <motion.button 
          onClick={handleOpenCreateModal} 
          className="button-hover" 
          title="Crear un nuevo equipo"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10B981', 
            border: '1px solid #059669', color: 'white', padding: '8px 16px', 
            borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', 
            transition: 'all 0.2s ease' 
          }}
          whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusCircle size={18} /> 
          Nuevo Equipo
        </motion.button>
        */}  
            </div>

      {/* NUEVA SECCIÓN PARA FILTROS DE COLUMNA */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', // Permitir que los filtros pasen a la siguiente línea si no caben
        gap: '16px', // Espacio entre filtros
        padding: '12px 0px', // Padding vertical para la sección de filtros
        marginBottom: '16px', 
        borderBottom: '1px solid #e5e7eb', // Un separador visual ligero
        alignItems: 'flex-end' // Alinear items al final para que labels e inputs se vean bien
      }}>
        {[ // Array de configuración para generar los filtros dinámicamente
          { label: 'Código:', name: 'codigo_producto', placeholder: 'Filtrar Código...' },
          { label: 'Nombre:', name: 'nombre_del_producto', placeholder: 'Filtrar Nombre...' },
          { label: 'Descripción:', name: 'descripcion', placeholder: 'Filtrar Desc...' },
          { label: 'Modelo:', name: 'Modelo', placeholder: 'Filtrar Modelo...' },
          { label: 'Categoría:', name: 'tipo', placeholder: 'Filtrar Categoría...' }, // Nombre visual cambiado
        ].map(filter => (
          <div key={filter.name} style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={`filter-${filter.name}`} style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
              {filter.label}
            </label>
            <input
              type="text"
              id={`filter-${filter.name}`}
              name={filter.name}
              placeholder={filter.placeholder}
              value={columnFilters[filter.name] || ''}
              onChange={handleColumnFilterChange}
              style={{ ...filterInputStyle, width: '150px' }} // Ancho fijo para cada input, ajustar según necesidad
            />
          </div>
        ))}
      </div> 

      {/* Contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <div style={{ fontSize: '14px', color: '#6B7280' }}>
          {loading ? "Cargando equipos..." : `Mostrando ${totalMostrado} de ${totalEquiposNoOpcionales} equipos`}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
        {loading ? ( <div style={{ padding: '32px', textAlign: 'center'}}>Cargando...</div>
        ) : error ? ( <div style={{ padding: '32px', textAlign: 'center', color: 'red' }}>Error: {error} <button onClick={refreshProductos}>Reintentar</button></div>
        ) : productos.length === 0 && productosOriginales.length > 0 ? ( <div style={{ padding: '32px', textAlign: 'center' }}>No hay equipos que coincidan con los filtros.</div>
        ) : productosOriginales.length === 0 && !loading ? ( <div style={{ padding: '32px', textAlign: 'center' }}>No hay equipos cargados. <button onClick={refreshProductos}>Actualizar</button></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                 <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#374151' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: '120px' }}>Código</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>Modelo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Ver Detalle</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Opcionales</th>
                    {isSelectionModeActive && (
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Seleccionar</th>
                    )}
                    {!isSelectionModeActive && (
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                    )}
                  </tr>
                  {/* La fila para inputs de filtro se elimina de aquí */}
                </thead>
                <tbody>
                  {productos.map((producto, index) => {
                    // Lógica de doble verificación para el tipo a mostrar en la tabla principal
                    let displayTipo: string = '-'; // Default, will usually be overridden
                    const nombreProductoNormalizado = producto.nombre_del_producto?.toLowerCase() || '';
                    const tipoProductoNormalizado = producto.tipo?.toLowerCase() || '';

                    const esOpcionalPorNombre = nombreProductoNormalizado.includes('opcional');
                    const esOpcionalPorTipoDirecto = tipoProductoNormalizado === 'opcional';

                    if (esOpcionalPorNombre || esOpcionalPorTipoDirecto) {
                      displayTipo = 'Opcional';
                    } else {
                      // No es Opcional por nombre ni por tipo directo.
                      // Será Equipo si el tipo es 'osi' o si el tipo está ausente/vacío.
                      if (tipoProductoNormalizado === 'osi' || tipoProductoNormalizado === '') {
                        displayTipo = 'Equipo';
                      } else {
                        // Tiene un tipo definido que no es 'opcional', 'osi', ni vacío.
                        // Usar ese tipo, capitalizado.
                        displayTipo = producto.tipo!.charAt(0).toUpperCase() + producto.tipo!.slice(1);
                      }
                    }

                    // Determinar el color de fondo de la fila
                    let rowBackgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'; // Alternating by default
                    if (producto.descontinuado) {
                      rowBackgroundColor = '#d1d5db'; // Gris más oscuro para descontinuados (era #e5e7eb)
                    }

                    return (
                      <tr 
                        key={producto.codigo_producto || `prod-${index}-${Math.random()}`} 
                        className="table-row" 
                        style={{ 
                          backgroundColor: rowBackgroundColor, 
                          borderBottom: '1px solid #e5e7eb' 
                        }}
                      >
                        {/* Column: Código */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.codigo_producto || '-'}</td>
                        {/* Column: Nombre */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.nombre_del_producto || '-'}</td>
                        {/* Column: Descripción */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.descripcion || '-'}</td>
                        {/* Column: Modelo */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.Modelo || '-'}</td>
                        {/* Column: Ver Detalle */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            title="Ver Detalles" 
                            className="button-hover" 
                            style={{ padding: '6px', backgroundColor: 'transparent', color: '#1d4ed8', border: 'none', borderRadius: '50%', cursor: 'pointer'}} 
                            onClick={() => handleVerDetalle(producto)} 
                            disabled={loadingDetail === producto.codigo_producto}
                          >
                            {loadingDetail === producto.codigo_producto ? '...' : <Info size={18}/>}
                          </button>
                        </td>
                        {/* Column: Opcionales */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            title="Ver Opcionales" 
                            className="button-hover" 
                            style={{ padding: '6px', backgroundColor: 'transparent', color: '#059669', border: 'none', borderRadius: '50%', cursor: 'pointer'}} 
                            onClick={() => handleOpcionales(producto)} 
                            disabled={loadingOpcionalesBtn === producto.codigo_producto}
                          >
                            {loadingOpcionalesBtn === producto.codigo_producto ? '...' : <ListFilter size={18}/>}
                          </button>
                        </td>
                        {/* Column: Seleccionar (conditional) */}
                        {isSelectionModeActive && (
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={productosSeleccionadosParaCotizar.has(producto.codigo_producto || '')} 
                              onChange={() => producto.codigo_producto && handleToggleProductoParaCotizar(producto.codigo_producto)} 
                              disabled={!producto.codigo_producto} 
                              style={{ transform: 'scale(1.3)', cursor: 'pointer'}} />
                          </td>
                        )}
                        {/* Column: Acciones (conditional) */}
                        {!isSelectionModeActive && (
                          <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {/* NUEVO DIV CONTENEDOR CON FLEXBOX */}
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                title={producto.descontinuado ? "Reactivar Equipo" : "Descontinuar Equipo"}
                                onClick={() => handleToggleDescontinuado(producto)}
                                disabled={loadingDescontinuado === producto.codigo_producto}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: producto.descontinuado ? '#22c55e' : '#f59e0b',
                                  padding: '6px',
                                  // verticalAlign: 'middle', // Eliminado
                                  display: 'inline-flex',    // Añadido
                                  alignItems: 'center'     // Añadido
                                }}
                              >
                                {loadingDescontinuado === producto.codigo_producto
                                  ? <RefreshCw size={18} className="animate-spin" />
                                  : producto.descontinuado ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(producto)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors duration-150"
                                title="Editar Equipo"
                                style={{
                                  background: 'none',
                                  padding: '6px',
                                  // verticalAlign: 'middle', // Eliminado (ya estaba, pero confirmando)
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <FileEdit size={18} className="text-blue-600" />
                              </button>
                              <button
                                title="Eliminar Equipo"
                                onClick={() => handleOpenConfirmDeleteModal(producto)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#EF4444',
                                  padding: '6px',
                                  // verticalAlign: 'middle', // Eliminado
                                  display: 'inline-flex',    // Añadido
                                  alignItems: 'center'     // Añadido
                                }}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div> 
          </> 
        )}
      </div> 

      {/* NUEVO BOTÓN INFERIOR PARA CONFIGURAR (visible en modo selección) */}
      {isSelectionModeActive && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', // Alinea el botón a la derecha
          padding: '20px 0', // Añade padding arriba y abajo
          marginTop: '20px', // Margen superior para separarlo de la tabla
          borderTop: '1px solid #e5e7eb' // Un separador visual ligero
        }}>
          <motion.button 
            onClick={handleProceedToOptionSelection} 
            disabled={productosSeleccionadosParaCotizar.size === 0}
            className="button-hover" 
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 20px', // Padding más generoso
              borderRadius: '6px', 
              fontSize: '15px', // Tamaño de fuente ligeramente mayor
              fontWeight: '500', 
              cursor: productosSeleccionadosParaCotizar.size === 0 ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease',
              backgroundColor: productosSeleccionadosParaCotizar.size === 0 ? '#D1D5DB' : '#1e88e5', // Gris si deshabilitado, azul si habilitado
              borderColor: productosSeleccionadosParaCotizar.size === 0 ? '#9CA3AF' : '#1c6cb8',
              color: 'white',
              opacity: productosSeleccionadosParaCotizar.size === 0 ? 0.7 : 1,
            }}
            whileHover={productosSeleccionadosParaCotizar.size > 0 ? { scale: 1.03, y: -1, transition: { duration: 0.2 } } : {}}
            whileTap={productosSeleccionadosParaCotizar.size > 0 ? { scale: 0.97 } : {}}
          >
            <Settings2 size={18} />
            Configurar {productosSeleccionadosParaCotizar.size > 0 ? `(${productosSeleccionadosParaCotizar.size})` : ''} Seleccionados
          </motion.button>
        </div>
      )}

      {/* Modales (Crear, Editar, Confirmar Eliminación, VerDetalle, VistaOpcionales) */}

      {/* --- MODAL PARA EDITAR Equipo (AHORA USA EquipoEditModal) --- */}
      {showEditModal && equipoParaEditar && (
        <EquipoEditModal
          open={showEditModal}
          onClose={handleCloseEditModal}
          producto={equipoParaEditar} // Asegúrate que productoParaEditar no sea null aquí
          onSaveSuccess={handleSaveSuccessEquipoEditModal}
        />
      )}
      {/* --- FIN MODAL PARA EDITAR Equipo --- */}

      {showConfirmDeleteModal && equipoParaEliminar && ( // Corregido equipoParaEliminarState a equipoParaEliminar
          <div style={unifiedModalOverlayStyle}>
            <div style={{...unifiedModalContentStyle, maxWidth: '450px'}}>
              <div style={unifiedHeaderStyle}>
                <h3 style={unifiedTitleStyle}><Trash2 size={20} style={{marginRight: '8px'}}/>Confirmar Eliminación</h3>
                <button onClick={handleCloseConfirmDeleteModal} style={unifiedCloseButtonStyle}><X size={16}/></button>
              </div>
              <div style={unifiedBodyStyle}>
                <p>¿Estás seguro de que quieres eliminar el equipo "{equipoParaEliminar.nombre_del_producto || equipoParaEliminar.codigo_producto}"?</p>
                <p style={{fontSize: '13px', color: '#6B7280'}}>Esta acción no se puede deshacer.</p>
                {deleteError && <p style={{ color: 'red', fontSize: '13px', marginTop: '12px' }}>Error: {deleteError}</p>}
              </div>
              <div style={{...unifiedFooterStyle, justifyContent: 'flex-end'}}>
                <button onClick={handleCloseConfirmDeleteModal} style={{...unifiedSecondaryButtonStyle, marginRight: '12px'}}>Cancelar</button>
                <button onClick={handleConfirmDelete} disabled={isDeleting} style={isDeleting ? unifiedDisabledSecondaryButtonStyle : {...unifiedSecondaryButtonStyle, backgroundColor: '#EF4444', color: 'white', borderColor: '#DC2626'}}>
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* --- MODAL VER DETALLE (Modificado con Animación) --- */}
      {showDetalleModal && detalleProducto && (
        <motion.div // <<< Envolver overlay con motion.div >>>
          className="modal-overlay"
          style={unifiedModalOverlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div // <<< Envolver contenido con motion.div >>>
            className="modal-content hover-scale" 
            style={{ ...unifiedModalContentStyle, maxWidth: '900px' }} 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div style={unifiedHeaderStyle}>
              <div style={unifiedTitleStyle}>
                <Info size={20} />
                <h2>Detalles Técnicos: {detalleProducto.nombre_del_producto || detalleProducto.codigo_producto || 'Equipo'}</h2>
              </div>
              <button onClick={handleCloseDetalleModal} className="button-hover" style={unifiedCloseButtonStyle}>
                <X size={16} />
              </button>
            </div>
            <div style={{...unifiedBodyStyle, maxHeight: 'calc(85vh - 110px)'}}>
              {renderSpecifications(detalleProducto.especificaciones_tecnicas)}
            </div>
            <div style={unifiedFooterStyle}>
              <button onClick={handleCloseDetalleModal} style={unifiedSecondaryButtonStyle}>
                Cerrar
              </button>
            </div>
          </motion.div> 
        </motion.div>
      )}
      {/* --- FIN MODAL VER DETALLE --- */}

      {showVistaOpcionalesModal && productoParaVistaOpcionales && (
        <motion.div
          className="modal-overlay"
          style={unifiedModalOverlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="modal-content hover-scale"
            style={{ ...unifiedModalContentStyle, maxWidth: '750px' }} // Ancho similar a Ver Detalles
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div style={unifiedHeaderStyle}>
              <div style={unifiedTitleStyle}>
                <ListFilter size={20} />
                <h2>Opcionales para: {productoParaVistaOpcionales.nombre_del_producto || productoParaVistaOpcionales.codigo_producto}</h2>
              </div>
              <button onClick={handleCloseModal} className="button-hover" style={unifiedCloseButtonStyle}>
                <X size={16} />
              </button>
            </div>
            <div style={{ ...unifiedBodyStyle, maxHeight: 'calc(80vh - 110px)' }}>
              {vistaOpcionalesLoading && <p style={{ textAlign: 'center', padding: '20px' }}>Cargando opcionales...</p>}
              {vistaOpcionalesError && <p style={{ textAlign: 'center', padding: '20px', color: 'red' }}>Error: {vistaOpcionalesError}</p>}
              {!vistaOpcionalesLoading && !vistaOpcionalesError && vistaOpcionalesData.length === 0 && (
                <p style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>No se encontraron opcionales para este producto.</p>
              )}
              {/* <<< INICIO DEBUG >>> */}
              {(() => { console.log('[DEBUG] vistaOpcionalesData:', vistaOpcionalesData); return null; })()}
              {/* <<< FIN DEBUG >>> */}
              {!vistaOpcionalesLoading && !vistaOpcionalesError && vistaOpcionalesData.length > 0 && (
                <div style={unifiedTableContainerStyle}>
                  <table style={{ ...unifiedTableStyle, fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ ...unifiedThStyle, width: '100px' }}>Código</th>
                        <th style={unifiedThStyle}>Nombre del Opcional</th>
                        <th style={unifiedThStyle}>Modelo</th>
                        <th style={{...unifiedThStyle, width: '150px'}}>Tipo Producto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vistaOpcionalesData.map((opcional, index) => (
                        <tr key={opcional.codigo_producto || `opc-${index}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={unifiedTdStyle}>{opcional.codigo_producto || '-'}</td>
                          {/* Ajuste para tomar nombre_del_producto de caracteristicas primero */}
                          <td style={unifiedTdStyle}>{opcional.caracteristicas?.nombre_del_producto || opcional.nombre_del_producto || '-'}</td>
                          <td style={unifiedTdStyle}>{opcional.Modelo || opcional.caracteristicas?.modelo || '-'}</td>
                          <td style={unifiedTdStyle}>{opcional.producto || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={unifiedFooterStyle}>
              <button onClick={handleCloseModal} style={unifiedSecondaryButtonStyle}>
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* MODAL PARA SELECCIÓN DE OPCIONALES */} 
      {showSeleccionOpcionalesModal && (
        <div style={unifiedModalOverlayStyle}> 
          <div style={{...unifiedModalContentStyle, maxWidth: '1100px'}}> 
            <div style={unifiedHeaderStyle}>
              <h2 style={unifiedTitleStyle}>Configurar Opcionales para Equipos Seleccionados</h2>
              <button onClick={() => setShowSeleccionOpcionalesModal(false)} style={unifiedCloseButtonStyle} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div style={unifiedBodyStyle}>
              {opcionalesLoadingModal && <p style={{textAlign: 'center', padding: '20px'}}>Cargando configuración...</p>}
              {!opcionalesLoadingModal && renderSeleccionOpcionalesModalContent()} {/* Llamar a la función de contenido */}
            </div>
            <div style={unifiedFooterStyle}>
              <button 
                onClick={() => setShowSeleccionOpcionalesModal(false)} 
                style={unifiedSecondaryButtonStyle}
              >
                Cancelar
              </button>
              <button 
                // onClick={handleFinalizarSeleccionOpcionalesDesdeModal} // Esta función se creará después
                style={ (opcionalesLoadingModal || productosParaConfigurarOpcionales.length === 0) ? unifiedDisabledPrimaryButtonStyle : unifiedPrimaryButtonStyle }
                disabled={opcionalesLoadingModal || productosParaConfigurarOpcionales.length === 0}
              >
                Confirmar Opcionales y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FIN MODAL PARA SELECCIÓN DE OPCIONALES */} 

    </div> 
  );
}

// --- FUNCIÓN PARA MANEJAR EL TOGGLE DE UN OPCIONAL EN EL MODAL ---
const handleToggleOpcionalEnModal = (codigoPrincipal: string, codigoOpcional: string) => {
  setOpcionalesSeleccionadosEnModal(prev => {
    const nuevosSeleccionadosParaPrincipal = new Set(prev[codigoPrincipal] || []);
    if (nuevosSeleccionadosParaPrincipal.has(codigoOpcional)) {
      nuevosSeleccionadosParaPrincipal.delete(codigoOpcional);
    }
    else {
      nuevosSeleccionadosParaPrincipal.add(codigoOpcional);
    }
    return {
      ...prev,
      [codigoPrincipal]: nuevosSeleccionadosParaPrincipal
    };
  });
};
// --- FIN FUNCIÓN TOGGLE OPCIONAL EN MODAL ---