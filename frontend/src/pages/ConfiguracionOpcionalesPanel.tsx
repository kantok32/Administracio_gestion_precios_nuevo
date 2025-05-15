import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react'; // Assuming X might be used for a cancel/close button eventually

// Interfaces (deberían ser importadas de un archivo de tipos común si es posible)
interface Producto {
  _id?: string;
  id?: string;
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
  categoria?: string;
  tipo?: string;
  producto?: string;
  peso_kg?: number;
  especificaciones_tecnicas?: any;
  caracteristicas?: {
    nombre_del_producto?: string;
    modelo?: string;
    descripcion?: string;
    categoria?: string;
    [key: string]: any;
  };
  datos_contables?: {
    costo_fabrica_original_eur?: number;
    costo_ano_cotizacion?: number;
    [key: string]: any;
  };
  dimensiones?: {
    largo_mm?: number;
    ancho_mm?: number;
    alto_mm?: number;
    [key: string]: any;
  };
  clasificacion_easysystems?: string;
  codigo_ea?: string;
  proveedor?: string;
  procedencia?: string;
  es_opcional?: boolean;
  familia?: string;
  nombre_comercial?: string;
  detalles?: any;
  [key: string]: any;
}

type OpcionalesPrincipalState = {
  data: Producto[];
  isLoading: boolean;
  error: string | null;
};

// Props para este panel/página
interface ConfiguracionOpcionalesPanelProps {
  productosPrincipales: Producto[];
  onConfiguracionCompleta: (opcionalesConfirmadosPorPrincipal: Record<string, Set<string>>) => void;
  onCancelar: () => void;
}

// --- ESTILOS UNIFICADOS (COPIADOS Y ADAPTADOS DE EquiposPanel) ---
// (Considerar moverlos a un archivo CSS o un objeto de estilos compartidos)
const unifiedModalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1040 };
const unifiedModalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  width: '95%',
  maxWidth: '1000px', // Ajustado para parecerse más a imagen 1
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};
const unifiedHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f0f9ff' }; // Lighter blue
const unifiedTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: 600, color: '#0c4a6e' }; // Darker blue for title text
const unifiedCloseButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', color: '#0c4a6e' };
const unifiedBodyStyle: React.CSSProperties = { flexGrow: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F9FAFB' };
const unifiedFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' };
const unifiedSecondaryButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 };
const unifiedPrimaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };
const unifiedDisabledPrimaryButtonStyle: React.CSSProperties = { ...unifiedPrimaryButtonStyle, backgroundColor: '#a5d8ff', color: '#e0e0e0', cursor: 'not-allowed', borderColor: '#a5d8ff' };
// --- FIN ESTILOS ---


export default function ConfiguracionOpcionalesPanel({
  productosPrincipales,
  onConfiguracionCompleta,
  onCancelar,
}: ConfiguracionOpcionalesPanelProps) {
  const [opcionalesPorPrincipal, setOpcionalesPorPrincipal] = useState<Record<string, OpcionalesPrincipalState>>({});
  const [opcionalesSeleccionadosEnModal, setOpcionalesSeleccionadosEnModal] = useState<Record<string, Set<string>>>({});
  const [isLoadingPagina, setIsLoadingPagina] = useState(false); // Para un estado de carga general de la página si es necesario


  useEffect(() => {
    if (productosPrincipales.length > 0) {
      console.log("ConfiguracionOpcionalesPanel: Cargando opcionales para:", productosPrincipales);
      setIsLoadingPagina(true);
      const initialOpcionalesState: Record<string, OpcionalesPrincipalState> = {};
      productosPrincipales.forEach(principal => {
        if (principal.codigo_producto) {
          initialOpcionalesState[principal.codigo_producto] = { data: [], isLoading: true, error: null };
        }
      });
      setOpcionalesPorPrincipal(initialOpcionalesState);
      setOpcionalesSeleccionadosEnModal({}); // Resetear selecciones

      const fetchPromises = productosPrincipales.map(async (principal) => {
        if (!principal.codigo_producto || !principal.Modelo) {
          console.error("Producto principal sin código o modelo:", principal);
          if (principal.codigo_producto) {
            setOpcionalesPorPrincipal(prev => ({
              ...prev,
              [principal.codigo_producto!]: { data: [], isLoading: false, error: 'Faltan datos del producto principal para cargar opcionales.' }
            }));
          }
          return;
        }

        try {
          const params = new URLSearchParams();
          params.append('codigo', principal.codigo_producto);
          params.append('modelo', principal.Modelo);
          const url = `http://localhost:5001/api/products/opcionales?${params.toString()}`;
          console.log(`Cargando opcionales para ${principal.codigo_producto} desde ${url}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
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
          if (principal.codigo_producto) {
            setOpcionalesPorPrincipal(prev => ({
              ...prev,
              [principal.codigo_producto!]: { data: [], isLoading: false, error: errorMessageToShow }
            }));
          }
        }
      });
      Promise.all(fetchPromises).finally(() => {
        setIsLoadingPagina(false);
      });
    }
  }, [productosPrincipales]);

  const handleToggleOpcionalEnModal = (codigoPrincipal: string, codigoOpcional: string) => {
    setOpcionalesSeleccionadosEnModal((prev: Record<string, Set<string>>) => {
      const nuevosSeleccionadosParaPrincipal = new Set(prev[codigoPrincipal] || []);
      if (nuevosSeleccionadosParaPrincipal.has(codigoOpcional)) {
        nuevosSeleccionadosParaPrincipal.delete(codigoOpcional);
      } else {
        nuevosSeleccionadosParaPrincipal.add(codigoOpcional);
      }
      return {
        ...prev,
        [codigoPrincipal]: nuevosSeleccionadosParaPrincipal
      };
    });
  };

  const renderOpcionalesContent = () => {
    if (productosPrincipales.length === 0 && !isLoadingPagina) {
      return (
        <div style={{padding: '20px', textAlign: 'center'}}>
          <p>No hay productos principales seleccionados para configurar opcionales.</p>
          {/* El botón de volver aquí es opcional, ya que hay uno principal en el footer del componente */}
          {/* <button onClick={onCancelar} style={{...unifiedSecondaryButtonStyle, marginTop: '20px'}}>Volver a Equipos</button> */}
        </div>
      );
    }

    if (isLoadingPagina && Object.keys(opcionalesPorPrincipal).length === 0) {
        return <p style={{textAlign: 'center', padding: '40px', fontSize: '18px'}}>Cargando configuración inicial de opcionales...</p>;
    }
    
    return (
      <>{/* Fragmento para envolver el map de productos principales */}
        {productosPrincipales.map((principal: Producto) => {
          if (!principal.codigo_producto) return null; // Clave para el map y lógica

          const estadoOpcionales = opcionalesPorPrincipal[principal.codigo_producto] || { data: [], isLoading: true, error: null };
          const seleccionadosActual = opcionalesSeleccionadosEnModal[principal.codigo_producto] || new Set();

          return (
            // Card individual para cada producto principal
            <div key={principal.codigo_producto} style={{ marginBottom: '32px', backgroundColor:'white', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              {/* Header específico para esta card de producto */}
              <div style={{...unifiedHeaderStyle, borderBottom: '1px solid #e5e7eb', padding: '12px 16px', backgroundColor: '#fafafa' }}>
                <h3 style={{...unifiedTitleStyle, fontSize: '16px', color: '#333'}}>
                  {principal.nombre_del_producto} ({principal.Modelo || principal.codigo_producto})
                </h3>
              </div>

              {/* Cuerpo de la card para los opcionales de este producto */}
              <div style={{padding: '16px'}}>
                {estadoOpcionales.isLoading && <p style={{color: '#757575', fontStyle: 'italic', textAlign: 'center', padding: '20px'}}>Cargando opcionales para {principal.nombre_del_producto}...</p>}
                {estadoOpcionales.error && <p style={{color: 'red', fontWeight: 'bold', textAlign: 'center', padding: '20px'}}>Error al cargar opcionales: {estadoOpcionales.error}</p>}
                {!estadoOpcionales.isLoading && !estadoOpcionales.error && estadoOpcionales.data.length === 0 && (
                  <p style={{color: '#757575', textAlign: 'center', padding: '20px'}}>No se encontraron opcionales para este equipo.</p>
                )}
                {!estadoOpcionales.isLoading && !estadoOpcionales.error && estadoOpcionales.data.length > 0 && (
                  <>
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#4b5563' }}>
                        {seleccionadosActual.size} seleccionados de {estadoOpcionales.data.length} opcionales
                      </span>
                      {/* Paginación podría ir aquí si fuese necesaria por producto */}
                    </div>
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth:'600px' }}>
                        <thead style={{ backgroundColor: '#f9fafb' }}>
                          <tr>
                            <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '80px', fontSize: '13px', color: '#374151' }}>Seleccionar</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '120px', fontSize: '13px', color: '#374151' }}>Código</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '13px', color: '#374151' }}>Nombre</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '13px', color: '#374151', minWidth: '250px' }}>Descripción</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #ddd', width: '150px', fontSize: '13px', color: '#374151' }}>Costo Fábrica</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estadoOpcionales.data.map((opcional: Producto) => (
                            <tr key={opcional.codigo_producto} style={{ borderBottom: '1px solid #eef2f7', backgroundColor: (seleccionadosActual.has(opcional.codigo_producto!) ? '#e0f2fe' : 'transparent') }}>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }} 
                                  checked={seleccionadosActual.has(opcional.codigo_producto!) || false}
                                  onChange={() => handleToggleOpcionalEnModal(principal.codigo_producto!, opcional.codigo_producto!)}
                                  disabled={!principal.codigo_producto || !opcional.codigo_producto} // principal.codigo_producto ya verificado arriba
                                  title={seleccionadosActual.has(opcional.codigo_producto!) ? `Deseleccionar ${opcional.nombre_del_producto}` : `Seleccionar ${opcional.nombre_del_producto}`}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '13px', color: '#374151' }}>
                                {opcional.codigo_producto || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '13px', color: '#374151' }}>
                                {opcional.nombre_del_producto || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '13px', color: '#4b5563', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                {opcional.descripcion || opcional.detalles?.descripcion_extendida || 'No disponible'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', color: '#374151' }}>
                                {opcional.datos_contables && typeof opcional.datos_contables.costo_fabrica === 'number'
                                  ? `${opcional.datos_contables.costo_fabrica.toLocaleString('de-DE')} ${opcional.datos_contables.divisa_costo || ''}`
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div> {/* Fin del cuerpo de la card de producto */}
            </div> // Fin de la card individual del producto principal
          );
        })} 
      </> // Fin del fragmento que envuelve el map
    );
  };

  const handleConfirmar = () => {
    // Verificar si todos los opcionales que estaban cargando ya terminaron (o tuvieron error)
    const todaviaCargandoAlguno = productosPrincipales.some(p => {
        if (!p.codigo_producto) return false;
        return opcionalesPorPrincipal[p.codigo_producto]?.isLoading;
    });

    if (todaviaCargandoAlguno) {
        alert("Aún se están cargando algunos datos de opcionales. Por favor, espere un momento.");
        return;
    }
    onConfiguracionCompleta(opcionalesSeleccionadosEnModal);
  };
  
  // Simulación de un layout de página, no un modal
  return (
    <div style={{ padding: '20px', backgroundColor: '#F0F2F5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={unifiedHeaderStyle}>
          <h2 style={unifiedTitleStyle}>Configurar Opcionales para Equipos Seleccionados</h2>
          {/* No hay botón X de modal aquí, la navegación se maneja con botones "Confirmar" o "Cancelar" */}
        </div>
        <div style={unifiedBodyStyle}>
          {renderOpcionalesContent()} 
        </div>
        <div style={unifiedFooterStyle}>
          <button 
            onClick={onCancelar} 
            style={{...unifiedSecondaryButtonStyle, marginRight: '12px'}}
          >
            Cancelar y Volver a Equipos
          </button>
          {/* Contador global de opcionales seleccionados - opcional, podría ser complejo si hay muchos productos */}
          {/* <span style={{fontSize: '13px', color: '#4b5563', marginRight: 'auto', marginLeft: '16px'}}>
            Total Opcionales: {Object.values(opcionalesSeleccionadosEnModal).reduce((acc, currentSet) => acc + currentSet.size, 0)}
          </span> */}
          <button 
            onClick={handleConfirmar}
            style={ (productosPrincipales.length === 0) ? unifiedDisabledPrimaryButtonStyle : unifiedPrimaryButtonStyle }
            disabled={productosPrincipales.length === 0 || isLoadingPagina}
          >
            {isLoadingPagina ? "Cargando..." : "Confirmar Opcionales y Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
} 