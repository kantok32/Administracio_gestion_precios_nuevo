import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Calculator, ListTree, DollarSign, CloudOff, FileText } from 'lucide-react';
import {
  Button, Typography, Paper, Box, Container, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, SelectChangeEvent,
  Accordion, AccordionSummary, AccordionDetails, Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getPerfiles } from '../services/perfilService';
import { guardarCalculoHistorial, CotizacionDetails } from '../services/calculoHistorialService';
import {
    ProductoConOpcionales,
    CalculationResult,
    LocationState,
    LineaDeTrabajoConCosto
} from '../types/calculoTypes';
import { CostoPerfilData } from '../types';
import { Producto } from '../types/product';

// --- Tipos (deberían idealmente importarse de un archivo types.ts común si no lo están ya) ---
interface DatosContables {
    costo_fabrica?: number;
    divisa_costo?: string;
    fecha_cotizacion?: string;
    [key: string]: any;
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

// --- Helpers de Formato (Similares a PerfilesPanel.tsx) ---
const formatCurrency = (value: number | null | undefined, currencySymbol: string = '€') => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${currencySymbol}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
        precioVentaNetoCLP: "Precio Venta Neto (CLP)",
        precioVentaNetoCLP_AntesDescCliente: "Precio Venta Neto (CLP) (Antes Desc. Cliente)"
    },
    precios_cliente: {
        descuentoClienteCLP: "Descuento Cliente (CLP)",
        precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)",
        ivaVentaCLP: "IVA Venta (19%) (CLP)",
        precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)"
    }
};

const RenderResultDetails: React.FC<{ detalle: CalculationResult | null, profile: CostoPerfilData | null }> = ({ detalle, profile }) => {
    if (!detalle) {
        return <Typography variant="body2" color="textSecondary">Seleccione un perfil para ver el cálculo detallado.</Typography>;
    }
    if (detalle.error) {
        return <Alert severity="error">Error en el cálculo: {detalle.error}</Alert>;
    }
    const profileNameFromCalc = detalle.profileName;
    const currentProfileName = profile?.nombre_perfil;
    const displayProfileName = currentProfileName || profileNameFromCalc || "Perfil Desconocido";
    const displayProfileId = profile?._id || "ID Desconocido"; 
    const inputs = detalle.inputs;
    const calculados = detalle.calculados;
    if (!inputs || !calculados) {
        return <Alert severity="warning">Datos del cálculo detallado incompletos o en formato inesperado.</Alert>;
    }
    const formatValue = (value: any, key: string): string => {
                    if (typeof value === 'number') {
            if (key.toLowerCase().includes('_clp')) return formatCLP(value);
            else if (key.toLowerCase().endsWith('_eur')) return formatGenericCurrency(value, 'EUR');
            else if (key.toLowerCase().endsWith('_usd')) return formatGenericCurrency(value, 'USD');
            else if (key.toLowerCase().includes('_pct') || key.toLowerCase().startsWith('tasa_') || key.toLowerCase().includes('factor') || key.toLowerCase().includes('margen_adicional_pct') || key.toLowerCase().includes('descuento_cliente_pct')) return formatPercentDisplay(value);
            else if (key.toLowerCase().includes('tipo_cambio') || key.toLowerCase().includes('tipocambio')) return formatNumber(value, 6);
            else return formatNumber(value, 2);
                    } else if (value === undefined && inputs[key] !== undefined) {
                        const inputValue = inputs[key];
                        if (typeof inputValue === 'number') {
                if (key.toLowerCase().includes('_clp')) return formatCLP(inputValue);
                else if (key.toLowerCase().endsWith('_eur')) return formatGenericCurrency(inputValue, 'EUR');
                else if (key.toLowerCase().endsWith('_usd')) return formatGenericCurrency(inputValue, 'USD');
                else if (key.toLowerCase().includes('_pct') || key.toLowerCase().startsWith('tasa_')) return formatPercentDisplay(inputValue/100);
                else return formatNumber(inputValue, 2);
                        } else {
                return String(inputValue); 
            }
        }
        return '--';
    };

    return (
        <Box sx={{ mt: 2, p: 2, border: '1px dashed grey' }}>
            <Typography variant="h6" gutterBottom>
                Detalle del Cálculo (Perfil: {displayProfileName} - ID: {displayProfileId})
            </Typography>

            {/* Sección de Inputs Utilizados */}
            <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ width: '40%', flexShrink: 0, fontWeight: 'medium' }}>Campo (Input)</Typography>
                    <Typography sx={{ color: 'text.secondary' }}>Valor Utilizado</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={1}>
                        {Object.entries(inputs).map(([key, value]) => (
                            <React.Fragment key={`input-${key}`}>
                                <Grid item xs={6}><Typography variant="body2"><em>{inputLabels[key] || key}:</em></Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">{formatValue(value, key)}</Typography></Grid>
                            </React.Fragment>
                        ))}
                        {/* Mostrar los parámetros del perfil que se usaron */}
                        {profile && (
                            <>
                                <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Parámetros del Perfil Aplicado:</Typography></Grid>
                                {Object.entries(profile).map(([key, value]) => {
                                    // No mostrar _id, nombre_perfil, descripcion_perfil aquí si ya se muestran arriba o no son numéricos relevantes
                                    if (key === '_id' || key === 'nombre_perfil' || key === 'descripcion_perfil' || key === 'createdAt' || key === 'updatedAt' || key === '__v' || key === 'activo') {
                                        return null;
                                    }
                                    // Si es un campo _pct, mostrar como porcentaje
                                    const displayValue = key.endsWith('_pct') ? `${(Number(value) * 100).toFixed(2)}%` : formatValue(value, key);
                                    return (
                                        <React.Fragment key={`profile-param-${key}`}>
                                            <Grid item xs={6}><Typography variant="body2" color="text.secondary"><em>{inputLabels[key] || key}:</em></Typography></Grid>
                                            <Grid item xs={6}><Typography variant="body2" color="text.secondary">{displayValue}</Typography></Grid>
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Sección de Resultados Calculados por Etapa */}
            {Object.entries(calculados).map(([stageName, stageValues]) => (
                <Accordion key={stageName} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ width: '40%', flexShrink: 0, fontWeight: 'medium' }}>{apiValuesLabels[stageName] || stageName.replace(/_/g, ' ')}</Typography>
                        {/* Mostrar algún valor consolidado si aplica, ej: Precio Lista Final CLP */}
                        {stageName === "PRECIOS_CLIENTE" && stageValues.precio_lista_final_clp_iva_incl && (
                             <Typography sx={{ color: 'text.secondary' }}>
                                Precio Lista Final: {formatValue(stageValues.precio_lista_final_clp_iva_incl, 'clp')}
                            </Typography>
                        )}
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={1}>
                            {Object.entries(stageValues).map(([key, value]) => (
                                <React.Fragment key={`${stageName}-${key}`}>
                                    <Grid item xs={6}><Typography variant="body2"><em>{apiValuesLabels[key] || key.replace(/_/g, ' ')}:</em></Typography></Grid>
                                    <Grid item xs={6}><Typography variant="body2">{formatValue(value, key)}</Typography></Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            ))}

        </Box>
    );
};

// --- Nueva función para llamar al API de cálculo --- (Modificada)
const fetchCalculoDetallado = async (
  costoFabricaOriginalEUR: number,
  fechaCotizacionStr: string | undefined,
  profileId: string,
  anoEnCurso: number,
  tcEurUsd: number,
  nombrePerfil: string
): Promise<CalculationResult> => {
  
  let parsedYear: number | undefined;
  if (fechaCotizacionStr && /^\d{4}$/.test(fechaCotizacionStr)) { // Es un string de 4 dígitos (ej: "2023")
    parsedYear = parseInt(fechaCotizacionStr, 10);
  } else if (fechaCotizacionStr) { // Intenta parsear como fecha más completa
    const dateObj = new Date(fechaCotizacionStr);
    // Verificar si el objeto Date es válido y getFullYear() devuelve un número
    if (dateObj instanceof Date && !isNaN(dateObj.valueOf()) && !isNaN(dateObj.getFullYear())) {
      parsedYear = dateObj.getFullYear();
    } else {
        console.warn(`[fetchCalculoDetallado] fechaCotizacionStr "${fechaCotizacionStr}" no pudo ser parseada a una fecha válida.`);
    }
  }

  const anoCotizacion = parsedYear !== undefined ? parsedYear : anoEnCurso - 1;

  const payload = {
    profileId: profileId,
    anoCotizacion: anoCotizacion, 
    anoEnCurso: anoEnCurso,
    costoFabricaOriginalEUR: costoFabricaOriginalEUR,
    tipoCambioEurUsdActual: tcEurUsd,
  };

  console.log('[ResultadosCalculoCostosPanel] Enviando payload a /api/costo-perfiles/calcular-producto:', payload);

  try {
    const response = await fetch('/api/costo-perfiles/calcular-producto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[ResultadosCalculoCostosPanel] Error API:', data);
      throw new Error(data.message || `Error ${response.status} al calcular costos.`);
    }
    if (data && data.resultado && data.resultado.inputs && data.resultado.calculados) {
      return {
        inputs: data.resultado.inputs,
        calculados: data.resultado.calculados,
        profileName: data.perfilUsado?.nombre_perfil || data.perfilUsado?.nombre || nombrePerfil, 
      };
    } else {
      console.error('[ResultadosCalculoCostosPanel] Respuesta API inesperada:', data);
      throw new Error('La respuesta del servidor no tiene el formato esperado.');
    }
  } catch (error: any) {
    console.error('[ResultadosCalculoCostosPanel] Catch Fetch Error:', error);
    return {
      error: error.message || 'Error de conexión o al procesar la respuesta del cálculo.',
      profileName: nombrePerfil,
    };
  }
};

// Nueva función para transformar los datos para ConfiguracionPanel
function transformarLineasParaConfiguracion(lineas: LineaDeTrabajoConCosto[], nombrePerfilFallback?: string): Record<string, CalculationResult> {
  const resultados: Record<string, CalculationResult> = {};
  lineas.forEach(linea => {
    const keyPrincipal = `principal-${linea.principal.codigo_producto || `P_ID_DESCONOCIDO_${Math.random().toString(36).substring(7)}`}`;
    const fallbackProfileNamePrincipal = linea.detalleCalculoPrincipal?.profileName || nombrePerfilFallback;
    resultados[keyPrincipal] = linea.detalleCalculoPrincipal || { 
      error: "Detalle de cálculo principal no disponible.", 
      profileName: typeof fallbackProfileNamePrincipal === 'string' ? fallbackProfileNamePrincipal : "Perfil no especificado"
    };

    linea.opcionales.forEach((opcional, idx) => {
      const keyOpcional = `opcional-${opcional.codigo_producto || `O_ID_DESCONOCIDO_${idx}_${Math.random().toString(36).substring(7)}`}`;
      const detalleOpcional = linea.detallesCalculoOpcionales?.[idx];
      const fallbackProfileNameOpcional = detalleOpcional?.profileName || nombrePerfilFallback;
      resultados[keyOpcional] = detalleOpcional || { 
        error: `Detalle de cálculo para opcional ${opcional.nombre_del_producto || idx+1} no disponible.`, 
        profileName: typeof fallbackProfileNameOpcional === 'string' ? fallbackProfileNameOpcional : "Perfil no especificado"
      };
    });
  });
  return resultados;
}

export default function ResultadosCalculoCostosPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [lineasCalculadas, setLineasCalculadas] = useState<LineaDeTrabajoConCosto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [savedCalculoId, setSavedCalculoId] = useState<string | null>(null);
  const [latestCalculatedResults, setLatestCalculatedResults] = useState<Record<string, CalculationResult> | null>(null);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [perfilesList, setPerfilesList] = useState<CostoPerfilData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(state?.selectedProfileId || '');
  const [currentProfileData, setCurrentProfileData] = useState<CostoPerfilData | null>(null);
  const [isProfilesLoading, setIsProfilesLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const anoActualGlobal = new Date().getFullYear();

  useEffect(() => {
    const cargarPerfilesDesdeAPI = async () => {
        setIsProfilesLoading(true);
        setProfileError(null);
        try {
          const data = await getPerfiles(); 
          setPerfilesList(data || []); 
          let initialProfileIdToSelect = state?.selectedProfileId || '';
          if (!initialProfileIdToSelect && data && data.length > 0) {
            initialProfileIdToSelect = data[0]._id;
          }
          if (initialProfileIdToSelect) {
            const perfilPreseleccionado = data.find((p: CostoPerfilData) => p._id === initialProfileIdToSelect);
            if (perfilPreseleccionado) {
              setCurrentProfileData(perfilPreseleccionado);
              setSelectedProfileId(initialProfileIdToSelect);
            } else if (data && data.length > 0) {
              setCurrentProfileData(data[0]);
              setSelectedProfileId(data[0]._id);
            }
          }
        } catch (err: any) {
          console.error("[ResultadosCalculoCostosPanel] Error cargando perfiles:", err);
          setProfileError(err.message || "No se pudieron cargar los perfiles de costo.");
          setPerfilesList([]);
        } finally {
          setIsProfilesLoading(false);
          setIsLoading(false);
        }
      };
      cargarPerfilesDesdeAPI();
  }, [state?.selectedProfileId]);

  useEffect(() => {
    if (!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0) {
      setErrorCarga("No se recibieron datos de configuración. Por favor, vuelva a la selección de equipos.");
      setLineasCalculadas([]);
      setIsLoading(false);
      return;
    }
    const productosParaProcesar = Array.isArray(state.productosConOpcionalesSeleccionados) ? state.productosConOpcionalesSeleccionados : [];
    const lineasBase = productosParaProcesar.map((item: ProductoConOpcionales) => {
      let costoBaseTotal = item.principal.datos_contables?.costo_fabrica || 0;
      item.opcionales.forEach((opcional: Producto) => {
        costoBaseTotal += opcional.datos_contables?.costo_fabrica || 0;
      });
      return {
        ...item,
        costoBaseTotalEur: costoBaseTotal,
        detalleCalculoPrincipal: undefined, 
        detallesCalculoOpcionales: undefined,
        precioVentaTotalClienteCLPPrincipal: undefined,
      };
    });
    setLineasCalculadas(lineasBase);
    setSavedCalculoId(null);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setIsLoading(false);
  }, [state?.productosConOpcionalesSeleccionados]);
  
  const realizarCalculoDetallado = useCallback(async (lineasParaCalcular: LineaDeTrabajoConCosto[]): Promise<LineaDeTrabajoConCosto[] | null> => {
    if (!currentProfileData || lineasParaCalcular.length === 0) {
        setErrorCarga("Seleccione un perfil y asegúrese de que haya productos cargados para calcular.");
        return null; 
    }

    setErrorCarga(null);
    setSaveSuccessMessage(null); 
    setSaveErrorMessage(null);
    setSavedCalculoId(null);

    const tcEurUsdActual = 1.117564; 

    const getFechaCotizacionAsString = (fecha: string | Date | undefined): string | undefined => {
        if (typeof fecha === 'string' || fecha === undefined) return fecha;
        if (fecha instanceof Date) return fecha.toISOString();
        return undefined;
    };

    try {
      const lineasConDetallePromises = lineasParaCalcular.map(async (lineaExistente) => {
        const detallePrincipal = await fetchCalculoDetallado(
          lineaExistente.principal.datos_contables?.costo_fabrica || 0,
          getFechaCotizacionAsString(lineaExistente.principal.datos_contables?.fecha_cotizacion),
          currentProfileData._id,
          anoActualGlobal,
          tcEurUsdActual,
          currentProfileData.nombre_perfil
        );

        let detallesOpcionalesResultados: CalculationResult[] | undefined = undefined;
        if (lineaExistente.opcionales && lineaExistente.opcionales.length > 0) {
            const detallesOpcPromises = lineaExistente.opcionales.map(opcional => 
              fetchCalculoDetallado(
                opcional.datos_contables?.costo_fabrica || 0,
                getFechaCotizacionAsString(opcional.datos_contables?.fecha_cotizacion),
                currentProfileData._id,
                anoActualGlobal,
                tcEurUsdActual,
                currentProfileData.nombre_perfil
              )
            );
            detallesOpcionalesResultados = await Promise.all(detallesOpcPromises);
        }
        
        const precioCLPPrincipal = detallePrincipal?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;

        return {
          ...lineaExistente,
          detalleCalculoPrincipal: detallePrincipal,
          detallesCalculoOpcionales: detallesOpcionalesResultados,
          precioVentaTotalClienteCLPPrincipal: typeof precioCLPPrincipal === 'number' ? precioCLPPrincipal : undefined,
        };
      });

      return await Promise.all(lineasConDetallePromises);
    } catch (error: any) {
      console.error("[ResultadosCalculoCostosPanel] Error en realizarCalculoDetallado (Promise.all):", error);
      setErrorCarga(error.message || "Ocurrió un error durante el cálculo detallado.");
      return null; 
    }
  }, [currentProfileData, anoActualGlobal]);

  const handleCalcularYGuardar = async () => {
    if (!currentProfileData) {
      setSaveErrorMessage("Por favor, seleccione un perfil de costo primero.");
      return;
    }
    const lineasActualesParaCalculo = [...lineasCalculadas]; 

    if (!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0 || lineasActualesParaCalculo.length === 0) {
        setSaveErrorMessage("No hay productos para calcular y guardar.");
        return;
    }

    setIsCalculating(true); 
    setIsSaving(true); 
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setSavedCalculoId(null);
    setErrorCarga(null);

    const nuevasLineasConDetalles = await realizarCalculoDetallado(lineasActualesParaCalculo);

    if (!nuevasLineasConDetalles) {
      setIsCalculating(false); 
      setIsSaving(false);
      setSaveErrorMessage(errorCarga || "Falló la etapa de cálculo. No se guardó.");
      return;
    }
    
    setLineasCalculadas(nuevasLineasConDetalles);

    const resultadosParaGuardar = transformarLineasParaConfiguracion(nuevasLineasConDetalles, currentProfileData.nombre_perfil);
    setLatestCalculatedResults(resultadosParaGuardar);

    const cotizacionDetailsMinimos: CotizacionDetails = {
        clienteNombre: null, 
        empresaQueCotiza: "Nombre Empresa Ejemplo", // TODO: Obtener de configuración global o datos de usuario
        emisorNombre: undefined,
    };

    if (!state.productosConOpcionalesSeleccionados) {
        setIsSaving(false);
        setIsCalculating(false);
        setSaveErrorMessage("Error interno: productosConOpcionalesSeleccionados es nulo.");
        return;
    }

    const payload = {
        itemsParaCotizar: state.productosConOpcionalesSeleccionados, 
        resultadosCalculados: resultadosParaGuardar,
        selectedProfileId: currentProfileData._id,
        nombrePerfil: currentProfileData.nombre_perfil,
        anoEnCursoGlobal: anoActualGlobal,
        cotizacionDetails: cotizacionDetailsMinimos,
    };

    console.log('[ResultadosCalculoCostosPanel] Payload para guardar:', JSON.stringify(payload, null, 2));
    // For more detailed inspection if stringify hides something:
    console.log('[ResultadosCalculoCostosPanel] itemsParaCotizar:', state.productosConOpcionalesSeleccionados);
    console.log('[ResultadosCalculoCostosPanel] resultadosCalculados:', resultadosParaGuardar);
    console.log('[ResultadosCalculoCostosPanel] cotizacionDetails:', cotizacionDetailsMinimos);

    try {
      const respuestaGuardado = await guardarCalculoHistorial(payload);
      const numeroCot = respuestaGuardado.numeroCotizacion;
      const calculoId = respuestaGuardado._id;

      setSaveSuccessMessage(numeroCot ? `Cálculo guardado con N° de Cotización: ${numeroCot}` : (respuestaGuardado.message || "Cálculo guardado exitosamente."));
      setSavedCalculoId(calculoId); 
      setSaveErrorMessage(null);
    } catch (error: any) {
      console.error("[ResultadosCalculoCostosPanel] Error al guardar cálculo:", error);
      setSaveErrorMessage(error.message || "No se pudo guardar el cálculo.");
      setSaveSuccessMessage(null);
    } finally {
      setIsCalculating(false); 
      setIsSaving(false);
    }
  };

  const handleProfileChange = (event: SelectChangeEvent<string>) => {
    const profileId = event.target.value;
    const selected = perfilesList.find(p => p._id === profileId);
    setSelectedProfileId(profileId);
    setCurrentProfileData(selected || null);
    setLineasCalculadas(prevLineas => prevLineas.map(linea => ({
        ...linea,
        detalleCalculoPrincipal: undefined,
        detallesCalculoOpcionales: undefined,
        precioVentaTotalClienteCLPPrincipal: undefined, 
    })));
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setErrorCarga(null); 
    setSavedCalculoId(null);
    setIsCalculating(false); 
    setLatestCalculatedResults(null);
  };

  const toggleExpandItem = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVolverAResumen = () => {
    navigate('/configurar-opcionales');
  };

  const handleGenerarInformePDF = () => {
    if (!savedCalculoId) {
        setSaveErrorMessage("Debe calcular y guardar el resultado primero para poder generar el informe.");
        return;
    }
    if (!currentProfileData) {
        setSaveErrorMessage("No hay un perfil seleccionado."); 
        return;
    }
    navigate('/configuracion-panel', {
        state: {
            itemsParaCotizar: state?.productosConOpcionalesSeleccionados || [],
            resultadosCalculados: latestCalculatedResults,
            idCalculoHistorial: savedCalculoId, 
            selectedProfileId: currentProfileData._id,
            nombrePerfil: currentProfileData.nombre_perfil,
            anoEnCursoGlobal: anoActualGlobal,
        }
    });
  };

  if (isLoading || isProfilesLoading) {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '200px', justifyContent: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Cargando datos y perfiles...</Typography>
            </Paper>
        </Container>
    );
  }

  if (errorCarga && !lineasCalculadas.length) {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Alert severity="error">{errorCarga}</Alert>
            <Button startIcon={<ArrowLeft />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                Volver
            </Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Resultados del Cálculo de Costos
          </Typography>
        </Box>

        {profileError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar perfiles: {profileError}</Alert>}

        <Box sx={{ display: 'flex', mb: 3 }}>
            <FormControl fullWidth>
                <InputLabel id="select-perfil-label">Seleccionar Perfil de Costo</InputLabel>
                <Select
                    labelId="select-perfil-label"
                    value={selectedProfileId}
                    label="Seleccionar Perfil de Costo"
                    onChange={handleProfileChange}
                    disabled={isProfilesLoading || perfilesList.length === 0}
                >
                    {perfilesList.map((perfil) => (
                        <MenuItem key={perfil._id} value={perfil._id}>{perfil.nombre_perfil}</MenuItem>
                    ))}
                </Select>
                {isProfilesLoading && <CircularProgress size={20} sx={{ position: 'absolute', top: '50%', right: '35px', marginTop: '-12px' }} />}
                {perfilesList.length === 0 && !isProfilesLoading && 
                    <Typography variant="caption" color="textSecondary" sx={{mt:1}}>No hay perfiles disponibles.</Typography>}
            </FormControl>
        </Box>

        {isCalculating && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <CircularProgress sx={{ mr: 1 }} />
                <Typography>Realizando cálculos detallados...</Typography>
            </Box>
        )}
        {isSaving && !isCalculating && (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <CircularProgress sx={{ mr: 1 }} />
                <Typography>Guardando cálculo...</Typography>
            </Box>
        )}

        {saveSuccessMessage && <Alert severity="success" sx={{mb:2}}>{saveSuccessMessage}</Alert>}
        {saveErrorMessage && <Alert severity="error" sx={{mb:2}}>{saveErrorMessage}</Alert>}
        {errorCarga && <Alert severity="warning" sx={{mb:2}}>{errorCarga}</Alert>}

        {lineasCalculadas.length === 0 && !isLoading && !errorCarga && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay productos seleccionados para calcular o no se ha podido cargar la configuración inicial.
          </Alert>
        )}

        {lineasCalculadas.map((linea, index) => {
          const key = linea.principal.codigo_producto || `item-${index}`;
          const isExpanded = expandedItems[key] || false;
          const tieneDetalles = !!linea.detalleCalculoPrincipal && !linea.detalleCalculoPrincipal.error;

          return (
            <Accordion key={key} expanded={isExpanded} onChange={() => toggleExpandItem(key)} sx={{ mb: 1.5 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`panel${index}-content`} id={`panel${index}-header`}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {linea.principal.nombre_del_producto || 'Producto Principal'}
                    {linea.opcionales.length > 0 && 
                        <Chip label={`${linea.opcionales.length} opcional(es)`} size="small" sx={{ ml: 1, backgroundColor: '#e0e0e0'}} />
                    }
                  </Typography>
                  {tieneDetalles && linea.detalleCalculoPrincipal?.calculados?.precios_cliente?.precioVentaTotalClienteCLP !== undefined ? (
                     <Typography variant="h6" color="secondary" sx={{ mr: 1, fontWeight: 'bold' }}>
                        {formatCLP(linea.detalleCalculoPrincipal.calculados.precios_cliente.precioVentaTotalClienteCLP)}
                     </Typography>
                  ) : currentProfileData && !isCalculating ? (
                    <Chip icon={<AlertTriangle size={16}/>} label="Requiere Cálculo" color="warning" size="small" sx={{mr:1}}/>
                  ) : !currentProfileData ? (
                    <Chip icon={<CloudOff size={16}/>} label="Seleccione Perfil" color="info" size="small" sx={{mr:1}}/>
                  ) : null}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ borderTop: '1px solid rgba(0, 0, 0, .125)', p: {xs: 1, sm: 2} }}>
                <Typography variant="subtitle1" gutterBottom sx={{mt:1, fontWeight: 'medium' }}>Producto Principal: {linea.principal.nombre_del_producto}</Typography>
                {linea.detalleCalculoPrincipal ? (
                    <RenderResultDetails detalle={linea.detalleCalculoPrincipal} profile={currentProfileData} />
                ) : (
                    <Typography sx={{my:1}}>{currentProfileData ? (isCalculating ? 'Calculando...' : 'Presione "Calcular y Guardar" para ver detalles.') : 'Seleccione un perfil para habilitar el cálculo.'}</Typography>
                )}

                {linea.opcionales.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium' }}>Productos Opcionales:</Typography>
                        {linea.opcionales.map((opcional, opcIndex) => (
                            <Box key={opcional.codigo_producto || `opc-${opcIndex}`} sx={{ mb: 2, pl: 2, borderLeft: '3px solid #eee' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{color: 'text.secondary'}}>{opcional.nombre_del_producto}</Typography>
                                {linea.detallesCalculoOpcionales && linea.detallesCalculoOpcionales[opcIndex] ? (
                                    <RenderResultDetails detalle={linea.detallesCalculoOpcionales[opcIndex]} profile={currentProfileData} />
                                ) : (
                                    <Typography sx={{my:1}}>{currentProfileData ? (isCalculating ? 'Calculando...' : 'Presione "Calcular y Guardar" para ver detalles.') : 'Seleccione un perfil para habilitar el cálculo.'}</Typography>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 3, mb:1, gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowLeft />}
            onClick={handleVolverAResumen}
          >
            Volver a Config. Opcionales
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Calculator />}
            onClick={handleCalcularYGuardar}
            disabled={!currentProfileData || (lineasCalculadas && lineasCalculadas.length === 0) || isCalculating || isSaving}
            sx={{ minWidth: '220px' }}
          >
            {isCalculating && !isSaving ? "Calculando..." : (isSaving ? "Guardando..." : "Calcular y Guardar")}
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<FileText />}
            onClick={handleGenerarInformePDF}
            disabled={!savedCalculoId || isCalculating || isSaving}
          >
            Configurar Cotización y Datos Adicionales (PDF)
          </Button>
        </Box>

      </Paper>
    </Container>
  );
}