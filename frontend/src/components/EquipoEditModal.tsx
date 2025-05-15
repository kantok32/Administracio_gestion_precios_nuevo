import React, { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';

// Asume que tienes tipos definidos para Producto, si no, créalos o ajústalos.
// import { Producto } from '../types/Producto'; 

// Props del componente Modal
interface EquipoEditModalProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  producto: any | null; // Debería ser 'Producto | null' con tipos definidos
  onSaveSuccess: () => void;
}

// Estilos base reutilizables
const inputBaseStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  width: '100%', 
  boxSizing: 'border-box',
  // marginTop: '4px', // Eliminado: el labelStyle.marginBottom se encarga de esto
};

const fieldContainerStyle: React.CSSProperties = {
  marginBottom: '16px', 
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#333',
  marginTop: '24px',
  marginBottom: '16px',
  borderBottom: '1px solid #eee',
  paddingBottom: '8px',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: '24px',
  textAlign: 'center',
};

// NUEVO: Estilo para el contenedor de sección en rejilla
const gridSectionContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px ' + '20px', // gap: row-gap column-gap (ej: 16px vertical, 20px horizontal)
  alignItems: 'start',
};

// Estilo para labels encima del input
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#333',
};

// NUEVOS ESTILOS PARA ESPECIFICACIONES TÉCNICAS
const specSectionStyle: React.CSSProperties = {
  marginBottom: '20px',
  padding: '15px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: '#f9f9f9' 
};

const specSectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#333',
  marginBottom: '15px',
  paddingBottom: '8px',
  borderBottom: '1px solid #ddd',
  textTransform: 'uppercase',
};

const specRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  gap: '10px',
};

const specKeyStyle: React.CSSProperties = {
  width: '350px',
  marginRight: '10px',
  fontSize: '14px',
  color: '#555',
  textAlign: 'left', // Ajustado a la izquierda para nombres de specs largos
  flexShrink: 0,
  wordBreak: 'break-word', // Para nombres largos
};

const specValueInputStyle: React.CSSProperties = {
  ...inputBaseStyle,
  flexGrow: 1,
};

const specDeleteButtonStyle: React.CSSProperties = {
  background:'none',
  border:'none',
  cursor:'pointer',
  color: '#EF4444',
  padding: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
// FIN DE NUEVOS ESTILOS

const EquipoEditModal: React.FC<EquipoEditModalProps> = ({ open, onClose, producto, onSaveSuccess }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({}); // Debería ser 'Partial<Producto>'
  const [ultimaObservacion, setUltimaObservacion] = useState('');
  const [expandedSpecSections, setExpandedSpecSections] = useState<Record<string, boolean>>({}); // Estado para el acordeón

  useEffect(() => {
    if (producto) {
      const initialFormData = JSON.parse(JSON.stringify(producto));
      initialFormData.caracteristicas = initialFormData.caracteristicas || {};
      initialFormData.dimensiones = initialFormData.dimensiones || {};
      initialFormData.datos_contables = initialFormData.datos_contables || {};
      initialFormData.especificaciones_tecnicas = initialFormData.especificaciones_tecnicas || {};

      // --- Initialize and derive Tipo --- 
      let currentTipo = initialFormData.tipo;
      if (typeof initialFormData.es_opcional === 'boolean') { // Check if es_opcional is explicitly set
        if (initialFormData.es_opcional) {
          currentTipo = 'opcional';
        } else {
          currentTipo = 'equipo';
        }
      } else { // If es_opcional is not set, derive from tipo or default
        if (currentTipo !== 'equipo' && currentTipo !== 'opcional') {
          currentTipo = 'equipo'; // Default to 'equipo' if tipo is invalid and es_opcional is not set
        }
      }
      initialFormData.tipo = currentTipo;
      initialFormData.es_opcional = currentTipo === 'opcional';
      // --- End of Tipo initialization ---

      // --- Adjustment for fecha_cotizacion ---
      if (initialFormData.datos_contables && initialFormData.datos_contables.fecha_cotizacion) {
        const dateValue = initialFormData.datos_contables.fecha_cotizacion;
        const date = new Date(dateValue); // Attempt to parse
        if (!isNaN(date.getTime())) { // Check if date is valid
          // Format to YYYY-MM-DD
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
          const day = date.getDate().toString().padStart(2, '0');
          initialFormData.datos_contables.fecha_cotizacion = `${year}-${month}-${day}`;
        } else {
          // If original value was not a valid date string, set to empty
          initialFormData.datos_contables.fecha_cotizacion = '';
        }
      } else if (initialFormData.datos_contables) {
        // If fecha_cotizacion is not present in datos_contables, ensure it's an empty string
         initialFormData.datos_contables.fecha_cotizacion = '';
      }
      // --- End of adjustment ---

      setFormData(initialFormData);
      setUltimaObservacion(producto.ultima_observacion_edicion || '');
      setExpandedSpecSections({}); // Resetear acordeón cuando el producto cambia o se abre el modal
    } else {
      setFormData({});
      setUltimaObservacion('');
    }
  }, [producto, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.includes('.')) {
      const [objectName, fieldName] = name.split('.');
      setFormData((prev: typeof formData) => ({
        ...prev,
        [objectName]: {
          ...prev[objectName],
          [fieldName]: type === 'checkbox' ? checked : value,
        },
      }));
    } else if (name === 'tipo') { // --- Sync es_opcional when Tipo changes ---
      setFormData((prev: typeof formData) => ({
        ...prev,
        tipo: value,
        es_opcional: value === 'opcional',
      }));
    } else {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, specKey: string) => {
    const { value } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: {
        ...prev.especificaciones_tecnicas,
        [specKey]: value,
      },
    }));
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNestedSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, sectionKey: string, specKey: string) => {
    const { value } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: {
        ...prev.especificaciones_tecnicas,
        [sectionKey]: {
          ...(prev.especificaciones_tecnicas[sectionKey] || {}),
          [specKey]: value,
        }
      },
    }));
  };

  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newSpecSection, setNewSpecSection] = useState(''); // Para especificar la sección de la nueva especificación

  // Nueva función para el toggle del acordeón de especificaciones
  const toggleSpecSection = (sectionKey: string) => {
    setExpandedSpecSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleAddSpec = () => {
    if (newSpecKey.trim() === '') return; // No añadir si la clave está vacía

    let updatedSpecs = { ...formData.especificaciones_tecnicas };

    if (newSpecSection.trim() !== '') { // Si se especificó una sección
        if (!updatedSpecs[newSpecSection]) {
            updatedSpecs[newSpecSection] = {}; // Crear la sección si no existe
        }
        updatedSpecs[newSpecSection][newSpecKey.trim()] = newSpecValue;
    } else { // Si no hay sección, añadir directamente
        updatedSpecs[newSpecKey.trim()] = newSpecValue;
    }

    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: updatedSpecs,
    }));
    setNewSpecKey('');
    setNewSpecValue('');
    setNewSpecSection(''); // Limpiar también la sección
  };
  
  const handleDeleteSpec = (specKey: string, sectionKey?: string) => {
    const newSpecs = { ...formData.especificaciones_tecnicas };
    if (sectionKey && newSpecs[sectionKey]) {
        delete newSpecs[sectionKey][specKey];
        if (Object.keys(newSpecs[sectionKey]).length === 0) { // Si la sección queda vacía, eliminarla
            delete newSpecs[sectionKey];
        }
    } else {
        delete newSpecs[specKey];
    }
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: newSpecs,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto || !producto.Codigo_Producto) return;

    const payload = {
      ...formData,
      ultima_observacion_edicion: ultimaObservacion,
    };
    
    // Limpiar el _id y otros campos que Mongoose añade si no se quieren enviar al update
    // delete payload._id; 
    // delete payload.createdAt;
    // delete payload.updatedAt;

    try {
      const response = await fetch(`/api/products/code/${producto.Codigo_Producto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Intenta parsear el cuerpo del error si está disponible
        const errorData = await response.json().catch(() => null); // Evita error si no hay JSON
        const errorMessage = errorData?.message || errorData?.error || `Error HTTP: ${response.status}`;
        console.error('Error al guardar el producto:', errorMessage, errorData);
        // Aquí podrías usar un sistema de notificaciones más amigable en lugar de un alert
        alert(`Error al guardar: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const updatedProduct = await response.json();
      console.log('Producto actualizado:', updatedProduct);
      alert('¡Producto guardado con éxito!');
      
      onSaveSuccess(); // Llama a la función para refrescar/notificar
      onClose(); // Cierra el modal
    } catch (error) {
      // El error ya debería haber sido logueado y mostrado en una alerta arriba
      // Si llegamos aquí por un error que no fue un !response.ok (ej. red), loguearlo.
      // Comprobamos si el error es una instancia de Error para acceder a 'message'
      if (error instanceof Error) {
        if (!error.message.startsWith('Error HTTP')) {
          console.error('Error en handleSubmit:', error);
          alert(`Se produjo un error inesperado: ${error.message}`);
        }
      } else {
        // Si no es una instancia de Error, loguearlo de forma genérica
        console.error('Error en handleSubmit (tipo desconocido):', error);
        alert('Se produjo un error inesperado.');
      }
    }
  };

  if (!open || !producto) {
    return null;
  }
  
  // Función auxiliar para renderizar los items de una sección de especificación (clave-valor)
  const renderSpecSectionItems = (items: object, parentSectionKey: string) => {
    return Object.entries(items).map(([key, value]) => (
      <div key={key} style={specRowStyle}>
        <label style={specKeyStyle}>{key.replace(/_/g, ' ')}:</label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => handleNestedSpecChange(e, parentSectionKey, key)}
          style={specValueInputStyle}
        />
        <button 
          type="button" 
          onClick={() => handleDeleteSpec(key, parentSectionKey)} 
          title={`Eliminar ${key.replace(/_/g, ' ')}`}
          style={specDeleteButtonStyle}
        >
          <Trash2 size={16} />
        </button>
      </div>
    ));
  };

  const renderEspecificaciones = (specs: object) => { // Ya no necesita parentSectionKey aquí
    return Object.entries(specs).map(([sectionKey, sectionValue]) => {
      // Asumimos que el primer nivel de 'specs' siempre son objetos de sección
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        const isExpanded = !!expandedSpecSections[sectionKey];
        return (
          <div key={sectionKey} style={{ ...specSectionStyle, marginBottom: '10px' }}>
            <button 
              type="button"
              onClick={() => toggleSpecSection(sectionKey)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 0',
                width: '100%',
                textAlign: 'left',
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? 'none' : '1px solid #eee',
                outline: 'none',
              }}
            >
              {sectionKey.replace(/_/g, ' ').toUpperCase()}
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {isExpanded && (
              <div style={{ paddingTop: '15px' }}>
                {renderSpecSectionItems(sectionValue, sectionKey)}
              </div>
            )}
          </div>
        );
      }
      return null; // No debería llegar aquí si la estructura es siempre sección -> items
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white', padding: '20px 30px', borderRadius: '8px',
        maxHeight: '90vh', overflowY: 'auto',
        width: '95%',
        maxWidth: '2000px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
      }}>
        <h2 style={modalTitleStyle}>Editar Producto: {producto.Codigo_Producto}</h2>
        <form onSubmit={handleSubmit}>
          {/* --- Información General --- */}
          <h4 style={sectionTitleStyle}>Información General</h4>
          <div style={gridSectionContainerStyle}>
            <div style={fieldContainerStyle}>
              <label htmlFor="Codigo_Producto" style={labelStyle}>Código Producto:</label>
              <input id="Codigo_Producto" type="text" name="Codigo_Producto" value={formData.Codigo_Producto || ''} onChange={handleInputChange} style={inputBaseStyle} disabled />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="producto" style={labelStyle}>Producto (Tipo General):</label>
              <input id="producto" type="text" name="producto" value={formData.producto || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}> 
              <label htmlFor="tipo" style={labelStyle}>Tipo:</label>
              <select 
                id="tipo" 
                name="tipo" 
                value={formData.tipo || 'equipo'} 
                onChange={handleInputChange} 
                style={inputBaseStyle}
              >
                <option value="equipo">Equipo</option>
                <option value="opcional">Opcional</option>
              </select>
            </div>
            <div style={{ ...fieldContainerStyle, gridColumn: 'span 2' }}>
              <label htmlFor="descripcion" style={labelStyle}>Descripción:</label>
              <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleInputChange} style={{...inputBaseStyle, minHeight: '80px'}} />
            </div>
          </div>

          {/* --- Características --- */}
          <h4 style={sectionTitleStyle}>Características</h4>
          <div style={gridSectionContainerStyle}>
            <div style={{ ...fieldContainerStyle, gridColumn: 'span 2' }}> {/* Nombre del producto puede ocupar más */} 
              <label htmlFor="caracteristicas.nombre_del_producto" style={labelStyle}>Nombre del Producto (Característica):</label>
              <input id="caracteristicas.nombre_del_producto" type="text" name="caracteristicas.nombre_del_producto" value={formData.caracteristicas?.nombre_del_producto || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="caracteristicas.modelo" style={labelStyle}>Modelo (Característica):</label>
              <input id="caracteristicas.modelo" type="text" name="caracteristicas.modelo" value={formData.caracteristicas?.modelo || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
          </div>

          {/* --- Dimensiones --- */}
          <h4 style={sectionTitleStyle}>Dimensiones</h4>
          <div style={gridSectionContainerStyle}>
            <div style={fieldContainerStyle}>
              <label htmlFor="dimensiones.largo_mm" style={labelStyle}>Largo (mm):</label>
              <input id="dimensiones.largo_mm" type="number" name="dimensiones.largo_mm" value={formData.dimensiones?.largo_mm || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="dimensiones.ancho_mm" style={labelStyle}>Ancho (mm):</label>
              <input id="dimensiones.ancho_mm" type="number" name="dimensiones.ancho_mm" value={formData.dimensiones?.ancho_mm || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="dimensiones.alto_mm" style={labelStyle}>Alto (mm):</label>
              <input id="dimensiones.alto_mm" type="number" name="dimensiones.alto_mm" value={formData.dimensiones?.alto_mm || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="peso_kg" style={labelStyle}>Peso (kg):</label>
              <input id="peso_kg" type="number" name="peso_kg" value={formData.peso_kg || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
          </div>

          {/* --- Datos Contables --- */}
          <h4 style={sectionTitleStyle}>Datos Contables</h4>
          <div style={gridSectionContainerStyle}>
            <div style={fieldContainerStyle}>
              <label htmlFor="datos_contables.costo_fabrica" style={labelStyle}>Costo Fábrica (EUR):</label>
              <input id="datos_contables.costo_fabrica" type="number" name="datos_contables.costo_fabrica" value={formData.datos_contables?.costo_fabrica || ''} onChange={handleInputChange} style={inputBaseStyle} step="0.01" />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="datos_contables.divisa_costo" style={labelStyle}>Divisa Costo:</label>
              <input id="datos_contables.divisa_costo" type="text" name="datos_contables.divisa_costo" value={formData.datos_contables?.divisa_costo || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
              <label htmlFor="datos_contables.fecha_cotizacion" style={labelStyle}>Fecha Cotización:</label>
              <input id="datos_contables.fecha_cotizacion" type="date" name="datos_contables.fecha_cotizacion" value={formData.datos_contables?.fecha_cotizacion || ''} onChange={handleInputChange} style={inputBaseStyle} />
            </div>
          </div>

          {/* --- Especificaciones Técnicas (Se abordará en Paso B) --- */}
          <h4 style={sectionTitleStyle}>Especificaciones Técnicas</h4>
          {formData.especificaciones_tecnicas && Object.keys(formData.especificaciones_tecnicas).length > 0 && (
            <div style={{ marginBottom: '20px' }}> {/* Contenedor general para las especificaciones renderizadas */}
              {renderEspecificaciones(formData.especificaciones_tecnicas)}
            </div>
          )}
          <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '6px', marginTop: '10px' }}>
            <h5 style={{marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#444'}}>Añadir Nueva Especificación</h5>
            <div style={fieldContainerStyle}>
                <label htmlFor="newSpecSection" style={labelStyle}>Sección (Opcional, ej: DIMENSIONES):</label>
                <input id="newSpecSection" type="text" value={newSpecSection} onChange={(e) => setNewSpecSection(e.target.value)} placeholder="Ej: MOTOR" style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
                <label htmlFor="newSpecKey" style={labelStyle}>Nombre Característica:</label>
                <input id="newSpecKey" type="text" value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} placeholder="Ej: Cilindrada" style={inputBaseStyle} />
            </div>
            <div style={fieldContainerStyle}>
                <label htmlFor="newSpecValue" style={labelStyle}>Valor Especificación:</label>
                <input id="newSpecValue" type="text" value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} placeholder="Ej: 200 cc" style={inputBaseStyle} />
            </div>
            <button type="button" onClick={handleAddSpec} style={{ padding: '8px 15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
              Añadir Especificación
            </button>
          </div>

          {/* --- Observación --- */}
          <h4 style={sectionTitleStyle}>Observación de Edición</h4>
          <div style={fieldContainerStyle}> {/* La observación debería ocupar todo el ancho, no necesita estar en rejilla si es única */} 
            <label htmlFor="ultimaObservacion" style={labelStyle}>Última Observación:</label>
            <textarea
              id="ultimaObservacion"
              value={ultimaObservacion}
              onChange={(e) => setUltimaObservacion(e.target.value)}
              placeholder="Añada una observación sobre esta edición si es necesario..."
              style={{ ...inputBaseStyle, minHeight: '100px' }}
            />
          </div>

          {/* --- Botones de Acción --- */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipoEditModal; 