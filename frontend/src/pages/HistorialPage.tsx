import React, { useEffect, useState, useMemo } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Box, Tooltip, IconButton, TextField, Button
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as VisibilityIcon, Search as SearchIcon } from '@mui/icons-material';
import { getCalculosHistorial, HistorialCalculoItem } from '../services/calculoHistorialService';
import { useNavigate } from 'react-router-dom';

// Helper para formatear fechas (puedes moverlo a un archivo utils)
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formateando fecha:', dateString, error);
    return dateString; // Devuelve el string original si hay error
  }
};

// Helper para extraer el primer nombre de producto principal
const getMainProductName = (item: HistorialCalculoItem): string => {
  if (item.itemsParaCotizar && item.itemsParaCotizar.length > 0) {
    const firstPrincipal = item.itemsParaCotizar[0].principal;
    return firstPrincipal?.caracteristicas?.nombre_del_producto || firstPrincipal?.descripcion || 'Producto sin nombre';
  }
  return 'N/A';
};

const HistorialPage: React.FC = () => {
  const [historial, setHistorial] = useState<HistorialCalculoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const navigate = useNavigate();

  const fetchHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalculosHistorial();
      setHistorial(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  // Filtrar historial basado en searchTerm
  const filteredHistorial = useMemo(() => {
    if (!searchTerm) {
      return historial;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return historial.filter(item => {
      const nombreRef = item.nombreReferencia?.toLowerCase() || '';
      const clienteNombre = item.cotizacionDetails?.clienteNombre?.toLowerCase() || '';
      const productoPrincipal = getMainProductName(item).toLowerCase();
      
      return nombreRef.includes(lowerSearchTerm) || 
             clienteNombre.includes(lowerSearchTerm) ||
             productoPrincipal.includes(lowerSearchTerm);
    });
  }, [historial, searchTerm]);

  // Función para manejar la vista de detalles (a implementar en el futuro)
  const handleViewDetails = (id: string) => {
    // console.log("Ver detalles del cálculo:", id);
    // Aquí podrías navegar a una página de detalle, por ejemplo:
    navigate(`/historial/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Historial de Cálculos
          </Typography>
          <Tooltip title="Refrescar lista">
            <span>
              <IconButton onClick={fetchHistorial} disabled={loading} color="primary">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Campo de Búsqueda */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end' }}>
          <SearchIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
          <TextField 
            fullWidth
            label="Buscar por Referencia, Cliente o Producto Principal"
            variant="standard"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {!loading && !error && (
          <TableContainer>
            <Table stickyHeader aria-label="tabla de historial de cálculos">
              <TableHead>
                <TableRow>
                  <TableCell sx={{fontWeight: 'bold'}}>Nº Config.</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Fecha Creación</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Referencia</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Cliente</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Producto Principal (1ro)</TableCell>
                  {/* <TableCell sx={{fontWeight: 'bold'}} align="right">Total (Ejemplo)</TableCell> */}
                  <TableCell sx={{fontWeight: 'bold'}} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistorial.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {searchTerm ? 'No se encontraron cálculos que coincidan con su búsqueda.' : 'No hay cálculos guardados en el historial.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredHistorial.map((item) => (
                  <TableRow hover key={item._id}>
                    <TableCell sx={{textAlign: 'center'}}>{item.numeroConfiguracion || 'N/A'}</TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>{item.nombreReferencia || 'N/A'}</TableCell>
                    <TableCell>{item.cotizacionDetails?.clienteNombre || 'N/A'}</TableCell>
                    <TableCell>{getMainProductName(item)}</TableCell>
                    {/* <TableCell align="right">{formatCLP(item.totalGeneralCalculado)}</TableCell> */}
                    <TableCell align="center">
                      <Tooltip title="Ver Detalles">
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={() => navigate(`/historial/${item._id}`)}
                        >
                          Ver Detalles
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default HistorialPage; 