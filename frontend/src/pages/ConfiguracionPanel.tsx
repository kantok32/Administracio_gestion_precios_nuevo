import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Container, TextField, Typography, Paper, Grid, Divider, TextareaAutosize } from '@mui/material';
import { ArrowLeft, DownloadCloud } from 'lucide-react';

// Tipos (Idealmente, algunos de estos vendrían de un archivo global de tipos)
interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  // ... otros campos de Producto que puedan ser relevantes para mostrar
}
interface ProductoConOpcionales { principal: Producto; opcionales: Producto[]; }
interface CalculationResult { inputs?: any; calculados?: any; error?: string; }
interface LocationStateFromPrevPage {
  itemsParaCotizar: ProductoConOpcionales[];
  resultadosCalculados: Record<string, CalculationResult>;
  selectedProfileId: string | null;
  nombrePerfil?: string;
  anoEnCursoGlobal: number;
}

// Estado para los nuevos datos del formulario
interface CotizacionFormData {
  // Cliente
  clienteNombre: string;
  clienteRut: string;
  clienteDireccion: string;
  clienteComuna: string;
  clienteCiudad: string;
  clientePais: string;
  clienteContactoNombre: string;
  clienteContactoEmail: string;
  clienteContactoTelefono: string;
  // Documento
  numeroCotizacion: string;
  referenciaDocumento: string; // Opcional
  fechaCreacion: string;
  fechaCaducidad: string;
  // Emisor (Vendedor)
  emisorNombre: string; // Nombre del creador del presupuesto
  emisorAreaComercial: string;
  emisorEmail: string; // Email del creador (asumo)
  // Comentarios y Términos
  comentariosAdicionales: string;
  terminosPago: string;
  medioPago: string;
  formaPago: string;
}

export default function ConfiguracionPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [calculosData, setCalculosData] = useState<LocationStateFromPrevPage | null>(null);
  const [formData, setFormData] = useState<CotizacionFormData>({
    clienteNombre: '',
    clienteRut: '',
    clienteDireccion: '',
    clienteComuna: '',
    clienteCiudad: 'Chile', // Default a Chile
    clientePais: '',
    clienteContactoNombre: '',
    clienteContactoEmail: '',
    clienteContactoTelefono: '',
    numeroCotizacion: '', // Podría ser generado o sugerido
    referenciaDocumento: '',
    fechaCreacion: new Date().toISOString().split('T')[0],
    fechaCaducidad: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Default a 30 días
    emisorNombre: '', // ¿Obtener de usuario logueado si es posible en el futuro?
    emisorAreaComercial: 'Comercial', // Default
    emisorEmail: '',
    comentariosAdicionales: '',
    terminosPago: '50% Anticipado, 50% Contraentrega', // Default
    medioPago: 'Transferencia Bancaria', // Default
    formaPago: 'Contrafactura', // Default
  });

  useEffect(() => {
    if (location.state) {
      setCalculosData(location.state as LocationStateFromPrevPage);
      // Podríamos pre-rellenar numeroCotizacion aquí si tenemos una lógica para ello
      // setFormData(prev => ({ ...prev, numeroCotizacion: `COT-${Date.now()}` }));
    } else {
      // Manejar el caso donde no hay estado (ej. el usuario navega directamente a esta URL)
      alert('No se encontraron datos de cálculo. Por favor, inicie desde la selección de equipos.');
      navigate('/'); // O a la página de inicio de cálculos
    }
  }, [location, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerarPdf = async () => {
    if (!calculosData) {
      alert('Faltan los datos de cálculo base.');
      return;
    }
    setIsLoading(true);

    // Crear el payload para el backend
    const payload = {
      ...calculosData, // Esto incluye itemsParaCotizar, resultadosCalculados, etc.
      cotizacionDetails: formData // Esto incluye todos los campos del formulario actual
    };

    console.log('Enviando al backend:', payload);

    try {
      const response = await fetch('/api/calculos-historial/guardar-y-exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Intentar obtener un mensaje de error más detallado del backend si es posible
        let errorMessage = 'Error del servidor al generar PDF.';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Si el cuerpo no es JSON o está vacío, usar el texto de estado
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Construir un nombre de archivo más descriptivo
      const nombreArchivo = `Configuracion_${formData.numeroCotizacion || 'Calculo'}_${formData.clienteNombre || 'Cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.download = nombreArchivo.replace(/[^a-z0-9_.-]/gi, '_'); // Sanitizar nombre de archivo
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert('Cotización PDF generada y descarga iniciada.');

    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      alert(`Error al generar PDF: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!calculosData) {
    return <Typography>Cargando datos de cálculo...</Typography>; // O un spinner más elegante
  }

  // Estilos básicos para el layout
  const mainPaperStyle: React.CSSProperties = { padding: '24px', margin: '20px 0' };
  const sectionTitleStyle: React.CSSProperties = { marginTop: '20px', marginBottom: '10px' };

  return (
    <Box sx={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      <Paper elevation={3} sx={mainPaperStyle}>
        <Typography variant="h4" gutterBottom align="center">
          Configurar Datos de Cotización
        </Typography>

        {/* SECCIÓN DATOS DEL CLIENTE */}
        <Typography variant="h6" sx={sectionTitleStyle}>Datos del Cliente</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Nombre Cliente/Empresa" name="clienteNombre" value={formData.clienteNombre} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="RUT/ID Cliente" name="clienteRut" value={formData.clienteRut} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Dirección (Calle, Número, Depto)" name="clienteDireccion" value={formData.clienteDireccion} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Comuna" name="clienteComuna" value={formData.clienteComuna} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Ciudad" name="clienteCiudad" value={formData.clienteCiudad} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="País" name="clientePais" value={formData.clientePais} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Nombre Contacto" name="clienteContactoNombre" value={formData.clienteContactoNombre} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Email Contacto" name="clienteContactoEmail" type="email" value={formData.clienteContactoEmail} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Teléfono Contacto" name="clienteContactoTelefono" value={formData.clienteContactoTelefono} onChange={handleChange} /></Grid>
        </Grid>

        {/* SECCIÓN DATOS DEL EMISOR */}
        <Typography variant="h6" sx={sectionTitleStyle}>Datos del Emisor</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Presupuesto Creado por" name="emisorNombre" value={formData.emisorNombre} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Área Comercial" name="emisorAreaComercial" value={formData.emisorAreaComercial} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Email Emisor" name="emisorEmail" type="email" value={formData.emisorEmail} onChange={handleChange} /></Grid>
        </Grid>

        {/* SECCIÓN COMENTARIOS Y TÉRMINOS */}
        <Typography variant="h6" sx={sectionTitleStyle}>Comentarios y Condiciones</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Comentarios Adicionales</Typography>
            <TextareaAutosize minRows={3} style={{ width: '100%', padding: '8px', borderColor: '#ccc', borderRadius: '4px' }} name="comentariosAdicionales" value={formData.comentariosAdicionales} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Términos de Pago" name="terminosPago" value={formData.terminosPago} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Medio de Pago" name="medioPago" value={formData.medioPago} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Forma de Pago" name="formaPago" value={formData.formaPago} onChange={handleChange} /></Grid>
        </Grid>

        {/* Resumen de Items (Solo para visualización, no editable aquí) */}
        <Typography variant="h6" sx={sectionTitleStyle}>Resumen de Equipos Calculados</Typography>
        {calculosData.itemsParaCotizar.map((item, index) => (
            <Box key={item.principal.codigo_producto || `item-${index}`} sx={{ mb: 1, p:1, border: '1px solid #eee', borderRadius: '4px'}}>
                <Typography variant="subtitle1">{item.principal.nombre_del_producto || 'Equipo sin nombre'}</Typography>
                {/* Aquí podrías mostrar un resumen muy breve si es necesario, o el precio calculado */}
            </Box>
        ))}
        <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
            Total de equipos principales a cotizar: {calculosData.itemsParaCotizar.length}
        </Typography>

        {/* Botones de Acción */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/resultados-calculo-costos')}>
            Volver a Resultados
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadCloud />} 
            onClick={handleGenerarPdf} 
            disabled={isLoading}
          >
            {isLoading ? 'Generando PDF...' : 'Generar Cotización PDF'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 