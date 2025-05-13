import React from 'react';

// Usar la interfaz Producto directamente (o crear una específica si es necesario)
// Importarla desde types si está definida globalmente, o copiarla
interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Descripcion?: string;
  Modelo?: string;
  categoria?: string;
  pf_eur?: string | number;
  tipo?: string;
  // ... otras propiedades de Producto
  id?: string; // Asegurarse que hay un identificador único, o usar codigo_producto
}

// Props actualizadas del modal
interface OpcionalesCotizacionModalProps {
  productoNombre: string;
  opcionales: Producto[]; // Ahora espera un array de Producto
  isLoading: boolean; // Estado de carga
  error: string | null; // Mensaje de error
  onClose: () => void;
  onConfirmarSeleccion: (seleccionados: string[]) => void; // Nueva prop para confirmar
  // Añadir más props para selección, paginación, crear cotización más adelante
}

// Eliminar opcionalesDeEjemplo, ya no se usa

export default function OpcionalesCotizacionModal({
  productoNombre,
  opcionales, // Recibe los opcionales reales
  isLoading,
  error,
  onClose,
  onConfirmarSeleccion, // Recibir la nueva prop
}: OpcionalesCotizacionModalProps) {

  // Estados (para selección, paginación, etc. - añadir más adelante)
  const [seleccionados, setSeleccionados] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalOpcionales = opcionales.length;
  const totalPages = 1; // Placeholder para paginación futura

  // --- Estilos Unificados (Importados o definidos aquí) ---
  // Se usan los mismos nombres que en EquiposPanel para claridad
  const unifiedModalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }; // zIndex más alto
  const unifiedModalContentStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' };
  const unifiedHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#EBF8FF' }; 
  const unifiedTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e88e5' };
  const unifiedCloseButtonStyle: React.CSSProperties = { backgroundColor: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', color: '#1e40af' };
  const unifiedBodyStyle: React.CSSProperties = { flexGrow: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F9FAFB' }; 
  const unifiedTableContainerStyle: React.CSSProperties = { overflowX: 'auto' }; 
  const unifiedTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
  const unifiedThStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', backgroundColor: '#f3f4f6' }; 
  const unifiedTdStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', fontSize: '13px', color: '#4B5563' }; 
  const unifiedFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' }; 
  const unifiedSecondaryButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 };
  const unifiedDisabledSecondaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' };
  // Estilo para botón primario (Configurar)
  const unifiedPrimaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };
  const unifiedDisabledPrimaryButtonStyle: React.CSSProperties = { ...unifiedPrimaryButtonStyle, backgroundColor: '#a5d8ff', color: '#f8f9fa', cursor: 'not-allowed', borderColor: '#a5d8ff' };

  // Función para manejar la selección/deselección de un opcional
  const handleSeleccion = (codigoOpcional: string | undefined) => {
    if (!codigoOpcional) return; // No hacer nada si no hay código

    setSeleccionados(prevSeleccionados => {
      if (prevSeleccionados.includes(codigoOpcional)) {
        // Si ya está seleccionado, quitarlo
        return prevSeleccionados.filter(codigo => codigo !== codigoOpcional);
      } else {
        // Si no está seleccionado, añadirlo
        return [...prevSeleccionados, codigoOpcional];
      }
    });
  };

  // Renderizar contenido basado en loading/error/data
  const renderContent = () => {
    if (isLoading) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Cargando...</div>;
    }
    if (error) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>Error: {error}</div>;
    }
    if (opcionales.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>No hay opcionales disponibles.</div>;
    }
    return (
      <div style={unifiedTableContainerStyle}>
        <table style={unifiedTableStyle}>
          <thead>
            <tr>
              <th style={{ ...unifiedThStyle, width: '100px' }}>Seleccionar</th>
              <th style={{ ...unifiedThStyle, width: '100px' }}>Código</th>
              <th style={{ ...unifiedThStyle, width: '35%' }}>Nombre</th>
              <th style={unifiedThStyle}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {opcionales.map((opcional, index) => {
              const opcionalCodigo = opcional.codigo_producto;
              const isSelected = opcionalCodigo ? seleccionados.includes(opcionalCodigo) : false;
              
              // Lógica de doble verificación para el nombre a mostrar
              let displayName = opcional.nombre_del_producto || '-';
              const esTipoOpcionalDirecto = opcional.tipo === 'opcional';
              const tieneNombreOpcional = opcional.nombre_del_producto && 
                                        opcional.nombre_del_producto.toLowerCase().includes('opcional');

              const debeConsiderarseOpcional = esTipoOpcionalDirecto || (!esTipoOpcionalDirecto && tieneNombreOpcional);

              if (debeConsiderarseOpcional && opcional.nombre_del_producto && 
                  !opcional.nombre_del_producto.toLowerCase().startsWith('opcional:')) {
                displayName = `Opcional: ${opcional.nombre_del_producto}`;
              } else if (debeConsiderarseOpcional && opcional.nombre_del_producto && 
                         opcional.nombre_del_producto.toLowerCase().startsWith('opcional:')) {
                // Si ya empieza con "Opcional:", usarlo como está.
                displayName = opcional.nombre_del_producto;
              }

              return (
                <tr key={opcionalCodigo || index} style={{ backgroundColor: index % 2 !== 0 ? '#f8f9fa' : 'white' }}>
                  <td style={unifiedTdStyle}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => handleSeleccion(opcionalCodigo)}
                      disabled={!opcionalCodigo} // Deshabilitar si no hay código
                      style={{ cursor: opcionalCodigo ? 'pointer' : 'not-allowed' }}
                      aria-label={`Seleccionar ${displayName}`}
                      title={!opcionalCodigo ? 'Este opcional no se puede seleccionar (falta código)' : undefined}
                    />
                  </td>
                  <td style={unifiedTdStyle}>{opcional.codigo_producto || '-'}</td>
                  <td style={unifiedTdStyle}>{displayName}</td>
                  <td style={unifiedTdStyle}>{opcional.Descripcion || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Función para manejar el clic en el botón principal
  const handleConfirmarClick = () => {
    console.log("Opcionales seleccionados para confirmar:", seleccionados);
    onConfirmarSeleccion(seleccionados); // Llamar a la función pasada por props
  };

  return (
    <div style={unifiedModalOverlayStyle} onClick={onClose}> 
      <div style={unifiedModalContentStyle} onClick={(e) => e.stopPropagation()}> 
        {/* Header Unificado */}
        <div style={unifiedHeaderStyle}>
           <div style={unifiedTitleStyle}>
              {/* Icono para Configurar? - Eliminado */}
              {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 9h6v6H9z"></path></svg> */}
              <h2>{productoNombre}</h2>
            </div>
           <button onClick={onClose} style={unifiedCloseButtonStyle} aria-label="Cerrar">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
        </div>

        {/* Body Unificado */}
        <div style={unifiedBodyStyle}>
          {renderContent()} 
        </div>

        {/* Footer Unificado */}
        <div style={unifiedFooterStyle}>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {seleccionados.length} seleccionados de {totalOpcionales} opcionales 
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', visibility: opcionales.length > 0 ? 'visible' : 'hidden' }}> 
            {/* Paginación con estilos unificados */} 
            <button style={currentPage === 1 ? unifiedDisabledSecondaryButtonStyle : unifiedSecondaryButtonStyle} disabled={currentPage === 1}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Anterior
            </button>
            <span style={{ fontSize: '13px', color: '#4B5563', padding: '0 8px' }}>
              {currentPage} de {totalPages}
            </span>
            <button style={currentPage === totalPages ? unifiedDisabledSecondaryButtonStyle : unifiedSecondaryButtonStyle} disabled={currentPage === totalPages}>
              Siguiente
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          {/* Botón Configurar ahora llama a handleConfirmarClick */}
          <button 
             style={isLoading || error !== null || opcionales.length === 0 ? unifiedDisabledPrimaryButtonStyle : unifiedPrimaryButtonStyle} 
             disabled={isLoading || error !== null || opcionales.length === 0}
             onClick={handleConfirmarClick} // Llamar a la nueva función
           >
             Configurar
          </button>
        </div>
      </div>
    </div>
  );
} 