import React, { useState, useEffect } from 'react';
// Importar iconos necesarios (quitamos LayoutDashboard)
import { SlidersHorizontal, DollarSign, Euro, RefreshCw, Info, Save, Calendar, Filter, Loader2, CheckCircle, XCircle, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { CostoPerfilData } from '../types';
import { CostParams, CurrencyWebhookResponse, CostParamsWebhookResponse } from '../types/costParams';
import { calculateCostoProductoFromProfileService, getPerfiles } from '../services/perfilService';

// --- Componente CostosPanel (Contiene la lógica original de AdminPanel) ---
export default function CostosPanel() {
  // --- Estados, Handlers, useEffects y JSX originales de AdminPanel ---
  // (Copiado directamente de la versión anterior de AdminPanel.tsx)

  // Función de mapeo de categorías
  const getCategoryId = (categoria: string) => {
    switch (categoria) {
      case 'Chipeadoras': return 'categoria_chipeadora';
      case 'Chipeadoras Motor': return 'chipeadora_motor';
      case 'Chipeadoras PTO': return 'chipeadora_pto';
      case 'Global': return 'global';
      default: return categoria.toLowerCase().replace(/ /g, '_');
    }
  };

  // --- Estados para parámetros ---
  const [tipoCambio, setTipoCambio] = useState<string>('1.12');
  const [bufferDolar, setBufferDolar] = useState<string>('1.8');
  const [tasaSeguroGlobal, setTasaSeguroGlobal] = useState<string>('1');
  const [bufferTransporteGlobal, setBufferTransporteGlobal] = useState<string>('5');
  const [margenTotalGeneral, setMargenTotalGeneral] = useState<string>('20');
  const [descuentoFabricanteGeneral, setDescuentoFabricanteGeneral] = useState<string>('5');
  const [fechaUltimaActualizacion, setFechaUltimaActualizacion] = useState<string>('2025-04-14');
  const [costoFabricaOriginalEUR, setCostoFabricaOriginalEUR] = useState<string>('100000');
  const [transporteLocalEUR, setTransporteLocalEUR] = useState<string>('800');
  const [gastoImportacionEUR, setGastoImportacionEUR] = useState<string>('400');
  const [fleteMaritimosUSD, setFleteMaritimosUSD] = useState<string>('3500');
  const [recargosDestinoUSD, setRecargosDestinoUSD] = useState<string>('500');
  const [honorariosAgenteAduanaUSD, setHonorariosAgenteAduanaUSD] = useState<string>('600');
  const [gastosPortuariosOtrosUSD, setGastosPortuariosOtrosUSD] = useState<string>('200');
  const [transporteNacionalCLP, setTransporteNacionalCLP] = useState<string>('950000');
  const [factorActualizacionAnual, setFactorActualizacionAnual] = useState<string>('5');
  const [derechoAdValorem, setDerechoAdValorem] = useState<string>('6');
  const [iva, setIva] = useState<string>('19');
  const [bufferEurUsd, setBufferEurUsd] = useState<string>('2');

  // --- Estados Divisas ---
  const [dolarActualCLP, setDolarActualCLP] = useState<string | null>(null);
  const [euroActualCLP, setEuroActualCLP] = useState<string | null>(null);
  const [fechaActualizacionDivisas, setFechaActualizacionDivisas] = useState<string | null>(null);

  // --- Estados Filtros y Categorías ---
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([
    'Global', 'Chipeadoras', 'Chipeadoras Motor', 'Chipeadoras PTO'
  ]);
  const [categoriaSeleccionadaParaAplicar, setCategoriaSeleccionadaParaAplicar] = useState<string>('Global');

  // --- NUEVOS ESTADOS para Calculadora de Producto ---
  const [costProfiles, setCostProfiles] = useState<CostoPerfilData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [anoCotizacion, setAnoCotizacion] = useState<string>('2023'); // Default year
  const [anoEnCurso, setAnoEnCurso] = useState<string>(new Date().getFullYear().toString()); // Default to current year
  const [calculationResult, setCalculationResult] = useState<any | null>(null); // To store calculation result {perfilUsado, resultado}
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // --- Estilos ---
  const primaryTextColor = '#0ea5e9';
  const secondaryTextColor = '#64748b';
  const lightGrayBg = '#f8fafc';
  const borderColor = '#e5e7eb';
  const gridContainerStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' };
  const gridCardStyle: React.CSSProperties = { backgroundColor: lightGrayBg, borderRadius: '8px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' };
  const gridCardTitleStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '16px' };
  const inputGroupStyle: React.CSSProperties = { marginBottom: '12px' };
  const labelStyle: React.CSSProperties = { display:'block', marginBottom: '4px', fontSize: '12px', color: secondaryTextColor, fontWeight: 500 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: `1px solid ${borderColor}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };
  const inputDescriptionStyle: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', marginTop: '4px' };
  const currencyDisplayStyle: React.CSSProperties = { backgroundColor: 'white', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px', textAlign: 'center' };
  const currencyValueStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' };
  const buttonBaseStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const primaryButtonStyle: React.CSSProperties = { ...buttonBaseStyle, backgroundColor: primaryTextColor, color: 'white', borderColor: primaryTextColor };
  const secondaryButtonStyle: React.CSSProperties = { ...buttonBaseStyle, backgroundColor: 'white', color: '#334155', borderColor: borderColor };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', background: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${secondaryTextColor.substring(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E') no-repeat right 12px center`, backgroundSize: '10px' };


  // --- Estados Carga/Error ---
  const [isUpdatingCurrencies, setIsUpdatingCurrencies] = useState(false);
  const [currencyUpdateError, setCurrencyUpdateError] = useState<string | null>(null);
  const [initialCurrencyLoading, setInitialCurrencyLoading] = useState(true);
  const [initialCurrencyError, setInitialCurrencyError] = useState<string | null>(null);
  // const [isApplyingCategorySettings, setIsApplyingCategorySettings] = useState(false); // Removido por ahora
  // const [applyCategorySettingsError, setApplyCategorySettingsError] = useState<string | null>(null);
  // const [applyCategorySettingsSuccess, setApplyCategorySettingsSuccess] = useState<string | null>(null);
  const [initialCostParamsLoading, setInitialCostParamsLoading] = useState(true);
  const [initialCostParamsError, setInitialCostParamsError] = useState<string | null>(null);
  const [isLoadingCategoryParams, setIsLoadingCategoryParams] = useState(false);
  const [loadCategoryParamsError, setLoadCategoryParamsError] = useState<string | null>(null);
  const [isSavingGlobalParams, setIsSavingGlobalParams] = useState(false);
  const [saveGlobalParamsError, setSaveGlobalParamsError] = useState<string | null>(null);
  const [saveGlobalParamsSuccess, setSaveGlobalParamsSuccess] = useState<string | null>(null);


  // --- Funciones API ---
  const fetchAndSetCurrencies = async (updateTimestamp?: Date) => {
    console.log("[CostosPanel] Fetching currencies from webhook...");
    setIsUpdatingCurrencies(true);
    setCurrencyUpdateError(null);
    try {
      // const data: CurrencyWebhookResponse = await api.fetchCurrencies(); // COMMENTED OUT - Missing API function
      const data: CurrencyWebhookResponse = { Valor_Dolar: '950', Valor_Euro: '1050' }; // Mock data to avoid breaking logic
      //console.log("Webhook currency response:", data);
      if (data && data.Valor_Dolar !== undefined && data.Valor_Euro !== undefined) {
        const roundedDolar = Math.round(parseFloat(data.Valor_Dolar));
        const roundedEuro = Math.round(parseFloat(data.Valor_Euro));
        let dolarSuccessfullySet = false;
        let euroSuccessfullySet = false;
        if (!isNaN(roundedDolar)) { setDolarActualCLP(String(roundedDolar)); dolarSuccessfullySet = true; } else { console.warn('Valor_Dolar no es válido:', data.Valor_Dolar); setDolarActualCLP(null); }
        if (!isNaN(roundedEuro)) { setEuroActualCLP(String(roundedEuro)); euroSuccessfullySet = true; } else { console.warn('Valor_Euro no es válido:', data.Valor_Euro); setEuroActualCLP(null); }
        const displayTime = updateTimestamp || new Date();
        setFechaActualizacionDivisas(displayTime.toLocaleString('es-CL'));
        if (dolarSuccessfullySet && euroSuccessfullySet) {
          console.log(`[CostosPanel] Currency values updated (D: ${roundedDolar}, E: ${roundedEuro}). Attempting to update in DB...`);
          try {
            // await api.updateCurrenciesInDB({ dolar_observado_actual: roundedDolar, euro_observado_actual: roundedEuro }); // COMMENTED OUT - Missing API function
            console.log('[CostosPanel] Backend currency update skipped (API missing).');
            //console.log('[CostosPanel] Backend confirmed currency update:', updateResult);
          } catch (backendError) {
            console.error('[CostosPanel] Error updating currencies in backend:', backendError);
          }
        }
        return true;
      } else {
        throw new Error('Respuesta del webhook de divisas incompleta.');
      }
    } catch (error) {
      console.error('Error fetching/setting currencies:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setCurrencyUpdateError(errorMsg.includes('fetch') ? 'Error de conexión con webhook.' : errorMsg);
      throw error;
    } finally {
        setIsUpdatingCurrencies(false);
    }
  };

  const fetchInitialGlobalParams = async () => {
    setInitialCostParamsLoading(true);
    setInitialCostParamsError(null);
    console.log('[CostosPanel] Fetching initial global cost parameters from DB... (SKIPPED - API Missing)');
    try {
      // const data = await api.fetchGlobalParams(); // COMMENTED OUT - Missing API function
      const data: CostParamsWebhookResponse | null = null; // Mock empty data
      if (data && data.costos) { // Explicitly check if data and data.costos are truthy
        //console.log('[CostosPanel] Initial global parameters received from DB:', data);
        applyCostDataToState(data.costos); // Safe to access here
      } else {
         console.log('[CostosPanel] Global override document not found or invalid. Using default form values.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[CostosPanel] Error fetching initial global parameters:', error);
      setInitialCostParamsError(errorMsg.includes('fetch') ? 'Error de conexión cargando parámetros.' : errorMsg);
    } finally {
      setInitialCostParamsLoading(false);
    }
  };

  // Helper para aplicar datos a los estados
  const applyCostDataToState = (costos: Partial<CostParams> | null) => { // Aceptar Partial<CostParams>
      if (!costos) return;
      setTipoCambio(costos.tipo_cambio_eur_usd !== undefined ? String(costos.tipo_cambio_eur_usd) : tipoCambio);
      setBufferDolar(costos.buffer_usd_clp !== undefined ? String(costos.buffer_usd_clp * 100) : bufferDolar);
      setTasaSeguroGlobal(costos.tasa_seguro !== undefined ? String(costos.tasa_seguro * 100) : tasaSeguroGlobal);
      setBufferTransporteGlobal(costos.buffer_transporte !== undefined ? String(costos.buffer_transporte * 100) : bufferTransporteGlobal);
      setMargenTotalGeneral(costos.margen_adicional_total !== undefined ? String(costos.margen_adicional_total * 100) : margenTotalGeneral);
      setDescuentoFabricanteGeneral(costos.descuento_fabricante !== undefined ? String(costos.descuento_fabricante * 100) : descuentoFabricanteGeneral);
      setBufferEurUsd(costos.buffer_eur_usd !== undefined ? String(costos.buffer_eur_usd * 100) : bufferEurUsd);
      setCostoFabricaOriginalEUR(costos.costo_fabrica_original_eur !== undefined ? String(costos.costo_fabrica_original_eur) : costoFabricaOriginalEUR);
      setTransporteLocalEUR(costos.transporte_local_eur !== undefined ? String(costos.transporte_local_eur) : transporteLocalEUR);
      setGastoImportacionEUR(costos.gasto_importacion_eur !== undefined ? String(costos.gasto_importacion_eur) : gastoImportacionEUR);
      setFleteMaritimosUSD(costos.flete_maritimo_usd !== undefined ? String(costos.flete_maritimo_usd) : fleteMaritimosUSD);
      setRecargosDestinoUSD(costos.recargos_destino_usd !== undefined ? String(costos.recargos_destino_usd) : recargosDestinoUSD);
      setHonorariosAgenteAduanaUSD(costos.honorarios_agente_aduana_usd !== undefined ? String(costos.honorarios_agente_aduana_usd) : honorariosAgenteAduanaUSD);
      setGastosPortuariosOtrosUSD(costos.gastos_portuarios_otros_usd !== undefined ? String(costos.gastos_portuarios_otros_usd) : gastosPortuariosOtrosUSD);
      setTransporteNacionalCLP(costos.transporte_nacional_clp !== undefined ? String(costos.transporte_nacional_clp) : transporteNacionalCLP);
      setFactorActualizacionAnual(costos.factor_actualizacion_anual !== undefined ? String(costos.factor_actualizacion_anual * 100) : factorActualizacionAnual);
      setDerechoAdValorem(costos.derecho_ad_valorem !== undefined ? String(costos.derecho_ad_valorem * 100) : derechoAdValorem);
      setIva(costos.iva !== undefined ? String(costos.iva * 100) : iva);
      setFechaUltimaActualizacion(costos.fecha_ultima_actualizacion_transporte_local ?? fechaUltimaActualizacion);
      // No aplicar divisas aquí, se cargan por separado
  };

  const fetchAndApplyCategoryParams = async (categoria: string) => {
     if (categoria === 'Global') {
      console.log('[CostosPanel] Selected Global. Reloading global params... (SKIPPED - API Missing)');
      // await fetchInitialGlobalParams(); // COMMENTED OUT - Calls missing API function
      return;
    }
    setIsLoadingCategoryParams(true);
    setLoadCategoryParamsError(null);
    console.log(`[CostosPanel] Fetching parameters for category: ${categoria} (SKIPPED - API Missing)`);
    try {
      const categoryId = getCategoryId(categoria);
      // await fetchInitialGlobalParams(); // COMMENTED OUT
      // const data = await api.fetchCategoryParams(categoryId); // COMMENTED OUT
      const data: CostParamsWebhookResponse | null = null; // Mock empty data
       if (data && data.costos) { // Explicitly check if data and data.costos are truthy
        console.log(`[CostosPanel] Override found for ${categoria}. Applying specific values...`);
        applyCostDataToState(data.costos); // Safe to access here
      } else {
        console.log(`[CostosPanel] No override found for ${categoria}. Using global values.`);
      }
    } catch (error) {
      console.error('[CostosPanel] Error fetching category parameters:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setLoadCategoryParamsError(errorMsg);
      // if(initialCostParamsLoading) await fetchInitialGlobalParams(); // COMMENTED OUT - Calls missing API function
    } finally {
      setIsLoadingCategoryParams(false);
    }
  };

  // --- useEffects ---
  useEffect(() => {
     const loadInitialCurrencies = async () => {
        setInitialCurrencyLoading(true);
        setInitialCurrencyError(null);
        try {
            await fetchAndSetCurrencies(new Date());
        } catch (error) { setInitialCurrencyError('Error al cargar divisas iniciales.'); }
        finally { setInitialCurrencyLoading(false); }
     };
     loadInitialCurrencies();
  }, []);

  useEffect(() => {
    console.log('[CostosPanel] Component mounted, fetching initial global parameters... (SKIPPED - API Missing)');
    // fetchInitialGlobalParams(); // COMMENTED OUT - Calls missing API function
  }, []);

  // --- NUEVO useEffect para cargar perfiles ---
  useEffect(() => {
    const loadCostProfiles = async () => {
      console.log('[CostosPanel] Fetching cost profiles...');
      try {
        const profiles = await getPerfiles(); // Use the imported service function
        setCostProfiles(profiles || []); // Set profiles or empty array if null/undefined
        if (profiles && profiles.length > 0) {
            // Optionally set a default selected profile
            // setSelectedProfileId(profiles[0]._id);
        }
      } catch (error) {
        console.error('[CostosPanel] Error fetching cost profiles:', error);
        // Handle error loading profiles (e.g., show a message)
      }
    };
    loadCostProfiles();
  }, []); // Run once on mount

  // --- Handlers ---
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Reset calculation state when inputs change
    setCalculationResult(null);
    setCalculationError(null);
    // Existing logic
    setSaveGlobalParamsSuccess(null);
    setSaveGlobalParamsError(null);
    setter(event.target.value);
  };

  const handleActualizarDivisas = () => { fetchAndSetCurrencies(new Date()); };

  const handleCategoriaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
     const nuevaCategoria = event.target.value;
     setCategoriaSeleccionadaParaAplicar(nuevaCategoria);
     fetchAndApplyCategoryParams(nuevaCategoria);
  };

  const handleSaveAll = async () => {
    console.log('[CostosPanel] Starting save operation...');
    setIsSavingGlobalParams(true);
    setSaveGlobalParamsError(null);
    setSaveGlobalParamsSuccess(null);
    try {
      const categoryId = getCategoryId(categoriaSeleccionadaParaAplicar);
      //console.log(`[CostosPanel] Saving parameters for category: ${categoriaSeleccionadaParaAplicar} (ID: ${categoryId})`);
      const buildParam = (value: string, defaultValue = 0): number => { const p = parseFloat(value); return isNaN(p) ? defaultValue : p; };
      const buildPercentage = (value: string, defaultValue = 0): number => { const p = parseFloat(value); return isNaN(p) ? defaultValue : p / 100; };
      const params: Partial<CostParams> = {
        tipo_cambio_eur_usd: buildParam(tipoCambio, 1.1),
        buffer_usd_clp: buildPercentage(bufferDolar),
        buffer_eur_usd: buildPercentage(bufferEurUsd),
        tasa_seguro: buildPercentage(tasaSeguroGlobal),
        margen_adicional_total: buildPercentage(margenTotalGeneral),
        buffer_transporte: buildPercentage(bufferTransporteGlobal),
        descuento_fabricante: buildPercentage(descuentoFabricanteGeneral),
        costo_fabrica_original_eur: buildParam(costoFabricaOriginalEUR),
        transporte_local_eur: buildParam(transporteLocalEUR),
        gasto_importacion_eur: buildParam(gastoImportacionEUR),
        flete_maritimo_usd: buildParam(fleteMaritimosUSD),
        recargos_destino_usd: buildParam(recargosDestinoUSD),
        honorarios_agente_aduana_usd: buildParam(honorariosAgenteAduanaUSD),
        gastos_portuarios_otros_usd: buildParam(gastosPortuariosOtrosUSD),
        transporte_nacional_clp: buildParam(transporteNacionalCLP),
        factor_actualizacion_anual: buildPercentage(factorActualizacionAnual),
        derecho_ad_valorem: buildPercentage(derechoAdValorem),
        iva: buildPercentage(iva, 0.19),
        fecha_ultima_actualizacion_transporte_local: fechaUltimaActualizacion || new Date().toISOString().split('T')[0],
      };
      // Validation remains the same
      for (const [key, value] of Object.entries(params)) {
          if (key !== 'fecha_ultima_actualizacion_transporte_local' && value !== undefined && typeof value !== 'string' && isNaN(Number(value))) {
               throw new Error(`Valor inválido para ${key}: ${value}. Asegúrese que los campos numéricos sean correctos.`);
          }
      }

      const apiPayload = { costos: params };
      let result;
      if (categoryId === 'global') {
          console.log('[CostosPanel] Guardando parámetros como Global... (SKIPPED - API Missing)');
          // result = await api.updateGlobalParams(apiPayload); // COMMENTED OUT - Missing API function
          setSaveGlobalParamsSuccess('Simulación: Parámetros Globales guardados.');
      } else {
          console.log(`[CostosPanel] Guardando parámetros para categoría: ${categoryId}... (SKIPPED - API Missing)`);
          // result = await api.updateCategoryParams(categoryId, apiPayload); // COMMENTED OUT - Missing API function
          setSaveGlobalParamsSuccess(`Simulación: Parámetros para ${categoriaSeleccionadaParaAplicar} guardados.`);
      }
      //setSaveGlobalParamsSuccess(`Parámetros para ${categoriaSeleccionadaParaAplicar} guardados.`);
      setTimeout(() => setSaveGlobalParamsSuccess(null), 5000);
    } catch (error) {
      console.error('[CostosPanel] Error saving parameters:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setSaveGlobalParamsError(errorMsg);
      setTimeout(() => setSaveGlobalParamsError(null), 8000);
    } finally {
      setIsSavingGlobalParams(false);
    }
  };

  // --- NUEVO Handler para calcular costo producto ---
  const handleCalculateCostoProducto = async () => {
    // Clear previous results/errors
    setCalculationResult(null);
    setCalculationError(null);
    setIsCalculating(true);

    // Validate inputs
    if (!selectedProfileId) {
      setCalculationError('Por favor, seleccione un perfil de costo.');
      setIsCalculating(false);
      return;
    }
    const numCostoFabrica = parseFloat(costoFabricaOriginalEUR);
    const numTipoCambio = parseFloat(tipoCambio); // Using the existing tipoCambio state
    const numAnoCotizacion = parseInt(anoCotizacion, 10);
    const numAnoEnCurso = parseInt(anoEnCurso, 10);

    if (isNaN(numCostoFabrica) || numCostoFabrica <= 0 || isNaN(numTipoCambio) || numTipoCambio <= 0 || isNaN(numAnoCotizacion) || isNaN(numAnoEnCurso)) {
      setCalculationError('Valores de entrada inválidos. Verifique Costo Fábrica, TC y Años.');
      setIsCalculating(false);
      return;
    }

    const payload = {
      profileId: selectedProfileId,
      anoCotizacion: numAnoCotizacion,
      anoEnCurso: numAnoEnCurso,
      costoFabricaOriginalEUR: numCostoFabrica,
      tipoCambioEurUsdActual: numTipoCambio, // Use the state value
    };

    console.log('[CostosPanel] Calling calculateCostoProducto with payload:', payload);

    try {
      const result = await calculateCostoProductoFromProfileService(payload);
      setCalculationResult(result); // Backend returns { perfilUsado: {...}, resultado: {...} }
    } catch (error: any) {
      console.error('[CostosPanel] Error calculating product cost:', error);
      // error.message likely contains the error string from the backend service
      setCalculationError(error?.message || 'Error desconocido durante el cálculo.');
    } finally {
      setIsCalculating(false);
    }
  };

  // --- JSX del Panel de Costos ---
  return (
    // Quitar el div envolvente que estaba en AdminPanel, ya que este es el contenido principal ahora
    <>
      {/* Sección Valores Actuales de Divisas y Botones de Acción */}
      <div style={{ marginBottom: '24px' }}>
          {/* Cambiado: Contenedor para título y botones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Valores Actuales de Divisas</h2>
             {/* Contenedor para botones */}
             <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                 {/* Botón Configurar Parámetros (Nuevo) */}
                 <button
                   style={secondaryButtonStyle} // Usar estilo secundario por ahora
                   // onClick={/* TODO: Añadir handler para abrir modal/sección */}
                 >
                    <SlidersHorizontal size={14} />
                    Configurar Parámetros
                 </button>
                 {/* Botón Sub Categorías (Nuevo) */}
                 <button
                   style={secondaryButtonStyle} // Usar estilo secundario por ahora
                   // onClick={/* TODO: Añadir handler */}
                 >
                   <Filter size={14} />
                   Sub Categorías
                 </button>
                 {/* Botón Actualizar Divisas (Existente) */}
                 <motion.button
                   onClick={handleActualizarDivisas}
                   style={isUpdatingCurrencies || initialCurrencyLoading ? { ...secondaryButtonStyle, cursor: 'not-allowed', opacity: 0.7 } : secondaryButtonStyle}
                   disabled={isUpdatingCurrencies || initialCurrencyLoading}
                   whileHover={!(isUpdatingCurrencies || initialCurrencyLoading) ? { scale: 1.05, y: -2, transition: { duration: 0.2 } } : {}}
                   whileTap={!(isUpdatingCurrencies || initialCurrencyLoading) ? { scale: 0.95 } : {}}
                 >
                   {isUpdatingCurrencies ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                   Actualizar Divisas
                 </motion.button>
             </div>
          </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
             <div style={currencyDisplayStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                   <DollarSign size={20} style={{ color: primaryTextColor }} />
                   <div style={currencyValueStyle}>{initialCurrencyLoading ? '...' : dolarActualCLP ?? '-'}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>Dólar Observado Actual (CLP)</div>
             </div>
             <div style={currencyDisplayStyle}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Euro size={20} style={{ color: primaryTextColor }} />
                    <div style={currencyValueStyle}>{initialCurrencyLoading ? '...' : euroActualCLP ?? '-'}</div>
                 </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>Euro Observado Actual (CLP)</div>
             </div>
          </div>
           {currencyUpdateError && ( <div style={{ fontSize: '12px', color: 'red', textAlign: 'center', marginTop: '12px' }}>Error al actualizar: {currencyUpdateError}</div> )}
           <div style={{ fontSize: '11px', color: secondaryTextColor, textAlign: 'center', marginTop: '12px', height: '1.5em' }}>
            {initialCurrencyLoading ? ( <span>&nbsp;</span> ) :
             fechaActualizacionDivisas ? ( <> <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Última actualización: {fechaActualizacionDivisas} </> ) :
             initialCurrencyError ? ( <span style={{color: 'red'}}>Error al obtener última actualización.</span> ) : ( <span>&nbsp;</span> )}
           </div>
      </div>

      {/* Sección Parámetros Editables */}
      <div style={{borderTop: `1px solid ${borderColor}`, paddingTop: '24px'}}>
          {/* TODO: Considerar mostrar/ocultar esta sección o usar un modal al hacer clic en "Configurar Parámetros" */}
          {/* Temporalmente, mantenemos la lógica de selección de categoría aquí para que funcione */}
          <div style={{ marginBottom: '24px' }}>
              <label htmlFor="categoriaSelectHidden" style={{ ...labelStyle, marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  Parámetros Aplicados Para: {/* Cambiado el label */}
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {/* Mantenemos el select funcionalmente, pero podría ocultarse o moverse a un modal */}
                  <select
                      id="categoriaSelectHidden" // Cambiado ID para evitar conflictos si se reutiliza
                      style={{ ...selectStyle, flexGrow: 1 }}
                      value={categoriaSeleccionadaParaAplicar}
                      onChange={handleCategoriaChange}
                      disabled={isLoadingCategoryParams || initialCostParamsLoading}
                  >
                      {categoriasDisponibles.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                  {isLoadingCategoryParams && <Loader2 size={18} className="animate-spin" style={{ color: primaryTextColor }} />}
              </div>
              {loadCategoryParamsError && <p style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>Error cargando {categoriaSeleccionadaParaAplicar}: {loadCategoryParamsError}</p>}
          </div>

          {initialCostParamsLoading && ( <div style={{ padding: '20px', textAlign: 'center', color: secondaryTextColor }}>Cargando parámetros...</div> )}
          {initialCostParamsError && ( <div style={{ padding: '20px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', textAlign: 'center' }}>Error al cargar parámetros: {initialCostParamsError}</div> )}

          {!(initialCostParamsLoading || isLoadingCategoryParams) && !initialCostParamsError && ( // Mostrar solo si no está cargando y no hay error inicial
             <div style={gridContainerStyle}>
                 {/* Tarjeta Tipo de Cambio y Buffers */}
                <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Tipo de Cambio y Buffers</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="tipoCambio" style={labelStyle}>Tipo de Cambio EUR/USD:</label>
                      <input id="tipoCambio" type="number" step="0.01" style={inputStyle} value={tipoCambio} onChange={handleInputChange(setTipoCambio)} placeholder="Ej: 1.1" />
                      <p style={inputDescriptionStyle}>Tipo de cambio actual entre Euro y Dólar</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="bufferEurUsd" style={labelStyle}>Buffer EUR/USD (%):</label>
                      <input id="bufferEurUsd" type="number" step="0.1" style={inputStyle} value={bufferEurUsd} onChange={handleInputChange(setBufferEurUsd)} placeholder="Ej: 2"/>
                      <p style={inputDescriptionStyle}>Margen adicional para tipo cambio EUR/USD</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="bufferDolar" style={labelStyle}>Buffer USD/CLP (%):</label>
                      <input id="bufferDolar" type="number" step="0.1" style={inputStyle} value={bufferDolar} onChange={handleInputChange(setBufferDolar)} placeholder="Ej: 1.8" />
                      <p style={inputDescriptionStyle}>Margen adicional para Dólar Observado</p>
                   </div>
                </div>
                {/* Tarjeta Parámetros de Margen y Seguro */}
                <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Parámetros de Margen y Seguro</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="margenTotalGeneral" style={labelStyle}>Margen Total (%):</label>
                      <input id="margenTotalGeneral" type="number" step="0.1" style={inputStyle} value={margenTotalGeneral} onChange={handleInputChange(setMargenTotalGeneral)} placeholder="Ej: 35"/>
                      <p style={inputDescriptionStyle}>Porcentaje de margen adicional</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="tasaSeguroGlobal" style={labelStyle}>Tasa de Seguro (%):</label>
                      <input id="tasaSeguroGlobal" type="number" step="0.1" style={inputStyle} value={tasaSeguroGlobal} onChange={handleInputChange(setTasaSeguroGlobal)} placeholder="Ej: 0.6" />
                      <p style={inputDescriptionStyle}>Porcentaje aplicado para calcular seguro</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="descuentoFabricanteGeneral" style={labelStyle}>Descuento Fabricante (%):</label>
                      <input id="descuentoFabricanteGeneral" type="number" step="0.1" style={inputStyle} value={descuentoFabricanteGeneral} onChange={handleInputChange(setDescuentoFabricanteGeneral)} placeholder="Ej: 10"/>
                      <p style={inputDescriptionStyle}>Descuento base sobre costo fábrica</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="factorActualizacionAnual" style={labelStyle}>Factor Actualización Anual (%):</label>
                      <input id="factorActualizacionAnual" type="number" step="0.1" style={inputStyle} value={factorActualizacionAnual} onChange={handleInputChange(setFactorActualizacionAnual)} placeholder="Ej: 5" />
                      <p style={inputDescriptionStyle}>Incremento anual sobre costo fábrica</p>
                   </div>
                </div>
                 {/* Tarjeta Parámetros de Transporte */}
                <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Parámetros de Transporte</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="bufferTransporteGlobal" style={labelStyle}>Buffer Transporte (%):</label>
                      <input id="bufferTransporteGlobal" type="number" step="0.1" style={inputStyle} value={bufferTransporteGlobal} onChange={handleInputChange(setBufferTransporteGlobal)} placeholder="Ej: 0"/>
                      <p style={inputDescriptionStyle}>Margen adicional para costos de transporte</p>
                   </div>
                    <div style={inputGroupStyle}>
                      <label htmlFor="transporteLocalEUR" style={labelStyle}>Transporte Local (EUR):</label>
                      <input id="transporteLocalEUR" type="number" style={inputStyle} value={transporteLocalEUR} onChange={handleInputChange(setTransporteLocalEUR)} placeholder="Ej: 800"/>
                      <p style={inputDescriptionStyle}>Costo de transporte local en origen</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="transporteNacionalCLP" style={labelStyle}>Transporte Nacional (CLP):</label>
                      <input id="transporteNacionalCLP" type="number" style={inputStyle} value={transporteNacionalCLP} onChange={handleInputChange(setTransporteNacionalCLP)} placeholder="Ej: 950000"/>
                      <p style={inputDescriptionStyle}>Costo de transporte nacional en destino</p>
                   </div>
                  <div style={inputGroupStyle}>
                    <label htmlFor="fechaUltimaActualizacion" style={labelStyle}>Fecha Última Actualización Tarifas:</label>
                    <input id="fechaUltimaActualizacion" type="date" style={inputStyle} value={fechaUltimaActualizacion} onChange={handleInputChange(setFechaUltimaActualizacion)}/>
                    <p style={inputDescriptionStyle}>Fecha de última act. tarifas transporte</p>
                  </div>
                </div>
                {/* Tarjeta Costos Adicionales (EUR) */}
                <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Costos Adicionales (EUR)</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="costoFabricaOriginalEUR" style={labelStyle}>Costo Fábrica Referencial (EUR):</label>
                      <input id="costoFabricaOriginalEUR" type="number" style={inputStyle} value={costoFabricaOriginalEUR} onChange={handleInputChange(setCostoFabricaOriginalEUR)} placeholder="Ej: 100000" />
                      <p style={inputDescriptionStyle}>Costo base de fábrica en Euros</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="gastoImportacionEUR" style={labelStyle}>Gasto Importación (EUR):</label>
                      <input id="gastoImportacionEUR" type="number" style={inputStyle} value={gastoImportacionEUR} onChange={handleInputChange(setGastoImportacionEUR)} placeholder="Ej: 400" />
                      <p style={inputDescriptionStyle}>Gastos de importación en Euros (Origen)</p>
                   </div>
                </div>
                {/* Tarjeta Costos Adicionales (USD) */}
                 <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Costos Adicionales (USD)</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="fleteMaritimosUSD" style={labelStyle}>Flete Marítimo (USD):</label>
                      <input id="fleteMaritimosUSD" type="number" style={inputStyle} value={fleteMaritimosUSD} onChange={handleInputChange(setFleteMaritimosUSD)} placeholder="Ej: 2500"/>
                      <p style={inputDescriptionStyle}>Costo de flete marítimo en USD</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="recargosDestinoUSD" style={labelStyle}>Recargos Destino (USD):</label>
                      <input id="recargosDestinoUSD" type="number" style={inputStyle} value={recargosDestinoUSD} onChange={handleInputChange(setRecargosDestinoUSD)} placeholder="Ej: 500" />
                      <p style={inputDescriptionStyle}>Recargos en destino en USD</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="honorariosAgenteAduanaUSD" style={labelStyle}>Honorarios Agente Aduana (USD):</label>
                      <input id="honorariosAgenteAduanaUSD" type="number" style={inputStyle} value={honorariosAgenteAduanaUSD} onChange={handleInputChange(setHonorariosAgenteAduanaUSD)} placeholder="Ej: 600"/>
                      <p style={inputDescriptionStyle}>Honorarios del agente de aduana</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="gastosPortuariosOtrosUSD" style={labelStyle}>Gastos Portuarios/Otros (USD):</label>
                      <input id="gastosPortuariosOtrosUSD" type="number" style={inputStyle} value={gastosPortuariosOtrosUSD} onChange={handleInputChange(setGastosPortuariosOtrosUSD)} placeholder="Ej: 200" />
                      <p style={inputDescriptionStyle}>Otros gastos portuarios en USD</p>
                   </div>
                </div>
                 {/* Tarjeta Impuestos */}
                <div style={gridCardStyle}>
                  <h3 style={gridCardTitleStyle}>Impuestos</h3>
                   <div style={inputGroupStyle}>
                      <label htmlFor="derechoAdValorem" style={labelStyle}>Derecho Ad Valorem (%):</label>
                      <input id="derechoAdValorem" type="number" step="0.1" style={inputStyle} value={derechoAdValorem} onChange={handleInputChange(setDerechoAdValorem)} placeholder="Ej: 6"/>
                      <p style={inputDescriptionStyle}>Impuesto aduanero (0 si aplica TLC)</p>
                   </div>
                   <div style={inputGroupStyle}>
                      <label htmlFor="iva" style={labelStyle}>IVA (%):</label>
                      <input id="iva" type="number" step="0.1" style={inputStyle} value={iva} onChange={handleInputChange(setIva)} placeholder="Ej: 19"/>
                      <p style={inputDescriptionStyle}>Impuesto al Valor Agregado</p>
                   </div>
                </div>
             </div>
          )}
      </div>

      {/* --- NUEVA SECCIÓN: Calculadora de Costo de Producto --- */}
      <div style={{ ...gridCardStyle, marginTop: '24px' }}>
        <h3 style={{ ...gridCardTitleStyle, borderBottom: `1px solid ${borderColor}`, paddingBottom: '12px', marginBottom: '20px' }}>
          <Calculator size={16} style={{ marginRight: '8px', verticalAlign: 'bottom' }} />
          Calcular Costo de Producto (Usando Perfil)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Selector de Perfil */}
          <div style={inputGroupStyle}>
            <label htmlFor="calc-profile-select" style={labelStyle}>Perfil de Costo:</label>
            <select 
              id="calc-profile-select"
              style={selectStyle}
              value={selectedProfileId}
              onChange={(e) => { setSelectedProfileId(e.target.value); setCalculationResult(null); setCalculationError(null); }}
              disabled={costProfiles.length === 0}
            >
              <option value="">{costProfiles.length > 0 ? 'Seleccione un perfil...' : 'Cargando perfiles...'}</option>
              {costProfiles.map(profile => (
                <option key={profile._id} value={profile._id}>{profile.nombre_perfil}</option>
              ))}
            </select>
            {costProfiles.length === 0 && <p style={inputDescriptionStyle}>No hay perfiles disponibles o están cargando.</p>}
          </div>

          {/* Año Cotización */}
          <div style={inputGroupStyle}>
            <label htmlFor="calc-ano-cotizacion" style={labelStyle}>Año Cotización Base:</label>
            <input 
              id="calc-ano-cotizacion"
              type="number"
              style={inputStyle}
              value={anoCotizacion}
              onChange={handleInputChange(setAnoCotizacion)}
              placeholder="Ej: 2023"
            />
             <p style={inputDescriptionStyle}>Año del costo original.</p>
          </div>

          {/* Año en Curso */}
          <div style={inputGroupStyle}>
            <label htmlFor="calc-ano-curso" style={labelStyle}>Año Cálculo Destino:</label>
            <input 
              id="calc-ano-curso"
              type="number"
              style={inputStyle}
              value={anoEnCurso}
              onChange={handleInputChange(setAnoEnCurso)}
              placeholder="Ej: 2025"
            />
             <p style={inputDescriptionStyle}>Año para el cual se calcula.</p>
          </div>
        </div>

        {/* Costo Fábrica y TC (Usan estados existentes) - Mostrar como referencia */}
         <div style={{ marginBottom: '20px', fontSize: '12px', color: secondaryTextColor }}>
           <p>Se usará el <strong>Costo Fábrica Referencial (EUR):</strong> {costoFabricaOriginalEUR || 'N/A'} y <strong>Tipo Cambio EUR/USD:</strong> {tipoCambio || 'N/A'} definidos arriba.</p>
         </div>

        {/* Botón Calcular y Área de Resultado/Error */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCalculateCostoProducto}
            style={primaryButtonStyle}
            disabled={isCalculating || !selectedProfileId}
          >
            {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
            Calcular Costo
          </button>
          {calculationError && <div style={{ color: 'red', fontSize: '13px' }}><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'bottom' }} /> Error: {calculationError}</div>}
        </div>

        {/* Resultados del Cálculo */} 
        {calculationResult && (
          <div style={{ marginTop: '20px', padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '8px', backgroundColor: '#f0f9ff' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0c4a6e', marginBottom: '12px' }}>Resultado del Cálculo (Perfil: {calculationResult.perfilUsado?.nombre_perfil || 'N/A'})</h4>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px', color: '#374151', maxHeight: '300px', overflowY: 'auto' }}>
              {JSON.stringify(calculationResult.resultado, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {/* --- FIN NUEVA SECCIÓN --- */}

      {/* Botón Guardar Todo (existente) */}
      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        {/* ... mensajes de error/éxito de guardado ... */} 
        <button
          onClick={handleSaveAll}
          style={primaryButtonStyle}
          disabled={isSavingGlobalParams}
        >
          {/* ... icono guardar ... */}
          Guardar Cambios
        </button>
      </div>

    </> // Fin del fragment
  );
} 