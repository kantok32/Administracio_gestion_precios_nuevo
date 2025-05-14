import React, { useState, useEffect } from 'react';

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

const EquipoEditModal: React.FC<EquipoEditModalProps> = ({ open, onClose, producto, onSaveSuccess }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({}); // Debería ser 'Partial<Producto>'
  const [ultimaObservacion, setUltimaObservacion] = useState('');

  useEffect(() => {
    if (producto) {
      // Clonar el producto para evitar mutaciones directas del prop
      // y asegurar que todos los campos, incluyendo los anidados, estén presentes
      const initialFormData = JSON.parse(JSON.stringify(producto));
      
      // Asegurar que los objetos anidados existan
      initialFormData.caracteristicas = initialFormData.caracteristicas || {};
      initialFormData.dimensiones = initialFormData.dimensiones || {};
      initialFormData.datos_contables = initialFormData.datos_contables || {};
      initialFormData.especificaciones_tecnicas = initialFormData.especificaciones_tecnicas || {};
      
      setFormData(initialFormData);
      setUltimaObservacion(producto.ultima_observacion_edicion || ''); // Cargar observación existente si hay
    } else {
      // Resetear si no hay producto (o para un futuro "Crear Producto" en modal)
      setFormData({});
      setUltimaObservacion('');
    }
  }, [producto, open]); // Depender de 'open' para recargar cuando se abre el modal

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checked = (e.target as any).checked; // Para checkboxes

    // Manejar campos anidados (ej: caracteristicas.nombre_del_producto)
    if (name.includes('.')) {
      const [objectName, fieldName] = name.split('.');
      setFormData((prev: typeof formData) => ({
        ...prev,
        [objectName]: {
          ...prev[objectName],
          [fieldName]: type === 'checkbox' ? checked : value,
        },
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
      // Asumiendo que tienes un servicio API configurado
      // Reemplaza con tu llamada real a la API
      // Ejemplo: await apiService.updateProduct(producto.Codigo_Producto, payload);
      console.log('Enviando actualización:', producto.Codigo_Producto, payload);
      
      // Simulación de llamada a la API
      const response = await fetch(`/api/products/code/${producto.Codigo_Producto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el producto');
      }

      // const updatedProduct = await response.json();
      // console.log('Producto actualizado:', updatedProduct);
      
      onSaveSuccess(); // Llama a la función para refrescar/notificar
      onClose(); // Cierra el modal
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      // Aquí podrías mostrar un mensaje de error al usuario en el modal
      alert('Error al guardar: ' + (error as Error).message);
    }
  };

  if (!open || !producto) {
    return null;
  }
  
  const renderEspecificaciones = (specs: object, sectionKey?: string) => {
    return Object.entries(specs).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return (
          <div key={key} style={{ marginLeft: sectionKey ? '20px' : '0', border: '1px solid #eee', padding: '5px', marginBottom: '5px' }}>
            <strong>{key}:</strong>
            {renderEspecificaciones(value, key)}
          </div>
        );
      }
      return (
        <div key={key} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '5px', minWidth: '150px' }}>{key}:</label>
          <input
            type="text"
            value={value as string}
            onChange={(e) => sectionKey ? handleNestedSpecChange(e, sectionKey, key) : handleSpecChange(e, key)}
            style={{ flexGrow: 1, marginRight: '5px' }}
          />
          <button type="button" onClick={() => handleDeleteSpec(key, sectionKey)} style={{color: 'red'}}>X</button>
        </div>
      );
    });
  };


  // Placeholder para el Modal. Reemplaza con tu componente Modal de librería UI.
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
        maxHeight: '90vh', overflowY: 'auto', width: '80%', maxWidth: '700px'
      }}>
        <h2>Editar Producto: {producto.caracteristicas?.nombre_del_producto || producto.Codigo_Producto}</h2>
        <form onSubmit={handleSubmit}>
          {/* Campos Generales */}
          <h4>Información General</h4>
          <div>
            <label>Código Producto: </label>
            <input type="text" name="Codigo_Producto" value={formData.Codigo_Producto || ''} onChange={handleInputChange} disabled />
          </div>
          <div>
            <label>Producto (Tipo General): </label>
            <input type="text" name="producto" value={formData.producto || ''} onChange={handleInputChange} />
          </div>
           <div>
            <label>Nombre Comercial: </label>
            <input type="text" name="nombre_comercial" value={formData.nombre_comercial || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Descripción: </label>
            <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Peso (kg): </label>
            <input type="number" name="peso_kg" value={formData.peso_kg || ''} onChange={handleInputChange} />
          </div>
           <div>
            <label>Tipo (ej: opcional, equipo): </label>
            <input type="text" name="tipo" value={formData.tipo || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Familia: </label>
            <input type="text" name="familia" value={formData.familia || ''} onChange={handleInputChange} />
          </div>
           <div>
            <label>Proveedor: </label>
            <input type="text" name="proveedor" value={formData.proveedor || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Es Opcional?: </label>
            <input type="checkbox" name="es_opcional" checked={formData.es_opcional || false} onChange={handleInputChange} />
          </div>


          {/* Características */}
          <h4>Características</h4>
          <div>
            <label>Nombre del Producto (Característica): </label>
            <input type="text" name="caracteristicas.nombre_del_producto" value={formData.caracteristicas?.nombre_del_producto || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Modelo: </label>
            <input type="text" name="caracteristicas.modelo" value={formData.caracteristicas?.modelo || ''} onChange={handleInputChange} />
          </div>

          {/* Dimensiones */}
          <h4>Dimensiones</h4>
          <div>
            <label>Largo (mm): </label>
            <input type="number" name="dimensiones.largo_mm" value={formData.dimensiones?.largo_mm || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Ancho (mm): </label>
            <input type="number" name="dimensiones.ancho_mm" value={formData.dimensiones?.ancho_mm || ''} onChange={handleInputChange} />
          </div>
          <div>
            <label>Alto (mm): </label>
            <input type="number" name="dimensiones.alto_mm" value={formData.dimensiones?.alto_mm || ''} onChange={handleInputChange} />
          </div>
          
          {/* Datos Contables */}
          <h4>Datos Contables</h4>
           <div>
            <label>Costo Fábrica: </label>
            <input type="number" name="datos_contables.costo_fabrica" value={formData.datos_contables?.costo_fabrica || ''} onChange={handleInputChange} />
          </div>
           <div>
            <label>Divisa Costo: </label>
            <input type="text" name="datos_contables.divisa_costo" value={formData.datos_contables?.divisa_costo || 'EUR'} onChange={handleInputChange} />
          </div>
          <div>
            <label>Fecha Cotización: </label>
            <input 
                type="date" 
                name="datos_contables.fecha_cotizacion" 
                value={formData.datos_contables?.fecha_cotizacion ? new Date(formData.datos_contables.fecha_cotizacion).toISOString().split('T')[0] : ''} 
                onChange={handleInputChange} />
            </div>


          {/* Especificaciones Técnicas */}
          <h4>Especificaciones Técnicas</h4>
          {renderEspecificaciones(formData.especificaciones_tecnicas || {})}
          
          <h5>Añadir Nueva Especificación</h5>
          <div>
            <input 
              type="text" 
              placeholder="Nombre Sección (Opcional)" 
              value={newSpecSection} 
              onChange={(e) => setNewSpecSection(e.target.value)} 
              style={{ marginRight: '10px', marginBottom: '5px' }}
            />
          </div>
          <div>
            <input 
              type="text" 
              placeholder="Clave Especificación" 
              value={newSpecKey} 
              onChange={(e) => setNewSpecKey(e.target.value)} 
              style={{ marginRight: '10px', marginBottom: '5px' }}
            />
            <input 
              type="text" 
              placeholder="Valor Especificación" 
              value={newSpecValue} 
              onChange={(e) => setNewSpecValue(e.target.value)} 
              style={{ marginRight: '10px', marginBottom: '5px' }}
            />
            <button type="button" onClick={handleAddSpec}>Añadir Especificación</button>
          </div>

          {/* Observaciones */}
          <h4>Observaciones de Edición</h4>
          <div>
            <textarea
              name="ultima_observacion_edicion"
              placeholder="Añade una observación sobre este cambio..."
              value={ultimaObservacion}
              onChange={(e) => setUltimaObservacion(e.target.value)}
              style={{ width: '100%', minHeight: '80px' }}
            />
          </div>
          
          <hr />
          {/* Acciones */}
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button type="button" onClick={onClose} style={{ marginRight: '10px' }}>Cancelar</button>
            <button type="submit" style={{ backgroundColor: 'blue', color: 'white' }}>Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipoEditModal; 