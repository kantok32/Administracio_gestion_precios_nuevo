import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, ArrowLeft, ArrowRight, Check, MessageCircle, PlusCircle, FileEdit, Trash2, RefreshCw, ListFilter, Mail, Edit3, ChevronDown, Info, Settings2 } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import OpcionalesCotizacionModal from '../components/OpcionalesCotizacionModal';
import DetallesCargaPanel from './DetallesCargaPanel';
import DetallesEnvioPanel from './DetallesEnvioPanel';
// import type { Producto } from '../types/product'; // <<< LÍNEA A ELIMINAR O COMENTAR
// Importar motion
import { motion } from 'framer-motion';

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
    // Simular llamada fetch a POST /api/pricing-overrides/calculate
    // const response = await fetch('/api/pricing-overrides/calculate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(body)
    // });
    // if (!response.ok) throw new Error('Error en la respuesta del cálculo de precios');
    // const data = await response.json();
    // if (!data.success) throw new Error(data.message || 'Error en el cálculo de precios');
    // return data.data; // Devolver solo la parte 'data' que contiene inputsUsed y calculations
    
    // --- Respuesta simulada (¡REEMPLAZAR!) ---
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
    return { 
      inputsUsed: { productCode: body.productCode, categoryId: 'simulated_category', totalMarginPercent: 0.35, landedCostUSD: 124112.35, appliedUsdClpRate: 978.5, netSalePriceCLP: 163954687, finalSalePriceCLP: 195106078 }, 
      calculations: { landedCostUSD: 124112.35, appliedUsdClpRate: 978.5, landedCostCLP: 121447916, marginAmountCLP: 42506771, netSalePriceCLP: 163954687, saleIvaAmountCLP: 31151391, finalSalePriceCLP: 195106078 }
    }; 
    // --- Fin Respuesta simulada ---
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

export default function EquiposPanel() {
  // Estados principales (movidos de App.tsx)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosOriginales, setProductosOriginales] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMostrado, setTotalMostrado] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState<Producto | null>(null);

  // Estados para el modal de "Ver Opcionales" (el que se abre desde el botón de información en cada fila)
  // const [showVistaOpcionalesModal, setShowVistaOpcionalesModal] = useState(false); // ELIMINADO
  // const [productoParaVistaOpcionales, setProductoParaVistaOpcionales] = useState<Producto | null>(null); // ELIMINADO
  // const [vistaOpcionalesData, setVistaOpcionalesData] = useState<Producto[]>([]); // ELIMINADO
  // const [vistaOpcionalesLoading, setVistaOpcionalesLoading] = useState(false); // ELIMINADO
  // const [vistaOpcionalesError, setVistaOpcionalesError] = useState<string | null>(null); // ELIMINADO
  // const [loadingOpcionalesBtn, setLoadingOpcionalesBtn] = useState<string | null>(null); // ELIMINADO

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
  const [productosSeleccionadosParaCotizar, setProductosSeleccionadosParaCotizar] = useState<string[]>([]);
  // --- NUEVO: Estado para la configuración secuencial de opcionales ---
  const [indiceProductoActualParaOpcionales, setIndiceProductoActualParaOpcionales] = useState<number | null>(null);
  const [opcionalesSeleccionadosPorProducto, setOpcionalesSeleccionadosPorProducto] = useState<Record<string, Producto[]>>({});
  // --- NUEVO: Estado para pasar datos estructurados a DetallesCargaPanel ---
  const [datosParaDetallesCarga, setDatosParaDetallesCarga] = useState<ProductoConOpcionales[]>([]);
  // --- NUEVO: Estado para el producto principal cuyos opcionales se están configurando ---
  const [productoActualConfigurandoOpcionales, setProductoActualConfigurandoOpcionales] = useState<Producto | null>(null);

  // --- NUEVO: Estados para los datos del OpcionalesCotizacionModal ---
  // Estos se llenarán dinámicamente para el productoActualConfigurandoOpcionales
  const [opcionalesDataModal, setOpcionalesDataModal] = useState<Producto[]>([]);
  const [opcionalesLoadingModal, setOpcionalesLoadingModal] = useState(false);
  const [opcionalesErrorModal, setOpcionalesErrorModal] = useState<string | null>(null);

  // --- NUEVO: Estados para el Modal de CREAR Equipo ---
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newEquipoForm, setNewEquipoForm] = useState<EquipoFormData>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- NUEVO: Estados para el Modal de EDITAR Equipo ---
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [equipoParaEditar, setEquipoParaEditar] = useState<Producto | null>(null);
  const [editEquipoForm, setEditEquipoForm] = useState<EquipoFormData>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null); 

  // --- NUEVO: Estados para el Modal de CONFIRMAR ELIMINACIÓN ---
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
  const [equipoParaEliminar, setEquipoParaEliminar] = useState<Producto | null>(null);
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
  const unifiedFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' }; // Gris claro footer
  const unifiedSecondaryButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 }; // Reducido a 13px
  const unifiedDisabledSecondaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' };

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

  // const handleOpcionales = async (producto: Producto) => {
  //   console.log("Obteniendo opcionales (vista simple) para:", producto.codigo_producto, "Tipo DB:", producto.tipo, "Nombre:", producto.nombre_del_producto);
  //   // setProductoParaVistaOpcionales(producto); // ELIMINADO
  //   // setShowVistaOpcionalesModal(true); // Mostrar modal solo si hay algo que cargar o un mensaje claro // ELIMINADO
    
  //   // setVistaOpcionalesLoading(true); // ELIMINADO
  //   // setVistaOpcionalesError(null); // ELIMINADO
  //   // setVistaOpcionalesData([]); // ELIMINADO
  //   // setLoadingOpcionalesBtn(producto.codigo_producto || null); // ELIMINADO

  //   // Lógica de doble verificación para determinar si es opcional
  //   const esTipoOpcionalDirecto = producto.tipo === 'opcional';
  //   const tieneNombreOpcional = producto.nombre_del_producto && producto.nombre_del_producto.toLowerCase().includes('opcional');

  //   if (esTipoOpcionalDirecto || (!esTipoOpcionalDirecto && tieneNombreOpcional) ) {
  //     // Si el tipo es 'opcional' O (el tipo no es 'opcional' PERO el nombre contiene 'opcional')
  //     console.log("El producto se considera opcional (por tipo directo o por nombre). No se buscarán más opcionales para la vista simple.");
  //     // setVistaOpcionalesError('Este producto ya es un opcional y no tiene sub-opcionales.'); // ELIMINADO
  //     // setVistaOpcionalesData([]); // ELIMINADO
  //     // setVistaOpcionalesLoading(false); // ELIMINADO
  //     // setLoadingOpcionalesBtn(null); // ELIMINADO
  //     // setShowVistaOpcionalesModal(true); // Mostrar modal para ver el mensaje // ELIMINADO
  //     return;
  //   }

  //   try {
  //     if (!producto.codigo_producto) { // Solo el código del producto es necesario ahora
  //       throw new Error('Falta el código del producto principal para obtener opcionales.');
  //     }
  //     const params = new URLSearchParams();
  //     params.append('codigo', producto.codigo_producto);
  //     // El modelo y la categoría ya no se envían como parámetros.
  //     const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
  //     console.log('Consultando opcionales (vista simple):', url);

  //     const controller = new AbortController();
  //     const timeoutId = setTimeout(() => controller.abort(), 15000);

  //     const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
  //     clearTimeout(timeoutId);

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}));
  //       throw new Error(errorData.message || `Error del servidor al obtener opcionales (vista simple): ${response.status}`);
  //     }
  //     const data = await response.json();

  //     if (data.success && data.data && Array.isArray(data.data.products)) {
  //       // setVistaOpcionalesData(data.data.products); // ELIMINADO
  //     } else {
  //       throw new Error('Formato de respuesta de opcionales inválido (vista simple)');
  //     }
  //   } catch (error: any) {
  //     console.error('Error al obtener opcionales (vista simple):', error);
  //     if (error.name === 'AbortError') {
  //        // setVistaOpcionalesError('La solicitud tardó demasiado.'); // ELIMINADO
  //     } else if (error.message.includes('Failed to fetch')) {
  //       // setVistaOpcionalesError('Error de conexión al obtener opcionales.'); // ELIMINADO
  //     } else {
  //        // setVistaOpcionalesError(error instanceof Error ? error.message : 'Error desconocido'); // ELIMINADO
  //     }
  //     // setVistaOpcionalesData([]); // ELIMINADO
  //   } finally {
  //     // setVistaOpcionalesLoading(false); // ELIMINADO
  //     // setLoadingOpcionalesBtn(null); // ELIMINADO
  //     // setShowVistaOpcionalesModal(true); // Asegurar que el modal se muestre // ELIMINADO
  //   }
  // };

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
       setOpcionalesErrorModal(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
       setOpcionalesLoadingModal(false); // Terminar carga del modal
    }
  };
  
  // const handleCloseModal = () => {
  //   // setShowVistaOpcionalesModal(false); // ELIMINADO
  //   // setProductoParaVistaOpcionales(null); // ELIMINADO
  //   // setVistaOpcionalesData([]); // ELIMINADO
  //   // setVistaOpcionalesError(null); // ELIMINADO
  // };
  
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
    let productosFiltrados = [...productosOriginales];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      productosFiltrados = productosFiltrados.filter(
        producto => 
          producto.codigo_producto?.toLowerCase().includes(lowerSearchTerm) || 
          producto.nombre_del_producto?.toLowerCase().includes(lowerSearchTerm) ||
          producto.Modelo?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setProductos(productosFiltrados);
    setTotalMostrado(productosFiltrados.length);
  }, [searchTerm, productosOriginales]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
         // if (showVistaOpcionalesModal) { handleCloseModal(); } // ELIMINADO
         if (showDetalleModal) { handleCloseDetalleModal(); }
         // También podríamos querer cerrar otros modales aquí si están abiertos,
         // como el de OpcionalesCotizacionModal (pasoCotizacion === 1)
         // o los modales de Crear/Editar/Eliminar equipo.
         if (pasoCotizacion === 1 && productoActualConfigurandoOpcionales) {
          handleCerrarProcesoSeleccionOpcionalesGlobal(); // Cierra el modal de selección de opcionales de cotización
         }
         if (showCreateModal) { handleCloseCreateModal(); }
         if (showEditModal) { handleCloseEditModal(); }
         if (showConfirmDeleteModal) { handleCloseConfirmDeleteModal(); }
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => { window.removeEventListener('keydown', handleEscKey); };
  }, [showDetalleModal, pasoCotizacion, productoActualConfigurandoOpcionales, showCreateModal, showEditModal, showConfirmDeleteModal]); // Dependencias actualizadas

  const handleCloseDetalleModal = () => {
    setShowDetalleModal(false);
    setDetalleProducto(null);
  };

  // --- NUEVO: Función para avanzar en la configuración de opcionales o finalizar ---
  const avanzarConfiguracionOpcionales = (guardarOpcionalesActuales: Producto[] | null = null) => {
    if (indiceProductoActualParaOpcionales === null) return; // No debería pasar si se llama correctamente

    const codigoProductoActual = productosSeleccionadosParaCotizar[indiceProductoActualParaOpcionales];

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

    if (siguienteIndice < productosSeleccionadosParaCotizar.length) {
      setIndiceProductoActualParaOpcionales(siguienteIndice);
      const siguienteCodigoProducto = productosSeleccionadosParaCotizar[siguienteIndice];
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
      
      const itemsParaDetalleCarga: ProductoConOpcionales[] = productosSeleccionadosParaCotizar.map(codigoPrincipal => {
        const principal = productosOriginales.find(p => p.codigo_producto === codigoPrincipal);
        const opcionales = opcionalesSeleccionadosPorProducto[codigoPrincipal] || [];
        return {
          principal: principal || {} as Producto, // Evitar undefined si no se encuentra
          opcionales: opcionales
        };
      }).filter(item => item.principal && item.principal.codigo_producto); // Asegurarse que el principal es válido

      console.log("Datos preparados para DetallesCargaPanel:", itemsParaDetalleCarga);
      setDatosParaDetallesCarga(itemsParaDetalleCarga);
      
      setPasoCotizacion(1); // Transición a DetallesCargaPanel
      setIndiceProductoActualParaOpcionales(null); // Resetear índice
    }
  };

  // --- useEffect para cargar opcionales cuando productoActualConfigurandoOpcionales cambia y estamos en paso 1 ---
  useEffect(() => {
    const fetchOpcionalesParaProductoActual = async () => {
      if (!productoActualConfigurandoOpcionales || !productoActualConfigurandoOpcionales.codigo_producto) {
        setOpcionalesDataModal([]);
        return;
      }

      console.log(`Cargando opcionales (para modal) para: ${productoActualConfigurandoOpcionales.nombre_del_producto}`);
      setOpcionalesLoadingModal(true);
      setOpcionalesErrorModal(null);
      setOpcionalesDataModal([]); // Limpiar datos previos

      try {
        const { codigo_producto, Modelo /*, categoria */ } = productoActualConfigurandoOpcionales; // categoria eliminado
        if (!codigo_producto || !Modelo /* || !categoria */) { // categoria eliminado
          throw new Error('Faltan parámetros (código, modelo) para obtener opcionales.');
        }
        const params = new URLSearchParams();
        params.append('codigo', codigo_producto);
        params.append('modelo', Modelo);
        // params.append('categoria', categoria); // Eliminado
        const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error del servidor: ${response.status}` }));
          throw new Error(errorData.message || `Error del servidor: ${response.status}`);
        }
        const dataAPI = await response.json(); // Renombrado para evitar conflicto con opcionalesDataModal

        if (dataAPI.success && dataAPI.data && Array.isArray(dataAPI.data.products)) {
          setOpcionalesDataModal(dataAPI.data.products);
        } else {
          throw new Error('Formato de respuesta de opcionales inválido.');
        }
      } catch (error: any) {
        console.error('Error al obtener opcionales para el producto actual en modal:', error);
        if (error.name === 'AbortError') {
          setOpcionalesErrorModal('La solicitud para obtener opcionales tardó demasiado.');
        } else {
          setOpcionalesErrorModal(error instanceof Error ? error.message : 'Error desconocido al obtener opcionales.');
        }
        setOpcionalesDataModal([]);
      } finally {
        setOpcionalesLoadingModal(false);
      }
    };

    if (pasoCotizacion === 1 && productoActualConfigurandoOpcionales) {
      fetchOpcionalesParaProductoActual();
    }
  }, [productoActualConfigurandoOpcionales, pasoCotizacion]);

  // --- MODIFICADO: Función llamada desde OpcionalesCotizacionModal --- 
  // Esta función se llama cuando el usuario confirma la selección de opcionales DENTRO DEL MODAL
  // para el producto principal que se está mostrando actualmente en ese modal.
  const handleConfirmarOpcionalesParaPrincipalActual = (codigosOpcionalesSeleccionados: string[]) => {
    if (!productoActualConfigurandoOpcionales || !productoActualConfigurandoOpcionales.codigo_producto) {
      console.error("Error: No hay producto principal actual para confirmar opcionales.");
      // Considerar cerrar el modal o mostrar un error al usuario aquí si esto sucede.
      return;
    }
    const codigoPrincipalActual = productoActualConfigurandoOpcionales.codigo_producto;
    console.log(`Opcionales confirmados para ${codigoPrincipalActual}:`, codigosOpcionalesSeleccionados);
    
    // opcionalesDataModal tiene los opcionales disponibles para el productoActualConfigurandoOpcionales
    const seleccionadosCompletos = opcionalesDataModal.filter(op => 
        op.codigo_producto && codigosOpcionalesSeleccionados.includes(op.codigo_producto)
    );

    setOpcionalesSeleccionadosPorProducto(prev => ({
      ...prev,
      [codigoPrincipalActual]: seleccionadosCompletos
    }));

    // Avanzar al siguiente producto principal para configurar sus opcionales, o finalizar.
    avanzarAlSiguientePrincipalParaOpcionales(); 
  };
  
  // --- MODIFICADO: Al cerrar el modal de cotización/opcionales (OpcionalesCotizacionModal) ---
  // Esto se llama si el usuario cierra el modal (ej. con su botón 'X') ANTES de completar la selección de todos los productos.
  const handleCerrarProcesoSeleccionOpcionalesGlobal = () => { 
      console.log("Proceso global de selección de opcionales cerrado/cancelado por el usuario.");
      setIsSelectionModeActive(false); // Salir del modo de checkboxes si aún estaba activo (no debería)
      setProductosSeleccionadosParaCotizar([]);
      setOpcionalesSeleccionadosPorProducto({});
      setIndiceProductoActualParaOpcionales(null);
      setProductoActualConfigurandoOpcionales(null);
      setDatosParaDetallesCarga([]);
      
      // Limpiar estados del modal
      setOpcionalesDataModal([]);
      setOpcionalesLoadingModal(false);
      setOpcionalesErrorModal(null);

      setPasoCotizacion(0); // Volver a la tabla de equipos
  };

  // --- NUEVA: Función para avanzar al siguiente producto principal para la selección de opcionales ---
  const avanzarAlSiguientePrincipalParaOpcionales = () => {
    const siguienteIndice = (indiceProductoActualParaOpcionales ?? -1) + 1; // Inicia en 0 si es null

    if (siguienteIndice < productosSeleccionadosParaCotizar.length) {
      setIndiceProductoActualParaOpcionales(siguienteIndice);
      const siguienteCodigoProducto = productosSeleccionadosParaCotizar[siguienteIndice];
      const siguienteProducto = productosOriginales.find(p => p.codigo_producto === siguienteCodigoProducto);
      
      if (siguienteProducto) {
        console.log(`Avanzando para configurar opcionales de: ${siguienteProducto.nombre_del_producto}`);
        setProductoActualConfigurandoOpcionales(siguienteProducto);
        // El useEffect se encargará de llamar a fetchOpcionalesParaProductoActual
        // y el OpcionalesCotizacionModal se re-renderizará con el nuevo producto y sus opcionales.
      } else {
        console.error(`Error: Siguiente producto principal (${siguienteCodigoProducto}) no encontrado. Deteniendo el proceso.`);
        handleCerrarProcesoSeleccionOpcionalesGlobal(); // Volver al inicio si hay un error grave
      }
    } else {
      // Todos los productos principales han sido procesados para opcionales.
      console.log("Todos los productos principales han tenido la oportunidad de configurar opcionales.");
      
      const itemsParaDetalleCargaCalc: ProductoConOpcionales[] = productosSeleccionadosParaCotizar.map(codigoPrincipal => {
        const principal = productosOriginales.find(p => p.codigo_producto === codigoPrincipal);
        const opcionales = opcionalesSeleccionadosPorProducto[codigoPrincipal] || []; // Usar los opcionales guardados
        return {
          principal: principal || {} as Producto,
          opcionales: opcionales
        };
      }).filter(item => item.principal && item.principal.codigo_producto); 
      
      setDatosParaDetallesCarga(itemsParaDetalleCargaCalc);
      console.log("Datos finales para Detalles de la Carga:", itemsParaDetalleCargaCalc);

      setPasoCotizacion(2); // Ir a Detalles de la Carga
      
      // Limpiar estados de la configuración de opcionales actual
      setIndiceProductoActualParaOpcionales(null);
      setProductoActualConfigurandoOpcionales(null);
      // No limpiar opcionalesSeleccionadosPorProducto aquí, se usó para datosParaDetallesCarga
      // No limpiar productosSeleccionadosParaCotizar aquí, se usó para datosParaDetallesCarga
    }
  };

  // --- MODIFICADO: Función para proceder a la selección de opcionales (cuando se hace clic en "Cotizar X Equipos")
  const handleProceedToOptionSelection = () => {
    if (productosSeleccionadosParaCotizar.length === 0) return;

    setIsSelectionModeActive(false); // Salir del modo de selección con checkboxes
    setOpcionalesSeleccionadosPorProducto({}); // Limpiar opcionales guardados de una sesión anterior
    setIndiceProductoActualParaOpcionales(0); // Empezar con el primer producto seleccionado

    const primerCodigoProducto = productosSeleccionadosParaCotizar[0];
    const primerProducto = productosOriginales.find(p => p.codigo_producto === primerCodigoProducto);
    
    if (primerProducto) {
      setProductoActualConfigurandoOpcionales(primerProducto);
      // El useEffect se encargará de buscar los opcionales del primerProducto
      // y el OpcionalesCotizacionModal se mostrará porque pasoCotizacion será 1
    } else {
      console.error("No se encontró el primer producto para configurar opcionales. Volviendo al inicio.");
      handleCerrarProcesoSeleccionOpcionalesGlobal(); // Resetear todo y volver al paso 0
      return; 
    }
    setPasoCotizacion(1); // Cambiar al panel/vista de "Selección de Opcionales"
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
        // Al salir del modo de selección, no hacer nada especial aquí ya que "Cotizar" tiene su propia lógica.
      }
      return !prevIsActive;
    });
  };

  // --- Función para manejar la selección/deselección de un producto para cotizar ---
  const handleToggleProductoParaCotizar = (codigoProducto: string) => {
    setProductosSeleccionadosParaCotizar(prevSeleccionados => {
      if (prevSeleccionados.includes(codigoProducto)) {
        return prevSeleccionados.filter(codigo => codigo !== codigoProducto);
      } else {
        return [...prevSeleccionados, codigoProducto];
      }
    });
  };

  // --- Funciones de navegación y cálculo de precios que fueron eliminadas accidentalmente ---
   const handleVolverDesdeDetalles = () => {
    // Al volver desde DetallesCargaPanel, usualmente se quiere volver a la tabla de equipos
    // o al inicio del proceso de selección de opcionales si se desea modificar.
    // Por consistencia con handleCerrarProcesoSeleccionOpcionalesGlobal, reseteamos todo.
    handleCerrarProcesoSeleccionOpcionalesGlobal(); 
  };

  const handleSiguienteDesdeDetalles = async () => {
    // Esta función se llama desde DetallesCargaPanel.
    // Aquí se debería implementar la lógica para el siguiente paso, ej. Detalles de Envío.
    // Y potencialmente el cálculo de precios para los itemsEnDetalleCarga.
    console.log("Paso a Detalles de Envío/Cálculo de Precios...", datosParaDetallesCarga);
    
    // Lógica de ejemplo para el cálculo de precios (Placeholder)
    if (datosParaDetallesCarga.length > 0) {
      // Suponiendo que necesitamos el primer producto para la API de precios actual
      const primerItem = datosParaDetallesCarga[0];
      if (primerItem.principal.codigo_producto) {
    setPricingLoading(true);
    setPricingError(null);
        setPricingResult(null);
    try {
      const result = await api.calculatePricing({ 
            productCode: primerItem.principal.codigo_producto 
            // Aquí se podría extender para enviar también los opcionales del primerItem
            // o si la API soporta múltiples productos, enviar todos los datosParaDetallesCarga.
          });
          setPricingResult(result);
          // setPasoCotizacion(3); // Suponiendo que 3 es DetallesEnvioPanel después del cálculo
          console.log("Cálculo de precios simulado exitoso para el primer item.", result);
          alert("Cálculo de precios (simulado) para el primer producto realizado. Ver consola. Siguiente paso no implementado.");
          // Por ahora, no avanzamos a otro paso ya que DetallesEnvioPanel no está totalmente integrado
          // en este nuevo flujo de múltiples productos.

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error desconocido al calcular precios.";
      setPricingError(errorMsg);
          console.error("Error en cálculo de precios (simulado):", errorMsg);
    } finally {
      setPricingLoading(false);
    }
      } else {
        setPricingError("El primer producto seleccionado no tiene código para calcular precios.");
      }
    } else {
      setPricingError("No hay productos en Detalles de Carga para calcular precios.");
    }
  };

  // Refrescar productos (reutilizable)
  const refreshProductos = useCallback(() => {
    fetchProductos(); // fetchProductos ya existe y carga de /api/products/cache/all
  }, []); // fetchProductos debería estar envuelto en useCallback si es dependencia de otros useEffects, o ser estable.

  // --- NUEVO: Handlers para CREAR Equipo ---
  const handleOpenCreateModal = () => {
    setNewEquipoForm({}); // Limpiar formulario
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleNewEquipoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Para checkboxes
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Manejar campos anidados (ej. caracteristicas.nombre_del_producto)
    if (name.includes('.')) {
      const [objKey, fieldKey] = name.split('.');
      setNewEquipoForm(prev => ({
        ...prev,
        [objKey]: {
          ...(prev[objKey as keyof EquipoFormData] as object || {}),
          [fieldKey]: val
        }
      }));
    } else {
      setNewEquipoForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleCreateEquipoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      // Aquí puedes añadir transformaciones si los campos numéricos están como string
      const payload = { ...newEquipoForm };
      if (payload.peso_kg) payload.peso_kg = parseFloat(payload.peso_kg as string);
      if (payload.dimensiones?.largo_cm) payload.dimensiones.largo_cm = parseFloat(payload.dimensiones.largo_cm as string);
      if (payload.dimensiones?.ancho_cm) payload.dimensiones.ancho_cm = parseFloat(payload.dimensiones.ancho_cm as string);
      if (payload.dimensiones?.alto_cm) payload.dimensiones.alto_cm = parseFloat(payload.dimensiones.alto_cm as string);

      const response = await fetch('http://localhost:5001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }
      console.log('Producto creado:', responseData.data);
      alert('¡Equipo creado exitosamente!'); // Reemplazar con una notificación mejor
      handleCloseCreateModal();
      refreshProductos(); // Refrescar la lista de productos
    } catch (error: any) {
      console.error('Error al crear equipo:', error);
      setCreateError(error.message || 'Ocurrió un error al crear el equipo.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- Stubs para EDITAR y ELIMINAR (se implementarán después) ---
  const handleOpenEditModal = (producto: Producto) => {
    console.log("Abrir modal para editar:", producto);
    setEquipoParaEditar(producto);
    
    // Pre-llenar formulario. Acceder a los campos de forma segura.
    // Asumimos que la interfaz Producto del frontend tiene al menos los campos aplanados por el backend.
    const formData: EquipoFormData = {
        Codigo_Producto: producto.codigo_producto, // Usar el campo que la interfaz Producto sí tiene
        peso_kg: (producto as any).peso_kg || '', // Acceso seguro si no está en la interfaz Producto
        clasificacion_easysystems: (producto as any).clasificacion_easysystems || '',
        codigo_ea: (producto as any).codigo_ea || '',
        proveedor: (producto as any).proveedor || '',
        procedencia: (producto as any).procedencia || '',
        es_opcional: (producto as any).es_opcional || false,
        tipo: (producto as any).tipo || '',
        caracteristicas: {
            nombre_del_producto: producto.nombre_del_producto,
            modelo: producto.Modelo, 
            descripcion: producto.descripcion,
            categoria: (producto as any).caracteristicas?.categoria || (producto as any).categoria_interna || '' // Ejemplo si hubiera una categoria interna
        },
        dimensiones: {
            largo_cm: (producto as any).dimensiones?.largo_cm || '',
            ancho_cm: (producto as any).dimensiones?.ancho_cm || '',
            alto_cm: (producto as any).dimensiones?.alto_cm || '',
        }
    };
    // Limpiar campos undefined o null para evitar problemas con controlled components
    Object.keys(formData).forEach(key => {
        const formKey = key as keyof EquipoFormData;
        if (formData[formKey] === null || formData[formKey] === undefined) {
            if (typeof formData[formKey] === 'boolean') {
                 // No hacer nada para booleanos, ya se maneja con || false arriba
            } else if (typeof formData[formKey] === 'object' && formData[formKey] !== null) {
                // Para objetos anidados como caracteristicas y dimensiones
                const nestedObject = formData[formKey] as any;
                Object.keys(nestedObject).forEach(subKey => {
                    if (nestedObject[subKey] === null || nestedObject[subKey] === undefined) {
                        nestedObject[subKey] = '';
                    }
                });
            } else {
                 (formData as any)[formKey] = '';
            }
        }
    });
    // Caso especial para es_opcional que debe ser booleano
    formData.es_opcional = !!formData.es_opcional;

    setEditEquipoForm(formData);
    setEditError(null);
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => setShowEditModal(false);

  const handleEditEquipoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name.includes('.')) {
      const [objKey, fieldKey] = name.split('.');
      setEditEquipoForm(prev => ({
        ...prev,
        [objKey]: {
          ...(prev[objKey as keyof EquipoFormData] as object || {}),
          [fieldKey]: val
        }
      }));
    } else {
      setEditEquipoForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleEditEquipoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoParaEditar || !equipoParaEditar.codigo_producto) {
      setEditError('No hay un equipo seleccionado para editar o falta el código del producto.');
      return;
    }
    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const payload = { ...editEquipoForm };
      // Eliminar Codigo_Producto del payload ya que no se debe enviar para modificar el ID en sí, se usa en la URL
      // delete payload.Codigo_Producto; 
      // Aunque en nuestro servicio backend, ya evitamos que Codigo_Producto se actualice desde el body.

      // Convertir números de string a float si es necesario
      if (payload.peso_kg) payload.peso_kg = parseFloat(payload.peso_kg as string);
      if (payload.dimensiones?.largo_cm) payload.dimensiones.largo_cm = parseFloat(payload.dimensiones.largo_cm as string);
      if (payload.dimensiones?.ancho_cm) payload.dimensiones.ancho_cm = parseFloat(payload.dimensiones.ancho_cm as string);
      if (payload.dimensiones?.alto_cm) payload.dimensiones.alto_cm = parseFloat(payload.dimensiones.alto_cm as string);

      const response = await fetch(`http://localhost:5001/api/products/code/${equipoParaEditar.codigo_producto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }
      alert('¡Equipo actualizado exitosamente!'); 
      handleCloseEditModal();
      refreshProductos();
    } catch (error: any) {
      console.error('Error al actualizar equipo:', error);
      setEditError(error.message || 'Ocurrió un error al actualizar el equipo.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
      const responseData = await response.json(); // Leer cuerpo aunque sea para errores
      if (!response.ok) {
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }
      alert('¡Equipo eliminado exitosamente!');
      handleCloseConfirmDeleteModal();
      refreshProductos();
    } catch (error: any) {
      setDeleteError(error.message || 'Error al eliminar equipo.');
    } finally {
      setIsDeleting(false);
    }
  };

  // JSX (movido de App.tsx, corresponde al <main>...</main>)
  if (pasoCotizacion === 1 && productoActualConfigurandoOpcionales) {
    // PASO 1: Selección de Opcionales (usando OpcionalesCotizacionModal)
    return (
      <OpcionalesCotizacionModal 
        productoNombre={productoActualConfigurandoOpcionales.nombre_del_producto || 'Seleccionar Opcionales'}
        opcionales={opcionalesDataModal} 
        isLoading={opcionalesLoadingModal}
        error={opcionalesErrorModal}
        onClose={handleCerrarProcesoSeleccionOpcionalesGlobal} 
        onConfirmarSeleccion={handleConfirmarOpcionalesParaPrincipalActual} // Corregido aquí si era necesario
      />
    );
  }

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
    <div style={{ padding: '24px' }}>
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
              style={{ width: '100%', padding: '8px 12px 8px 40px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
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
        
        {/* BOTÓN SELECCIONAR PARA COTIZAR */}
        <motion.button 
          onClick={isSelectionModeActive ? handleProceedToOptionSelection : toggleSelectionMode} 
          disabled={isSelectionModeActive && productosSeleccionadosParaCotizar.length === 0}
          className="button-hover" 
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', 
            backgroundColor: isSelectionModeActive ? (productosSeleccionadosParaCotizar.length > 0 ? '#22c55e' : '#D1D5DB') : 'white', 
            border: `1px solid ${isSelectionModeActive ? (productosSeleccionadosParaCotizar.length > 0 ? '#16a34a' : '#9CA3AF') : '#1e88e5'}`,
            color: isSelectionModeActive ? 'white' : '#1e88e5', 
            padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', 
            cursor: (isSelectionModeActive && productosSeleccionadosParaCotizar.length === 0) ? 'not-allowed' : 'pointer', 
            transition: 'all 0.2s ease' 
          }}
          whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
        >
          {isSelectionModeActive ? <Check size={18} /> : <Mail size={16} />}
          {isSelectionModeActive ? `Cotizar ${productosSeleccionadosParaCotizar.length} Equipo(s)` : 'Seleccionar para Cotizar'}
        </motion.button>

        {/* Botón para CREAR Equipo con icono PlusCircle */}
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
      </div>

      {/* Contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <div style={{ fontSize: '14px', color: '#6B7280' }}>
          {loading ? "Cargando equipos..." : `Mostrando ${totalMostrado} de ${productosOriginales.length} equipos`}
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
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: '80px' }}>Código</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Modelo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Ver Detalle</th>
                    {isSelectionModeActive && (
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Seleccionar</th>
                    )}
                    {!isSelectionModeActive && (
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                    )}
                  </tr>
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

                    return (
                      <tr key={producto.codigo_producto || `prod-${index}-${Math.random()}`} className="table-row" style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {/* Column: Código */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.codigo_producto || '-'}</td>
                        {/* Column: Nombre */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.nombre_del_producto || '-'}</td>
                        {/* Column: Descripción */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.descripcion || '-'}</td>
                        {/* Column: Modelo */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>{producto.Modelo || '-'}</td>
                        {/* Column: Tipo (with new logic) */}
                        <td style={{ padding: '16px', textAlign: 'left' }}>
                          {displayTipo}
                        </td>
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
                        {/* Column: Seleccionar (conditional) */}
                        {isSelectionModeActive && (
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={productosSeleccionadosParaCotizar.includes(producto.codigo_producto || '')} 
                              onChange={() => producto.codigo_producto && handleToggleProductoParaCotizar(producto.codigo_producto)} 
                              disabled={!producto.codigo_producto} 
                              style={{ transform: 'scale(1.3)', cursor: 'pointer'}} />
                          </td>
                        )}
                        {/* Column: Acciones (conditional) */}
                        {!isSelectionModeActive && (
                          <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button title="Editar Equipo" onClick={() => handleOpenEditModal(producto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', padding: '6px', marginRight: '10px', verticalAlign: 'middle' }}>
                              <FileEdit size={18} />
                            </button>
                            <button title="Eliminar Equipo" onClick={() => handleOpenConfirmDeleteModal(producto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '6px', verticalAlign: 'middle' }}>
                              <Trash2 size={18} />
                            </button>
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

      {/* Modales (Crear, Editar, Confirmar Eliminación, VerDetalle, VistaOpcionales) */}
      {showCreateModal && ( 
        <div className="modal-overlay" style={unifiedModalOverlayStyle}>
          <div className="modal-content hover-scale" style={{ ...unifiedModalContentStyle, maxWidth: '700px' }}>
            <form onSubmit={handleCreateEquipoSubmit}>
               <div style={unifiedHeaderStyle}>
                 <div style={unifiedTitleStyle}>
                    <PlusCircle size={20} /> 
                    <h2>Crear Nuevo Equipo</h2>
                 </div>
                 <button type="button" onClick={handleCloseCreateModal} className="button-hover" style={unifiedCloseButtonStyle}>
                   <X size={16}/>
                 </button>
               </div>
               <div style={{...unifiedBodyStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                  {/* ... campos del formulario de creación ... */}
                  <div><label>Código Producto*</label><input type="text" name="Codigo_Producto" value={newEquipoForm.Codigo_Producto || ''} onChange={handleNewEquipoFormChange} required /></div>
                  <div><label>Nombre Producto*</label><input type="text" name="caracteristicas.nombre_del_producto" value={newEquipoForm.caracteristicas?.nombre_del_producto || ''} onChange={handleNewEquipoFormChange} required /></div>
                  <div><label>Modelo*</label><input type="text" name="caracteristicas.modelo" value={newEquipoForm.caracteristicas?.modelo || ''} onChange={handleNewEquipoFormChange} required /></div>
                  <div><label>Categoría (Interna)*</label><input type="text" name="caracteristicas.categoria" value={newEquipoForm.caracteristicas?.categoria || ''} onChange={handleNewEquipoFormChange} required /></div>
                  <div style={{gridColumn: '1 / -1'}}><label>Descripción</label><textarea name="caracteristicas.descripcion" value={newEquipoForm.caracteristicas?.descripcion || ''} onChange={handleNewEquipoFormChange} /></div>
                  <div><label>Peso (kg)*</label><input type="number" name="peso_kg" value={newEquipoForm.peso_kg || ''} onChange={handleNewEquipoFormChange} required /></div>
                  {/* ...Añadir TODOS los demás campos requeridos por el backend para la creación ...*/}
                  {createError && <p style={{ color: 'red', gridColumn: '1 / -1' }}>Error: {createError}</p>}
               </div>
               <div style={unifiedFooterStyle}>
                 <button type="button" onClick={handleCloseCreateModal} style={{...unifiedSecondaryButtonStyle, marginRight: '12px'}}>Cancelar</button>
                 <button type="submit" disabled={isSubmittingCreate} style={isSubmittingCreate ? unifiedDisabledSecondaryButtonStyle : {...unifiedSecondaryButtonStyle, backgroundColor: '#10B981', color: 'white', borderColor: '#059669' }}>
                  {isSubmittingCreate ? 'Creando...' : 'Crear Equipo'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAL PARA EDITAR Equipo --- */}
      {showEditModal && equipoParaEditar && (
        <div className="modal-overlay" style={unifiedModalOverlayStyle}>
          {/* Aumentar maxWidth a 850px y reducir un poco el padding vertical del cuerpo */}
          <div className="modal-content hover-scale" style={{ ...unifiedModalContentStyle, width: '90%', maxWidth: '850px' }}> 
            <form onSubmit={handleEditEquipoSubmit}>
              <div style={unifiedHeaderStyle}> {/* Header se mantiene igual */}
                <div style={unifiedTitleStyle}>
                   <FileEdit size={20} />
                   <h2>Editar Equipo: {editEquipoForm.caracteristicas?.nombre_del_producto || editEquipoForm.Codigo_Producto}</h2>
                </div>
                <button type="button" onClick={handleCloseEditModal} className="button-hover" style={unifiedCloseButtonStyle}>
                   <X size={16}/>
                </button>
              </div>
              
              {/* Cuerpo del modal con scroll y padding ajustado */}
              <div style={{
                ...unifiedBodyStyle, 
                padding: '20px 24px', // Reducido padding vertical de 24px a 20px
                maxHeight: 'calc(85vh - 110px)', // Reducido el estimado de header/footer a 110px (de 120px)
                overflowY: 'auto' 
              }}>
                
                {/* Sección: Información General */}
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#1e88e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Información General</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '24px' }}>
                  {/* ... todos los campos de Información General como estaban ... */}
                  <div>
                    <label htmlFor="edit_Codigo_Producto" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Código Producto</label>
                    <input type="text" name="Codigo_Producto" id="edit_Codigo_Producto" value={editEquipoForm.Codigo_Producto || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#e9ecef'}} readOnly />
                  </div>
                  <div>
                    <label htmlFor="edit_caracteristicas.nombre_del_producto" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Nombre Producto*</label>
                    <input type="text" name="caracteristicas.nombre_del_producto" id="edit_caracteristicas.nombre_del_producto" value={editEquipoForm.caracteristicas?.nombre_del_producto || ''} onChange={handleEditEquipoFormChange} required style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  {/* (Asegúrate que el resto de los campos de esta sección estén aquí) */}
                   <div>
                    <label htmlFor="edit_caracteristicas.modelo" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Modelo*</label>
                    <input type="text" name="caracteristicas.modelo" id="edit_caracteristicas.modelo" value={editEquipoForm.caracteristicas?.modelo || ''} onChange={handleEditEquipoFormChange} required style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div>
                    <label htmlFor="edit_categoria" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Categoría Principal*</label>
                    <input type="text" name="categoria" id="edit_categoria" value={editEquipoForm.categoria || ''} onChange={handleEditEquipoFormChange} required style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                   <div>
                    <label htmlFor="edit_caracteristicas.categoria" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Categoría (Caract.)</label>
                    <input type="text" name="caracteristicas.categoria" id="edit_caracteristicas.categoria" value={editEquipoForm.caracteristicas?.categoria || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="edit_caracteristicas.descripcion" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Descripción (Caract.)</label>
                      <textarea name="caracteristicas.descripcion" id="edit_caracteristicas.descripcion" value={editEquipoForm.caracteristicas?.descripcion || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', minHeight: '70px'}}/>
                  </div>
                </div>

                {/* Sección: Detalles Físicos */}
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#1e88e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Detalles Físicos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px 24px', marginBottom: '24px' }}>
                  {/* ... todos los campos de Detalles Físicos como estaban ... */}
                  <div>
                    <label htmlFor="edit_peso_kg" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Peso (kg)*</label>
                    <input type="number" name="peso_kg" id="edit_peso_kg" value={editEquipoForm.peso_kg || ''} onChange={handleEditEquipoFormChange} required style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                   {/* (Asegúrate que el resto de los campos de esta sección estén aquí) */}
                  <div>
                    <label htmlFor="edit_dimensiones.largo_cm" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Largo (cm)</label>
                    <input type="number" name="dimensiones.largo_cm" id="edit_dimensiones.largo_cm" value={editEquipoForm.dimensiones?.largo_cm || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div>
                    <label htmlFor="edit_dimensiones.ancho_cm" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Ancho (cm)</label>
                    <input type="number" name="dimensiones.ancho_cm" id="edit_dimensiones.ancho_cm" value={editEquipoForm.dimensiones?.ancho_cm || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div>
                    <label htmlFor="edit_dimensiones.alto_cm" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Alto (cm)</label>
                    <input type="number" name="dimensiones.alto_cm" id="edit_dimensiones.alto_cm" value={editEquipoForm.dimensiones?.alto_cm || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                </div>
                
                {/* Sección: Clasificación y Origen */}
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#1e88e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Clasificación y Origen</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
                  {/* ... todos los campos de Clasificación y Origen como estaban ... */}
                  <div>
                    <label htmlFor="edit_clasificacion_easysystems" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Clasificación EasySystems</label>
                    <input type="text" name="clasificacion_easysystems" id="edit_clasificacion_easysystems" value={editEquipoForm.clasificacion_easysystems || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  {/* (Asegúrate que el resto de los campos de esta sección estén aquí) */}
                  <div>
                    <label htmlFor="edit_codigo_ea" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Código EA</label>
                    <input type="text" name="codigo_ea" id="edit_codigo_ea" value={editEquipoForm.codigo_ea || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div>
                    <label htmlFor="edit_proveedor" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Proveedor</label>
                    <input type="text" name="proveedor" id="edit_proveedor" value={editEquipoForm.proveedor || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                   <div>
                    <label htmlFor="edit_procedencia" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Procedencia</label>
                    <input type="text" name="procedencia" id="edit_procedencia" value={editEquipoForm.procedencia || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                  <div>
                    <label htmlFor="edit_tipo" style={{fontSize: '13px', fontWeight: 500, display:'block', marginBottom:'4px'}}>Tipo</label>
                    <input type="text" name="tipo" id="edit_tipo" value={editEquipoForm.tipo || ''} onChange={handleEditEquipoFormChange} style={{width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: '6px'}}/>
                  </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}> 
                      <input type="checkbox" name="es_opcional" id="edit_es_opcional" checked={editEquipoForm.es_opcional || false} onChange={handleEditEquipoFormChange} style={{transform: 'scale(1.3)'}} />
                      <label htmlFor="edit_es_opcional" style={{fontSize: '13px', fontWeight: 500, marginBottom:0}}>Es Opcional</label>
                  </div>
                </div>
                {editError && <p style={{ color: 'red', gridColumn: '1 / -1', fontSize: '13px', textAlign: 'center' }}>Error: {editError}</p>}
              </div>

              <div style={unifiedFooterStyle}> {/* Footer se mantiene igual */}
                <button type="button" onClick={handleCloseEditModal} style={{...unifiedSecondaryButtonStyle, marginRight: '12px'}}>Cancelar</button>
                <button type="submit" disabled={isSubmittingEdit} style={isSubmittingEdit ? unifiedDisabledSecondaryButtonStyle : {...unifiedSecondaryButtonStyle, backgroundColor: '#3B82F6', color: 'white', borderColor: '#1D4ED8' }}>
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmDeleteModal && equipoParaEliminar && ( 
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

    </div> 
  );
} 