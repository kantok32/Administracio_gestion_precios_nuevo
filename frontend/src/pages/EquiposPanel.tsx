import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Check, FileEdit, Trash2, RefreshCw, ListFilter, Mail, Info, Archive, ArchiveRestore } from 'lucide-react';
import DetallesCargaPanel from './DetallesCargaPanel';
import { motion } from 'framer-motion';
import EquipoEditModal from '../components/EquipoEditModal';
import ConfiguracionOpcionalesPanel from './ConfiguracionOpcionalesPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Box, Paper, Typography } from '@mui/material';
import { ArrowRight } from 'lucide-react';

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
  success?: boolean;
  data?: {
    products: Producto[];
    total: number;
    source?: string;
  };
  message?: string;
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
}

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
    fecha_cotizacion?: string; // <<< AÑADIDO
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
  descontinuado?: boolean; // Añadido para handleToggleDescontinuado
}

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
  const [totalMostrado, setTotalMostrado] = useState(0);
  const [totalEquiposNoOpcionales, setTotalEquiposNoOpcionales] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState<Producto | null>(null);
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const [opcionalesSeleccionadosPorProducto, setOpcionalesSeleccionadosPorProducto] = useState<Record<string, Producto[]>>({});
  const [datosParaDetallesCarga, setDatosParaDetallesCarga] = useState<ProductoConOpcionales[]>([]);

  const [pasoCotizacion, setPasoCotizacion] = useState<number>(0); // 0: Tabla, 2: DetallesCarga
  const [productosSeleccionadosParaCotizar, setProductosSeleccionadosParaCotizar] = useState<Set<string>>(new Set());
  
  // Estados para el modal de "Ver Opcionales"
  const [showVistaOpcionalesModal, setShowVistaOpcionalesModal] = useState(false);
  const [productoParaVistaOpcionales, setProductoParaVistaOpcionales] = useState<Producto | null>(null);
  const [vistaOpcionalesData, setVistaOpcionalesData] = useState<Producto[]>([]);
  const [vistaOpcionalesLoading, setVistaOpcionalesLoading] = useState(false);
  const [vistaOpcionalesError, setVistaOpcionalesError] = useState<string | null>(null);
  const [loadingOpcionalesBtn, setLoadingOpcionalesBtn] = useState<string | null>(null);
  const [loadingDescontinuado, setLoadingDescontinuado] = useState<string | null>(null);
  const [errorDescontinuado, setErrorDescontinuado] = useState<Record<string, string | null>>({}); // Para errores por producto

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [equipoParaEditar, setEquipoParaEditar] = useState<Producto | null>(null);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
  const [equipoParaEliminar, setEquipoParaEliminar] = useState<Producto | null>(null); 
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Estilos Unificados (Basados en Ver Detalle) ---
  const unifiedModalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1040 };
  const unifiedModalContentStyle: React.CSSProperties = { 
    backgroundColor: 'white', 
    borderRadius: '8px', 
    width: '95%',                  // Usa el 90% del ancho disponible
    maxWidth: '2200px',            // Pero no más de 1000px
    maxHeight: '90vh',             // Usa el 90% de la altura de la pantalla
    display: 'flex', 
    flexDirection: 'column', 
    overflow: 'hidden', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
  };
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
  const chatButtonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#2563eb',
    color: 'white',
    width: '56px',
    height: '56px',
    borderRadius: '70%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    zIndex: 1000,
  };

  const navigate = useNavigate(); // Asegúrate de que useNavigate esté importado y disponible
  const location = useLocation(); // Añadido para el efecto de restaurar estado

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
    if (!producto || !producto.codigo_producto) {
      console.error("handleOpcionales: Producto o código de producto no definido.");
      setVistaOpcionalesError("No se pudo cargar la información del producto.");
      return;
    }
    setLoadingOpcionalesBtn(producto.codigo_producto); 
    setVistaOpcionalesLoading(true);
    setVistaOpcionalesError(null);
    setProductoParaVistaOpcionales(producto);
    setShowVistaOpcionalesModal(true);

    try {
      if (!producto.Modelo || !producto.categoria) {
        throw new Error('Faltan parámetros Modelo o Categoría del producto principal para buscar opcionales.');
      }
      const params = new URLSearchParams();
      params.append('codigo', producto.codigo_producto);
      params.append('modelo', producto.Modelo);
      params.append('categoria', producto.categoria);

      const response = await fetch(`/api/products/opcionales?${params.toString()}`);
      const data: OpcionalesResponse = await response.json();

      if (!response.ok || !data.success) { 
        throw new Error(data.message || `Error del servidor: ${response.status}`);
      }
      
      const opcionales = data.data?.products || data.products || []; 
      setVistaOpcionalesData(opcionales);

    } catch (error: any) {
      console.error('Error al obtener opcionales para vista rápida:', error);
      setVistaOpcionalesError(error.message || 'Error desconocido');
      setVistaOpcionalesData([]);
    } finally {
      setVistaOpcionalesLoading(false);
      setLoadingOpcionalesBtn(null);
    }
  };

  const handleCloseVistaOpcionalesModal = () => {
    setShowVistaOpcionalesModal(false);
    setProductoParaVistaOpcionales(null);
    setVistaOpcionalesData([]);
    setVistaOpcionalesError(null);
  };

  const handleCloseModal = () => { // This is an alias or might be a typo for handleCloseVistaOpcionalesModal based on usage
    setShowVistaOpcionalesModal(false);
    setProductoParaVistaOpcionales(null);
    setVistaOpcionalesData([]);
    setVistaOpcionalesError(null);
  };
  
  const fetchProductos = useCallback(async () => {
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
  }, []); // useCallback con dependencias vacías si no depende de props o estado que cambie

  useEffect(() => { fetchProductos(); }, [fetchProductos]);
  
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
         if (showVistaOpcionalesModal) { handleCloseModal(); } // o handleCloseVistaOpcionalesModal
         if (showDetalleModal) { handleCloseDetalleModal(); }
         if (showEditModal) { handleCloseEditModal(); } 
         if (showConfirmDeleteModal) { handleCloseConfirmDeleteModal(); }
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => { window.removeEventListener('keydown', handleEscKey); };
  }, [showVistaOpcionalesModal, showDetalleModal, showEditModal, showConfirmDeleteModal]); 

  const handleCloseDetalleModal = () => {
    setShowDetalleModal(false);
    setDetalleProducto(null);
  };

  const handleSaveSuccessEquipoEditModal = () => {
    refreshProductos(); // Actualiza la lista de productos
    handleCloseEditModal(); // Cierra el modal de edición
    // Aquí podrías añadir una notificación de éxito si lo deseas
    console.log("Equipo guardado exitosamente a través de EquipoEditModal y lista actualizada.");
  };

  const handleProceedToOptionSelection = () => {
    if (productosSeleccionadosParaCotizar.size === 0) {
      alert("Por favor, seleccione al menos un equipo principal para configurar.");
      return;
    }
    const principalesSeleccionados = productosOriginales.filter(p => 
      p.codigo_producto && productosSeleccionadosParaCotizar.has(p.codigo_producto)
    );

    if (principalesSeleccionados.length === 0) {
        alert("No se encontraron los detalles de los equipos seleccionados. Intente de nuevo.");
        return;
    }
    
    navigate('/configurar-opcionales', { 
      state: { 
        productosPrincipales: principalesSeleccionados,
        // Aquí se pueden pasar otros datos si son necesarios en ConfigurarOpcionalesPanel
      } 
    });
  };

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

  const toggleSelectionMode = () => {
    setIsSelectionModeActive((prevIsActive: boolean) => {
      if (prevIsActive) { 
        // Al salir del modo de selección, limpiar los equipos previamente seleccionados.
        setProductosSeleccionadosParaCotizar(new Set());
      }
      return !prevIsActive;
    });
  };

  const handleToggleProductoParaCotizar = (codigoProducto: string) => {
    setProductosSeleccionadosParaCotizar(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigoProducto)) {
        newSet.delete(codigoProducto);
      } else {
        newSet.add(codigoProducto);
      }
      return newSet;
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

  const refreshProductos = useCallback(() => {
    fetchProductos(); // fetchProductos ya existe y carga de /api/products/cache/all
  }, [fetchProductos]); // fetchProductos debería estar envuelto en useCallback si es dependencia de otros useEffects, o ser estable.

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
      setErrorDescontinuado(prev => ({ ...prev, [productoAActualizar._id || 'unknown']: 'Producto sin código.' }));
      return;
    }

    const codigoProducto = productoAActualizar.codigo_producto;
    setLoadingDescontinuado(codigoProducto);
    setErrorDescontinuado(prev => ({ ...prev, [codigoProducto]: null })); // Limpiar error previo
    const nuevoEstadoDescontinuado = !productoAActualizar.descontinuado;

    try {
      const response = await fetch(`/api/products/code/${codigoProducto}/toggle-discontinued`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descontinuado: nuevoEstadoDescontinuado }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Error al actualizar el estado del producto.');
      }
      
      // Actualizar el estado local con la respuesta del backend (o simplemente el nuevo estado)
      // Es mejor si el backend devuelve el producto actualizado completo para mayor consistencia.
      setProductosOriginales(prev => 
        prev.map(p => 
          p.codigo_producto === codigoProducto 
            ? { ...p, ...responseData.data, descontinuado: nuevoEstadoDescontinuado, caracteristicas: {...p.caracteristicas, ...responseData.data?.caracteristicas, descontinuado: nuevoEstadoDescontinuado} } // Asegurar que el estado local refleje la estructura de la BD
            : p
        )
      );
      // setProductos se actualizará por el useEffect que depende de productosOriginales.

      // Opcional: Mostrar notificación de éxito
      console.log(`Estado descontinuado de ${codigoProducto} actualizado a ${nuevoEstadoDescontinuado} en backend y localmente.`);

    } catch (error: any) {
      console.error(`Error al cambiar estado descontinuado para ${codigoProducto}:`, error);
      setErrorDescontinuado(prev => ({ ...prev, [codigoProducto]: error.message || 'Error de red' }));
      // Opcional: Mostrar notificación de error al usuario
    } finally {
      setLoadingDescontinuado(null);
    }
  };

  const handleEliminarPrincipalDeCarga = (codigoPrincipalAEliminar: string) => {
    setDatosParaDetallesCarga(prevDatos => 
      prevDatos.filter(item => item.principal.codigo_producto !== codigoPrincipalAEliminar)
    );
    // También actualizamos el set de productos seleccionados para cotizar para reflejar la eliminación
    setProductosSeleccionadosParaCotizar(prevSeleccionados => {
      const nuevosSeleccionados = new Set(prevSeleccionados);
      nuevosSeleccionados.delete(codigoPrincipalAEliminar);
      return nuevosSeleccionados;
    });
    // Opcional: si quieres que al eliminar el último item, se vuelva al paso anterior o se muestre un mensaje
    // if (datosParaDetallesCarga.length === 1 && datosParaDetallesCarga[0].principal.codigo_producto === codigoPrincipalAEliminar) {
    //   // Volver al paso 0 o manejar estado vacío
    //   setPasoCotizacion(0); 
    // }
  };

  useEffect(() => {
    if (location.state?.opcionalesConfigurados && location.state?.configuracionPrincipal) {
      const { opcionalesConfigurados, configuracionPrincipal } = location.state;
      console.log("EquiposPanel: Volviendo de /configurar-opcionales con datos:", opcionalesConfigurados, configuracionPrincipal);
      setOpcionalesSeleccionadosPorProducto(opcionalesConfigurados);
      // Aquí podrías querer actualizar `productosSeleccionadosParaCotizar` si es necesario
      // o directamente proceder al siguiente paso si esa es la intención.
      // Por ejemplo, si configuracionPrincipal tiene los datos de los principales que se enviaron:
      // setProductosSeleccionadosParaCotizar(new Set(configuracionPrincipal.map(p => p.codigo_producto!)));
      
      // Reconstruir datosParaDetallesCarga y avanzar al paso 2 (ResumenCarga)
      const itemsParaDetalleCarga: ProductoConOpcionales[] = configuracionPrincipal.map((principal: Producto) => {
        return {
          principal: principal,
          opcionales: (principal.codigo_producto && opcionalesConfigurados[principal.codigo_producto]) || []
        };
      }).filter((item: ProductoConOpcionales) => item.principal && item.principal.codigo_producto);

      if (itemsParaDetalleCarga.length > 0) {
        setDatosParaDetallesCarga(itemsParaDetalleCarga);
        setPasoCotizacion(2); // Asumiendo que 2 es el paso para DetallesCargaPanel
      } else {
        // Si no hay items, volver al paso 0 o manejar como error
        setPasoCotizacion(0);
      }
      // Limpiar el estado de la navegación para evitar que se reutilice incorrectamente
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, productosOriginales]);

  // RENDERIZADO PRINCIPAL
  if (pasoCotizacion === 2) {
    return (
      <DetallesCargaPanel 
        itemsParaCotizar={datosParaDetallesCarga} 
        onVolver={handleVolverDesdeDetalles}
        onSiguiente={handleSiguienteDesdeDetalles}
        onEliminarOpcionalDePrincipal={handleEliminarOpcionalConfirmado}
        onEliminarPrincipal={handleEliminarPrincipalDeCarga}
      />
    );
  }

  // PASO 0: Tabla de Equipos
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

      {/* EL MODAL PARA SELECCIÓN DE OPCIONALES HA SIDO COMPLETAMENTE ELIMINADO DE AQUÍ */}

    </div> 
  );
}

// Estilos (panelStyle, modalOverlayStyle, opcionalesModalStyle, etc. si son necesarios para otros modales)
const panelStyle: React.CSSProperties = { padding: '20px', position: 'relative' /* Para el footer fijo */, paddingBottom: '100px' /* Espacio para el footer */ };
// ... otros estilos que se mantengan ...