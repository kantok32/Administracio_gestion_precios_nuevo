import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Typography } from '@mui/material';

// --- Tipos (deberían idealmente importarse de un archivo types.ts común si no lo están ya) ---
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
    costo_producto: Record<string, number | undefined>;
    logistica_seguro: Record<string, number | undefined>;
    importacion: Record<string, number | undefined>;
    landed_cost: Record<string, number | undefined>;
    conversion_margen: Record<string, number | undefined>;
    precios_cliente: Record<string, number | undefined>;
    // Idealmente, cada sub-objeto tendría tipos más específicos
}

interface CalculationResult {
    inputs?: any; 
    calculados?: GroupedPruebaResults;
    error?: string;
}

interface LocationState {
  itemsParaCotizar: ProductoConOpcionales[];
  resultadosCalculados: Record<string, CalculationResult>;
  selectedProfileId: string | null;
  nombrePerfil?: string;
  anoEnCursoGlobal: number;
}

// --- Helpers de Formato (Similares a PerfilesPanel.tsx) ---
const formatCLP = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return `$ ${value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // Sin decimales para CLP general
};

const formatCLPConDecimales = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return `$ ${value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  };
  // Usar 'en-US' para USD/EUR para asegurar el símbolo correcto y formato de punto/coma
  // o 'de-DE' para EUR si se prefiere el formato europeo.
  return value.toLocaleString(currency === 'EUR' ? 'de-DE' : 'en-US', options);
};

const formatPercentDisplay = (value: number | null | undefined, digits = 4): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return `${(value * 100).toFixed(digits)}%`;
};

const formatNumber = (value: number | null | undefined, digits = 4): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(digits);
};

// --- Labels para los campos (para que coincidan con tu ejemplo) ---
const inputLabels: Record<string, string> = {
    anoCotizacion: "Año Cotización",
    anoEnCurso: "Año en Curso",
    costoFabricaOriginalEUR: "Costo Fábrica Original EUR",
    tipoCambioEurUsdActual: "TC EUR/USD Actual (Input)", // Distinguir del aplicado
    tipoCambioUsdClpActual: "TC USD/CLP Actual (Input)", // Distinguir del aplicado
    buffer_eur_usd_pct: "Buffer EUR/USD (Perfil)",
    descuento_fabrica_pct: "Descuento Fábrica (Perfil)",
    costo_logistica_origen_eur: "Costo Origen EUR (Perfil)", // Nombre del campo en CostoPerfil.js
    flete_maritimo_usd: "Flete Marítimo USD (Perfil)",
    recargos_destino_usd: "Recargos Destino USD (Perfil)",
    tasa_seguro_pct: "Tasa Seguro % (Perfil)",
    costo_agente_aduana_usd: "Costo Agente Aduana USD (Perfil)",
    gastos_portuarios_otros_usd: "Gastos Portuarios Otros USD (Perfil)",
    transporte_nacional_clp: "Transporte Nacional CLP (Perfil)",
    buffer_usd_clp_pct: "Buffer USD/CLP % (Perfil)",
    margen_adicional_pct: "Margen Adicional % (Perfil)",
    descuento_cliente_pct: "Descuento Cliente % (Perfil)",
    derecho_advalorem_pct: "Derecho AdValorem % (Perfil)", // Aunque se usa 0.06, el perfil lo tiene
    iva_pct: "IVA % (Perfil)" // Aunque se usa 0.19, el perfil lo tiene
};

const apiValuesLabels: Record<string, string> = {
    tipo_cambio_usd_clp_actual: "TC USD/CLP Actual (API)",
    tipo_cambio_eur_usd_actual: "TC EUR/USD Actual (API)",
};

const sectionLabels: Record<string, Record<string, string>> = {
    costo_producto: {
        factorActualizacion: "Factor Actualización",
        costoFabricaActualizadoEUR: "Costo Fáb. Act. EUR (Antes Desc.)",
        costoFinalFabricaEUR_EXW: "Costo Fábrica Descontado EUR EXW", // Ajustado para tu ejemplo
        tipoCambioEurUsdAplicado: "TC EUR/USD Aplicado",
        costoFinalFabricaUSD_EXW: "Costo Final Fáb. USD (EXW)"
    },
    logistica_seguro: {
        costosOrigenUSD: "Costos en Origen (USD)",
        costoTotalFleteManejosUSD: "Costo Total Flete y Manejos (USD)",
        baseParaSeguroUSD: "Base para Seguro (CFR Aprox - USD)",
        primaSeguroUSD: "Prima Seguro (USD)",
        totalTransporteSeguroEXW_USD: "Total Transporte y Seguro EXW (USD)" // Nombre largo pero descriptivo
    },
    importacion: {
        valorCIF_USD: "Valor CIF (USD)",
        derechoAdvaloremUSD: "Derecho AdValorem (USD)",
        baseIvaImportacionUSD: "Base IVA Importación (USD)",
        ivaImportacionUSD: "IVA Importación (USD)",
        totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)" // Nombre largo
    },
    landed_cost: {
        transporteNacionalUSD: "Transporte Nacional (USD)",
        precioNetoCompraBaseUSD_LandedCost: "Precio Neto Compra Base (USD) - Landed Cost"
    },
    conversion_margen: {
        tipoCambioUsdClpAplicado: "Tipo Cambio USD/CLP Aplicado",
        precioNetoCompraBaseCLP: "Precio Neto Compra Base (CLP)",
        margenCLP: "Margen (CLP)",
        precioVentaNetoCLP: "Precio Venta Neto (CLP)"
    },
    precios_cliente: {
        precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)",
        ivaVentaCLP: "IVA Venta (19%) (CLP)",
        precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)"
    }
};

const RenderResultDetails: React.FC<{ result: CalculationResult }> = ({ result }) => {
    if (result.error) {
        return <Typography style={{ color: 'red', fontWeight: 'bold' }}>Error en cálculo: {result.error}</Typography>;
    }
    if (!result.calculados || !result.inputs) {
        return <Typography>Datos de cálculo incompletos.</Typography>;
    }

    const { calculados, inputs } = result;

    // Función para renderizar una sección específica
    const renderSection = (title: string, data: Record<string, number | undefined> | undefined, labels: Record<string, string>) => {
        if (!data || Object.keys(data).length === 0) return null;
        return (
            <div style={{ marginBottom: '15px' }}>
                <Typography variant="h6" component="h4" style={{ fontSize: '1em', fontWeight: '600', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>{title}</Typography>
                {Object.entries(data).map(([key, value]) => {
                    const label = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    let formattedValue = '--';
                    if (typeof value === 'number') {
                        if (key.toLowerCase().includes('_clp')) formattedValue = formatCLP(value);
                        else if (key.toLowerCase().endsWith('_eur')) formattedValue = formatGenericCurrency(value, 'EUR');
                        else if (key.toLowerCase().endsWith('_usd')) formattedValue = formatGenericCurrency(value, 'USD');
                        else if (key.toLowerCase().includes('_pct') || key.toLowerCase().startsWith('tasa_') || key.toLowerCase().includes('factor') || key.toLowerCase().includes('margen_adicional_pct') || key.toLowerCase().includes('descuento_cliente_pct')) formattedValue = formatPercentDisplay(value);
                        else if (key.toLowerCase().includes('tipo_cambio') || key.toLowerCase().includes('tipocambio')) formattedValue = formatNumber(value, 6);
                        else formattedValue = formatNumber(value, 2); // Default a 2 decimales para otros números
                    } else if (value === undefined && inputs[key] !== undefined) {
                         // Caso especial para inputs que podrían no estar en `calculados` pero sí en `inputs`.
                        const inputValue = inputs[key];
                        if (typeof inputValue === 'number') {
                            if (key.toLowerCase().includes('_clp')) formattedValue = formatCLP(inputValue);
                            else if (key.toLowerCase().endsWith('_eur')) formattedValue = formatGenericCurrency(inputValue, 'EUR');
                            else if (key.toLowerCase().endsWith('_usd')) formattedValue = formatGenericCurrency(inputValue, 'USD');
                            else if (key.toLowerCase().includes('_pct') || key.toLowerCase().startsWith('tasa_')) formattedValue = formatPercentDisplay(inputValue/100); // Asumir que los inputs % de perfil vienen como 10, no 0.1
                            else formattedValue = formatNumber(inputValue, 2);
                        } else {
                            formattedValue = String(inputValue); 
                        }
                    }
                    return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', marginBottom: '3px' }}>
                            <Typography component="span">{label}:</Typography>
                            <Typography component="span" style={{ fontWeight: '500' }}>{formattedValue}</Typography>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
            {renderSection("Costo de Producto", calculados.costo_producto, sectionLabels.costo_producto || {})}
            {renderSection("Logística y Seguro (EXW a Chile)", calculados.logistica_seguro, sectionLabels.logistica_seguro || {})}
            {renderSection("Costos de Importación", calculados.importacion, sectionLabels.importacion || {})}
            {renderSection("Costo puesto en Bodega (Landed Cost)", calculados.landed_cost, sectionLabels.landed_cost || {})}
            {renderSection("Conversión a CLP y Margen", calculados.conversion_margen, sectionLabels.conversion_margen || {})}
            {renderSection("Precios para Cliente", calculados.precios_cliente, sectionLabels.precios_cliente || {})}
        </div>
    );
};


export default function ResultadosCalculoCostosPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const [isLoading, setIsLoading] = useState(false); // Mantener por si se usa para alguna precarga futura, aunque la acción principal cambia

  // Estado para controlar qué items PRINCIPALES están expandidos
  const [expandedPrincipales, setExpandedPrincipales] = useState<Record<string, boolean>>({});
  // Estado para controlar qué items OPCIONALES están expandidos (clave: principalId_opcionalId)
  const [expandedOpcionales, setExpandedOpcionales] = useState<Record<string, boolean>>({});

  // Función para cambiar el estado de expansión de un item PRINCIPAL
  const toggleExpandPrincipal = (principalKey: string) => {
    setExpandedPrincipales(prev => ({
      ...prev,
      [principalKey]: !prev[principalKey]
    }));
    // Opcional: Contraer todos los opcionales de este principal si el principal se contrae
    if (expandedPrincipales[principalKey]) {
      const newOpcionalesExpanded = { ...expandedOpcionales };
      Object.keys(newOpcionalesExpanded).forEach(key => {
        if (key.startsWith(principalKey + '_')) {
          delete newOpcionalesExpanded[key];
        }
      });
      setExpandedOpcionales(newOpcionalesExpanded);
    }
  };

  // Función para cambiar el estado de expansión de un item OPCIONAL
  const toggleExpandOpcional = (opcionalKey: string) => {
    setExpandedOpcionales(prev => ({
      ...prev,
      [opcionalKey]: !prev[opcionalKey]
    }));
  };

  if (!state || !state.itemsParaCotizar || !state.resultadosCalculados) {
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="orange" style={{ marginBottom: '20px' }}/>
            <Typography variant="h5" gutterBottom>Error</Typography>
            <Typography variant="body1">
                No se encontraron datos de cálculo. Por favor, vuelva a la página anterior e inténtelo de nuevo.
            </Typography>
            <Button variant="contained" onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>
                Volver
            </Button>
        </div>
    );
  }

  const { itemsParaCotizar, resultadosCalculados, selectedProfileId, nombrePerfil, anoEnCursoGlobal } = state;
  
  // --- INICIO: Calcular Totales Agregados por Tipo (Principal/Opcional) ---
  const inicializarTotales = () => ({
    costoTotalFabricaUSD_EXW: 0,
    landedCostTotalUSD: 0,
    precioVentaNetoTotalCLP: 0,
    precioVentaTotalClienteCLP: 0,
    itemsCalculadosConExito: 0,
  });

  const totalesPrincipales = inicializarTotales();
  const totalesOpcionales = inicializarTotales();

  Object.entries(resultadosCalculados).forEach(([key, result]) => {
    if (result.calculados && !result.error) {
      const targetObject = key.startsWith('principal-') ? totalesPrincipales : 
                           key.startsWith('opcional-') ? totalesOpcionales : null;
      
      if (targetObject) {
        targetObject.itemsCalculadosConExito++;
        if (result.calculados.costo_producto?.costoFinalFabricaUSD_EXW) {
          targetObject.costoTotalFabricaUSD_EXW += result.calculados.costo_producto.costoFinalFabricaUSD_EXW;
        }
        if (result.calculados.landed_cost?.precioNetoCompraBaseUSD_LandedCost) {
          targetObject.landedCostTotalUSD += result.calculados.landed_cost.precioNetoCompraBaseUSD_LandedCost;
        }
        if (result.calculados.precios_cliente?.precioNetoVentaFinalCLP) {
          targetObject.precioVentaNetoTotalCLP += result.calculados.precios_cliente.precioNetoVentaFinalCLP;
        }
        if (result.calculados.precios_cliente?.precioVentaTotalClienteCLP) {
          targetObject.precioVentaTotalClienteCLP += result.calculados.precios_cliente.precioVentaTotalClienteCLP;
        }
      }
    }
  });
  // --- FIN: Calcular Totales Agregados por Tipo ---

  // Estilos generales para esta página
  const pageStyle: React.CSSProperties = { padding: '24px', maxWidth: '1200px', margin: '0 auto' };
  const headerStyle: React.CSSProperties = { marginBottom: '24px', paddingBottom: '10px', borderBottom: '1px solid #ddd' };
  const itemCardStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '24px' };
  const footerNavStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' };
  const primaryButtonStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '6px', border: '1px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 500, backgroundColor: '#1e88e5', color: 'white' };
  const secondaryButtonStyle: React.CSSProperties = { ...primaryButtonStyle, backgroundColor: '#6c757d' }; 
  const itemHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '10px 0' };
  const itemTitleStyle: React.CSSProperties = { fontSize: '1.2em', fontWeight: '600', color: '#343a40' };

  const handleNavegarAConfiguracion = () => {
    if (!state) {
      console.error("Error: No hay estado disponible para pasar a la configuración.");
      alert("Error: No hay datos para configurar la cotización. Por favor, vuelve a intentarlo.");
      return;
    }

    const {
      itemsParaCotizar,
      resultadosCalculados,
      selectedProfileId,
      nombrePerfil,
      anoEnCursoGlobal
    } = state;

    if (!itemsParaCotizar || Object.keys(resultadosCalculados).length === 0) {
        console.error("Error: itemsParaCotizar o resultadosCalculados están vacíos.");
        alert("Error: No hay items o resultados calculados para configurar.");
        return;
    }
    
    // Navegar a la nueva página de configuración, pasando el estado actual
    navigate('/configuracion-panel', {
      state: {
        itemsParaCotizar,
        resultadosCalculados,
        selectedProfileId,
        nombrePerfil,
        anoEnCursoGlobal
      }
    });
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <Typography variant="h4" component="h1" gutterBottom style={{ fontWeight: 600 }}>
          Resultados del Cálculo de Costos
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Perfil de Costo Aplicado: {nombrePerfil || selectedProfileId || 'No especificado'} | Año en Curso: {anoEnCursoGlobal || 'N/A'}
        </Typography>
      </div>

      {/* --- INICIO: Sección de Resumen de Totales por Tipo --- */}
      {(totalesPrincipales.itemsCalculadosConExito > 0 || totalesOpcionales.itemsCalculadosConExito > 0) && (
        <div style={{ ...itemCardStyle, backgroundColor: '#eef2f9', borderLeft: '5px solid #1e88e5', marginBottom: '28px', padding: '20px' }}>
          <Typography variant="h6" component="h2" gutterBottom style={{ color: '#1e88e5', fontWeight: 500, marginBottom: '20px' }}>
            Resumen General de la Carga
          </Typography>
          
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', color: '#333', fontWeight: 600, borderBottom: '2px solid #1e88e5', width: '40%' }}>Concepto de Costo</th>
                <th style={{ padding: '10px 8px', color: '#333', fontWeight: 600, borderBottom: '2px solid #1e88e5', textAlign: 'right', width: '30%' }}>
                  Total Principales ({totalesPrincipales.itemsCalculadosConExito})
                </th>
                <th style={{ padding: '10px 8px', color: '#333', fontWeight: 600, borderBottom: '2px solid #1e88e5', textAlign: 'right', width: '30%' }}>
                  Total Opcionales ({totalesOpcionales.itemsCalculadosConExito})
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Costo Total Fábrica (EXW)", principal: totalesPrincipales.costoTotalFabricaUSD_EXW, opcional: totalesOpcionales.costoTotalFabricaUSD_EXW, format: (val: number) => formatGenericCurrency(val, 'USD') },
                { label: "Landed Cost Total Estimado", principal: totalesPrincipales.landedCostTotalUSD, opcional: totalesOpcionales.landedCostTotalUSD, format: (val: number) => formatGenericCurrency(val, 'USD') },
                { label: "Precio Venta Neto Total", principal: totalesPrincipales.precioVentaNetoTotalCLP, opcional: totalesOpcionales.precioVentaNetoTotalCLP, format: formatCLP },
                { label: "Precio Venta Total Cliente (IVA Incl.)", principal: totalesPrincipales.precioVentaTotalClienteCLP, opcional: totalesOpcionales.precioVentaTotalClienteCLP, format: formatCLP, isBold: true },
              ].map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  <td style={{ padding: '10px 8px', fontWeight: row.isBold ? 600 : 500, color: row.isBold ? '#1e88e5' : '#444' }}>{row.label}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: row.isBold ? 600 : 500, color: row.isBold ? '#1e88e5' : '#444' }}>
                    {row.format(row.principal)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: row.isBold ? 600 : 500, color: row.isBold ? '#1e88e5' : '#444' }}>
                    {row.format(row.opcional)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* --- FIN: Sección de Resumen de Totales por Tipo --- */}

      {itemsParaCotizar.length === 0 && (
        <Typography>No se procesaron items para cotizar.</Typography>
      )}

      {itemsParaCotizar.map((item, index) => {
        const principalProductKey = item.principal.codigo_producto || `principal-${index}`;
        const resultadoPrincipal = resultadosCalculados[`principal-${item.principal.codigo_producto}`];
        const isPrincipalExpanded = !!expandedPrincipales[principalProductKey];

        return (
          <div key={principalProductKey} style={itemCardStyle}>
            <div 
              style={itemHeaderStyle} 
              onClick={() => toggleExpandPrincipal(principalProductKey)}
            >
              <Typography variant="h6" component="h3" style={itemTitleStyle}>{item.principal.nombre_del_producto || 'Producto Principal Sin Nombre'}</Typography>
              {isPrincipalExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>

            {isPrincipalExpanded && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                {resultadoPrincipal ? (
                  <RenderResultDetails result={resultadoPrincipal} />
                ) : (
                  <Typography style={{ color: 'orange' }}>No se encontraron resultados para este producto principal.</Typography>
                )}

                {item.opcionales && item.opcionales.length > 0 && (
                  <div style={{ marginTop: '20px', paddingLeft: '10px' }}> {/* Ligero indentado para opcionales */}
                    <Typography variant="subtitle1" component="h4" style={{ fontSize: '1.1em', fontWeight: '600', color: '#495057', marginBottom: '10px' }}>Opcionales:</Typography>
                    {item.opcionales.map((opcional, opcionalIndex) => {
                      const opcionalProductKey = opcional.codigo_producto || `opcional-${opcionalIndex}`;
                      const opcionalUniqueKey = `${principalProductKey}_${opcionalProductKey}`;
                      const resultadoOpcional = resultadosCalculados[`opcional-${opcional.codigo_producto}`];
                      const isOpcionalExpanded = !!expandedOpcionales[opcionalUniqueKey];

                      return (
                        <div key={opcionalUniqueKey} style={{ marginBottom: '15px', marginLeft:'10px', borderLeft: '2px solid #f0f0f0', paddingLeft:'15px' }}>
                           <div 
                            style={{...itemHeaderStyle, padding: '5px 0'}} // Estilo más compacto para opcionales
                            onClick={() => toggleExpandOpcional(opcionalUniqueKey)}
                          >
                            <Typography variant="subtitle2" component="h5" style={{ fontSize: '1em', fontWeight: '500', color: '#555' }}>{opcional.nombre_del_producto || 'Opcional Sin Nombre'}</Typography>
                            {isOpcionalExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                          {isOpcionalExpanded && (
                            <div style={{marginTop: '10px'}}>
                                {resultadoOpcional ? (
                                <RenderResultDetails result={resultadoOpcional} />
                                ) : (
                                <Typography style={{ color: 'orange' }}>No se encontraron resultados para este opcional.</Typography>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={footerNavStyle}>
        <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/equipos')} /* style={secondaryButtonStyle} */ >
          Volver y Modificar
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleNavegarAConfiguracion}
          disabled={isLoading}
          style={{ marginTop: '20px', padding: '10px 20px' }}
          startIcon={isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        >
          Configurar Cotización y Datos Adicionales
        </Button>
      </div>
    </div>
  );
} 