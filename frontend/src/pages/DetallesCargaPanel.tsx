import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, AlertTriangle } from 'lucide-react';
import { CostoPerfilData } from '../types';

// Interfaces (Producto ya existe, ProductoConOpcionales es nueva)
interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Descripcion?: string;
  Modelo?: string;
  categoria?: string;
  pf_eur?: string | number;
  datos_contables?: {
    costo_fabrica?: number;
    divisa_costo?: string;
    fecha_cotizacion?: string;
    [key: string]: any;
  };
}

interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

interface GroupedPruebaResults {
    costo_producto: {
        factorActualizacion?: number;
        costoFabricaActualizadoEUR?: number;
        costoFinalFabricaEUR_EXW?: number;
        tipoCambioEurUsdAplicado?: number;
        costoFinalFabricaUSD_EXW?: number;
    };
    logistica_seguro: {
        costosOrigenUSD?: number;
        costoTotalFleteManejosUSD?: number;
        baseParaSeguroUSD?: number;
        primaSeguroUSD?: number;
        totalTransporteSeguroEXW_USD?: number;
    };
    importacion: {
        valorCIF_USD?: number;
        derechoAdvaloremUSD?: number;
        baseIvaImportacionUSD?: number;
        ivaImportacionUSD?: number;
        totalCostosImportacionDutyFeesUSD?: number;
    };
    landed_cost: {
        transporteNacionalUSD?: number;
        precioNetoCompraBaseUSD_LandedCost?: number;
    };
    conversion_margen: {
        tipoCambioUsdClpAplicado?: number;
        precioNetoCompraBaseCLP?: number;
        margenCLP?: number;
        precioVentaNetoCLP?: number;
    };
    precios_cliente: {
        precioNetoVentaFinalCLP?: number;
        ivaVentaCLP?: number;
        precioVentaTotalClienteCLP?: number;
    };
}

interface CalculationResult {
    inputs?: any;
    calculados?: GroupedPruebaResults;
    error?: string;
}

interface DetallesCargaPanelProps {
  itemsParaCotizar: ProductoConOpcionales[];
  onVolver: () => void;
  onSiguiente: () => void;
  onEliminarOpcionalDePrincipal: (codigoPrincipal: string, codigoOpcional: string) => void;
  onEliminarPrincipal: (codigoPrincipal: string) => void;
}

// Componente Stepper simple (se puede mejorar)
const Stepper = ({ pasoActual }: { pasoActual: number }) => {
  const pasos = ['Resumen y Configuración de Carga', 'Detalles de Envío', 'Detalles Tributarios', 'Detalles Usuario'];
  const stepStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' };
  const numberStyle: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e9ecef', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '8px', border: '2px solid transparent' };
  const activeNumberStyle: React.CSSProperties = { ...numberStyle, backgroundColor: '#1e88e5', color: 'white' };
  const textStyle: React.CSSProperties = { fontSize: '13px', color: '#6c757d' };
  const activeTextStyle: React.CSSProperties = { ...textStyle, color: '#1e88e5', fontWeight: 500 };
  const lineStyle: React.CSSProperties = { position: 'absolute', top: '16px', left: '50%', right: '-50%', height: '2px', backgroundColor: '#e9ecef', zIndex: -1 };

  return (
    <div style={{ display: 'flex', marginBottom: '32px', marginTop:'16px', padding: '0 10%' }}>
      {pasos.map((nombre, index) => (
        <React.Fragment key={index}>
          <div style={stepStyle}>
             <div style={index + 1 === pasoActual ? activeNumberStyle : numberStyle}>{index + 1}</div>
             <div style={index + 1 === pasoActual ? activeTextStyle : textStyle}>{nombre}</div>
          </div>
          {index < pasos.length - 1 && (
             <div style={{ flex: 1, position: 'relative' }}>
                <div style={lineStyle}></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Simulación de una función para obtener tasas, esta debería existir en services/api.ts
// y llamar a un endpoint del backend como GET /api/products/tasas-cambio-actuales
// que internamente use la lógica de fetchCurrencyValues.
const getTasasDeCambioDesdeAPI = async (): Promise<{ eurUsd: number, usdClp: number, error?: string }> => {
    try {
        // Esta es una simulación. Deberías reemplazar esto con una llamada real a tu API.
        // const response = await api.get('/products/tasas-cambio-actuales');
        // return { eurUsd: response.data.eurUsd, usdClp: response.data.usdClp };

        // --- SIMULACIÓN INICIO ---
        // Intenta obtener los valores de localStorage si están (para desarrollo/prueba rápida)
        const storedDolar = localStorage.getItem('valor_dolar_actual');
        const storedEuro = localStorage.getItem('valor_euro_actual');

        if (storedDolar && storedEuro) {
            const usdClp = parseFloat(storedDolar);
            const eurClp = parseFloat(storedEuro);
            if (!isNaN(usdClp) && !isNaN(eurClp) && usdClp !== 0) {
                console.warn("Usando tasas de cambio simuladas/cacheadas de localStorage");
                return { eurUsd: eurClp / usdClp, usdClp: usdClp };
            }
        }
        // Fallback a valores dummy si no hay API ni localStorage (NO USAR EN PRODUCCIÓN)
        console.error("API real para tasas no implementada, usando valores dummy muy genéricos.");
        // Estos valores deben obtenerse de forma dinámica y fiable en una implementación real.
        const mockEurUsd = 1.08; // Ejemplo EUR/USD
        const mockUsdClp = 950;  // Ejemplo USD/CLP
        // Almacenar para posible reutilización en la misma sesión de prueba
        localStorage.setItem('valor_dolar_actual', mockUsdClp.toString());
        localStorage.setItem('valor_euro_actual', (mockEurUsd * mockUsdClp).toString());

        return { eurUsd: mockEurUsd, usdClp: mockUsdClp };
        // --- SIMULACIÓN FIN ---

    } catch (error: any) {
        console.error("Error obteniendo tasas de cambio:", error);
        return { eurUsd: 0, usdClp: 0, error: error.response?.data?.message || error.message || "Error al obtener tasas de cambio" };
    }
};

export default function DetallesCargaPanel({
  itemsParaCotizar,
  onVolver,
  onSiguiente,
  onEliminarOpcionalDePrincipal,
  onEliminarPrincipal,
}: DetallesCargaPanelProps) {

  const [resultadosCalculados, setResultadosCalculados] = useState<Record<string, CalculationResult>>({});
  const [isLoadingCalculations, setIsLoadingCalculations] = useState<boolean>(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- INICIO MODIFICACIÓN: Estados para la selección de perfiles ---
  const [perfilesCostoList, setPerfilesCostoList] = useState<CostoPerfilData[]>([]);
  const [currentSelectedProfileId, setCurrentSelectedProfileId] = useState<string | null>(null);
  const [isLoadingPerfiles, setIsLoadingPerfiles] = useState<boolean>(false);
  const [errorPerfiles, setErrorPerfiles] = useState<string | null>(null);

  useEffect(() => {
    const cargarPerfiles = async () => {
      setIsLoadingPerfiles(true);
      setErrorPerfiles(null);
      try {
        const perfiles = await api.fetchAllProfiles();
        setPerfilesCostoList(perfiles || []);
        if (perfiles && perfiles.length > 0) {
          // Opcional: seleccionar el primer perfil por defecto, o dejar que el usuario elija.
          // setCurrentSelectedProfileId(perfiles[0]._id); 
        }
      } catch (err: any) {
        console.error("Error cargando perfiles de costo:", err);
        setErrorPerfiles(err.message || "No se pudieron cargar los perfiles de costo.");
      }
      setIsLoadingPerfiles(false);
    };
    cargarPerfiles();
  }, []);
  // --- FIN MODIFICACIÓN ---

  const obtenerParametrosProducto = (producto: Producto): { costoFabricaOriginalEUR: number | null, anoCotizacion: number | null, error?: string } => {
    let costoFabricaOriginalEUR: number | null = null;
    let anoCotizacion: number | null = null;
    let error = undefined;

    if (producto.datos_contables?.costo_fabrica && producto.datos_contables?.divisa_costo === 'EUR') {
      costoFabricaOriginalEUR = Number(producto.datos_contables.costo_fabrica);
    } else if (producto.pf_eur) {
      costoFabricaOriginalEUR = Number(producto.pf_eur);
    } else {
      error = "No se pudo determinar el costo de fábrica en EUR.";
    }

    if (isNaN(costoFabricaOriginalEUR ?? NaN)) {
        costoFabricaOriginalEUR = null;
        error = (error ? error + " " : "") + "Costo de fábrica no es un número válido.";
    }

    if (producto.datos_contables?.fecha_cotizacion) {
      const year = parseInt(producto.datos_contables.fecha_cotizacion, 10);
      if (!isNaN(year) && year > 1900 && year < 2100) {
        anoCotizacion = year;
      } else {
        error = (error ? error + " " : "") + `Año de cotización (${producto.datos_contables.fecha_cotizacion}) inválido.`;
      }
    } else {
       error = (error ? error + " " : "") + "Falta fecha de cotización para determinar el año.";
    }
    return { costoFabricaOriginalEUR, anoCotizacion, error };
  };

  const handleRealizarCalculos = async () => {
    if (!currentSelectedProfileId) {
      setCalculationError("No se ha seleccionado un perfil de costo.");
      return;
    }

    setIsLoadingCalculations(true);
    setCalculationError(null);
    const nuevosResultados: Record<string, CalculationResult> = {};

    const tasas = await getTasasDeCambioDesdeAPI();
    if (tasas.error || !tasas.eurUsd || !tasas.usdClp) {
      setCalculationError(tasas.error || "Error crítico obteniendo tasas de cambio.");
      setIsLoadingCalculations(false);
      return;
    }

    const calculosPromises: Promise<void>[] = [];
    const anoActualParaCalculo = new Date().getFullYear();

    for (const item of itemsParaCotizar) {
      const paramsPrincipal = obtenerParametrosProducto(item.principal);
      if (paramsPrincipal.costoFabricaOriginalEUR !== null && paramsPrincipal.anoCotizacion !== null) {
        const payloadPrincipal = {
          profileId: currentSelectedProfileId,
          anoCotizacion: paramsPrincipal.anoCotizacion,
          anoEnCurso: anoActualParaCalculo,
          costoFabricaOriginalEUR: paramsPrincipal.costoFabricaOriginalEUR,
          tipoCambioEurUsdActual: tasas.eurUsd,
        };
        calculosPromises.push(
          api.calcularCostoProductoConPerfil(payloadPrincipal)
            .then(response => {
              nuevosResultados[`principal-${item.principal.codigo_producto}`] = response.resultado ? 
                { calculados: response.resultado.calculados, inputs: response.resultado.inputs } : 
                { error: response.message || "Respuesta inesperada del servidor." };
            })
            .catch(err => {
              console.error(`Error calculando para principal ${item.principal.codigo_producto}:`, err);
              nuevosResultados[`principal-${item.principal.codigo_producto}`] = { error: err.message || err.data?.message || "Error en cálculo." };
            })
        );
      } else {
        nuevosResultados[`principal-${item.principal.codigo_producto}`] = { error: paramsPrincipal.error || "Datos insuficientes para calcular costo del principal." };
      }

      for (const opcional of item.opcionales) {
        const paramsOpcional = obtenerParametrosProducto(opcional);
        if (paramsOpcional.costoFabricaOriginalEUR !== null && paramsOpcional.anoCotizacion !== null) {
          const payloadOpcional = {
            profileId: currentSelectedProfileId,
            anoCotizacion: paramsOpcional.anoCotizacion,
            anoEnCurso: anoActualParaCalculo,
            costoFabricaOriginalEUR: paramsOpcional.costoFabricaOriginalEUR,
            tipoCambioEurUsdActual: tasas.eurUsd,
          };
          calculosPromises.push(
            api.calcularCostoProductoConPerfil(payloadOpcional)
              .then(response => {
                nuevosResultados[`opcional-${opcional.codigo_producto}`] = response.resultado ? 
                  { calculados: response.resultado.calculados, inputs: response.resultado.inputs } : 
                  { error: response.message || "Respuesta inesperada del servidor." };
              })
              .catch(err => {
                console.error(`Error calculando para opcional ${opcional.codigo_producto}:`, err);
                nuevosResultados[`opcional-${opcional.codigo_producto}`] = { error: err.message || err.data?.message || "Error en cálculo." };
              })
          );
        } else {
          nuevosResultados[`opcional-${opcional.codigo_producto}`] = { error: paramsOpcional.error || "Datos insuficientes para calcular costo del opcional." };
        }
      }
    }

    await Promise.allSettled(calculosPromises);
    setResultadosCalculados(nuevosResultados);
    setIsLoadingCalculations(false);

    const algunErrorItemCritico = Object.values(nuevosResultados).some(res => res.error && !res.calculados);
    let errorGeneralParaNavegacion = calculationError;

    if (algunErrorItemCritico && !errorGeneralParaNavegacion) {
        const primerError = Object.values(nuevosResultados).find(res => res.error)?.error || "Algunos productos no pudieron ser calculados.";
        setCalculationError(primerError);
        errorGeneralParaNavegacion = primerError;
        return; 
    }
    
    if (itemsParaCotizar.length === 0) {
        onSiguiente();
        return;
    }

    if (!errorGeneralParaNavegacion || Object.values(nuevosResultados).some(r => r.calculados)) {
        const perfilSeleccionadoObj = perfilesCostoList.find(p => p._id === currentSelectedProfileId);
        const nombrePerfilParaMostrar = perfilSeleccionadoObj ? perfilSeleccionadoObj.nombre_perfil : currentSelectedProfileId;

        navigate('/resultados-calculo-costos', { 
            state: { 
                itemsParaCotizar: itemsParaCotizar, 
                resultadosCalculados: nuevosResultados, 
                nombrePerfil: nombrePerfilParaMostrar,
                selectedProfileId: currentSelectedProfileId,
                anoEnCursoGlobal: anoActualParaCalculo
            }
        });
    } else if (errorGeneralParaNavegacion) {
        console.error("Error general impidió el cálculo o la navegación:", errorGeneralParaNavegacion);
    }

  };

  const handleSiguienteClick = async () => {
    if (itemsParaCotizar.length === 0) {
      onSiguiente(); 
      return;
    }
    await handleRealizarCalculos();
  };

  // Estilos (podrían moverse a CSS o unificar)
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' };
  const sectionTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' };
  const tagStyle: React.CSSProperties = { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' };
  const principalTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e3f2fd', color: '#1e88e5' };
  const adicionalesTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e7f5e9', color: '#28a745' };
  const countTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e9ecef', color: '#6c757d', fontWeight: 500 };
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 500, color: '#6c757d', backgroundColor: '#f8f9fa' };
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #eef2f7', color: '#495057', textAlign: 'left' };
  const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' };
  const buttonStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '6px', border: '1px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 500 };
  const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };
  const secondaryButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: 'white', color: '#6c757d', border: '1px solid #dee2e6' };

  // Función interna para manejar el clic en eliminar (adaptada)
  const handleEliminarOpcionalClick = (codigoPrincipal: string | undefined, codigoOpcional: string | undefined) => {
    if (codigoPrincipal && codigoOpcional) {
      onEliminarOpcionalDePrincipal(codigoPrincipal, codigoOpcional);
    }
  };

  // Nueva función para manejar clic en eliminar principal
  const handleEliminarPrincipalClick = (codigoPrincipal: string | undefined) => {
    if (codigoPrincipal) {
      // Podríamos añadir una confirmación aquí si se desea
      // if (window.confirm('¿Está seguro de que desea eliminar este equipo principal y todos sus opcionales de la carga?')) {
      onEliminarPrincipal(codigoPrincipal);
      // }
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Stepper pasoActual={1} />

      <div style={cardStyle}>
         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#343a40', margin: 0, flexGrow: 1 }}>
                Resumen y Configuración de Carga
            </h2>
            <div style={{ minWidth: '250px', marginLeft: '20px' }}>
              {isLoadingPerfiles ? (
                <p style={{ fontStyle: 'italic', color: '#6c757d', margin: 0 }}>Cargando perfiles...</p>
              ) : errorPerfiles ? (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                    <AlertTriangle size={18} style={{ marginRight: '8px' }} />
                    <span>Error: {errorPerfiles}</span>
                </div>
              ) : perfilesCostoList.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#6c757d', margin: 0, fontSize: '13px' }}>No hay perfiles.</p>
              ) : (
                <select
                  id="perfilCostoSelect"
                  title="Seleccionar Perfil de Costo"
                  value={currentSelectedProfileId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setCurrentSelectedProfileId(selectedId === "" ? null : selectedId);
                    if (!selectedId && calculationError === "No se ha seleccionado un perfil de costo.") {
                        setCalculationError(null);
                    }
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px', backgroundColor: 'white' }}
                  disabled={perfilesCostoList.length === 0}
                >
                  <option value="" disabled={currentSelectedProfileId !== null && perfilesCostoList.length > 0}>-- Perfil de Costo --</option>
                  {perfilesCostoList.map(perfil => (
                    <option key={perfil._id} value={perfil._id}>
                      {perfil.nombre_perfil}
                    </option>
                  ))}
                </select>
              )}
            </div>
         </div>

        {calculationError && (
            <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                <AlertTriangle size={20} style={{ marginRight: '10px' }} />
                <span>{calculationError}</span>
            </div>
        )}

        {itemsParaCotizar.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', fontStyle: 'italic'}}>No hay equipos seleccionados para cotizar.</p>
        ) : (
          itemsParaCotizar.map((item, idx) => (
            <div key={item.principal.codigo_producto || idx} style={{ marginBottom: idx < itemsParaCotizar.length - 1 ? '32px' : '0' }}>
              <div style={sectionTitleStyle}>
                <span style={principalTagStyle}>Principal</span>
                <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: '#495057' }}>
                  {item.principal.nombre_del_producto || 'Sin nombre'}
                </h3>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '100px' }}>Código</th>
                      <th style={{ ...thStyle, width: '350px' }}>Nombre</th>
                      <th style={{ ...thStyle, textAlign: 'right', width: '140px' }}>Precio en EUR</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Fecha Cotización</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>{item.principal?.codigo_producto || '-'}</td>
                      <td style={tdStyle}>{item.principal?.nombre_del_producto || '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {item.principal?.datos_contables && typeof item.principal.datos_contables.costo_fabrica === 'number'
                          ? `€${item.principal.datos_contables.costo_fabrica.toLocaleString('de-DE')} ${item.principal.datos_contables.divisa_costo || ''}`
                          : (item.principal?.pf_eur ? `€${Number(item.principal.pf_eur).toLocaleString('de-DE')}` : '-')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{item.principal?.datos_contables?.fecha_cotizacion || '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button 
                          style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} 
                          title="Eliminar Equipo Principal de la Carga"
                          onClick={() => handleEliminarPrincipalClick(item.principal.codigo_producto)}
                        >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {item.opcionales && item.opcionales.length > 0 && (
                <>
                  <div style={sectionTitleStyle}>
                    <span style={adicionalesTagStyle}>Adicionales</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: '#495057' }}>Opcionales Seleccionados</h3>
                    <span style={countTagStyle}>{item.opcionales.length} seleccionados</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '100px' }}>Código</th>
                          <th style={{ ...thStyle, width: '350px' }}>Nombre</th>
                          <th style={{ ...thStyle, textAlign: 'right', width: '140px' }}>Precio en EUR</th>
                          <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Fecha Cotización</th>
                          <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.opcionales.map((opcional, opcionalIndex) => (
                          <tr key={opcional.codigo_producto || opcionalIndex}>
                            <td style={tdStyle}>{opcional.codigo_producto || '-'}</td>
                            <td style={tdStyle}>{opcional.nombre_del_producto || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              {opcional.datos_contables && typeof opcional.datos_contables.costo_fabrica === 'number'
                                ? `€${opcional.datos_contables.costo_fabrica.toLocaleString('de-DE')} ${opcional.datos_contables.divisa_costo || ''}`
                                : (opcional.pf_eur ? `€${Number(opcional.pf_eur).toLocaleString('de-DE')}` : '-')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{opcional.datos_contables?.fecha_cotizacion || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <button 
                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} 
                                title="Eliminar Opcional"
                                onClick={() => handleEliminarOpcionalClick(item.principal.codigo_producto, opcional.codigo_producto)}
                              >
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div style={footerStyle}>
        <button style={secondaryButtonStyle} onClick={onVolver}>
          &larr; Volver
        </button>
        <button 
          style={isLoadingCalculations || (itemsParaCotizar.length > 0 && !currentSelectedProfileId) ? {...primaryButtonStyle, backgroundColor: '#ccc'} : primaryButtonStyle} 
          onClick={handleSiguienteClick} 
          disabled={isLoadingPerfiles || isLoadingCalculations || (itemsParaCotizar.length > 0 && !currentSelectedProfileId)}
          title={
            isLoadingPerfiles ? "Cargando perfiles..." :
            isLoadingCalculations ? "Calculando costos..." :
            itemsParaCotizar.length > 0 && !currentSelectedProfileId ? "Seleccione un perfil de costo primero" :
            itemsParaCotizar.length === 0 ? "Continuar al siguiente paso (no hay items)":
            "Calcular y ver resumen de costos"
          }
        >
          {isLoadingPerfiles ? <><Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} /> Cargando Perfiles...</> :
           isLoadingCalculations ? <><Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} /> Calculando...</> : 
           (itemsParaCotizar.length === 0 ? 'Siguiente \u2192' : 'Calcular y Ver Resumen \u2192')}
        </button>
      </div>
    </div>
  );
} 