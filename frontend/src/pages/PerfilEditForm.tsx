import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
// Reintroducir useParams y useNavigate
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  Switch,
  FormControlLabel,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Save, X, ArrowLeft, ChevronDown } from 'lucide-react';
import { CostoPerfilData } from '../types';
import { api } from '../services/api';

// Helper para formatear números
const formatNumberForInput = (value: number | string | boolean | undefined | null): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// Props opcionales para flexibilidad
interface PerfilEditFormProps {
  profileId?: string; // ID opcional pasado como prop
  onSaveSuccess?: () => void; // Callback opcional
  onCancel?: () => void; // Callback opcional
}

const PerfilEditForm: React.FC<PerfilEditFormProps> = ({ profileId, onSaveSuccess, onCancel }) => {
  // Obtener ID de la URL si no se pasa como prop
  const { id: idFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Necesario si se usa como página

  // Determinar qué ID usar (prop > url)
  const idToUse = profileId || idFromUrl;

  const [perfilData, setPerfilData] = useState<Partial<CostoPerfilData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // Estado para Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchPerfil = async () => {
      // Usar el ID determinado (prop o url)
      if (!idToUse) {
        setError('No se proporcionó un ID de perfil.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        console.log(`[PerfilEditForm] Fetching profile with ID: ${idToUse}`);
        const data = await api.fetchProfileData(idToUse);
        if (data) {
          console.log(`[PerfilEditForm] Profile data received:`, data);
          setPerfilData(data);
        } else {
          setError(`No se encontró un perfil con ID: ${idToUse}`);
        }
      } catch (err: any) {
        console.error('[PerfilEditForm] Error fetching profile:', err);
        setError(err.message || 'Error al cargar los datos del perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
    // Depender del ID determinado
  }, [idToUse]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = event.target as HTMLInputElement; // Asegurar tipo para checked

    // Determinar el valor correcto (número, booleano o string)
    let parsedValue: string | number | boolean = value;
    if (type === 'number') {
      parsedValue = parseFloat(value) || 0;
      if (name.endsWith('_pct')) {
        parsedValue = (parseFloat(value) || 0) / 100;
      }
    } else if (type === 'checkbox') {
      parsedValue = checked;
    }

    setPerfilData(prevData => ({
      ...prevData,
      [name]: parsedValue,
    }));
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!idToUse || !perfilData) {
      setError('No hay datos de perfil para guardar.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('[PerfilEditForm] Attempting to update profile:', idToUse, perfilData);
      const { _id, createdAt, updatedAt, ...updatePayload } = perfilData;

      await api.updateProfile(idToUse, updatePayload);
      console.log('[PerfilEditForm] Profile updated successfully');

      // Mostrar Snackbar de éxito
      setSnackbarMessage('Perfil actualizado exitosamente!');
      setSnackbarOpen(true);

      // Llamar a onSaveSuccess si existe (modal), si no, esperar un poco y navegar (página)
      if (onSaveSuccess) {
        // Esperar un poco para que se vea el Snackbar antes de cerrar modal
        setTimeout(() => {
             onSaveSuccess();
        }, 1500); // Espera 1.5 segundos
      } else {
         // Esperar un poco y navegar atrás si es página independiente
         setTimeout(() => {
            navigate('/admin/perfiles');
         }, 1500); 
      }

    } catch (err: any) {
      console.error('[PerfilEditForm] Error updating profile:', err);
      setError(err.response?.data?.message || err.message || 'Error al guardar el perfil.');
    } finally {
      // No poner setIsSaving(false) inmediatamente si usamos timeout
      // Se podría poner dentro del timeout o quitar si la navegación/cierre lo desmonta
       // Dejémoslo aquí por ahora, se reseteará si hay error o al recargar
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(); // Llamar si está en modal
    } else {
      navigate('/admin/perfiles'); // Navegar si es página
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
     if (reason === 'clickaway') {
       return;
     }
     setSnackbarOpen(false);
  };

  // Función renderizadora simplificada para CostoPerfilData
  const renderTextField = (fieldName: keyof Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'>, label: string, type: string = 'text', required: boolean = false, adornment?: string) => {
      let value: string | number = formatNumberForInput(perfilData?.[fieldName]);
      let inputType = type;

      // Manejo especial para porcentajes (mostrar como 0-100)
      if (fieldName.endsWith('_pct') && typeof perfilData?.[fieldName] === 'number') {
          value = ( (perfilData[fieldName] as number) * 100 ).toString();
          inputType = 'number'; // Los porcentajes son números
      }

      return (
          <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label={label}
              name={fieldName}
              type={inputType}
              value={value}
              onChange={handleInputChange}
              required={required}
              InputProps={adornment ? {
                   endAdornment: <InputAdornment position="end">{adornment}</InputAdornment>,
              } : undefined}
              InputLabelProps={{
                   shrink: true,
              }}
              inputProps={{
                 step: inputType === 'number' ? (fieldName.endsWith('_pct') ? '0.1' : 'any') : undefined
               }}
              disabled={isSaving || loading}
          />
      );
  };

  // Determinar si se está usando como página o modal para renderizar
  const isStandalonePage = !onCancel && !onSaveSuccess;

  if (loading) {
     // Mostrar loader adecuado según contexto
     return <Box sx={{ display: 'flex', justifyContent: 'center', p: isStandalonePage ? 5 : 3 }}><CircularProgress /></Box>;
  }

  if (error && !isSaving) {
     // Mostrar error adecuado según contexto
     const errorContent = (
         <Box sx={{ p: isStandalonePage ? 3 : 2 }}>
             <Alert severity="error">{error}</Alert>
             <Button
                 variant="outlined"
                 // Usar icono y función correctos
                 startIcon={isStandalonePage ? <ArrowLeft /> : <X />}
                 onClick={handleCancel}
                 sx={{ mt: 2 }}
             >
                 {isStandalonePage ? 'Volver' : 'Cerrar'}
             </Button>
         </Box>
     );
     return isStandalonePage ? <Container>{errorContent}</Container> : errorContent;
  }

  const formContent = (
       <form onSubmit={handleSubmit}>
          {/* --- Acordeón Datos Generales (expandido por defecto) --- */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
             <AccordionSummary expandIcon={<ChevronDown />} aria-controls="general-content" id="general-header">
                 <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Datos Generales</Typography>
             </AccordionSummary>
             <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                 <Grid container spacing={2}>
                     <Grid item xs={12} md={6}>{renderTextField('nombre_perfil', 'Nombre del Perfil', 'text', true)}</Grid>
                     <Grid item xs={12} md={6}>{renderTextField('descripcion', 'Descripción', 'text')}</Grid>
                     <Grid item xs={12}>
                        <FormControlLabel
                           control={<Switch checked={!!perfilData?.activo} onChange={handleInputChange} name="activo" disabled={isSaving || loading} />}
                           label="Perfil Activo"
                           sx={{ pl: 1 }} // Añadir padding para alinear
                        />
                     </Grid>
                 </Grid>
             </AccordionDetails>
          </Accordion>
          
          {/* --- Acordeón Logistica y seguro --- */}
          <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
             <AccordionSummary expandIcon={<ChevronDown />} aria-controls="logistica-content" id="logistica-header">
                 <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Logistica y seguro</Typography>
             </AccordionSummary>
             <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                 <Grid container spacing={2}>
                     <Grid item xs={6} sm={4} md={3}>{renderTextField('costo_logistica_origen_eur', 'Costo Origen', 'number', false, 'EUR')}</Grid>
                     <Grid item xs={6} sm={4} md={3}>{renderTextField('flete_maritimo_usd', 'Flete Marítimo P.', 'number', false, 'USD')}</Grid>
                     <Grid item xs={6} sm={4} md={3}>{renderTextField('recargos_destino_usd', 'Recargos Destino', 'number', false, 'USD')}</Grid>
                     <Grid item xs={6} sm={4} md={3}>{renderTextField('tasa_seguro_pct', 'Tasa Seguro', 'number', false, '%')}</Grid>
                     <Grid item xs={6} sm={4} md={3}>{renderTextField('transporte_nacional_clp', 'Transp. Nacional', 'number', false, 'CLP')}</Grid>
                 </Grid>
            </AccordionDetails>
          </Accordion>

           {/* --- Acordeón Costos de Importación --- */}
           <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ChevronDown />} aria-controls="importacion-content" id="importacion-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Costos de Importación</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                  <Grid container spacing={2}>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('costo_agente_aduana_usd', 'Costo Ag. Aduana', 'number', false, 'USD')}</Grid>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('gastos_portuarios_otros_usd', 'Gastos Puerto/Otros', 'number', false, 'USD')}</Grid>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('derecho_advalorem_pct', 'Derecho AdValorem', 'number', false, '%')}</Grid>
                  </Grid>
             </AccordionDetails>
           </Accordion>

           {/* --- Acordeón Conversión a CLP y Margen --- */}
           <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ChevronDown />} aria-controls="conversion-content" id="conversion-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Conversión a CLP y Margen</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                  <Grid container spacing={2}>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('margen_adicional_pct', '% Adicional Total', 'number', false, '%')}</Grid>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('buffer_usd_clp_pct', 'Buffer USD/CLP', 'number', false, '%')}</Grid>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('buffer_eur_usd_pct', 'Buffer EUR/USD', 'number', false, '%')}</Grid>
                      <Grid item xs={6} sm={4} md={3}>{renderTextField('iva_pct', 'IVA', 'number', false, '%')}</Grid>
                  </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* --- Acordeón Precios para Cliente --- */}
            <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
               <AccordionSummary expandIcon={<ChevronDown />} aria-controls="cliente-content" id="cliente-header">
                   <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Precios para Cliente</Typography>
               </AccordionSummary>
               <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                   <Grid container spacing={2}>
                       <Grid item xs={6} sm={4} md={3}>{renderTextField('descuento_fabrica_pct', 'Desc. Fábrica', 'number', false, '%')}</Grid>
                       <Grid item xs={6} sm={4} md={3}>{renderTextField('descuento_cliente_pct', 'Desc. Cliente', 'number', false, '%')}</Grid>
                   </Grid>
               </AccordionDetails>
             </Accordion>

           {/* --- Botones de Acción (fuera de los acordeones) --- */}
           <Grid container sx={{ mt: 3, px: 2 }} justifyContent="space-between">
             <Button
               variant="outlined"
               color="secondary"
               startIcon={<X />}
               onClick={handleCancel}
               disabled={isSaving}
             >
               Cancelar
             </Button>
             <Button
               type="submit"
               variant="contained"
               color="primary"
               startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />}
               disabled={isSaving || loading}
             >
               {isSaving ? 'Guardando...' : 'Guardar Cambios'}
             </Button>
           </Grid>
       </form>
  );

  return (
    // Renderizar con o sin Container/Paper según el contexto
    <> 
      {isStandalonePage ? (
        <Container component={Paper} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>Editar Perfil de Costo</Typography>
          <Typography variant="subtitle1" gutterBottom color="textSecondary">ID: {idToUse}</Typography>
          <Divider sx={{ my: 2 }} />
          {formContent}
          {/* Mostrar error de guardado aquí si es página */} 
          {error && isSaving && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Container>
      ) : (
        <Box>
            {/* El título y ID suelen estar en el Dialog/Modal padre */} 
            {formContent}
            {/* Mostrar error de guardado aquí si es modal */} 
            {error && isSaving && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      )}
      {/* Snackbar para notificaciones */}
      <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000} // Duración en ms
          onClose={handleCloseSnackbar}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Posición
      />
    </>
  );
};

export default PerfilEditForm; 