import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, History, Search, Filter, Clock, Settings, RefreshCcw, Download, Calendar, FileText, Database, Rows } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Producto } from '../types/product';
import { getCalculosHistorial, HistorialCalculoItem } from '../services/calculoHistorialService';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

// Interfaces
interface Equipo {
  codigo: string;
  nombre: string;
  categoria: string;
  ultima_actualizacion: string;
  costo_fabrica_eur: number;
}

interface Configuracion {
  id: string;
  fecha: string;
  equipo_base: {
    codigo: string;
    nombre: string;
  };
  opcionales: Array<{
    codigo: string;
    nombre: string;
  }>;
  total_items: number;
}

// Componente principal
export default function DashboardPanel() {
  // Estados
  const [equiposDesactualizados, setEquiposDesactualizados] = useState<Equipo[]>([]);
  const [configuracionesRecientes, setConfiguracionesRecientes] = useState<Configuracion[]>([]);
  const [filtroConfiguracion, setFiltroConfiguracion] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for historial chart
  const [historialData, setHistorialData] = useState<HistorialCalculoItem[]>([]);
  const [equiposCotizadosChartData, setEquiposCotizadosChartData] = useState<any>(null);
  const [loadingHistorial, setLoadingHistorial] = useState<boolean>(true);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  // Estilos
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    marginBottom: '24px'
  };

  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gap: '24px',
    gridTemplateColumns: '1fr 1fr',
    marginBottom: '24px'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    fontWeight: 600
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#4b5563'
  };

  const searchBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    flex: 1
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: 'white'
  };

  const warningStyle: React.CSSProperties = {
    color: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const panelContainerStyle: React.CSSProperties = { /* Add padding if needed */ };
  const chartCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    marginBottom: '24px'
  };
  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };
  const chartTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937'
  };
  const controlsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px'
  };
  const buttonGroupStyle: React.CSSProperties = {
    display: 'inline-flex',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid #d1d5db'
  };
  const buttonGroupItemStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#374151'
  };
  const buttonGroupItemSelectedStyle: React.CSSProperties = {
    ...buttonGroupItemStyle,
    backgroundColor: '#3b82f6', // Blue background for selected
    color: 'white'
  };
  const chartContainerStyle: React.CSSProperties = {
    height: '400px', // Adjust height as needed
    position: 'relative'
  };
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  };
  const primaryButtonStyle: React.CSSProperties = { 
    ...buttonStyle, 
    backgroundColor: '#3b82f6', 
    color: 'white', 
    borderColor: '#3b82f6' 
  };
  const successButtonStyle: React.CSSProperties = { 
    ...buttonStyle, 
    backgroundColor: '#22c55e', 
    color: 'white', 
    borderColor: '#22c55e' 
  };
  const headerActionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  };

  // Cargar datos generales del dashboard
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: productos } = await api.getCachedProducts();
      const equipos: Equipo[] = productos
        .filter((producto: Producto) => producto && typeof producto === 'object' && (producto.codigo_producto || producto.nombre_del_producto))
        .map((producto: Producto) => ({
          codigo: producto.codigo_producto || 'Sin código',
          nombre: producto.nombre_del_producto || 'Sin nombre',
          categoria: producto.categoria || 'Sin categoría',
          ultima_actualizacion: producto.fecha_costo_original || new Date().toISOString(),
          costo_fabrica_eur: typeof producto.costo_lista_original_eur === 'number' ? producto.costo_lista_original_eur : 0,
        }));
      const equiposDesactualizadosFiltrados = equipos.filter(equipo => {
        try {
          const ultimaActualizacion = new Date(equipo.ultima_actualizacion);
          const ahora = new Date();
          const horasDiferencia = (ahora.getTime() - ultimaActualizacion.getTime()) / (1000 * 60 * 60);
          return horasDiferencia > 20;
        } catch (error) {
          console.error('Error al procesar fecha:', error);
          return false;
        }
      });
      setEquiposDesactualizados(equiposDesactualizadosFiltrados);
      setConfiguracionesRecientes([]); // Placeholder
    } catch (err: any) {
      console.error("Error fetching initial dashboard data:", err);
      setError(err.message || 'Error al cargar datos del dashboard.');
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies for fetchData

  // Cargar datos para el gráfico de historial
  const fetchHistorialChartData = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      setErrorHistorial(null);
      const rawHistorialData = await getCalculosHistorial();
      setHistorialData(rawHistorialData);

      const equipoStats: { [key: string]: { count: number; totalValue: number; name: string } } = {};
      rawHistorialData.forEach(item => {
        const principalItem = item.itemsParaCotizar?.[0]?.principal;
        const equipoNombre = principalItem?.nombre_del_producto;
        let valor = 0;
        if (item.resultadosCalculados?.calculados?.precios_cliente?.precioVentaTotalClienteCLP && 
            typeof item.resultadosCalculados.calculados.precios_cliente.precioVentaTotalClienteCLP === 'number') {
          valor = item.resultadosCalculados.calculados.precios_cliente.precioVentaTotalClienteCLP;
        }
        if (equipoNombre) {
          if (!equipoStats[equipoNombre]) {
            equipoStats[equipoNombre] = { count: 0, totalValue: 0, name: equipoNombre };
          }
          equipoStats[equipoNombre].count++;
          equipoStats[equipoNombre].totalValue += valor;
        }
      });

      const sortedEquipos = Object.values(equipoStats).sort((a, b) => b.count - a.count);
      const topN = 15;
      const topEquipos = sortedEquipos.slice(0, topN);

      const labels = topEquipos.map(e => e.name);
      const countsData = topEquipos.map(e => e.count);
      const avgValuesData = topEquipos.map(e => (e.count > 0 ? e.totalValue / e.count : 0));

      setEquiposCotizadosChartData({
        labels,
        datasets: [
          { label: 'Número de Cotizaciones', data: countsData, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1, yAxisID: 'y' },
          { label: 'Valor Promedio Cotizado (CLP)', data: avgValuesData, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1, yAxisID: 'y1' },
        ],
      });
    } catch (err: any) {
      console.error("Error fetching historial data for chart:", err);
      setErrorHistorial(err.message || 'Error al cargar datos de historial para el gráfico.');
    } finally {
      setLoadingHistorial(false);
    }
  }, []); // Dependencies for fetchHistorialChartData (api.getCachedProducts might be one if it changes)

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchHistorialChartData();
  }, [fetchHistorialChartData]);

  const renderEquiposDesactualizados = () => {
    if (!equiposDesactualizados || equiposDesactualizados.length === 0) {
      return <p style={{ color: '#6b7280', fontSize: '14px' }}>No hay equipos con costos desactualizados.</p>;
    }

    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>
            Equipos que Requieren Actualización
          </h2>
          <div style={warningStyle}>
            <AlertCircle size={18} />
            <span>Costos anteriores a 2024</span>
          </div>
        </div>
        
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Categoría</th>
              <th style={thStyle}>Última Actualización</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equiposDesactualizados.map((equipo) => (
              <tr key={equipo.codigo}>
                <td style={tdStyle}>{equipo.codigo}</td>
                <td style={tdStyle}>{equipo.nombre}</td>
                <td style={tdStyle}>{equipo.categoria}</td>
                <td style={tdStyle}>{equipo.ultima_actualizacion}</td>
                <td style={tdStyle}>
                  <Link 
                    to={`/admin/costos?equipo=${equipo.codigo}`}
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                  >
                    Actualizar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageLayout>
      <div style={panelContainerStyle}>
        {/* Header: Title and Global Actions */}
        <div style={headerActionsStyle}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>Dashboard</h1>
          <div style={controlsContainerStyle}>
            <motion.button 
              style={primaryButtonStyle}
              whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                fetchData(); 
                fetchHistorialChartData(); 
                console.log('Actualizando datos dashboard...');
              }}
            > 
              <RefreshCcw size={16} />
              Actualizar
            </motion.button>
            <motion.button 
              style={successButtonStyle}
              whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={16} />
              Descargar Informe
            </motion.button>
          </div>
        </div>

        {error && (
          <div style={{ ...cardStyle, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Error General del Dashboard</h3>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* EQUIPOS MÁS COTIZADOS CHART (MOVED HERE) */}
        <motion.div
          style={chartCardStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div style={cardHeaderStyle}>
            <h2 style={chartTitleStyle}>Equipos Más Cotizados y Sus Valores Promedio</h2>
          </div>
          {loadingHistorial && <p style={{padding: '20px', textAlign: 'center'}}>Cargando datos del historial de cotizaciones...</p>}
          {errorHistorial && (
            <div style={{ color: '#b91c1c', padding: '10px', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: '#fee2e2', margin: '20px' }}>
              <p style={{ margin: 0 }}><strong>Error al cargar gráfico de historial:</strong> {errorHistorial}</p>
            </div>
          )}
          {!loadingHistorial && !errorHistorial && equiposCotizadosChartData && equiposCotizadosChartData.labels && equiposCotizadosChartData.labels.length > 0 && (
            <div style={chartContainerStyle}>
              <Bar 
                data={equiposCotizadosChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Top Equipos: Número de Cotizaciones y Valor Promedio (CLP)',
                      font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.yAxisID === 'y1') { 
                                        label += new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(context.parsed.y);
                                    } else {
                                        label += context.parsed.y;
                                    }
                                }
                                return label;
                            }
                        }
                    }
                  },
                  scales: {
                    x: {
                      stacked: false,
                      title: {
                        display: true,
                        text: 'Equipos'
                      }
                    },
                    y: {
                      type: 'linear' as const,
                      display: true,
                      position: 'left' as const,
                      title: {
                        display: true,
                        text: 'Número de Cotizaciones',
                      },
                      beginAtZero: true,
                      grid: {
                        drawOnChartArea: false, 
                      }
                    },
                    y1: {
                      type: 'linear' as const,
                      display: true,
                      position: 'right' as const,
                      title: {
                        display: true,
                        text: 'Valor Promedio Cotizado (CLP)',
                      },
                      beginAtZero: true,
                      grid: {
                        drawOnChartArea: true,
                      },
                      ticks: {
                        callback: function(value: string | number) {
                          if (typeof value === 'number') {
                            return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
                          }
                          return value;
                        }
                      }
                    },
                  },
                }}
              />
            </div>
          )}
          {!loadingHistorial && !errorHistorial && (!equiposCotizadosChartData || !equiposCotizadosChartData.labels || equiposCotizadosChartData.labels.length === 0) && (
            <p style={{padding: '20px', textAlign: 'center'}}>No hay datos de historial suficientes para mostrar en el gráfico.</p>
          )}
        </motion.div>

        <div style={gridContainerStyle}>
          {/* Equipos que necesitan actualización */}
          {renderEquiposDesactualizados()}

          {/* Configuraciones Previas */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>
              Configuraciones Realizadas
            </h2>
            
            <div style={searchBarStyle}>
              <input
                type="text"
                placeholder="Buscar por código o nombre de equipo..."
                value={filtroConfiguracion}
                onChange={(e) => setFiltroConfiguracion(e.target.value)}
                style={inputStyle}
              />
              <select 
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                style={selectStyle}
              >
                <option value="todas">Todas las categorías</option>
                <option value="PTO">PTO</option>
                <option value="Industrial">Industrial</option>
                <option value="Motor">Motor</option>
              </select>
            </div>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID Config.</th>
                  <th style={thStyle}>Equipo Base</th>
                  <th style={thStyle}>Items</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {configuracionesRecientes.map((config) => (
                  <tr key={config.id}>
                    <td style={tdStyle}>{config.id}</td>
                    <td style={tdStyle}>{config.equipo_base.nombre}</td>
                    <td style={tdStyle}>{config.total_items}</td>
                    <td style={tdStyle}>{config.fecha}</td>
                    <td style={tdStyle}>
                      <Link 
                        to={`/equipos?config=${config.id}`}
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        Reutilizar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 