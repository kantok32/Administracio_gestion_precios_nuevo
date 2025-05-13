import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Download, Plus, X, AlertCircle, CheckCircle, FileSpreadsheet, Table2 } from 'lucide-react';
import * as XLSX from 'xlsx'; // Importar XLSX para generar el archivo Excel

// Interfaz para una especificación técnica
interface SpecItem {
  id: number; // Para el key en React
  nombre: string;
  valor: string;
}

// Estado inicial para el formulario, reflejando la estructura del Schema
const initialFormData = {
  Codigo_Producto: '',
  categoria: '',
  peso_kg: '',
  caracteristicas: {
    nombre_del_producto: '',
    modelo: '',
  },
  dimensiones: {
    largo_cm: '',
    ancho_cm: '',
    alto_cm: '',
  },
  // <<<--- Añadir campos de costo al estado inicial --->>>
  costo_fabrica_original_eur: '',
  costo_ano_cotizacion: '',
  // <<<---------------------------------------------->>>
  // Otros campos opcionales de nivel superior
  tipo: '',
  familia: '',
  proveedor: '',
  procedencia: '',
  nombre_comercial: '',
  descripcion: '',
  clasificacion_easysystems: '',
  codigo_ea: '',
  // No incluimos especificaciones técnicas aquí, se manejarán por separado
  // metadata tampoco se maneja desde el form individual por ahora
};

// Definición de las cabeceras para la plantilla Excel (ESTRUCTURA PLANA PARA EL USUARIO)
const excelTemplateHeaders = [
  'Codigo_Producto', // Raíz
  'nombre_del_producto', // Raíz
  'Descripcion', // Raíz (Descripción general)
  'Modelo', // Raíz
  'categoria', // Raíz (Categoría principal)
  
  // Campos que irán a datos_contables en el backend
  'fecha_cotizacion',
  'costo_fabrica_original_eur',
  
  // Campos que irán a dimensiones en el backend
  'largo_cm',
  'ancho_cm',
  'alto_cm',
  'peso_kg',
  
  // Campos que irán a detalles en el backend (sin prefijo en el Excel)
  'detalle_adicional_1',
  'detalle_adicional_2',
  'detalle_adicional_3',
  'combustible',
  'hp',
  'diametro_mm',
  'movilidad',
  'rotacion',
  'es_opcional', // Se espera TRUE/FALSE o similar
  'modelo_compatible_manual',
  'clasificacion_easysystems',
  'numero_caracteristicas_tecnicas',
  'codigo_ea',
  'proveedor',
  'procedencia',
  'familia',
  'nombre_comercial',
  'descripcion_detallada', // La descripción más específica
  'elemento_corte',
  'garganta_alimentacion_mm',
  'tipo_motor',
  'potencia_motor_kw_hp',
  'tipo_enganche',
  'tipo_chasis',
  'capacidad_chasis_velocidad',
  'tipo_producto_detalles'
];

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  summary?: any; // Para mantener el resumen de la carga
}

export default function CargaEquiposPanel() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [specItems, setSpecItems] = useState<SpecItem[]>([]); // Estado para especificaciones dinámicas
  const [nextSpecId, setNextSpecId] = useState(1); // Para generar IDs únicos para keys
  const [errors, setErrors] = useState<Record<string, string>>({}); // Para errores de validación
  const [submitStatus, setSubmitStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // <<<--- Estados para Carga Masiva --->>>
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: 'idle', message: '' });
  // <<<--- INICIO: Nuevo estado para el tipo de carga --- >>>
  type UploadType = 'plain' | 'matrix';
  const [uploadType, setUploadType] = useState<UploadType>('plain');
  // <<<--- FIN: Nuevo estado para el tipo de carga --- >>>

  const [searchTerm, setSearchTerm] = useState('');

  // --- Manejadores de Input --- 
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error para este campo al empezar a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNestedInputChange = (group: 'caracteristicas' | 'dimensiones', e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [name]: value
      }
    }));
    // Limpiar error para este campo
    const errorKey = `${group}.${name}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  // --- Manejadores de Especificaciones Técnicas --- 
  const handleSpecChange = (id: number, field: 'nombre' | 'valor', value: string) => {
    setSpecItems(prevSpecs => 
      prevSpecs.map(spec => 
        spec.id === id ? { ...spec, [field]: value } : spec
      )
    );
    // Limpiar errores relacionados con specs
    if (errors[`spec_${id}_nombre`] || errors[`spec_${id}_valor`]) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[`spec_${id}_nombre`];
            delete newErrors[`spec_${id}_valor`];
            return newErrors;
        });
    }
  };

  const addSpecItem = () => {
    setSpecItems(prevSpecs => [
      ...prevSpecs,
      { id: nextSpecId, nombre: '', valor: '' }
    ]);
    setNextSpecId(prevId => prevId + 1);
  };

  const removeSpecItem = (idToRemove: number) => {
    setSpecItems(prevSpecs => prevSpecs.filter(spec => spec.id !== idToRemove));
     // Limpiar errores asociados si existían
     setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[`spec_${idToRemove}_nombre`];
        delete newErrors[`spec_${idToRemove}_valor`];
        return newErrors;
    });
  };

  // --- Validación --- 
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Campos obligatorios de nivel superior
    if (!formData.Codigo_Producto.trim()) { newErrors.Codigo_Producto = 'Código es obligatorio'; isValid = false; }
    if (!formData.categoria.trim()) { newErrors.categoria = 'Categoría es obligatoria'; isValid = false; }
    // Validar peso después de intentar parsear
    const pesoKg = parseFloat(formData.peso_kg);
    if (isNaN(pesoKg)) { newErrors.peso_kg = 'Peso (kg) debe ser un número válido'; isValid = false; }
    else if (formData.peso_kg.trim() === '') { newErrors.peso_kg = 'Peso (kg) es obligatorio'; isValid = false; }

    // Campos obligatorios en caracteristicas
    // if (!formData.caracteristicas.nombre_del_producto.trim()) { newErrors['caracteristicas.nombre_del_producto'] = 'Nombre es obligatorio'; isValid = false; }
    if (!formData.caracteristicas.modelo.trim()) { newErrors['caracteristicas.modelo'] = 'Modelo es obligatorio'; isValid = false; }

    // Campos obligatorios en dimensiones
    const largoCm = parseFloat(formData.dimensiones.largo_cm);
    if (isNaN(largoCm)) { newErrors['dimensiones.largo_cm'] = 'Largo (cm) debe ser un número válido'; isValid = false; }
    else if (formData.dimensiones.largo_cm.trim() === '') { newErrors['dimensiones.largo_cm'] = 'Largo (cm) es obligatorio'; isValid = false; }

    const anchoCm = parseFloat(formData.dimensiones.ancho_cm);
    if (isNaN(anchoCm)) { newErrors['dimensiones.ancho_cm'] = 'Ancho (cm) debe ser un número válido'; isValid = false; }
    else if (formData.dimensiones.ancho_cm.trim() === '') { newErrors['dimensiones.ancho_cm'] = 'Ancho (cm) es obligatorio'; isValid = false; }

    const altoCm = parseFloat(formData.dimensiones.alto_cm);
     if (isNaN(altoCm)) { newErrors['dimensiones.alto_cm'] = 'Alto (cm) debe ser un número válido'; isValid = false; }
     else if (formData.dimensiones.alto_cm.trim() === '') { newErrors['dimensiones.alto_cm'] = 'Alto (cm) es obligatorio'; isValid = false; }

    // <<<--- Validar nuevos campos de costo (si no están vacíos, deben ser números) --->>>
    if (formData.costo_fabrica_original_eur.trim() !== '' && isNaN(parseFloat(formData.costo_fabrica_original_eur))) {
      newErrors.costo_fabrica_original_eur = 'Costo Fábrica debe ser un número válido';
      isValid = false;
    }
    if (formData.costo_ano_cotizacion.trim() !== '' && isNaN(parseFloat(formData.costo_ano_cotizacion))) {
      newErrors.costo_ano_cotizacion = 'Costo Año Cotización debe ser un número válido';
      isValid = false;
    }
    // <<<----------------------------------------------------------------------------->>>

    // Validar especificaciones (nombre y valor no pueden estar vacíos si la fila existe)
    specItems.forEach(spec => {
        const nombreTrimmed = spec.nombre.trim();
        const valorTrimmed = spec.valor.trim();
        if (!nombreTrimmed) { newErrors[`spec_${spec.id}_nombre`] = 'Nombre de especificación no puede estar vacío'; isValid = false; }
        if (!valorTrimmed) { newErrors[`spec_${spec.id}_valor`] = 'Valor de especificación no puede estar vacío'; isValid = false; }
        // Validar unicidad de nombres de especificación
        if (nombreTrimmed) {
             const duplicate = specItems.find(s => s.id !== spec.id && s.nombre.trim().toLowerCase() === nombreTrimmed.toLowerCase());
             if (duplicate) {
                 newErrors[`spec_${spec.id}_nombre`] = `Nombre "${spec.nombre}" duplicado (ignorando mayúsculas)`; 
                 isValid = false;
             }
         }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, specItems]);

  // --- Submit --- 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus({ type: 'idle', message: '' }); // Reset status
    setErrors({}); // Reset errors

    if (!validateForm()) {
        setSubmitStatus({ type: 'error', message: 'Por favor, corrija los errores en el formulario.' });
        return;
    }

    setSubmitStatus({ type: 'loading', message: 'Creando equipo...' });

    // Formatear especificaciones técnicas como objeto { nombre: valor }
    const especificaciones_tecnicas = specItems.reduce((acc, spec) => {
        // Solo incluir si nombre y valor no están vacíos (ya validado, pero doble check)
        if (spec.nombre.trim() && spec.valor.trim()) {
             acc[spec.nombre.trim()] = spec.valor.trim();
        }
      return acc;
    }, {} as Record<string, string>);

    // --- DEBUG: Loggear el estado ANTES de construir el payload ---
    console.log('Estado formData ANTES de crear payload:', formData);
    console.log('Nombre producto en estado:', formData.caracteristicas.nombre_del_producto);
    console.log('Modelo en estado:', formData.caracteristicas.modelo);
    // -------------------------------------------------------------

    // Preparar payload final para enviar
    const payload = {
        ...formData,
         // Convertir números a Number
         peso_kg: parseFloat(formData.peso_kg) || 0,
         dimensiones: {
            largo_cm: parseFloat(formData.dimensiones.largo_cm) || 0,
            ancho_cm: parseFloat(formData.dimensiones.ancho_cm) || 0,
            alto_cm: parseFloat(formData.dimensiones.alto_cm) || 0,
         },
         // <<<--- Convertir nuevos campos de costo a Number si existen --->>>
         ...(formData.costo_fabrica_original_eur && { costo_fabrica_original_eur: parseFloat(formData.costo_fabrica_original_eur) }),
         ...(formData.costo_ano_cotizacion && { costo_ano_cotizacion: parseFloat(formData.costo_ano_cotizacion) }),
         // <<<-------------------------------------------------------------->>>
        especificaciones_tecnicas,
    };

    console.log('Enviando payload:', payload);

    try {
        // --- PRUEBA TEMPORAL: Usar URL absoluta del backend ---
        // const response = await fetch('/api/products/equipment', { 
        const response = await fetch('http://localhost:5001/api/products/equipment', { 
        // -----------------------------------------------------
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Usar mensaje de error del backend si está disponible
        throw new Error(result.message || `Error del servidor: ${response.status}`); 
      }
      
      // Cambiar el mensaje de éxito y cerrar el modal
      setSubmitStatus({ type: 'success', message: 'EL PRODUCTO A SIDO AGREGADO CON EXITO' }); // Mensaje exacto
      // Resetear formulario y specs después de éxito
      setFormData(initialFormData);
      setSpecItems([]);
      setNextSpecId(1);
      // Cerrar el modal automáticamente
      setShowModal(false); 

    } catch (error: unknown) {
      console.error('Error al crear equipo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear el equipo';
      setSubmitStatus({ type: 'error', message: errorMessage });
    }
  };

  // --- Lógica para descargar la plantilla de carga masiva PLANA (Equipos) ---
  const handleDownloadTemplate = () => {
    // Asume que tienes una forma de obtener la URL base de la API, ej. process.env.REACT_APP_API_URL
    // o si el frontend y backend están en el mismo dominio, puedes usar una ruta relativa.
    const templateUrl = `/api/products/download-template`;
    window.location.href = templateUrl; // Inicia la descarga
  };

  // --- Lógica para descargar la plantilla de carga masiva MATRICIAL (Especificaciones CSV) ---
  const handleDownloadSpecificationsTemplate = () => {
    const templateUrl = `/api/products/download-specifications-template`;
    window.location.href = templateUrl; // Inicia la descarga
  };

  // <<<--- Manejadores para Carga Masiva --->>>
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus({ type: 'idle', message: '' }); // Reset status on new file selection
      console.log('Archivo seleccionado:', event.target.files[0].name);
    } else {
      setSelectedFile(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Por favor, seleccione un archivo Excel.' });
      return;
    }

    setUploadStatus({ type: 'uploading', message: 'Subiendo y procesando archivo...' });

    const formData = new FormData();
    let endpoint = '';
    let fileNameInForm = '';

    if (uploadType === 'plain') {
      endpoint = 'http://localhost:5001/api/products/upload-plain'; 
      fileNameInForm = 'archivoExcelPlain'; 
      console.log('Iniciando carga PLANA (Nuevos Equipos) al endpoint:', endpoint);
    } else if (uploadType === 'matrix') {
      endpoint = 'http://localhost:5001/api/products/upload-specifications';
      fileNameInForm = 'archivoEspecificaciones'; // Coincide con la ruta /upload-specifications
      console.log('Iniciando carga MATRICIAL (Actualizar Especificaciones) al endpoint:', endpoint);
    } else {
      setUploadStatus({ type: 'error', message: 'Tipo de carga no reconocido.' });
      return;
    }
    formData.append(fileNameInForm, selectedFile);

    try {
      const response = await fetch(endpoint, { // Usar el endpoint dinámico
        method: 'POST',
        body: formData,
        // ¡No establecer Content-Type manualmente para FormData!
      });

      const result = await response.json();

      // --- Revisar si hubo errores, incluso con respuesta OK (status 207) --- 
      const hasErrors = result.summary?.errors?.length > 0;
      const finalStatusType = hasErrors ? 'error' : 'success';
      const finalMessage = hasErrors 
          ? `Error al cargar: ${result.summary.errors.length} ${result.summary.errors.length === 1 ? 'error encontrado' : 'errores encontrados'}.` 
          : (result.message || 'Carga completada exitosamente.');
      // ------------------------------------------------------------------------

      if (!response.ok && !hasErrors) { // Si la respuesta NO es ok Y NO es por errores parciales
        // Usar mensaje de error del backend
        throw new Error(result.message || `Error del servidor: ${response.status}`);
      }

      // Establecer estado final (éxito o error basado en errores parciales)
      setUploadStatus({
        type: finalStatusType, 
        message: finalMessage,
        summary: result.summary // Guardar el resumen para mostrar
      });
      console.log('Resultado carga masiva:', result);
      setSelectedFile(null); // Limpiar archivo seleccionado
      // Limpiar el input de archivo (forma un poco hacky pero común)
      const fileInput = document.getElementById('bulk-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: unknown) {
      console.error('Error en carga masiva:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la carga.';
      setUploadStatus({ type: 'error', message: errorMessage });
    }
  };
  // <<<------------------------------------>>>

  const panelStyle: React.CSSProperties = {
    // Removido padding aquí para confiar en el padding de App.tsx
  };
  
  const titleStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '24px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  };

  const uploadZoneStyle: React.CSSProperties = {
    border: '2px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    color: '#64748b',
    marginBottom: '24px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '16px',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#475569',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    gap: '8px',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    cursor: 'not-allowed',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginBottom: '24px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
    fontWeight: 600,
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '24px'
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px'
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    width: '100%',
    maxWidth: '280px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155'
  };

  const errorStyle: React.CSSProperties = { color: '#ef4444', fontSize: '12px', marginTop: '4px' };

  // Modal styles
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: showModal ? 'flex' : 'none',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
  };

  const modalCloseButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '5px'
  };

  const actionButtonsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  };

  const specRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' };
  const statusMessageStyle: React.CSSProperties = { marginTop: '15px', padding: '10px', borderRadius: '6px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
  const successStatusStyle: React.CSSProperties = { ...statusMessageStyle, backgroundColor: '#dcfce7', color: '#166534' };
  const errorStatusStyle: React.CSSProperties = { ...statusMessageStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
  const loadingStatusStyle: React.CSSProperties = { ...statusMessageStyle, backgroundColor: '#e0f2fe', color: '#075985' };

  return (
    <div style={panelStyle}>
      <h1 style={titleStyle}>Carga de Equipos</h1>

      {/* Action Buttons */}
      <div style={actionButtonsStyle}>
        <div></div>
        <motion.button 
          style={buttonStyle} 
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          Agregar Equipo Individual
        </motion.button>
      </div>

      {/* Modal para carga individual */}
      <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
        <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
          <button 
            style={modalCloseButtonStyle} 
            onClick={() => setShowModal(false)}
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>

          <h2 style={subtitleStyle}>Carga Individual de Equipo</h2>
          <p style={descriptionStyle}>
            Complete el formulario para agregar un equipo de forma individual.
          </p>
          
          <form style={formStyle} onSubmit={handleSubmit}>
            {/* Sección: Información General */}
            <h3 style={{ marginTop: '16px', marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#334155' }}>Información General</h3>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Código de Producto *</label>
                <input type="text" name="Codigo_Producto" value={formData.Codigo_Producto} onChange={handleInputChange} style={inputStyle} required />
                {errors.Codigo_Producto && <span style={errorStyle}>{errors.Codigo_Producto}</span>}
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Nombre del Producto</label>
                <input type="text" name="nombre_del_producto" value={formData.caracteristicas.nombre_del_producto} onChange={(e) => handleNestedInputChange('caracteristicas', e)} style={inputStyle} />
                {errors['caracteristicas.nombre_del_producto'] && <span style={errorStyle}>{errors['caracteristicas.nombre_del_producto']}</span>}
              </div>
            </div>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Modelo *</label>
                <input type="text" name="modelo" value={formData.caracteristicas.modelo} onChange={(e) => handleNestedInputChange('caracteristicas', e)} style={inputStyle} required />
                {errors['caracteristicas.modelo'] && <span style={errorStyle}>{errors['caracteristicas.modelo']}</span>}
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Categoría *</label>
                <input type="text" name="categoria" value={formData.categoria} onChange={handleInputChange} style={inputStyle} required />
              </div>
            </div>

            {/* Sección: Dimensiones */}
            <h3 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#334155' }}>Dimensiones</h3>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Largo (cm) *</label>
                <input type="number" name="largo_cm" value={formData.dimensiones.largo_cm} onChange={(e) => handleNestedInputChange('dimensiones', e)} style={inputStyle} required />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Ancho (cm) *</label>
                <input type="number" name="ancho_cm" value={formData.dimensiones.ancho_cm} onChange={(e) => handleNestedInputChange('dimensiones', e)} style={inputStyle} required />
              </div>
            </div>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Alto (cm) *</label>
                <input type="number" name="alto_cm" value={formData.dimensiones.alto_cm} onChange={(e) => handleNestedInputChange('dimensiones', e)} style={inputStyle} required />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Peso (kg) *</label>
                <input type="number" name="peso_kg" value={formData.peso_kg} onChange={handleInputChange} style={inputStyle} required />
              </div>
            </div>

            {/* <<<--- Nueva Sección: Costos --->>> */} 
            <h3 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#334155' }}>Costos</h3>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Costo Fábrica Original (EUR)</label>
                <input 
                  type="number" 
                  name="costo_fabrica_original_eur" 
                  value={formData.costo_fabrica_original_eur} 
                  onChange={handleInputChange} 
                  style={inputStyle} 
                  step="0.01" // Permite decimales
                />
                {errors.costo_fabrica_original_eur && <span style={errorStyle}>{errors.costo_fabrica_original_eur}</span>}
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Costo Año Cotización</label>
                <input 
                  type="number" 
                  name="costo_ano_cotizacion" 
                  value={formData.costo_ano_cotizacion} 
                  onChange={handleInputChange} 
                  style={inputStyle} 
                  step="0.01" // Permite decimales
                />
                {errors.costo_ano_cotizacion && <span style={errorStyle}>{errors.costo_ano_cotizacion}</span>}
              </div>
            </div>
            {/* <<<-------------------------------->>> */}

            {/* Sección: Especificaciones Técnicas */}
            <h3 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#334155' }}>Especificaciones Técnicas</h3>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Clasificación EasySystems *</label>
                <input type="text" name="clasificacion_easysystems" value={formData.clasificacion_easysystems} onChange={handleInputChange} style={inputStyle} required />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Código EA *</label>
                <input type="text" name="codigo_ea" value={formData.codigo_ea} onChange={handleInputChange} style={inputStyle} required />
              </div>
            </div>
            <div style={inputGroupStyle}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Proveedor *</label>
                <input type="text" name="proveedor" value={formData.proveedor} onChange={handleInputChange} style={inputStyle} required />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Procedencia *</label>
                <input type="text" name="procedencia" value={formData.procedencia} onChange={handleInputChange} style={inputStyle} required />
              </div>
            </div>

            {/* Sección: Especificaciones Técnicas Dinámicas */}
            <section>
              <h3 style={{...subtitleStyle, fontSize: '16px'}}>Especificaciones Técnicas</h3>
              {specItems.map((spec, index) => (
                <div key={spec.id} style={specRowStyle}>
                  <div style={{...inputContainerStyle, flexGrow: 1}}>
                    <input 
                      type="text" 
                      placeholder={`Nombre Especificación ${index + 1}`}
                      value={spec.nombre}
                      onChange={(e) => handleSpecChange(spec.id, 'nombre', e.target.value)}
                      style={inputStyle}
                    />
                    {errors[`spec_${spec.id}_nombre`] && <span style={errorStyle}>{errors[`spec_${spec.id}_nombre`]}</span>}
                  </div>
                  <div style={{...inputContainerStyle, flexGrow: 1}}>
                    <input 
                      type="text" 
                      placeholder={`Valor Especificación ${index + 1}`}
                      value={spec.valor}
                      onChange={(e) => handleSpecChange(spec.id, 'valor', e.target.value)}
                      style={inputStyle}
                    />
                    {errors[`spec_${spec.id}_valor`] && <span style={errorStyle}>{errors[`spec_${spec.id}_valor`]}</span>}
                  </div>
                  <button type="button" onClick={() => removeSpecItem(spec.id)} style={{...buttonStyle, padding: '8px'}} aria-label="Eliminar especificación">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSpecItem} style={{...buttonStyle, marginTop: '10px'}}>
                <Plus size={16} /> Añadir Especificación
              </button>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" 
                style={{...buttonStyle, backgroundColor: '#94a3b8', marginRight: '12px'}} 
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button type="submit" style={buttonStyle}>
                <Plus size={16} />
                Agregar Equipo
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sección de Carga Masiva */}
      <div style={sectionStyle}>
        <div style={cardStyle}>
          <h2 style={subtitleStyle}>Carga Masiva de Equipos</h2>
          <p style={descriptionStyle}>
            Utilice esta sección para cargar nuevos equipos o actualizar especificaciones existentes mediante plantillas. Descargue la plantilla correspondiente, complete los datos y suba el archivo.
          </p>

          {/* Grupo de Botones para Descargar Plantillas */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            {/* Botón Descargar Plantilla de Equipos (XLSX) - Estilo Azul Principal */}
            <button 
              style={{...buttonStyle, backgroundColor: '#3b82f6'}} // Azul, sin flexGrow
              onClick={handleDownloadTemplate}
            >
              <Download size={16} />
              Descargar Plantilla Equipos (XLSX)
            </button>

            {/* NUEVO Botón Descargar Plantilla de Especificaciones (CSV) - Estilo Verde o similar */}
            <button 
              style={{...buttonStyle, backgroundColor: '#10b981'}} // Verde, sin flexGrow
              onClick={handleDownloadSpecificationsTemplate}
            >
              <FileSpreadsheet size={16} />
              Descargar Plantilla Especificaciones (CSV)
            </button>
          </div>
          
          {/* Zona de Carga */}
          <div style={uploadZoneStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>1. Seleccione el tipo de carga:</h4>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding:'8px', borderRadius:'4px', backgroundColor: uploadType === 'plain' ? '#e0f2fe' : 'transparent'}}>
                <input 
                  type="radio" 
                  name="uploadType" 
                  value="plain" 
                  checked={uploadType === 'plain'}
                  onChange={() => setUploadType('plain')} 
                  style={{ marginRight: '8px' }}
                />
                <FileSpreadsheet size={18} style={{marginRight: '5px'}}/>
                Cargar Nuevos Equipos (Plantilla General)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding:'8px', borderRadius:'4px', backgroundColor: uploadType === 'matrix' ? '#e0f2fe' : 'transparent' }}>
                <input 
                  type="radio" 
                  name="uploadType" 
                  value="matrix" 
                  checked={uploadType === 'matrix'}
                  onChange={() => setUploadType('matrix')} 
                  style={{ marginRight: '8px' }}
                />
                <Table2 size={18} style={{marginRight: '5px'}}/>
                Actualizar Especificaciones (Formato Matricial)
              </label>
            </div>
             <p style={{fontSize: '12px', color: '#64748b', marginTop: '10px'}}>
              {uploadType === 'plain' 
                ? "Use la 'Plantilla General (XLSX)' para crear nuevos equipos o actualizar su información básica (nombre, modelo, dimensiones, etc.)."
                : "Use la 'Plantilla Especificaciones (CSV)' para actualizar únicamente las especificaciones técnicas de equipos existentes mediante un formato matricial (Código Producto vs Nombre Especificación)."
              }
            </p>
            <UploadCloud size={38} style={{ marginBottom: '12px', color: '#94a3b8' }} />
            <p style={{...descriptionStyle, marginBottom: '18px'}}>
              {selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : 'Arrastre aquí su archivo Excel o haga clic para seleccionarlo.'}
              <br />
              Formatos soportados: .xlsx, .xls
            </p>
            {/* Input de archivo oculto y botón visible */}
            <input 
              type="file" 
              id="bulk-upload-input" 
              style={{ display: 'none' }} 
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
            />
            <label htmlFor="bulk-upload-input" style={{...buttonStyle, cursor: 'pointer', backgroundColor: '#64748b', marginRight: '12px'}}>
              <FileText size={16} />
              Seleccionar Archivo
            </label>
            <button 
              style={selectedFile && uploadStatus.type !== 'uploading' ? buttonStyle : disabledButtonStyle} 
              onClick={handleBulkUpload} 
              disabled={!selectedFile || uploadStatus.type === 'uploading'}
            >
              {uploadStatus.type === 'uploading' ? 'Cargando...' : 'Cargar Archivo'}
            </button>
          </div>

          {/* Mensajes de Estado/Resultado Carga Masiva */}
          {uploadStatus.type === 'uploading' && (
            <div style={loadingStatusStyle}>{uploadStatus.message}</div>
          )}
          {uploadStatus.type === 'success' && (
            <div style={successStatusStyle}>
              <CheckCircle size={16} /> {uploadStatus.message}
            </div>
          )}
          {uploadStatus.type === 'error' && (
            <div style={errorStatusStyle}>
              <AlertCircle size={16} /> {uploadStatus.message}
            </div>
          )}
          
          {/* Mostrar Resumen detallado en caso de éxito o error con summary */}
          {uploadStatus.summary && (
            <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ marginBottom: '10px', fontWeight: 600 }}>Resumen de la Carga:</h4>
              <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
                <li>Filas en Excel: {uploadStatus.summary.totalRowsInExcel ?? 'N/A'}</li>
                <li>Filas Procesadas: {uploadStatus.summary.rowsProcessed ?? 'N/A'}</li>
                <li>Insertados: {uploadStatus.summary.inserted ?? 0}</li>
                <li>Actualizados: {uploadStatus.summary.updated ?? 0}</li>
                <li>Filas con Errores: {uploadStatus.summary.rowsWithErrors ?? 0}</li>
              </ul>
              {uploadStatus.summary.errors && uploadStatus.summary.errors.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <h5 style={{ marginBottom: '5px', fontWeight: 600 }}>Detalle de Errores:</h5>
                  <ul style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #fee2e2', padding: '10px', borderRadius: '4px' }}>
                    {uploadStatus.summary.errors.map((err: any, index: number) => (
                      <li key={index} style={{ marginBottom: '5px' }}>
                        <strong>{err.codigo ? `Código ${err.codigo}:` : 'Fila sin código:'}</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{fontSize: '13px', color: '#64748b'}}>
            <strong>Notas importantes:</strong>
            <ul style={{marginTop: '8px', lineHeight: '1.5'}}>
              <li>Los archivos no deben exceder 10MB</li>
              <li>Todas las fechas deben estar en formato YYYY-MM-DD</li>
              <li>Los números decimales deben usar punto como separador</li>
              <li>Los campos vacíos deben dejarse en blanco, no usar 'N/A' o "null"</li>
              <li>Las dimensiones deben ser números enteros</li>
              <li>Los códigos de producto deben ser únicos (para plantilla general) o existentes (para plantilla de especificaciones).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 