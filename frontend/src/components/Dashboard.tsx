import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  Box,
  Button,
  AlertTitle,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  SelectChangeEvent,
} from '@mui/material';
import {
  RefreshCw,
  Search,
  Filter,
  Settings,
  Info,
  Plus,
  FileEdit,
} from 'lucide-react';
import { Producto } from '../types/product';
import { CurrencyData } from '../types/currency';
import { getCachedProducts, getCurrencies } from '../services/api';
import { getCurrencyValues, CurrencyResponse } from '../services/currencyService';

// Estilos personalizados para forzar el modo claro
const lightModeStyles = {
  container: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  paper: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  typography: {
    color: '#000000',
  },
  typographyPrimary: {
    color: '#1976d2',
  },
  typographySecondary: {
    color: '#555555',
  },
  tableHead: {
    backgroundColor: '#f5f5f5',
    color: '#000000',
    fontWeight: 'bold',
  },
  tableCell: {
    color: '#000000',
  },
  actionButton: {
    color: '#1976d2',
  },
};

// Añadir logs de tiempo de carga al inicio del archivo, fuera del componente
console.log('Dashboard module loading:', new Date().toISOString());

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<{total: number, data: Producto[]}>({ total: 0, data: [] });
  const [currencies, setCurrencies] = useState<CurrencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [categories, setCategories] = useState<string[]>(['todas']);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  // Añadir log después del último import
  console.log('Dashboard imports completed');

  const fetchCacheData = async () => {
    console.log('fetchCacheData started');
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching products data...');
      const productsData = await getCachedProducts();
      console.log('Products data received:', productsData);
      setProducts(productsData);
      
      // Extraer categorías únicas de los productos
      if (productsData.data && productsData.data.length > 0) {
        const uniqueCategories = [...new Set(productsData.data.map((p: Producto) => p.categoria).filter(Boolean) as string[])];
        console.log('Categories extracted:', uniqueCategories);
        setCategories(['todas', ...uniqueCategories]);
      }
      
      console.log('Fetching currencies data...');
      const currenciesData = await getCurrencyValues();
      console.log('Currencies data received:', currenciesData);
      setCurrencies(currenciesData);
      
      console.log('All data fetched successfully');
    } catch (error) {
      console.error('Error in fetchCacheData:', error);
      setError('Error al cargar los datos. Por favor, verifique su conexión e intente nuevamente.');
    } finally {
      setLoading(false);
      console.log('fetchCacheData completed, loading state set to false');
    }
  };

  useEffect(() => {
    console.log('Dashboard useEffect running - fetching data');
    fetchCacheData();
  }, []);

  const handleRetry = () => {
    fetchCacheData();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value);
    setPage(0);
  };

  const filteredProducts = products.data.filter(product => {
    const matchesSearch = product.nombre_del_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.codigo_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.Modelo && product.Modelo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'todas' || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Función para cargar los valores de divisas
  const loadCurrencyValues = async () => {
    setIsLoadingCurrencies(true);
    setCurrencyError(null);
    try {
      const response = await getCurrencyValues();
      setCurrencies(response);
    } catch (error) {
      console.error('Error loading currency values:', error);
      setCurrencyError('Error al cargar los valores de divisas');
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  // Cargar valores de divisas al montar el componente
  useEffect(() => {
    loadCurrencyValues();
  }, []);

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="100vh"
        sx={lightModeStyles.container}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, ...lightModeStyles.typography }}>
          Cargando datos...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, ...lightModeStyles.container }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3,
            backgroundColor: 'error.light',
            color: 'error.contrastText',
          }}
        >
          <Alert 
            severity="error"
            variant="filled"
            action={
              <Button 
                color="inherit" 
                size="large" 
                onClick={handleRetry}
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'error.dark'
                  }
                }}
              >
                REINTENTAR
              </Button>
            }
          >
            <AlertTitle sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Error de Conexión
            </AlertTitle>
            {error}
          </Alert>
        </Paper>
      </Container>
    );
  }

  const hasProducts = products.data && products.data.length > 0;
  const hasCurrencies = currencies?.data?.dollar?.value || currencies?.data?.euro?.value;

  if (!hasProducts && !hasCurrencies) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, ...lightModeStyles.container }}>
        <Alert 
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Actualizar
            </Button>
          }
        >
          No hay datos disponibles. Por favor, asegúrese de que el servidor esté funcionando correctamente.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, ...lightModeStyles.container }}>
      <Stack spacing={3}>
        {/* Header con acciones */}
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...lightModeStyles.paper }}>
          <Box display="flex" alignItems="center">
            <img 
              src="/ecoalliance-logo.png" 
              alt="Eco Alliance" 
              style={{ height: '40px', marginRight: '16px' }} 
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <Typography variant="h5" component="h1" sx={lightModeStyles.typographyPrimary}>
              EQUIPOS
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Actualizar datos">
              <IconButton onClick={handleRetry} color="primary">
                <RefreshCw />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configuración">
              <IconButton color="primary">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Barra de búsqueda y filtros */}
        <Paper sx={{ p: 2, ...lightModeStyles.paper }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" width="100%">
              <TextField
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar por código o nombre..."
                variant="outlined"
                size="small"
                sx={{ 
                  mr: 2, 
                  flexGrow: 1,
                  maxWidth: '400px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 150, 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                  }
                }}
              >
                <InputLabel id="category-select-label">Categoría</InputLabel>
                <Select
                  labelId="category-select-label"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="Categoría"
                  startAdornment={<Filter size={18} style={{ marginRight: '8px' }} />}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category === 'todas' ? 'Todas las categorías' : category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Mostrando {filteredProducts.length} equipos
            </Typography>
          </Box>
        </Paper>

        {/* Tabla de Productos */}
        {hasProducts && (
          <Paper sx={{ p: 2, ...lightModeStyles.paper }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={lightModeStyles.tableHead}>Código</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Nombre</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Descripción</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Modelo</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Categoría</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Ver Detalle</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Opcionales</TableCell>
                    <TableCell sx={lightModeStyles.tableHead}>Configurar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((product) => (
                      <TableRow key={product.codigo_producto} hover>
                        <TableCell sx={lightModeStyles.tableCell}>{product.codigo_producto}</TableCell>
                        <TableCell sx={lightModeStyles.tableCell}>{product.nombre_del_producto}</TableCell>
                        <TableCell sx={lightModeStyles.tableCell}>{product.Descripcion}</TableCell>
                        <TableCell sx={lightModeStyles.tableCell}>{product.Modelo}</TableCell>
                        <TableCell sx={lightModeStyles.tableCell}>{product.categoria || 'Sin categoría'}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" sx={lightModeStyles.actionButton}>
                              <Info size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Opcionales">
                            <IconButton size="small" sx={lightModeStyles.actionButton}>
                              <Plus size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Configurar">
                            <IconButton size="small" sx={lightModeStyles.actionButton}>
                              <FileEdit size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredProducts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
                sx={{
                  color: '#000000',
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    color: '#000000',
                  },
                }}
              />
            </TableContainer>
          </Paper>
        )}
      </Stack>

      {/* Panel lateral con valores de divisas */}
      <Paper
        sx={{
          p: 2,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          height: 'auto',
          minHeight: 140,
          position: 'fixed',
          width: '300px',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          border: '1px solid #e0e0e0',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          ...lightModeStyles.paper
        }}
      >
        <Typography component="h2" variant="h6" sx={lightModeStyles.typographyPrimary} gutterBottom>
          Valores de Divisas
        </Typography>
        {isLoadingCurrencies ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
            <CircularProgress size={24} />
          </Box>
        ) : currencyError ? (
          <Typography color="error" variant="body2">
            {currencyError}
          </Typography>
        ) : (
          <>
            <Typography component="p" variant="h5" sx={lightModeStyles.typography}>
              USD: {currencies?.data?.dollar?.value || 'No disponible'}
            </Typography>
            <Typography component="p" variant="h5" sx={lightModeStyles.typography}>
              EUR: {currencies?.data?.euro?.value || 'No disponible'}
            </Typography>
            {currencies?.last_update && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={lightModeStyles.typographySecondary}>
                  Última actualización: {new Date(currencies.last_update).toLocaleString('es-ES')}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;