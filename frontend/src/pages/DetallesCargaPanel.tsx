import React from 'react';

// Interfaces (Producto ya existe, ProductoConOpcionales es nueva)
interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Descripcion?: string;
  Modelo?: string;
  categoria?: string;
  pf_eur?: string | number;
  datos_contables?: {
    costo_fabrica?: number;
    divisa_costo?: string;
    [key: string]: any;
  };
}

interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

interface DetallesCargaPanelProps {
  itemsParaCotizar: ProductoConOpcionales[];
  onVolver: () => void;
  onSiguiente: () => void;
  onEliminarOpcionalDePrincipal: (codigoPrincipal: string, codigoOpcional: string) => void;
  onEliminarPrincipal: (codigoPrincipal: string) => void;
}

// Componente Stepper simple (se puede mejorar)
const Stepper = ({ pasoActual }: { pasoActual: number }) => {
  const pasos = ['Resumen y Configuración de Carga', 'Detalles de Envío', 'Detalles Tributarios', 'Detalles Usuario'];
  const stepStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' };
  const numberStyle: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e9ecef', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '8px', border: '2px solid transparent' };
  const activeNumberStyle: React.CSSProperties = { ...numberStyle, backgroundColor: '#1e88e5', color: 'white' };
  const textStyle: React.CSSProperties = { fontSize: '13px', color: '#6c757d' };
  const activeTextStyle: React.CSSProperties = { ...textStyle, color: '#1e88e5', fontWeight: 500 };
  const lineStyle: React.CSSProperties = { position: 'absolute', top: '16px', left: '50%', right: '-50%', height: '2px', backgroundColor: '#e9ecef', zIndex: -1 };

  return (
    <div style={{ display: 'flex', marginBottom: '32px', marginTop:'16px', padding: '0 10%' }}>
      {pasos.map((nombre, index) => (
        <React.Fragment key={index}>
          <div style={stepStyle}>
             <div style={index + 1 === pasoActual ? activeNumberStyle : numberStyle}>{index + 1}</div>
             <div style={index + 1 === pasoActual ? activeTextStyle : textStyle}>{nombre}</div>
          </div>
          {index < pasos.length - 1 && (
             <div style={{ flex: 1, position: 'relative' }}>
                <div style={lineStyle}></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function DetallesCargaPanel({
  itemsParaCotizar,
  onVolver,
  onSiguiente,
  onEliminarOpcionalDePrincipal,
  onEliminarPrincipal,
}: DetallesCargaPanelProps) {

  // Estilos (podrían moverse a CSS o unificar)
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' };
  const sectionTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' };
  const tagStyle: React.CSSProperties = { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' };
  const principalTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e3f2fd', color: '#1e88e5' };
  const adicionalesTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e7f5e9', color: '#28a745' };
  const countTagStyle: React.CSSProperties = { ...tagStyle, backgroundColor: '#e9ecef', color: '#6c757d', fontWeight: 500 };
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 500, color: '#6c757d', backgroundColor: '#f8f9fa' };
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #eef2f7', color: '#495057', textAlign: 'left' };
  const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' };
  const buttonStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '6px', border: '1px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 500 };
  const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };
  const secondaryButtonStyle: React.CSSProperties = { ...buttonStyle, backgroundColor: 'white', color: '#6c757d', border: '1px solid #dee2e6' };

  // Función interna para manejar el clic en eliminar (adaptada)
  const handleEliminarOpcionalClick = (codigoPrincipal: string | undefined, codigoOpcional: string | undefined) => {
    if (codigoPrincipal && codigoOpcional) {
      onEliminarOpcionalDePrincipal(codigoPrincipal, codigoOpcional);
    }
  };

  // Nueva función para manejar clic en eliminar principal
  const handleEliminarPrincipalClick = (codigoPrincipal: string | undefined) => {
    if (codigoPrincipal) {
      // Podríamos añadir una confirmación aquí si se desea
      // if (window.confirm('¿Está seguro de que desea eliminar este equipo principal y todos sus opcionales de la carga?')) {
      onEliminarPrincipal(codigoPrincipal);
      // }
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Stepper pasoActual={1} />

      <div style={cardStyle}>
         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#343a40', margin: 0 }}>
                Resumen y Configuración de Carga
            </h2>
         </div>

        {itemsParaCotizar.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', fontStyle: 'italic'}}>No hay equipos seleccionados para cotizar.</p>
        ) : (
          itemsParaCotizar.map((item, idx) => (
            <div key={item.principal.codigo_producto || idx} style={{ marginBottom: idx < itemsParaCotizar.length - 1 ? '32px' : '0' }}>
              {/* Sección Producto Principal */}
              <div style={sectionTitleStyle}>
                <span style={principalTagStyle}>Principal</span>
                <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: '#495057' }}>
                  {item.principal.nombre_del_producto || 'Sin nombre'}
                </h3>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '120px' }}>Código</th>
                      <th style={{ ...thStyle, width: '400px' }}>Nombre</th>
                      <th style={{ ...thStyle, textAlign: 'right', width: '150px' }}>Precio en EUR</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '80px' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>{item.principal?.codigo_producto || '-'}</td>
                      <td style={tdStyle}>{item.principal?.nombre_del_producto || '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {item.principal?.datos_contables && typeof item.principal.datos_contables.costo_fabrica === 'number'
                          ? `€${item.principal.datos_contables.costo_fabrica.toLocaleString('de-DE')} ${item.principal.datos_contables.divisa_costo || ''}`
                          : (item.principal?.pf_eur ? `€${Number(item.principal.pf_eur).toLocaleString('de-DE')}` : '-')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button 
                          style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} 
                          title="Eliminar Equipo Principal de la Carga"
                          onClick={() => handleEliminarPrincipalClick(item.principal.codigo_producto)}
                        >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sección Opcionales Seleccionados para este Principal */}
              {item.opcionales && item.opcionales.length > 0 && (
                <>
                  <div style={sectionTitleStyle}>
                    <span style={adicionalesTagStyle}>Adicionales</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: '#495057' }}>Opcionales Seleccionados</h3>
                    <span style={countTagStyle}>{item.opcionales.length} seleccionados</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '120px' }}>Código</th>
                          <th style={{ ...thStyle, width: '400px' }}>Nombre</th>
                          <th style={{ ...thStyle, textAlign: 'right', width: '150px' }}>Precio en EUR</th>
                          <th style={{ ...thStyle, textAlign: 'center', width: '80px' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.opcionales.map((opcional, opcionalIndex) => (
                          <tr key={opcional.codigo_producto || opcionalIndex}>
                            <td style={tdStyle}>{opcional.codigo_producto || '-'}</td>
                            <td style={tdStyle}>{opcional.nombre_del_producto || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              {opcional.datos_contables && typeof opcional.datos_contables.costo_fabrica === 'number'
                                ? `€${opcional.datos_contables.costo_fabrica.toLocaleString('de-DE')} ${opcional.datos_contables.divisa_costo || ''}`
                                : (opcional.pf_eur ? `€${Number(opcional.pf_eur).toLocaleString('de-DE')}` : '-')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <button 
                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} 
                                title="Eliminar Opcional"
                                onClick={() => handleEliminarOpcionalClick(item.principal.codigo_producto, opcional.codigo_producto)}
                              >
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer de navegación */}
      <div style={footerStyle}>
        <button style={secondaryButtonStyle} onClick={onVolver}>
          &larr; Volver
        </button>
        <button style={primaryButtonStyle} onClick={onSiguiente} disabled={itemsParaCotizar.length === 0}>
          Siguiente &rarr;
        </button>
      </div>
    </div>
  );
} 