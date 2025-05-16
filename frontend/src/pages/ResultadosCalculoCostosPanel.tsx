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
import { CostoPerfilData } from '../types';
import { Producto } from '../types/product';

// --- Tipos (deberían idealmente importarse de un archivo types.ts común si no lo están ya) ---
interface DatosContables {
  costo_fabrica?: number;
  divisa_costo?: string;
  fecha_cotizacion?: string;
  [key: string]: any;
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
    profileName?: string;
}

interface LocationState {
  productosConOpcionalesSeleccionados?: ProductoConOpcionales[];
  selectedProfileId?: string | null;
  nombrePerfil?: string;
  // anoEnCursoGlobal?: number; // Se usará el año actual directamente
}

interface LineaDeTrabajoConCosto extends ProductoConOpcionales {
  costoBaseTotalEur: number;
  detalleCalculoPrincipal?: CalculationResult;
  detallesCalculoOpcionales?: CalculationResult[];
  precioVentaTotalClienteCLPPrincipal?: number;
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
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [perfilesList, setPerfilesList] = useState<CostoPerfilData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(state?.selectedProfileId || '');
  const [currentProfileData, setCurrentProfileData] = useState<CostoPerfilData | null>(null);
  const [isProfilesLoading, setIsProfilesLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

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
        }
      };
      cargarPerfilesDesdeAPI();
  }, [state?.selectedProfileId]);

  const procesarLineasYCalcularDetalles = useCallback(async () => {
    if (!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0) {
      setErrorCarga("No se recibieron datos de configuración para calcular. Por favor, vuelva a la selección de equipos.");
      setLineasCalculadas([]);
      setIsLoading(false);
      return;
    }

    const productosParaProcesar = Array.isArray(state.productosConOpcionalesSeleccionados) ? state.productosConOpcionalesSeleccionados : [];

    if (!currentProfileData) {
      const lineasBase = productosParaProcesar.map((item: ProductoConOpcionales) => {
        let costoBaseTotal = item.principal.datos_contables?.costo_fabrica || 0;
        item.opcionales.forEach((opcional: Producto) => {
          costoBaseTotal += opcional.datos_contables?.costo_fabrica || 0;
        });
        return {
          ...item,
          costoBaseTotalEur: costoBaseTotal,
          detalleCalculoPrincipal: { error: "Seleccione un perfil para ver el cálculo detallado.", profileName: "Perfil no seleccionado" },
          detallesCalculoOpcionales: item.opcionales.map(() => ({ error: "Seleccione un perfil para ver el cálculo detallado.", profileName: "Perfil no seleccionado" })),
          precioVentaTotalClienteCLPPrincipal: undefined,
        };
      });
      setLineasCalculadas(lineasBase);
      setIsLoading(false);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    setErrorCarga(null);

    const anoActual = new Date().getFullYear();
    const tcEurUsdActual = 1.117564;

    const getFechaCotizacionAsString = (fecha: string | Date | undefined): string | undefined => {
        if (typeof fecha === 'string' || fecha === undefined) {
            return fecha;
        }
        if (fecha instanceof Date) {
            return fecha.toISOString();
        }
        return undefined; // o maneja otros casos como prefieras
    };

    try {
      const lineasConDetallePromises = productosParaProcesar.map(async (item: ProductoConOpcionales) => {
        let costoBaseTotal = item.principal.datos_contables?.costo_fabrica || 0;
        item.opcionales.forEach((opcional: Producto) => {
          costoBaseTotal += opcional.datos_contables?.costo_fabrica || 0;
        });

        const detallePrincipal = await fetchCalculoDetallado(
          item.principal.datos_contables?.costo_fabrica || 0,
          getFechaCotizacionAsString(item.principal.datos_contables?.fecha_cotizacion),
          currentProfileData._id,
          anoActual,
          tcEurUsdActual,
          currentProfileData.nombre_perfil
        );

        const detallesOpcionalesPromises = item.opcionales.map(opcional => 
          fetchCalculoDetallado(
            opcional.datos_contables?.costo_fabrica || 0,
            getFechaCotizacionAsString(opcional.datos_contables?.fecha_cotizacion),
            currentProfileData._id,
            anoActual,
            tcEurUsdActual,
            currentProfileData.nombre_perfil
          )
        );
        const detallesOpcionalesResultados = await Promise.all(detallesOpcionalesPromises);
        
        const precioCLPPrincipal = detallePrincipal?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;

        return {
          ...item,
          costoBaseTotalEur: costoBaseTotal,
          detalleCalculoPrincipal: detallePrincipal,
          detallesCalculoOpcionales: detallesOpcionalesResultados,
          precioVentaTotalClienteCLPPrincipal: typeof precioCLPPrincipal === 'number' ? precioCLPPrincipal : undefined,
        };
      });

      const nuevasLineasCalculadas = await Promise.all(lineasConDetallePromises);
      setLineasCalculadas(nuevasLineasCalculadas);

    } catch (error) {
      console.error("[ResultadosCalculoCostosPanel] Error en Promise.all al calcular detalles:", error);
      setErrorCarga("Ocurrió un error al obtener los cálculos detallados para una o más líneas.");
    } finally {
      setIsCalculating(false);
      setIsLoading(false);
    }
  }, [state, currentProfileData]);

  useEffect(() => {
    setIsLoading(true);
    procesarLineasYCalcularDetalles();
  }, [procesarLineasYCalcularDetalles]);

  const handleProfileChange = (event: SelectChangeEvent<string>) => {
    const profileId = event.target.value as string;
    setSelectedProfileId(profileId);
    const selected = perfilesList.find(p => p._id === profileId);
    setCurrentProfileData(selected || null);
  };

  const toggleExpandItem = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleVolverAResumen = () => {
    if (state && state.productosConOpcionalesSeleccionados) {
        navigate('/resumen-carga', { 
            state: { 
                itemsParaCotizar: state.productosConOpcionalesSeleccionados.map(item => ({principal: item.principal, opcionales: item.opcionales})), // Asegurar el formato correcto
                selectedProfileId: selectedProfileId,
                nombrePerfil: currentProfileData?.nombre_perfil,
            }
        });
    } else {
        navigate('/equipos');
    }
  };
  
  const handleGenerarInformePDF = () => {
    if (!lineasCalculadas || lineasCalculadas.length === 0) {
      alert("No hay líneas calculadas para generar un informe.");
      return;
    }
    if (!currentProfileData) {
        alert("Por favor, seleccione un perfil de costos antes de generar el informe.");
        return;
    }

    const itemsParaCotizarNavegacion = lineasCalculadas.map(lc => ({
      principal: lc.principal,
      opcionales: lc.opcionales
    }));

    const resultadosCalculadosNavegacion = transformarLineasParaConfiguracion(lineasCalculadas, currentProfileData.nombre_perfil);

    navigate('/configuracion-panel', {
      state: {
        itemsParaCotizar: itemsParaCotizarNavegacion,
        resultadosCalculados: resultadosCalculadosNavegacion,
        selectedProfileId: selectedProfileId,
        nombrePerfil: currentProfileData.nombre_perfil, // currentProfileData no será null aquí debido a la guarda anterior
        anoEnCursoGlobal: new Date().getFullYear(), 
      }
    });
  };

  if (isLoading && !isProfilesLoading) { 
    return (
        <Container sx={{ py: 4, textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>Cargando y procesando datos...</Typography>
        </Container>
      );
  }

  if (errorCarga && lineasCalculadas.length === 0) { 
    return (
        <Container sx={{ py: 4 }}>
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => navigate('/equipos')}>Volver a Equipos</Button>}>
            {errorCarga}
          </Alert>
        </Container>
      );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
            <Calculator size={32} style={{ marginRight: '12px', color: 'primary.main' }} />
            <Typography variant="h5" component="h1">
          Resultados del Cálculo de Costos
        </Typography>
          </Box>
          <FormControl sx={{ m: 1, minWidth: 250 }} size="small">
            <InputLabel id="select-profile-label">Perfil de Costos</InputLabel>
            <Select
              labelId="select-profile-label"
              id="select-profile"
              value={isProfilesLoading ? '' : selectedProfileId}
              label="Perfil de Costos"
              onChange={handleProfileChange}
              disabled={isProfilesLoading || perfilesList.length === 0}
            >
              {isProfilesLoading && <MenuItem value="" disabled><CircularProgress size={20} sx={{mr:1}}/>Cargando perfiles...</MenuItem>}
              {!isProfilesLoading && perfilesList.length === 0 && <MenuItem value="" disabled>No hay perfiles disponibles</MenuItem>}
              {perfilesList.map((perfil) => (
                <MenuItem key={perfil._id} value={perfil._id}>
                  {perfil.nombre_perfil}
                </MenuItem>
              ))}
            </Select>
             {profileError && <Typography color="error" variant="caption" sx={{mt:1}}>{profileError}</Typography>}
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          A continuación se muestra el costo base calculado para cada línea de trabajo.
          {!currentProfileData && !isProfilesLoading && perfilesList.length > 0 && " Seleccione un perfil para ver los cálculos detallados desde el servidor."}
          {currentProfileData && " Los detalles se obtienen del servidor usando el perfil seleccionado."}
          {(isLoading || isCalculating) && <CircularProgress size={16} sx={{ml:1}} />}
          </Typography>
          
        {lineasCalculadas.length === 0 && !isLoading && !isCalculating && (
             <Alert severity="info" sx={{mt:2}}>
                {!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0 
                    ? <>No hay productos cargados para calcular. Por favor, <Button size="small" onClick={() => navigate('/equipos')}>vuelva a la selección de equipos</Button>.</>
                    : !currentProfileData && !isProfilesLoading && perfilesList.length > 0 
                        ? "Por favor, seleccione un perfil de costos para iniciar el cálculo detallado." 
                        : "Procesando o no hay datos para mostrar."
                }
            </Alert>
        )}
        
        {errorCarga && lineasCalculadas.length > 0 && ( 
            <Alert severity="warning" sx={{mb:2}}>{errorCarga}</Alert>
        )}

        {lineasCalculadas.map((linea, index) => {
          const principalKey = linea.principal.codigo_producto || `principal-${index}`;
          const isItemCalculating = isCalculating && expandedItems[principalKey];

          return (
            <Paper key={principalKey} elevation={1} sx={{ mb: 2.5, p: 2, border: '1px solid #e0e0e0', opacity: isItemCalculating ? 0.7 : 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpandItem(principalKey)}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
                  {linea.principal.nombre_del_producto || 'Producto Principal Desconocido'}
                </Typography>
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    {isItemCalculating && <CircularProgress size={20} sx={{mr:1}}/>}
                    {expandedItems[principalKey] ? <ChevronUp /> : <ChevronDown />}
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Código Principal: {linea.principal.codigo_producto || 'N/A'}
              </Typography>

              <Box sx={{ my: 1.5, p: 1.5, backgroundColor: '#e6fffa', borderRadius: '4px' }}> 
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={20} style={{ marginRight: '8px', color: '#00796b' }} />
                  Precio Venta Total (CLP):
                  <span style={{ marginLeft: 'auto', fontSize:'1.1em' }}>
                    {linea.precioVentaTotalClienteCLPPrincipal !== undefined 
                      ? formatCLP(linea.precioVentaTotalClienteCLPPrincipal) 
                      : (isCalculating && !linea.detalleCalculoPrincipal?.error ? 'Calculando...' : formatCLP(0)) 
                    }
                  </span>
                </Typography>
              </Box>

              {expandedItems[principalKey] && (
                <Box sx={{ mt: 2, pl: 1 }}>
                  {isCalculating && !linea.detalleCalculoPrincipal && <Box sx={{display: 'flex', justifyContent: 'center', my:2}}><CircularProgress /><Typography sx={{ml:1}}>Calculando detalles del principal...</Typography></Box>}
                  {linea.detalleCalculoPrincipal && (
                    <RenderResultDetails detalle={linea.detalleCalculoPrincipal ?? null} profile={currentProfileData} />
                  )}

                  {linea.detallesCalculoOpcionales && linea.detallesCalculoOpcionales.length > 0 && (
                    <Box sx={{mt: 2, ml: 2, borderLeft: '2px solid #eee', pl:2}}>
                        <Typography variant="subtitle1" gutterBottom sx={{fontWeight:'bold', color: '#555'}} >Cálculo Detallado Opcionales:</Typography>
                        {linea.detallesCalculoOpcionales.map((detalleOpcional, idx) => (
                            <Box key={idx} sx={{mb:2}}>
                                <Typography variant="subtitle2" sx={{fontWeight:'medium', color: '#666'}}>
                                    Opcional: {linea.opcionales[idx]?.nombre_del_producto || `Opcional ${idx+1}`}
                                </Typography>
                                <RenderResultDetails detalle={detalleOpcional ?? null} profile={currentProfileData} />
                            </Box>
                        ))}
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
        );
      })}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft />} 
            onClick={handleVolverAResumen}
            disabled={isCalculating}
          >
            Volver a Resumen
        </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<FileText />} 
            onClick={handleGenerarInformePDF} 
            disabled={isCalculating || lineasCalculadas.length === 0 || !currentProfileData || lineasCalculadas.some(l => !l.detalleCalculoPrincipal || l.detalleCalculoPrincipal.error)}
          >
            Generar Informe PDF 
        </Button>
        </Box>
      </Paper>
    </Container>
  );
} 