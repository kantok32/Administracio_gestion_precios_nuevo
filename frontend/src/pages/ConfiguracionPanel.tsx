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
  // Documento
  numeroCotizacion: string;
  referenciaDocumento: string; // Opcional
  fechaCreacion: string;
  fechaCaducidad: string;
  // Emisor (Vendedor)
  emisorNombre: string; // Nombre del creador del presupuesto
  emisorAreaComercial: string;
  emisorEmail: string; // Email del creador (asumo)
  // Comentarios
  comentariosAdicionales: string;
}

export default function ConfiguracionPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [calculosData, setCalculosData] = useState<LocationStateFromPrevPage | null>(null);
  const [formData, setFormData] = useState<CotizacionFormData>({
    numeroCotizacion: '', // Podría ser generado o sugerido
    referenciaDocumento: '',
    fechaCreacion: new Date().toISOString().split('T')[0],
    fechaCaducidad: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Default a 30 días
    emisorNombre: 'ADMIN', // <--- VALOR POR DEFECTO
    emisorAreaComercial: 'Ecoalliance', // <--- VALOR POR DEFECTO
    emisorEmail: 'Ecoalliance33@gmail.com', // <--- VALOR POR DEFECTO
    comentariosAdicionales: '',
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
      const response = await fetch('/api/calculo-historial/guardar-y-exportar', {
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
      const nombreArchivo = `Configuracion_${formData.numeroCotizacion || 'Calculo'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
          Configurar Datos
        </Typography>

        {/* SECCIÓN DATOS DEL EMISOR */}
        <Typography variant="h6" sx={sectionTitleStyle}>Datos del Emisor</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Presupuesto Creado por" name="emisorNombre" value={formData.emisorNombre} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Área Comercial" name="emisorAreaComercial" value={formData.emisorAreaComercial} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Email Emisor" name="emisorEmail" type="email" value={formData.emisorEmail} onChange={handleChange} /></Grid>
        </Grid>

        {/* SECCIÓN COMENTARIOS Y CONDICIONES MODIFICADA */}
        <Typography variant="h6" sx={sectionTitleStyle}>Comentarios Adicionales</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextareaAutosize minRows={3} style={{ width: '100%', padding: '8px', borderColor: '#ccc', borderRadius: '4px' }} name="comentariosAdicionales" value={formData.comentariosAdicionales} onChange={handleChange} placeholder="Ingrese comentarios adicionales aquí..."/>
          </Grid>
        </Grid>

        {/* Resumen de Items (Solo para visualización, no editable aquí) */}
        <Typography variant="h6" sx={sectionTitleStyle}>Resumen de Equipos Calculados</Typography>
        {calculosData.itemsParaCotizar.map((item, index) => (
            <Box key={item.principal.codigo_producto || `item-${index}`} sx={{ mb: 2, p:1.5, border: '1px solid #eee', borderRadius: '4px'}}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {item.principal.nombre_del_producto || 'Equipo sin nombre'}
                </Typography>
                {item.opcionales && item.opcionales.length > 0 && (
                  <Box sx={{ pl: 2, mt: 0.5, fontSize: '0.9rem' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Opcionales:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {item.opcionales.map((opcional, opIndex) => (
                        <li key={opcional.codigo_producto || `op-${index}-${opIndex}`}>
                          {opcional.nombre_del_producto || 'Opcional sin nombre'}
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
            </Box>
        ))}
        <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
            Total de equipos principales: {calculosData.itemsParaCotizar.length}
        </Typography>

        {/* Botones de Acción */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/resultados-calculo-costos', { state: calculosData })}>
            Volver a Resultados
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadCloud />} 
            onClick={handleGenerarPdf} 
            disabled={isLoading}
          >
            {isLoading ? 'Generando Informe...' : 'Generar Informe'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 