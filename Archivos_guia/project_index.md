# -*- coding: utf-8 -*-

**Nota:** Todas las respuestas y comunicaciones relacionadas con este proyecto deben ser en español.

# Índice del Proyecto: Administración y Gestión de Precios

Este archivo sirve como índice para entender la estructura y funcionalidad del proyecto.

## Descripción General

El proyecto consiste en una aplicación web para la administración y gestión de precios, compuesta por un backend Node.js/Express y un frontend React/Vite/TypeScript.

## Estructura de Directorios Raíz

```
.
├── Archivos_guia/  # Carpeta con documentación y archivos guía del proyecto
│   ├── project_index.md    # Este archivo
│   ├── AI_PROJECT_GUIDE.md # Guía del proyecto AI
│   ├── logica_costo_producto.md # Lógica de cálculo de costos (Confirmado)
│   ├── Costo de Producto.docx # Documento relacionado con costos (Confirmado)
│   ├── solucion_problemas_comunes_extendido.md # Guía extendida para solución de problemas comunes
│   └── funcionalidades_proyecto.md # Funcionalidades del proyecto y archivos implicados (Actualizado)
├── backend/        # Código del servidor backend (Node.js/Express)
├── frontend/       # Código de la aplicación frontend (React/Vite)
├── node_modules/   # Dependencias de Node.js (nivel raíz, posiblemente para scripts)
├── .git/           # Repositorio Git
├── .gitignore      # Archivos ignorados por Git (Confirmado)
├── .gitattributes  # Atributos de Git (Confirmado)
├── package.json    # Dependencias y scripts (nivel raíz) (Confirmado)
├── package-lock.json # Versiones exactas de dependencias (nivel raíz) (Confirmado)
└── nodemon.json    # Configuración de Nodemon (Confirmado)
```

## Backend (`./backend/`)

Aplicación Node.js con Express.

### Estructura del Backend

```
backend/
├── config/         # Archivos de configuración (e.g., db.js, env.js)
├── controllers/    # Lógica de negocio (e.g., costoPerfilController.js, productController.js, ¿productoController.js?)
├── data/           # Posiblemente datos estáticos o iniciales
├── middleware/     # Middlewares de Express (e.g., errorMiddleware.js, authMiddleware.js)
├── models/         # Modelos de datos (probablemente Mongoose) (e.g., CostoPerfil.js, Producto.js, Conversation.js)
├── node_modules/   # Dependencias del backend
├── routes/         # Definición de rutas API (e.g., costoPerfilRoutes.js, productRoutes.js, ¿productoRoutes.js?, langchainRoutes.js)
├── src/            # Código fuente adicional del backend (Añadido)
├── utils/          # Funciones de utilidad (e.g., fetchProducts.js para Langchain)
├── server.js       # Punto de entrada principal del servidor
├── package.json    # Dependencias y scripts del backend
├── package-lock.json # Versiones exactas de dependencias del backend
├── Plantilla_Carga_Equipos.xlsx # Plantilla Excel para carga de equipos (Confirmado)
└── Plantilla_Carga_Especificaciones.xlsx # Plantilla XLSX para carga de especificaciones (Confirmado como .xlsx)
```

### Puntos Clave del Backend

*   **Punto de entrada:** `server.js` inicializa Express, conecta a la BD, configura middlewares y monta las rutas.
*   **Rutas API Principales:**
    *   `/api/users`: Autenticación y gestión de usuarios (`routes/userRoutes.js`).
    *   `/api/products`: Gestión y obtención de productos y divisas (`routes/productRoutes.js`). Podría existir una ruta `routes/productoRoutes.js` con funcionalidad más específica o legada.
    *   `/api/costo-perfiles`: CRUD para perfiles de costo (`routes/costoPerfilRoutes.js`). Controlado por `controllers/costoPerfilController.js`.
    *   `/api/langchain`: Rutas relacionadas con Langchain (`routes/langchainRoutes.js`). La lógica del agente y herramientas está definida directamente en este archivo.
*   **Base de Datos:** Probablemente MongoDB, configurado en `config/db.js`.
*   **Modelos:** Definidos en la carpeta `models/`. `CostoPerfil.js`, `Producto.js` (para productos/equipos), `User.js` y `Conversation.js` (para Langchain) son relevantes.
*   **Controladores:** Lógica para cada ruta en `controllers/`. `costoPerfilController.js` y `productController.js` son los principales. Existe `productoController.js` que podría ser legado o para funciones específicas. La lógica de Langchain no reside en un controlador dedicado.
*   **Utilidades:** `utils/fetchProducts.js` es utilizado por las rutas de Langchain.

## Frontend (`./frontend/`)

Aplicación React con Vite y TypeScript.

### Estructura del Frontend

```
frontend/
├── node_modules/   # Dependencias del frontend
├── public/         # Archivos estáticos públicos
├── src/            # Código fuente del frontend
│   ├── components/ # Componentes reutilizables (e.g., ChatWidget.tsx, Dashboard.tsx)
│   ├── pages/      # Componentes de página (vistas principales) (e.g., PerfilesPanel.tsx, PerfilEditForm.tsx, EquiposPanel.tsx, CostosAdminPanel.tsx, CargaEquiposPanel.tsx, DashboardPanel.tsx)
│   ├── services/   # Lógica para interactuar con la API backend (e.g., api.ts, perfilService.ts)
│   ├── types/      # Definiciones de tipos TypeScript
│   ├── App.css     # Estilos generales de App
│   ├── App.tsx     # Componente raíz de la aplicación (layout principal)
│   ├── index.css   # Estilos globales
│   ├── main.tsx    # Punto de entrada del frontend (renderiza App y configura rutas)
│   ├── theme.ts    # Configuración del tema (probablemente Material UI)
│   └── ...         # Otros archivos de configuración y tipos (tsconfig, vite-env, etc.)
├── assets/         # Imágenes, fuentes, etc. (Confirmado)
├── .gitignore      # Archivos ignorados por Git (Confirmado)
├── index.html      # Archivo HTML principal (Confirmado)
├── package.json    # Dependencias y scripts del frontend (Confirmado)
├── package-lock.json # Versiones exactas de dependencias del frontend (Confirmado)
├── vite.config.ts  # Configuración de Vite (Confirmado)
├── tsconfig.json   # Configuración de TypeScript (Confirmado)
├── tsconfig.app.json # Configuración específica de TypeScript para la app (Confirmado)
├── tsconfig.node.json # Configuración específica de TypeScript para el entorno Node en Vite (Confirmado)
├── eslint.config.js # Configuración de ESLint (Confirmado)
├── README.md       # README del frontend (Confirmado)
└── ...             # Otros archivos de configuración (eslint, etc.)
```

### Puntos Clave del Frontend

*   **Punto de entrada:** `main.tsx` configura `react-router-dom` y renderiza el componente `App`.
*   **Enrutamiento:** Definido en `main.tsx` usando `BrowserRouter` y `Routes`.
    *   Layout principal: `App.tsx`.
    *   Rutas principales: `/equipos` (`EquiposPanel.tsx`), `/admin` (`AdminPanel.tsx`), `/perfiles/:id/editar` (`PerfilEditForm.tsx`), `/dashboard` (`DashboardPanel.tsx`).
    *   Rutas de administración (`/admin`): Renderizadas dentro de `AdminPanel.tsx`.
        *   `/admin/perfiles`: `PerfilesPanel.tsx` (Podría existir `PerfilesAdminPanel.tsx` como alternativa o complemento).
        *   `/admin/costos`: `CostosAdminPanel.tsx` (Podría existir `CostosPanel.tsx` como alternativa o complemento).
        *   `/admin/carga-equipos`: `CargaEquiposPanel.tsx`.
    *   Nuevas páginas identificadas: `DetallesEnvioPanel.tsx`, `DetallesCargaPanel.tsx` (funcionalidad específica a documentar).
    *   Edición de perfil: `/perfiles/:id/editar` renderiza `PerfilEditForm.tsx`.
*   **Componente Principal:** `App.tsx` define el layout general (cabecera, barra lateral) y puede contener lógica global o estado compartido.
*   **Páginas:** Los componentes principales para cada ruta están en `pages/`.
*   **Llamadas API:** Realizadas desde los componentes en `pages/` o a través de funciones definidas en `services/` (como `perfilService.ts` o el genérico `api.ts`).
*   **Estilos:** Combinación de CSS (`index.css`, `App.css`) y posiblemente una librería UI como Material UI (`theme.ts`).

## Flujo de Trabajo para "Crear Perfil" (Objetivo Actual)

1.  **Usuario:** Hace clic en el botón "Crear Perfil" en la página `/admin/perfiles` (componente `PerfilesPanel.tsx`).
2.  **Frontend:**
    *   El evento `onClick` del botón debe disparar una función.
    *   Esta función probablemente realizará una llamada `POST` a la API backend: `POST /api/costo-perfiles`.
    *   Tras una respuesta exitosa del backend (que podría incluir el ID del nuevo perfil creado), el frontend debería redirigir al usuario a una nueva página/vista para configurar los detalles de ese perfil. Esta página podría ser una ruta como `/admin/perfiles/nuevo` o `/admin/perfiles/:id/configurar` (a definir).
3.  **Backend:**
    *   La ruta `POST /api/costo-perfiles` (definida en `routes/costoPerfilRoutes.js`) recibe la solicitud.
    *   Invoca la función `createCostoPerfil` del `costoPerfilController.js`.
    *   El controlador interactúa con el modelo `models/CostoPerfil.js` para crear un nuevo documento en la base de datos.
    *   Responde al frontend, usualmente con los datos del perfil recién creado o un mensaje de éxito.

Este índice debería facilitar la navegación y modificación del código. Lo usaré como referencia en nuestras próximas interacciones. 

## Solución de Problemas Comunes

Para problemas comunes como la falta de módulos (`bcryptjs`, `multer`) o errores de `Vite` en el frontend, consulta las soluciones básicas directamente en este documento.

**Para una guía más detallada y pasos adicionales de solución de problemas, incluyendo los que hemos cubierto interactivamente, por favor revisa el archivo:** `Archivos_guia/solucion_problemas_comunes_extendido.md`.

### Error: `Cannot find module 'bcryptjs'` (Backend)

Este error indica que falta la dependencia `bcryptjs` necesaria para el hashing de contraseñas en el backend.

**Solución (usando PowerShell en la raíz del proyecto):**

1.  Navega al directorio del backend:
    ```powershell
    cd backend
    ```
2.  Instala la dependencia faltante:
    ```powershell
    npm install bcryptjs
    ```
3.  Regresa al directorio raíz (opcional):
    ```powershell
    cd ..
    ```

### Error: `ERR_MODULE_NOT_FOUND` en `vite` (Frontend)

Este error, a menudo relacionado con un archivo como `.../frontend/node_modules/vite/dist/node/chunks/dep-....js`, sugiere problemas con las dependencias instaladas en el frontend, posiblemente por una instalación corrupta o incompleta.

**Solución (usando PowerShell en la raíz del proyecto):**

1.  Navega al directorio del frontend:
    ```powershell
    cd frontend
    ```
2.  Elimina la carpeta `node_modules` existente:
    ```powershell
    Remove-Item -Recurse -Force node_modules
    ```
3.  Elimina el archivo `package-lock.json`:
    ```powershell
    Remove-Item -Force package-lock.json
    ```
4.  Reinstala todas las dependencias:
    ```powershell
    npm install
    ```
5.  Regresa al directorio raíz (opcional):
    ```powershell
    cd ..
    ``` 