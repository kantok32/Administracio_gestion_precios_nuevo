import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
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
import ResultadosCalculoCostosPanel from './pages/ResultadosCalculoCostosPanel'
import ConfiguracionPanel from './pages/ConfiguracionPanel'
import ConfigurarOpcionalesPanel from './pages/ConfigurarOpcionalesPanel'
import ResumenCargaPanel from './pages/ResumenCargaPanel'
import LoginPage from './pages/LoginPage'
import HistorialPage from './pages/HistorialPage'
import HistorialDetallePage from './pages/HistorialDetallePage'
// import DetallesEnvioPanel from './pages/DetallesEnvioPanel'; // Comentado si no se usa directamente aquí

// Forzar modo claro
document.documentElement.setAttribute('data-color-mode', 'light');
document.documentElement.style.backgroundColor = '#ffffff';
document.documentElement.style.color = '#000000';
document.body.style.backgroundColor = '#ffffff';
document.body.style.color = '#000000';

console.log('Iniciando aplicación...');

// --- PASO 1: Asegurar que el elemento root exista ---
let rootElement = document.getElementById('root');
console.log('Elemento root inicial:', rootElement);

if (!rootElement) {
  console.log('No se encontró el elemento root. Creando uno nuevo...');
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
  console.log('Elemento root creado dinámicamente y añadido al body:', rootElement);
} else {
  console.log('Elemento root encontrado existente.');
}

// --- PASO 2: Crear la raíz de React UNA SOLA VEZ ---
// Aseguramos que rootElement no es null aquí, ya que lo creamos si no existía.
const reactRoot = ReactDOM.createRoot(rootElement!);
console.log('Raíz de React (reactRoot) creada con éxito.');

// Componente auxiliar para gestionar AnimatePresence con React Router
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
        <Route path="/" element={<App />}>
          <Route index element={<EquiposPanel />} />
          <Route path="equipos" element={<EquiposPanel />} />
          <Route path="admin" element={<AdminPanel />}>
            <Route index element={<AnimatedPage><PerfilesPanel /></AnimatedPage>} />
            <Route path="costos" element={<AnimatedPage><CostosAdminPanel /></AnimatedPage>} />
            <Route path="perfiles" element={<AnimatedPage><PerfilesPanel /></AnimatedPage>} />
            <Route path="carga-equipos" element={<AnimatedPage><CargaEquiposPanel /></AnimatedPage>} />
          </Route>
          <Route path="/perfiles/:id/editar" element={<AnimatedPage><PerfilEditForm /></AnimatedPage>} />
          <Route path="dashboard" element={<AnimatedPage><DashboardPanel /></AnimatedPage>} />
          {/* <Route path="detalles-envio" element={<AnimatedPage><DetallesEnvioPanel /></AnimatedPage>} /> */}
          <Route path="resultados-calculo-costos" element={<AnimatedPage><ResultadosCalculoCostosPanel /></AnimatedPage>} />
          <Route path="configuracion-panel" element={<AnimatedPage><ConfiguracionPanel /></AnimatedPage>} />
          <Route path="configurar-opcionales" element={<AnimatedPage><ConfigurarOpcionalesPanel /></AnimatedPage>} />
          <Route path="resumen-carga" element={<AnimatedPage><ResumenCargaPanel /></AnimatedPage>} />
          <Route path="historial" element={<HistorialPage />} />
          <Route path="historial/:id" element={<AnimatedPage><HistorialDetallePage /></AnimatedPage>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

// Componente HOC para añadir animación a las páginas
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    style={{ position: 'relative' }}
  >
    {children}
  </motion.div>
);

// --- PASO 3: Renderizar la aplicación y manejar errores ---
try {
  reactRoot.render(
    <React.StrictMode>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('Aplicación renderizada con éxito usando reactRoot.render()');
} catch (error) {
  console.error('Error CRÍTICO al renderizar la aplicación con reactRoot.render():', error);
  // Mostrar mensaje de error simple directamente en el DOM si el renderizado de React falla catastróficamente.
  // Aseguramos que rootElement no es null aquí.
  rootElement!.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: sans-serif; background-color: #fff; color: #000;">
      <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 16px;">Error al Cargar la Aplicación</h1>
      <p style="color: #52525b; font-size: 16px; margin-bottom: 24px;">
        Ocurrió un problema inesperado que impidió iniciar la aplicación correctamente. 
        Por favor, intente recargar la página.
      </p>
      <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">
        Si el problema persiste, puede que haya un error en la configuración o el código de la aplicación.
        Detalles del error (para desarrolladores): ${error instanceof Error ? error.message : String(error)}
      </p>
      <button
        onclick="window.location.reload()"
        style="padding: 12px 24px; font-size: 16px; cursor: pointer; background-color: #2563eb; color: white; border: none; border-radius: 6px; transition: background-color 0.2s;"
        onmouseover="this.style.backgroundColor='#1d4ed8'"
        onmouseout="this.style.backgroundColor='#2563eb'"
      >
        Recargar Página
      </button>
    </div>
  `;
  console.log('Mensaje de error de fallback insertado en el DOM.');
}

// --- Placeholder para ResumenCargaPanel ---
// const ResumenCargaPlaceholder = () => (
//   <div style={{ padding: '20px', textAlign: 'center' }}>
//     <h1>Resumen y Configuración de Carga</h1>
//     <p>Esta página está en construcción.</p>
//     <p>Aquí se mostrará el resumen de los equipos y opcionales seleccionados antes de proceder al cálculo final o cotización.</p>
//   </div>
// );
// --- Fin Placeholder ---
