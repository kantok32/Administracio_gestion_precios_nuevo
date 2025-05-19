import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Checkbox, CircularProgress, Paper, Box, Grid, IconButton, Alert, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Autocomplete } from '@mui/material';
import { ArrowLeft, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Info, AlertTriangle, Search } from 'lucide-react';
import { fetchProductByCode, fetchFilteredProducts } from '../services/productService'; // Added fetchFilteredProducts

// --- Interfaces (muchas de estas podrían venir de un archivo de tipos global) ---
interface Producto {
  _id?: string;
  id?: string;
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
  categoria?: string;
  tipo?: string;
  producto?: string; // Para opcionales, indica a qué principal pertenece
  peso_kg?: number;
  especificaciones_tecnicas?: any;
  caracteristicas?: { [key: string]: any };
  datos_contables?: { [key: string]: any };
  dimensiones?: { [key: string]: any };
  clasificacion_easysystems?: string;
  codigo_ea?: string;
  proveedor?: string;
  procedencia?: string;
  es_opcional?: boolean;
  familia?: string;
  nombre_comercial?: string;
  detalles?: any;
  descontinuado?: boolean;
  [key: string]: any;
}

interface OpcionalesResponse {
  total: number;
  products: Producto[]; // Lista de productos opcionales
  success: boolean;
  data?: { // Estructura anidada observada en handleOpcionales
    products: Producto[];
    total: number;
    source?: string;
  };
  message?: string;
}

interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

interface LocationState {
  // Original state from EquiposPanel
  productosPrincipales?: Producto[]; 

  // New state from HistorialDetallePage
  fromHistory?: boolean;
  mainProductCodigo?: string;
  selectedOptionalCodigos?: string[];

  // Potentially other shared data
  // selectedProfileId?: string | null;
  // nombrePerfil?: string;
  // anoEnCursoGlobal?: number;
}

export default function ConfigurarOpcionalesPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  console.log('[ConfigurarOpcionalesPanel] Initial location.state:', state); // LOG 1

  const [productosPrincipales, setProductosPrincipales] = useState<Producto[]>([]);
  const [opcionalesDisponibles, setOpcionalesDisponibles] = useState<Record<string, Producto[]>>({});
  const [opcionalesSeleccionados, setOpcionalesSeleccionados] = useState<Record<string, Set<string>>>({});
  const [loadingOpcionales, setLoadingOpcionales] = useState<Record<string, boolean>>({});
  const [errorOpcionales, setErrorOpcionales] = useState<Record<string, string | null>>({});
  const [expandedPrincipales, setExpandedPrincipales] = useState<Record<string, boolean>>({});
  const [showDiscontinuedWarning, setShowDiscontinuedWarning] = useState(false);
  const [discontinuedProductName, setDiscontinuedProductName] = useState<string>('');

  // New state for product search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedProductForAddition, setSelectedProductForAddition] = useState<Producto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchOpcionalesParaPrincipal = useCallback(async (principal: Producto) => {
    if (!principal.codigo_producto || !principal.Modelo || !principal.categoria) {
      setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: 'Datos del producto principal incompletos para buscar opcionales.' }));
      return;
    }
    setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: true }));
    setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: null }));

    try {
      const params = new URLSearchParams();
      params.append('codigo', principal.codigo_producto);
      params.append('modelo', principal.Modelo);
      params.append('categoria', principal.categoria);

      const response = await fetch(`/api/products/opcionales?${params.toString()}`);
      const data: OpcionalesResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Error del servidor: ${response.status}`);
      }
      
      const opcionales = data.data?.products || data.products || [];
      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: opcionales }));

    } catch (error: any) {
      console.error(`Error al obtener opcionales para ${principal.codigo_producto}:`, error);
      setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: error.message || 'Error desconocido' }));
      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: [] }));
    } finally {
      setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: false }));
    }
  }, []);

  useEffect(() => {
    console.log('[ConfigurarOpcionalesPanel] useEffect triggered. Current productosPrincipales length:', productosPrincipales.length, 'Current location.state:', state); // LOG 2a
    const loadDataFromState = async () => {
      console.log('[ConfigurarOpcionalesPanel] loadDataFromState called. state:', state); // LOG 2b
      if (state?.fromHistory && state.mainProductCodigo) {
        setLoadingOpcionales(prev => ({ ...prev, [state.mainProductCodigo!]: true }));
        try {
          const mainProduct = await fetchProductByCode(state.mainProductCodigo);
          if (!mainProduct) {
            throw new Error(`Producto principal con código ${state.mainProductCodigo} no encontrado.`);
          }
          setProductosPrincipales([mainProduct]);
          console.log('[ConfigurarOpcionalesPanel] Loaded from history, mainProduct:', mainProduct); // LOG
          
          const initialSelections: Record<string, Set<string>> = {};
          initialSelections[mainProduct.codigo_producto!] = new Set<string>(state.selectedOptionalCodigos || []);
          setOpcionalesSeleccionados(initialSelections);

          const initialExpanded: Record<string, boolean> = {};
          initialExpanded[mainProduct.codigo_producto!] = true;
          setExpandedPrincipales(initialExpanded);

          await fetchOpcionalesParaPrincipal(mainProduct);

          if (mainProduct.descontinuado) {
            setDiscontinuedProductName(mainProduct.nombre_del_producto || mainProduct.codigo_producto || 'Desconocido');
            setShowDiscontinuedWarning(true);
          }
        } catch (error: any) {
          console.error("Error al cargar configuración desde historial:", error);
          alert(`Error al cargar configuración desde historial: ${error.message}`);
          navigate('/historial');
        } finally {
          if (state.mainProductCodigo) {
             setLoadingOpcionales(prev => ({ ...prev, [state.mainProductCodigo!]: false }));
          }
        }
      } else if (state?.productosPrincipales && state.productosPrincipales.length > 0) {
        setProductosPrincipales(state.productosPrincipales);
        console.log('[ConfigurarOpcionalesPanel] Loaded from EquiposPanel state, productosPrincipales:', state.productosPrincipales); // LOG
        const initialSelections: Record<string, Set<string>> = {};
        const initialExpanded: Record<string, boolean> = {};
        let descontinuadoEncontrado = false;
        let primerDescontinuadoNombre = '';

        state.productosPrincipales.forEach(p => {
          if (p.codigo_producto) {
            initialSelections[p.codigo_producto] = new Set<string>();
            initialExpanded[p.codigo_producto] = true; // Expand by default when coming from EquiposPanel
            fetchOpcionalesParaPrincipal(p);
            if (p.descontinuado) {
              descontinuadoEncontrado = true;
              if (!primerDescontinuadoNombre) {
                primerDescontinuadoNombre = p.nombre_del_producto || p.codigo_producto || 'Desconocido';
              }
            }
          }
        });
        setOpcionalesSeleccionados(initialSelections);
        setExpandedPrincipales(initialExpanded);
        if (descontinuadoEncontrado) {
          setDiscontinuedProductName(primerDescontinuadoNombre);
          setShowDiscontinuedWarning(true);
        }
      } else {
        // No initial state to load a product, user must search and add.
        console.log('[ConfigurarOpcionalesPanel] No specific state for initial load. Setting productosPrincipales to empty array.'); // LOG
        setProductosPrincipales([]); 
      }
    };

    // Only run initial load if not already populated by a manual product load
    if (productosPrincipales.length === 0) {
        console.log('[ConfigurarOpcionalesPanel] useEffect: productosPrincipales is empty, calling loadDataFromState.'); // LOG 2c
        loadDataFromState();
    } else {
        console.log('[ConfigurarOpcionalesPanel] useEffect: productosPrincipales is NOT empty, skipping loadDataFromState.'); // LOG 2d
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [state, navigate, fetchOpcionalesParaPrincipal]); // Removed productosPrincipales from deps to avoid re-running on manual load

  const handleSearchChange = async (event: React.SyntheticEvent, value: string) => {
    setSearchTerm(value);
    setSelectedProductForAddition(null); // Clear selection when search term changes
    if (value.length > 2) { // Trigger search after 3 characters
      setLoadingSearch(true);
      setSearchError(null);
      try {
        const results = await fetchFilteredProducts(value);
        setSearchResults(results);
      } catch (err: any) {
        console.error("Error al buscar productos:", err);
        setSearchError(err.message || 'Error buscando productos.');
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectProductForAddition = (event: React.SyntheticEvent, value: Producto | null) => {
    setSelectedProductForAddition(value);
    if (value) {
        setSearchTerm(value.nombre_del_producto || value.codigo_producto || '');
    }
    console.log('[ConfigurarOpcionalesPanel] Product selected for addition:', value); // LOG 3a
  };
  
  const handleLoadProduct = async () => {
    console.log('[ConfigurarOpcionalesPanel] handleLoadProduct called. selectedProductForAddition:', selectedProductForAddition); // LOG 3b
    if (!selectedProductForAddition || !selectedProductForAddition.codigo_producto) {
      alert("Por favor, seleccione un producto de la búsqueda.");
      console.log('[ConfigurarOpcionalesPanel] handleLoadProduct: No product selected or no codigo_producto.'); // LOG 3c
      return;
    }

    const newPrincipal = selectedProductForAddition;
    console.log('[ConfigurarOpcionalesPanel] handleLoadProduct: Loading new principal:', newPrincipal); // LOG 3d
    
    // Clear previous states or reset for the new single product
    setProductosPrincipales([newPrincipal]);
    setOpcionalesDisponibles({}); // Clear old optionals
    setOpcionalesSeleccionados({ [newPrincipal.codigo_producto!]: new Set<string>() });
    setExpandedPrincipales({ [newPrincipal.codigo_producto!]: true }); // Expand the new one
    setErrorOpcionales({}); // Clear old errors
    
    // Handle discontinued warning for the newly loaded product
    if (newPrincipal.descontinuado) {
        setDiscontinuedProductName(newPrincipal.nombre_del_producto || newPrincipal.codigo_producto || 'Desconocido');
        setShowDiscontinuedWarning(true);
    } else {
        setShowDiscontinuedWarning(false); // Hide if previously shown for another product
    }

    await fetchOpcionalesParaPrincipal(newPrincipal);

    // Clear search fields
    setSearchTerm('');
    setSearchResults([]);
    setSelectedProductForAddition(null);
    setSearchError(null);
    console.log('[ConfigurarOpcionalesPanel] handleLoadProduct: Finished loading product. New productosPrincipales:', [newPrincipal]); // LOG 3e
  };

  const handleToggleOpcional = (codigoPrincipal: string, codigoOpcional: string) => {
    setOpcionalesSeleccionados(prev => {
      const newSelections = { ...prev };
      const setActual = new Set(newSelections[codigoPrincipal] || []);
      if (setActual.has(codigoOpcional)) {
        setActual.delete(codigoOpcional);
      } else {
        setActual.add(codigoOpcional);
      }
      newSelections[codigoPrincipal] = setActual;
      return newSelections;
    });
  };

  const toggleExpandPrincipal = (codigoPrincipal: string) => {
    setExpandedPrincipales(prev => ({ ...prev, [codigoPrincipal]: !prev[codigoPrincipal] }));
  };
  
  const handleConfirmarOpcionales = () => {
    const itemsParaProcesar: ProductoConOpcionales[] = productosPrincipales.map(principal => {
      const principalesOpcionalesCodigos = opcionalesSeleccionados[principal.codigo_producto!] || new Set<string>();
      const opcionalesDePrincipal = (opcionalesDisponibles[principal.codigo_producto!] || [])
        .filter(op => op.codigo_producto && principalesOpcionalesCodigos.has(op.codigo_producto));
      
      return {
        principal: principal,
        opcionales: opcionalesDePrincipal
      };
    });

    console.log("Configuración de opcionales confirmada:", itemsParaProcesar);
    
    // Navegar al siguiente paso (Resumen y Configuración de Carga o Resultados)
    // Pasando los itemsParaProcesar y cualquier otro dato relevante (perfil, año)
    navigate('/resumen-carga', { // Esta será la nueva ruta para el resumen de carga
      state: {
        itemsParaCotizar: itemsParaProcesar, // Renombrado para consistencia con el siguiente panel
        // Pasar otros datos que venían en el 'state' original si son necesarios:
        // selectedProfileId: state?.selectedProfileId,
        // nombrePerfil: state?.nombrePerfil,
        // anoEnCursoGlobal: state?.anoEnCursoGlobal
      }
    });
  };

  const handleCloseDiscontinuedWarning = () => {
    setShowDiscontinuedWarning(false);
  };

  // Show loading indicator if products are being loaded from state initially
  // and no new product has been loaded via search yet.
  if (productosPrincipales.length === 0 && ( (state?.fromHistory && state.mainProductCodigo) || (state?.productosPrincipales && state.productosPrincipales.length > 0 ) ) ) {
    // This condition tries to show loading only if initial state implies loading, 
    // but allows an empty state if user is expected to search.
    // If productosPrincipales is empty AND we were expecting something from state, show loading.
    // If productosPrincipales is empty AND no specific state was passed for auto-loading, it's fine (user needs to search).
    let isLoadingFromState = false;
    if (state?.fromHistory && state.mainProductCodigo && loadingOpcionales[state.mainProductCodigo]) {
        isLoadingFromState = true;
    } else if (state?.productosPrincipales && state.productosPrincipales.some(p => p.codigo_producto && loadingOpcionales[p.codigo_producto])) {
        isLoadingFromState = true;
    }
    
    if (isLoadingFromState) {
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Cargando configuración de opcionales...</Typography>
          </Box>
        );
    }
  }

  console.log('[ConfigurarOpcionalesPanel] Rendering. productosPrincipales:', productosPrincipales); // LOG 4

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Sección de Búsqueda y Carga de Nuevo Producto Principal */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cargar Nuevo Producto Principal para Configurar
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8} md={9}>
            <Autocomplete
              fullWidth
              options={searchResults}
              getOptionLabel={(option) => `${option.nombre_del_producto || 'Nombre no disponible'} (${option.codigo_producto || 'Código no disponible'})`}
              inputValue={searchTerm}
              onInputChange={handleSearchChange}
              onChange={handleSelectProductForAddition}
              loading={loadingSearch}
              loadingText="Buscando..."
              noOptionsText={searchTerm.length <= 2 ? "Escriba al menos 3 caracteres para buscar" : "No se encontraron productos"}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Buscar producto por código o nombre" 
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <Search style={{ marginRight: '8px', color: 'action.active' }} />
                    ),
                    endAdornment: (
                      <>
                        {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.codigo_producto === value.codigo_producto}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.codigo_producto || option._id || Math.random()}>
                  <Typography variant="body2">
                    <strong>{option.nombre_del_producto || 'N/A'}</strong> ({option.codigo_producto || 'N/A'})
                    {option.descontinuado && <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>(Descontinuado)</Typography>}
                  </Typography>
                </Box>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleLoadProduct}
              disabled={!selectedProductForAddition || loadingSearch}
              startIcon={<RefreshCw size={18} />}
            >
              Cargar Producto
            </Button>
          </Grid>
        </Grid>
        {searchError && <Alert severity="error" sx={{ mt: 2 }}>{searchError}</Alert>}
      </Paper>

      {/* Modal de Advertencia para Descontinuados */}
      <Dialog
        open={showDiscontinuedWarning}
        onClose={handleCloseDiscontinuedWarning}
        aria-labelledby="discontinued-warning-title"
        aria-describedby="discontinued-warning-description"
      >
        <DialogTitle id="discontinued-warning-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle color="orange" style={{ marginRight: '8px' }} />
          Advertencia
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="discontinued-warning-description">
            {/* Podríamos personalizar más el mensaje si hay más de un descontinuado */}
            El equipo "{discontinuedProductName}" (o alguno de los seleccionados) está descontinuado. Los valores y disponibilidad de opcionales pueden variar.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDiscontinuedWarning} color="primary" autoFocus>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {productosPrincipales.length === 0 && !((state?.fromHistory && state.mainProductCodigo) || (state?.productosPrincipales && state.productosPrincipales.length > 0)) && (
         <Alert severity="info" sx={{mb: 2}}>
            Por favor, busque y cargue un producto principal para comenzar la configuración de sus opcionales.
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          Configurar Opcionales para Equipos Seleccionados
        </Typography>

        {productosPrincipales.map(principal => (
          <Box key={principal.codigo_producto} sx={{ mb: 3, border: '1px solid #ddd', borderRadius: '4px' }}>
            <Box 
              sx={{ p: 2, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleExpandPrincipal(principal.codigo_producto!)}
            >
              <Typography variant="h6">{principal.nombre_del_producto || principal.codigo_producto}</Typography>
              <IconButton size="small">
                {expandedPrincipales[principal.codigo_producto!] ? <ChevronUp /> : <ChevronDown />}
              </IconButton>
            </Box>

            {expandedPrincipales[principal.codigo_producto!] && (
              <Box sx={{ p: 2 }}>
                {loadingOpcionales[principal.codigo_producto!] && <CircularProgress size={24} sx={{my: 2}}/>}
                {errorOpcionales[principal.codigo_producto!] && (
                  <Alert severity="error" sx={{my: 2}}>
                    Error al cargar opcionales para {principal.nombre_del_producto}: {errorOpcionales[principal.codigo_producto!]}
                    <Button onClick={() => fetchOpcionalesParaPrincipal(principal)} size="small" startIcon={<RefreshCw size={14}/>} sx={{ml:1}}>Reintentar</Button>
                  </Alert>
                )}
                
                {!loadingOpcionales[principal.codigo_producto!] && !errorOpcionales[principal.codigo_producto!] && (
                  (opcionalesDisponibles[principal.codigo_producto!]?.length || 0) === 0 ? (
                    <Typography sx={{my: 2, fontStyle: 'italic'}}>No hay opcionales disponibles para este equipo.</Typography>
                  ) : (
                    <Grid container spacing={1} sx={{ my: 1 }}>
                      {(opcionalesDisponibles[principal.codigo_producto!] || []).map(opcional => (
                        <Grid item xs={12} key={opcional.codigo_producto}>
                          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', '&:hover': { borderColor: 'primary.main' } }}>
                            <Checkbox
                              checked={(opcionalesSeleccionados[principal.codigo_producto!] || new Set()).has(opcional.codigo_producto!)}
                              onChange={() => handleToggleOpcional(principal.codigo_producto!, opcional.codigo_producto!)}
                              disabled={!opcional.codigo_producto} // Deshabilitar si no hay código
                            />
                            <Box>
                                <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                                { (opcional.nombre_del_producto || opcional.codigo_producto || '').replace(/^:\s*/, '').replace(/^Opcional:\s*/i, '').trim() }
                                </Typography>
                            </Box>
                            {/* Podríamos añadir un botón de Info aquí si hay más detalles del opcional */}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )
                )}
              </Box>
            )}
          </Box>
        ))}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft />} 
            onClick={() => navigate('/equipos')} // Volver a la selección de equipos principales
          >
            Volver a Selección de Equipos
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ArrowRight />} 
            onClick={handleConfirmarOpcionales}
            disabled={productosPrincipales.length === 0}
          >
            Confirmar y Continuar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 