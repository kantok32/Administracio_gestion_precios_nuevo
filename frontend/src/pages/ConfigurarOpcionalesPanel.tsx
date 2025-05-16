import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Checkbox, CircularProgress, Paper, Box, Grid, IconButton, Alert, Container } from '@mui/material';
import { ArrowLeft, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';

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
  productosPrincipales: Producto[]; // Equipos seleccionados de EquiposPanel
  // Potencialmente otros datos como el perfil, año, etc., si son necesarios aquí.
  // selectedProfileId?: string | null;
  // nombrePerfil?: string;
  // anoEnCursoGlobal?: number;
}

export default function ConfigurarOpcionalesPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [productosPrincipales, setProductosPrincipales] = useState<Producto[]>([]);
  const [opcionalesDisponibles, setOpcionalesDisponibles] = useState<Record<string, Producto[]>>({}); // Clave: codigo_producto del principal
  const [opcionalesSeleccionados, setOpcionalesSeleccionados] = useState<Record<string, Set<string>>>({}); // Clave: codigo_producto del principal, Valor: Set de codigos de opcionales
  const [loadingOpcionales, setLoadingOpcionales] = useState<Record<string, boolean>>({}); // Para spinners individuales
  const [errorOpcionales, setErrorOpcionales] = useState<Record<string, string | null>>({});
  const [expandedPrincipales, setExpandedPrincipales] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state && state.productosPrincipales && state.productosPrincipales.length > 0) {
      setProductosPrincipales(state.productosPrincipales);
      // Inicializar opcionalesSeleccionados y expandedPrincipales
      const initialSelections: Record<string, Set<string>> = {};
      const initialExpanded: Record<string, boolean> = {};
      state.productosPrincipales.forEach(p => {
        if (p.codigo_producto) {
          initialSelections[p.codigo_producto] = new Set<string>();
          initialExpanded[p.codigo_producto] = true; // Expandir todos por defecto
          // Cargar automáticamente los opcionales para cada principal
          fetchOpcionalesParaPrincipal(p);
        }
      });
      setOpcionalesSeleccionados(initialSelections);
      setExpandedPrincipales(initialExpanded);
    } else {
      // Si no hay productos principales, redirigir o mostrar mensaje
      alert("No se seleccionaron equipos para configurar opcionales. Volviendo a la selección de equipos.");
      navigate('/equipos'); // O a la ruta donde se seleccionan los equipos
    }
  }, [state, navigate]);

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
      // Podríamos añadir más parámetros si la lógica de backend los usa para filtrar opcionales (ej. familia)

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
      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: [] })); // Dejar vacío en caso de error
    } finally {
      setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: false }));
    }
  }, []);

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

  if (!productosPrincipales.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando configuración de opcionales...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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