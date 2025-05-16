import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button, Typography, Paper, Box, Container, List, ListItem, ListItemText, Divider, Alert,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@mui/material';
import { ArrowLeft, ArrowRight, ListChecks } from 'lucide-react';

// --- Interfaces (deberían idealmente venir de un archivo de tipos global) ---
interface DatosContables {
  costo_fabrica?: number;
  divisa_costo?: string;
  costo_fob_usd?: number;
  precio_venta_usd?: number;
  // ... otros campos contables relevantes
  [key: string]: any;
}

interface Producto {
  _id?: string;
  id?: string;
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
  categoria?: string;
  tipo?: string;
  datos_contables?: DatosContables;
  // ...otros campos de Producto que puedan ser relevantes
  [key: string]: any;
}

interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

interface LocationState {
  itemsParaCotizar: ProductoConOpcionales[];
  // Podrían venir otros datos del estado, como perfil, año, etc.
  // selectedProfileId?: string | null;
  // nombrePerfil?: string;
  // anoEnCursoGlobal?: number;
}

const labelStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '4px',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  marginRight: '12px',
  display: 'inline-block',
  textTransform: 'uppercase'
};

// Función para formatear números como moneda EUR
const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return 'N/A';
  return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; // Formato alemán para separadores correctos con EUR
};

export default function ResumenCargaPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [itemsResumen, setItemsResumen] = useState<ProductoConOpcionales[]>([]);

  useEffect(() => {
    if (state && state.itemsParaCotizar && state.itemsParaCotizar.length > 0) {
      setItemsResumen(state.itemsParaCotizar);
      console.log('[ResumenCargaPanel] Items recibidos para resumen:', JSON.stringify(state.itemsParaCotizar, null, 2));
    } else {
      // Si no hay items, podría ser un acceso directo o un error.
      // Por ahora, redirigimos a la selección de equipos.
      // Podríamos mostrar un mensaje antes de redirigir.
      alert("No hay configuración de carga para resumir. Volviendo a la selección de equipos.");
      navigate('/equipos');
    }
  }, [state, navigate]);

  const handleVolverAConfigurarOpcionales = () => {
    if (!state || !state.itemsParaCotizar) {
        navigate('/equipos'); // Fallback
        return;
    }
    // Extraer solo los productos principales para enviarlos de vuelta
    const productosPrincipalesOriginales = state.itemsParaCotizar.map(item => item.principal);
    
    navigate('/configurar-opcionales', {
      state: {
        productosPrincipales: productosPrincipalesOriginales,
        // Aquí podrías necesitar preservar otros datos que ConfigurarOpcionalesPanel espera,
        // como selectedProfileId, nombrePerfil, anoEnCursoGlobal si estaban en el 'state' original.
        // Ejemplo:
        // selectedProfileId: state?.selectedProfileId,
        // nombrePerfil: state?.nombrePerfil,
        // anoEnCursoGlobal: state?.anoEnCursoGlobal,
      }
    });
  };

  const handleContinuarAResultados = () => {
    if (!state || !state.itemsParaCotizar) {
      // Esto no debería ocurrir si los itemsResumen están cargados.
      alert("Error: No hay datos para enviar a resultados.");
      return;
    }
    // Los itemsParaCotizar ya tienen la estructura correcta (ProductoConOpcionales[])
    // que ResultadosCalculoCostosPanel espera como 'productosConOpcionalesSeleccionados'
    navigate('/resultados-calculo-costos', {
      state: {
        productosConOpcionalesSeleccionados: itemsResumen, // Pasar los items tal cual.
        // Aquí también, si ResultadosCalculoCostosPanel necesita perfil, año, etc.,
        // deben pasarse desde el 'state' original.
        // Ejemplo:
        // selectedProfileId: state?.selectedProfileId,
        // nombrePerfil: state?.nombrePerfil,
        // anoEnCursoGlobal: state?.anoEnCursoGlobal,
      }
    });
  };

  if (!itemsResumen.length) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5">Cargando resumen...</Typography>
        {/* Podría añadirse un CircularProgress aquí */}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ListChecks size={32} style={{ marginRight: '12px', color: 'primary.main' }} />
          <Typography variant="h5" component="h1">
            Resumen de Configuración de Carga
          </Typography>
        </Box>

        {itemsResumen.map((item, index) => (
          <Paper key={item.principal.codigo_producto || index} elevation={1} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0' }}>
            {/* SECCIÓN PRINCIPAL */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ ...labelStyle, backgroundColor: '#60A5FA' }}> {/* Azul para Principal */}
                  Principal
                </Typography>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
                  Producto Principal
                </Typography>
              </Box>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F3F4F6' }}>
                      <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '20%', textAlign: 'right' }}>Precio EUR</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{item.principal.codigo_producto || '-'}</TableCell>
                      <TableCell>{item.principal.nombre_del_producto || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(item.principal.datos_contables?.costo_fabrica)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* SECCIÓN ADICIONALES */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ ...labelStyle, backgroundColor: '#34D399' }}> {/* Verde para Adicionales */}
                  Adicionales
                </Typography>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium', mr: 1 }}>
                  Opcionales Seleccionados
                </Typography>
                {item.opcionales && item.opcionales.length > 0 && (
                  <Chip label={`${item.opcionales.length} SELECCIONADOS`} size="small" sx={{backgroundColor: '#E5E7EB', fontWeight:'bold'}} />
                )}
              </Box>
              {item.opcionales && item.opcionales.length > 0 ? (
                <TableContainer component={Paper} elevation={0} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#F3F4F6' }}>
                        <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '20%', textAlign: 'right' }}>Precio EUR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.opcionales.map((opcional, opIndex) => (
                        <TableRow key={opcional.codigo_producto || opIndex}>
                          <TableCell>{opcional.codigo_producto || '-'}</TableCell>
                          <TableCell>{opcional.nombre_del_producto || '-'}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(opcional.datos_contables?.costo_fabrica)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 0.5 }}>
                  (No se seleccionaron opcionales para este equipo)
                </Typography>
              )}
            </Box>
            {index < itemsResumen.length - 1 && <Divider sx={{ my: 2}}/>}
          </Paper>
        ))}
        
        {itemsResumen.length === 0 && (
             <Alert severity="warning" sx={{ mt: 2, mb: 3 }}>
                No hay equipos configurados para mostrar un resumen. Por favor, vuelva a la selección de equipos.
             </Alert>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft />} 
            onClick={handleVolverAConfigurarOpcionales}
          >
            Volver a Configurar Opcionales
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ArrowRight />} 
            onClick={handleContinuarAResultados}
            disabled={itemsResumen.length === 0}
          >
            Calcular
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 