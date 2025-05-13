import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import EquiposPanel from './pages/EquiposPanel'
import AdminPanel from './pages/AdminPanel'
import CostosAdminPanel from './pages/CostosAdminPanel'
import PerfilesPanel from './pages/PerfilesPanel'
import PerfilEditForm from './pages/PerfilEditForm'
import CargaEquiposPanel from './pages/CargaEquiposPanel'
import DashboardPanel from './pages/DashboardPanel'
import DetallesEnvioPanel from './pages/DetallesEnvioPanel'

// Forzar modo claro
document.documentElement.setAttribute('data-color-mode', 'light');
document.documentElement.style.backgroundColor = '#ffffff';
document.documentElement.style.color = '#000000';
document.body.style.backgroundColor = '#ffffff';
document.body.style.color = '#000000';

// Logs para depuración
console.log('Iniciando aplicación...');

const rootElement = document.getElementById('root');
console.log('Elemento root encontrado:', rootElement);

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('Root creado con éxito');
    
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<EquiposPanel />} />
              <Route path="equipos" element={<EquiposPanel />} />
              <Route path="admin" element={<AdminPanel />}>
                <Route index element={<PerfilesPanel />} />
                <Route path="costos" element={<CostosAdminPanel />} />
                <Route path="perfiles" element={<PerfilesPanel />} />
                <Route path="carga-equipos" element={<CargaEquiposPanel />} />
              </Route>
              <Route path="/perfiles/:id/editar" element={<PerfilEditForm />} />
              <Route path="dashboard" element={<DashboardPanel />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
    
    console.log('Aplicación renderizada');
  } catch (error) {
    console.error('Error al renderizar la aplicación:', error);
    
    // Intento de recuperación
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Error al cargar la aplicación</h1>
        <p>Por favor, intente recargar la página.</p>
        <button onclick="window.location.reload()">Recargar</button>
      </div>
    `;
    
    // Código de renderizado duplicado en el catch (asegúrate que también incluya la nueva ruta si es relevante para el fallback)
    const root = ReactDOM.createRoot(rootElement); 
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<EquiposPanel />} />
              <Route path="equipos" element={<EquiposPanel />} />
              <Route path="admin" element={<AdminPanel />}>
                <Route index element={<PerfilesPanel />} />
                <Route path="costos" element={<CostosAdminPanel />} />
                <Route path="perfiles" element={<PerfilesPanel />} />
                <Route path="carga-equipos" element={<CargaEquiposPanel />} />
              </Route>
              <Route path="/perfiles/:id/editar" element={<PerfilEditForm />} />
              <Route path="dashboard" element={<DashboardPanel />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
  }
} else {
  console.error('No se encontró el elemento root');
  
  // Crear elemento root si no existe
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  
  console.log('Elemento root creado dinámicamente');
  
  const root = ReactDOM.createRoot(newRoot);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<EquiposPanel />} />
            <Route path="equipos" element={<EquiposPanel />} />
            <Route path="admin" element={<AdminPanel />}>
              <Route index element={<PerfilesPanel />} />
              <Route path="costos" element={<CostosAdminPanel />} />
              <Route path="perfiles" element={<PerfilesPanel />} />
              <Route path="carga-equipos" element={<CargaEquiposPanel />} />
            </Route>
            <Route path="/perfiles/:id/editar" element={<PerfilEditForm />} />
            <Route path="dashboard" element={<DashboardPanel />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Componente auxiliar para gestionar AnimatePresence con React Router
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    // Envolver Routes con AnimatePresence
    <AnimatePresence mode="wait"> 
      {/* Usar location.key como key es crucial para que AnimatePresence detecte el cambio */}
      <Routes location={location} key={location.key}> 
        <Route path="/" element={<App />}>
          {/* Envuelve cada elemento de ruta con motion.div para la animación */}
          <Route index element={<AnimatedPage><EquiposPanel /></AnimatedPage>} />
          <Route path="equipos" element={<AnimatedPage><EquiposPanel /></AnimatedPage>} />
          <Route path="admin" element={<AdminPanel />}> {/* AdminPanel puede tener su propio Outlet y animación si es necesario */}
             {/* Rutas anidadas dentro de Admin. Si AdminPanel tiene <Outlet/>, estas se animarán */}
             <Route index element={<AnimatedPage><PerfilesPanel /></AnimatedPage>} />
             <Route path="costos" element={<AnimatedPage><CostosAdminPanel /></AnimatedPage>} />
             <Route path="perfiles" element={<AnimatedPage><PerfilesPanel /></AnimatedPage>} />
             <Route path="carga-equipos" element={<AnimatedPage><CargaEquiposPanel /></AnimatedPage>} />
           </Route>
          <Route path="/perfiles/:id/editar" element={<AnimatedPage><PerfilEditForm /></AnimatedPage>} />
          <Route path="dashboard" element={<AnimatedPage><DashboardPanel /></AnimatedPage>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

// Componente HOC para añadir animación a las páginas
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }} // Empieza invisible y ligeramente abajo
    animate={{ opacity: 1, y: 0 }} // Anima a visible y posición original
    exit={{ opacity: 0, y: -15 }} // Anima a invisible y ligeramente arriba
    transition={{ duration: 0.3, ease: "easeInOut" }} // Duración y tipo de transición
    style={{ position: 'relative' }} // Asegura contexto de apilamiento si es necesario
  >
    {children}
  </motion.div>
);

try {
  const root = ReactDOM.createRoot(rootElement!); // Usar '!' porque ya aseguramos que existe
  console.log('Root creado con éxito');
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        {/* Usar el componente AnimatedRoutes */}
        <AnimatedRoutes /> 
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('Aplicación renderizada');
} catch (error) {
  console.error('Error crítico al renderizar la aplicación:', error);
  // Mostrar mensaje de error simple en caso de fallo catastrófico
  rootElement!.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h1 style="color: #dc2626;">Error al cargar la aplicación</h1>
      <p style="color: #52525b;">Ocurrió un problema inesperado. Por favor, intente recargar la página o contacte al soporte.</p>
      <button 
        onclick="window.location.reload()" 
        style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #2563eb; color: white; border: none; border-radius: 6px; margin-top: 20px;"
      >
        Recargar Página
      </button>
    </div>
  `;
}
