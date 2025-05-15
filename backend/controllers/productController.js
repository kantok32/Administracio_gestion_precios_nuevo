const { fetchFilteredProducts, fetchCurrencyValues } = require('../utils/fetchProducts');
const { fetchBaseProductsFromDB, createProductInDB, getProductByCodeFromDB, updateProductInDB, deleteProductFromDB } = require('../utils/mongoDataService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Producto = require('../models/Producto.js');

let cachedProducts = [];
let currencyCache = {
  dollar: {
    value: null,
    last_update: null,
    fecha: null
  },
  euro: {
    value: null,
    last_update: null,
    fecha: null
  }
};

// Modificar la ruta para apuntar al nuevo archivo en la carpeta data
const CACHE_FILE = path.join(__dirname, '../data/productsCache.json');

// Cargar cache desde disco al iniciar
if (fs.existsSync(CACHE_FILE)) {
  try {
    let data = fs.readFileSync(CACHE_FILE, 'utf-8');
    
    // Eliminar BOM (Byte Order Mark) si existe
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.substring(1);
      console.log('BOM detectado y eliminado del archivo JSON al iniciar');
    }
    
    // Otra forma de eliminar posibles caracteres problemáticos
    data = data.replace(/^\uFEFF/, '');
    data = data.trim();
    
    try {
      cachedProducts = JSON.parse(data);
      console.log(`Cache de productos cargado desde disco. ${cachedProducts.length} productos encontrados.`);
    } catch (parseError) {
      console.error(`Error al parsear JSON al iniciar: ${parseError.message}`);
      console.error(`Contenido problemático: "${data.substring(0, 50)}..."`);
      cachedProducts = [];
    }
  } catch (err) {
    console.error('Error al leer el cache de productos:', err);
    cachedProducts = [];
  }
}

// Función para actualizar automáticamente los valores de las divisas
const updateCurrencyValues = async () => {
  try {
    // fetchCurrencyValues devuelve un objeto
    const currencyData = await fetchCurrencyValues();
    
    // Verificar que el objeto y las propiedades existan
    if (currencyData && currencyData.Valor_Dolar !== undefined && currencyData.Valor_Euro !== undefined && currencyData.Fecha !== undefined) {
      // Acceder directamente a las propiedades del objeto
      currencyCache.dollar.value = currencyData.Valor_Dolar;
      currencyCache.euro.value = currencyData.Valor_Euro;
      currencyCache.dollar.fecha = currencyData.Fecha;
      currencyCache.euro.fecha = currencyData.Fecha;
      currencyCache.dollar.last_update = new Date().toISOString();
      currencyCache.euro.last_update = new Date().toISOString();
      
      console.log('Internal currency cache updated automatically at:', new Date().toISOString());
    } else {
       console.error('Invalid currency data received during automatic update:', currencyData);
    }
  } catch (error) {
    console.error('Error in automatic currency update:', error.message);
  }
};

// Configurar actualización automática cada 24 horas
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(updateCurrencyValues, TWENTY_FOUR_HOURS);

// Ejecutar la primera actualización inmediatamente
updateCurrencyValues();

const saveCacheToDisk = () => {
  try {
    // Siempre escribir/sobrescribir el archivo de caché con el contenido actual de cachedProducts
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedProducts, null, 2), 'utf-8');
    console.log('Cache de productos guardado/actualizado en disco.');
  } catch (err) {
    console.error('Error al guardar el cache de productos:', err);
  }
};

// @desc    Fetch products from DB and cache them
// @route   GET /api/products/fetch
// @access  Public
const fetchProducts = async (req, res) => {
  try {
    const products = await fetchBaseProductsFromDB();
    
    cachedProducts = products; // Cache the products
    saveCacheToDisk();
    
    res.status(200).json({ 
      message: 'Products fetched from DB and cached successfully',
      count: products.length,
      products 
    });
  } catch (error) {
    console.error('Error in fetchProducts controller:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch and cache products' });
  }
};

// @desc    Get cached products
// @route   GET /api/products
// @access  Public
const getCachedProducts = (req, res) => {
  res.status(200).json(cachedProducts);
};

// @desc    Fetch filtered products from webhook
// @route   GET /api/products/filter
// @access  Public
const fetchFilteredProductsController = async (req, res) => {
  try {
    const { codigo, modelo, categoria } = req.query;
    const query = { codigo, modelo, categoria };
    const products = await fetchFilteredProducts(query);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch currency values from webhook and cache them
// @route   GET /api/currency/fetch
// @access  Public
const fetchCurrencyValuesController = async (req, res) => {
  try {
    // fetchCurrencyValues ahora devuelve un objeto directamente
    const currencyData = await fetchCurrencyValues(); 
    
    // Verificar que el objeto y las propiedades existan
    if (currencyData && currencyData.Valor_Dolar !== undefined && currencyData.Valor_Euro !== undefined && currencyData.Fecha !== undefined) {
      // Acceder directamente a las propiedades del objeto
      currencyCache.dollar.value = currencyData.Valor_Dolar;
      currencyCache.euro.value = currencyData.Valor_Euro;
      currencyCache.dollar.fecha = currencyData.Fecha;
      currencyCache.euro.fecha = currencyData.Fecha;
      currencyCache.dollar.last_update = new Date().toISOString();
      currencyCache.euro.last_update = new Date().toISOString();

      res.status(200).json({ 
        message: 'Currency values fetched and cached successfully', 
        currencies: currencyCache 
      });
    } else {
      // Si el objeto o las propiedades faltan
      console.error('Invalid currency data received from fetchCurrencyValues:', currencyData);
      res.status(404).json({ message: 'Invalid or incomplete currency data received' });
    }
  } catch (error) {
    console.error('Error fetching currency values:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get cached dollar value
// @route   GET /api/currency/dollar
// @access  Public
const getCachedDollarValue = (req, res) => {
  if (currencyCache.dollar.value) {
    res.status(200).json({
      value: currencyCache.dollar.value,
      fecha: currencyCache.dollar.fecha,
      last_update: currencyCache.dollar.last_update
    });
  } else {
    res.status(404).json({ message: 'Dollar value not cached yet' });
  }
};

// @desc    Get cached euro value
// @route   GET /api/currency/euro
// @access  Public
const getCachedEuroValue = (req, res) => {
  if (currencyCache.euro.value) {
    res.status(200).json({
      value: currencyCache.euro.value,
      fecha: currencyCache.euro.fecha,
      last_update: currencyCache.euro.last_update
    });
  } else {
    res.status(404).json({ message: 'Euro value not cached yet' });
  }
};

// @desc    Get all products from cached memory (was getAllProductsAndCache)
// @route   GET /api/products/cache/all
// @access  Public
const getAllProductsAndCache = (req, res) => { // Ya no necesita ser async
  try {
    // Servir directamente desde el caché en memoria
    // El caché en memoria (cachedProducts) se actualiza al inicio y por /api/products/fetch o /reset
    const response = {
      success: true,
      data: {
        currencies: currencyCache, // currencyCache se actualiza por su propio mecanismo
        products: {
          total: cachedProducts.length,
          data: cachedProducts // Usar la variable cachedProducts
        }
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`Servido /api/products/cache/all con ${cachedProducts.length} productos desde caché en memoria.`);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error en getAllProductsAndCache (sirviendo desde memoria):', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener todos los productos del caché de memoria',
      message: error.message
    });
  }
};

// @desc    Reset all cache and fetch fresh data
// @route   POST /api/products/cache/reset
// @access  Public
const resetCache = async (req, res) => {
  try {
    // Limpiar caché actual en memoria
    cachedProducts = [];
    currencyCache = {
      dollar: { value: null, last_update: null, fecha: null },
      euro: { value: null, last_update: null, fecha: null }
    };
    console.log('In-memory cache and currency cache cleared.');

    // Obtener nuevos datos de divisas
    try {
      const currencyData = await fetchCurrencyValues(); // fetchCurrencyValues devuelve un objeto
      if (currencyData && currencyData.Valor_Dolar !== undefined && currencyData.Valor_Euro !== undefined) {
        currencyCache.dollar.value = currencyData.Valor_Dolar;
        currencyCache.euro.value = currencyData.Valor_Euro;
        currencyCache.dollar.fecha = currencyData.Fecha || null; // Asegurar que fecha existe
        currencyCache.euro.fecha = currencyData.Fecha || null;   // Asegurar que fecha existe
        currencyCache.dollar.last_update = new Date().toISOString();
        currencyCache.euro.last_update = new Date().toISOString();
        console.log('Currency cache updated from source.');
      } else {
        console.warn('Could not update currency cache, source did not return expected data.');
      }
    } catch (currencyError) {
      console.error('Error fetching currency values during cache reset:', currencyError.message);
      // Continuar con el reseteo del caché de productos de todas formas
    }

    // Obtener nuevos datos de productos desde la DB
    const productsFromDB = await fetchBaseProductsFromDB(); // Esta función ya transforma los datos
    cachedProducts = productsFromDB; // Actualizar caché en memoria con datos frescos de la DB
    console.log(`Products cache updated from DB. Found ${cachedProducts.length} products.`);
    
    saveCacheToDisk();    // Guardar el nuevo caché (potencialmente vacío si la DB está vacía) en disco

    res.status(200).json({
      message: 'Cache reset successfully. Data reloaded from database.',
      cache: {
        currencies: currencyCache,
        products: {
          total: cachedProducts.length,
          data: cachedProducts
        }
      }
    });
  } catch (error) {
    // Si hay un error (ej. DB no accesible después de borrarla y antes de recargar)
    // Asegurar que el caché de productos se limpie.
    cachedProducts = []; // Limpiar caché en memoria
    console.error('Error during product fetch in cache reset. Product cache force-cleared. Error:', error.message);
    saveCacheToDisk(); // Intenta guardar el caché de productos vacío
    
    // Devolver un error, pero indicar que el caché de productos se limpió.
    // El caché de divisas podría o no haberse actualizado dependiendo de dónde ocurrió el error.
    res.status(500).json({ 
        message: `Error resetting product cache: ${error.message}. Product cache has been cleared. Currency cache status may vary.`,
        cache: {
            currencies: currencyCache, // Devuelve el estado actual del caché de divisas
            products: {
                total: cachedProducts.length,
                data: cachedProducts
            }
        }
    });
  }
};

// @desc    Clear all cache
// @route   DELETE /api/products/cache
// @access  Public
const clearCache = async (req, res) => {
  try {
    cachedProducts = [];
    currencyCache = {
      dollar: { value: null, last_update: null, fecha: null },
      euro: { value: null, last_update: null, fecha: null }
    };
    saveCacheToDisk();
    res.status(200).json({
      message: 'Cache cleared successfully',
      cache: {
        currencies: currencyCache,
        products: {
          total: 0,
          data: []
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product detail from cache or webhook
// @route   GET /api/products/detail
// @access  Public
const getProductDetail = async (req, res) => {
  try {
    const { codigo, modelo, categoria } = req.query;

    if (!codigo) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros inválidos',
        message: 'El código del producto es requerido'
      });
    }

    // Primero buscar en el caché
    const productsFromCache = cachedProducts;
    const productFromCache = productsFromCache.find(p => p.codigo_producto === codigo);

    if (productFromCache) {
      console.log(`Producto encontrado en caché: ${codigo}`);
      return res.status(200).json({
        success: true,
        data: {
          source: 'cache',
          product: productFromCache
        },
        timestamp: new Date().toISOString()
      });
    }

    // Si no está en caché, consultar al webhook
    console.log(`Producto no encontrado en caché, consultando webhook: ${codigo}`);
    const query = { codigo, modelo, categoria };
    const products = await fetchFilteredProducts(query);

    if (products && products.length > 0) {
      const product = products[0];
      return res.status(200).json({
        success: true,
        data: {
          source: 'webhook',
          product
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Producto no encontrado',
      message: `No se encontró el producto con código ${codigo}`
    });

  } catch (error) {
    console.error('Error al obtener detalle del producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalle del producto',
      message: error.message
    });
  }
};

// @desc    Get optional products based on new logic
// @route   GET /api/products/opcionales
// @access  Public
const getOptionalProducts = async (req, res) => {
  try {
    const { codigo: codigoPrincipal } = req.query;

    if (!codigoPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro inválido',
        message: 'Se requiere el código del producto principal (param: codigo)'
      });
    }

    const productoPrincipal = await Producto.findOne({ Codigo_Producto: codigoPrincipal }).lean();

    if (!productoPrincipal) {
      return res.status(404).json({
        success: false,
        error: 'No encontrado',
        message: `Producto principal con código ${codigoPrincipal} no encontrado.`
      });
    }

    // Validaciones de datos del producto principal
    if (!productoPrincipal.caracteristicas || !productoPrincipal.caracteristicas.modelo) {
        return res.status(400).json({
            success: false,
            error: 'Datos incompletos en producto principal',
            message: 'El producto principal no tiene "caracteristicas.modelo" definido.'
        });
    }
    if (!productoPrincipal.producto) { // Necesario para el nuevo filtro de tipo de chipeadora
        return res.status(400).json({
            success: false,
            error: 'Datos incompletos en producto principal',
            message: 'El producto principal no tiene el campo "producto" definido.'
        });
    }

    const modeloPrincipalString = productoPrincipal.caracteristicas.modelo.toLowerCase();
    const tipoChipeadoraPrincipal = productoPrincipal.producto.toLowerCase(); // Ej: "chipeadora motor", "chipeadora pto"

    // Paso 1: Búsqueda inicial de candidatos
    const candidatosOpcionales = await Producto.find({
      Codigo_Producto: { $ne: codigoPrincipal },
      $or: [
        { tipo: { $regex: /^opcional$/i } },
        { 'caracteristicas.nombre_del_producto': { $regex: 'opcional', $options: 'i' } }
      ]
    }).lean();

    console.log(`Encontrados ${candidatosOpcionales.length} productos candidatos iniciales (tipo:"opcional" o nombre contiene "opcional").`);

    // Paso 2 y 3: Filtrar por coincidencia de modelo Y tipo de chipeadora
    const opcionalesFiltrados = candidatosOpcionales.filter(opcional => {
      // Validaciones de datos del opcional
      if (!opcional.caracteristicas || !opcional.caracteristicas.modelo) {
        console.log(`Opcional ${opcional.Codigo_Producto} descartado por no tener caracteristicas.modelo.`);
        return false;
      }
      if (!opcional.producto) { // Necesario para el nuevo filtro
        console.log(`Opcional ${opcional.Codigo_Producto} descartado por no tener el campo "producto".`);
        return false;
      }

      const modeloOpcionalString = opcional.caracteristicas.modelo.toLowerCase();
      const tipoChipeadoraOpcional = opcional.producto.toLowerCase();

      // Condición de Modelo
      const coincideModelo = modeloPrincipalString.includes(modeloOpcionalString);
      if (!coincideModelo) {
        console.log(`Opcional ${opcional.Codigo_Producto} (${opcional.caracteristicas.nombre_del_producto || opcional.nombre_del_producto || 'Nombre no disponible'}) DESCARTADO. Modelo principal "${modeloPrincipalString}" no contiene modelo opcional "${modeloOpcionalString}".`);
        return false;
      }

      // NUEVA Condición: Tipo de Chipeadora (Motor vs PTO)
      const esPrincipalMotor = tipoChipeadoraPrincipal.includes("motor");
      const esPrincipalPTO = tipoChipeadoraPrincipal.includes("pto");
      
      const esOpcionalMotor = tipoChipeadoraOpcional.includes("motor");
      const esOpcionalPTO = tipoChipeadoraOpcional.includes("pto");

      let coincideTipoChipeadora;

      if (esPrincipalMotor) { // Principal es de tipo MOTOR
        coincideTipoChipeadora = esOpcionalMotor && !esOpcionalPTO; // Opcional debe ser MOTOR y no PTO
      } else if (esPrincipalPTO) { // Principal es de tipo PTO
        coincideTipoChipeadora = esOpcionalPTO && !esOpcionalMotor; // Opcional debe ser PTO y no MOTOR
      } else { 
        // Principal NO es ni MOTOR ni PTO (es genérico o un tipo diferente)
        // En este caso, el opcional TAMPOCO debe ser MOTOR ni PTO para ser compatible
        coincideTipoChipeadora = !esOpcionalMotor && !esOpcionalPTO;
      }

      if (!coincideTipoChipeadora) {
        console.log(`Opcional ${opcional.Codigo_Producto} (${opcional.caracteristicas.nombre_del_producto || opcional.nombre_del_producto || 'Nombre no disponible'}) DESCARTADO. Tipo de chipeadora no coincide. Principal: "${tipoChipeadoraPrincipal}", Opcional: "${tipoChipeadoraOpcional}".`);
        return false;
      }
      
      console.log(`Opcional ${opcional.Codigo_Producto} (${opcional.caracteristicas.nombre_del_producto || opcional.nombre_del_producto || 'Nombre no disponible'}) COINCIDE POR MODELO Y TIPO DE CHIPEADORA.`);
      return true;
    });

    console.log(`Encontrados ${opcionalesFiltrados.length} opcionales filtrados finales.`);

    const opcionalesParaFrontend = opcionalesFiltrados.map(op => {
      const mapped = {
        ...op,
        codigo_producto: op.Codigo_Producto,
        nombre_del_producto: op.caracteristicas?.nombre_del_producto || op.nombre_del_producto,
        Descripcion: op.caracteristicas?.descripcion || op.descripcion || op.Descripcion,
        Modelo: op.caracteristicas?.modelo || op.modelo || op.Modelo,
      };
      if (op.hasOwnProperty('Codigo_Producto') && mapped.codigo_producto !== undefined) {
        delete mapped.Codigo_Producto;
      }
      return mapped;
    });

    res.status(200).json({
      success: true,
      data: {
        total: opcionalesParaFrontend.length,
        products: opcionalesParaFrontend
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener productos opcionales (lógica con tipo de chipeadora):', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener productos opcionales (lógica con tipo de chipeadora)',
      message: (error instanceof Error) ? error.message : String(error),
    });
  }
};

// @desc    Get raw optional products (containing "opcional" in name)
// @route   GET /api/products/opcionales/raw
// @access  Public
const getRawOptionalProducts = async (req, res) => {
  try {
    const { codigoPrincipal } = req.query; // Opcional, para excluir el producto principal si se proporciona su código

    const findQuery = {
      'caracteristicas.nombre_del_producto': { $regex: 'opcional', $options: 'i' }
    };

    if (codigoPrincipal) {
      findQuery.Codigo_Producto = { $ne: codigoPrincipal };
    }

    const rawOpcionales = await Producto.find(findQuery).lean();

    // Mapeo similar al de getOptionalProducts para mantener consistencia si es necesario
    const opcionalesParaFrontend = rawOpcionales.map(op => {
      const mapped = {
        ...op,
        codigo_producto: op.Codigo_Producto,
        nombre_del_producto: op.caracteristicas?.nombre_del_producto,
        Descripcion: op.caracteristicas?.descripcion || op.descripcion || op.Descripcion,
        Modelo: op.caracteristicas?.modelo || op.modelo || op.Modelo,
      };
      if (op.hasOwnProperty('Codigo_Producto') && mapped.codigo_producto !== undefined) {
        delete mapped.Codigo_Producto;
      }
      return mapped;
    });

    res.status(200).json({
      success: true,
      data: {
        total: opcionalesParaFrontend.length,
        products: opcionalesParaFrontend
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener productos opcionales sin procesar:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener productos opcionales sin procesar',
      message: (error instanceof Error) ? error.message : String(error),
    });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Public (o Private si implementas autenticación)
const createProductController = async (req, res) => {
  try {
    const productData = req.body;

    // --- Validación (existente, la mantenemos) --- 
    const requiredFields = {
      topLevel: [
        'Codigo_Producto', 'categoria', 'peso_kg', 'clasificacion_easysystems',
        'codigo_ea', 'proveedor', 'procedencia'
      ],
      caracteristicas: ['nombre_del_producto', 'modelo'],
      dimensiones: ['largo_cm', 'ancho_cm', 'alto_cm']
    };
    for (const field of requiredFields.topLevel) {
      if (productData[field] === undefined || productData[field] === null || productData[field] === '') {
        return res.status(400).json({ message: `El campo ${field} es requerido`, field });
      }
    }
    if (!productData.caracteristicas) {
      return res.status(400).json({ message: 'El objeto caracteristicas es requerido', field: 'caracteristicas' });
    }
    for (const field of requiredFields.caracteristicas) {
      if (productData.caracteristicas[field] === undefined || productData.caracteristicas[field] === null || productData.caracteristicas[field] === '') {
        return res.status(400).json({ message: `El campo caracteristicas.${field} es requerido`, field: `caracteristicas.${field}` });
      }
    }
    if (!productData.dimensiones) {
      return res.status(400).json({ message: 'El objeto dimensiones es requerido', field: 'dimensiones' });
    }
    for (const field of requiredFields.dimensiones) {
      if (productData.dimensiones[field] === undefined || productData.dimensiones[field] === null || productData.dimensiones[field] === '') {
        return res.status(400).json({ message: `El campo dimensiones.${field} es requerido`, field: `dimensiones.${field}` });
      }
    }
    const numericFields = {
        topLevel: ['peso_kg'],
        dimensiones: ['largo_cm', 'ancho_cm', 'alto_cm']
    };
    for (const field of numericFields.topLevel) {
        if (productData[field] === undefined || isNaN(Number(productData[field]))) {
            return res.status(400).json({ message: `El campo ${field} debe ser un número válido`, field });
        }
    }
    if (productData.dimensiones) { 
        for (const field of numericFields.dimensiones) {
            if (productData.dimensiones[field] === undefined || isNaN(Number(productData.dimensiones[field]))) {
                return res.status(400).json({ message: `El campo dimensiones.${field} debe ser un número válido`, field: `dimensiones.${field}` });
            }
        }
    }
    // --- Fin Validación --- 

    console.log('[INFO] Validation passed for creating product with Codigo_Producto:', productData.Codigo_Producto);
    
    const newProduct = await createProductInDB(productData);

    // Actualizar caché después de crear un nuevo producto
    // Podríamos simplemente añadir el nuevo producto al caché en memoria y al de disco,
    // o recargar todo el caché desde la DB para asegurar consistencia total.
    // Recargar todo es más simple de implementar ahora.
    console.log('Product created, attempting to refresh cache...');
    const productsFromDB = await fetchBaseProductsFromDB(); // Esta función ya transforma los datos
    cachedProducts = productsFromDB;
    saveCacheToDisk();
    console.log('Cache refreshed after product creation.');

    res.status(201).json({
      message: 'Producto creado exitosamente y caché actualizado.',
      data: newProduct // Devolver el producto completo insertado en la DB
    });

  } catch (error) {
    console.error('[ERROR] Error creating product:', error);
    // Si el error es por duplicado, el mensaje de createProductInDB será útil
    if (error.message && error.message.includes('ya existe')) {
        return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    res.status(500).json({ 
      message: 'Error al crear el producto.',
      error: error.message 
    });
  }
};

// --- Función para inicializar el caché de productos al inicio de la aplicación ---
async function initializeProductCache() {
  try {
    console.log('Inicializando caché de productos desde DB al arrancar la aplicación...');
    const productsFromDB = await fetchBaseProductsFromDB();
    cachedProducts = productsFromDB; // Actualizar caché en memoria
    saveCacheToDisk(); // Guardar en archivo (saveCacheToDisk ya sobrescribe)
    console.log(`Caché de productos inicializado con ${cachedProducts.length} productos y guardado en disco.`);
  } catch (error) {
    console.error('Error fatal al inicializar el caché de productos desde DB:', error);
    // Considerar si la aplicación debe continuar si el caché no se puede cargar.
    // Por ahora, la aplicación continuará con un caché vacío si esto falla.
    cachedProducts = []; 
    // No intentar guardar un caché vacío si la carga inicial falló, para no borrar un archivo bueno.
  }
}

// Llamar a la inicialización del caché cuando este módulo se carga por primera vez.
// Esto asegura que se intente poblar el caché tan pronto como el controlador esté listo.
initializeProductCache();

// --- NUEVO: Handler para el endpoint de prueba de DB ---
const testGetBaseProductsFromDBController = async (req, res) => {
  try {
    console.log('[Controller Test] Attempting to fetch base products directly from DB for testing...');
    const products = await fetchBaseProductsFromDB();
    res.status(200).json({
      message: 'Test successful: Fetched base products directly from DB',
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('[Controller Test] Error fetching base products from DB for testing:', error);
    res.status(500).json({
      message: 'Test failed: Error fetching base products from DB',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// --- NUEVO: Handler para obtener un producto por Codigo_Producto ---
// @desc    Get a single product by its Codigo_Producto
// @route   GET /api/products/code/:codigoProducto
// @access  Public
const getProductByCodeController = async (req, res) => {
  try {
    const { codigoProducto } = req.params;
    if (!codigoProducto) {
      return res.status(400).json({ message: 'El parámetro codigoProducto es requerido.' });
    }

    console.log(`[Controller] Attempting to fetch product by Codigo_Producto: ${codigoProducto}`);
    const product = await getProductByCodeFromDB(codigoProducto);

    if (!product) {
      return res.status(404).json({ message: `Producto con Codigo_Producto ${codigoProducto} no encontrado.` });
    }

    res.status(200).json({
      message: 'Producto encontrado exitosamente.',
      data: product
    });

  } catch (error) {
    console.error(`[Controller] Error fetching product by Codigo_Producto ${req.params.codigoProducto}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener el producto.',
      error: error.message 
    });
  }
};

// --- NUEVO: Handler para actualizar un producto por Codigo_Producto ---
// @desc    Update a product by its Codigo_Producto
// @route   PUT /api/products/code/:codigoProducto
// @access  Public (o Private)
const updateProductController = async (req, res) => {
  try {
    const { codigoProducto } = req.params;
    const updateData = req.body;

    if (!codigoProducto) {
      return res.status(400).json({ message: 'El parámetro codigoProducto es requerido.' });
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'El cuerpo de la solicitud (updateData) no puede estar vacío.' });
    }

    // Opcional: Validación más exhaustiva de updateData aquí si es necesario
    // Por ejemplo, verificar que no se intenten pasar campos no permitidos o formatos incorrectos.

    console.log(`[Controller] Attempting to update product with Codigo_Producto: ${codigoProducto}`);
    const updatedProduct = await updateProductInDB(codigoProducto, updateData);

    if (!updatedProduct) {
      return res.status(404).json({ message: `Producto con Codigo_Producto ${codigoProducto} no encontrado para actualizar.` });
    }

    // Actualizar caché después de la modificación
    console.log('Product updated, attempting to refresh cache...');
    const productsFromDB = await fetchBaseProductsFromDB();
    cachedProducts = productsFromDB;
    saveCacheToDisk();
    console.log('Cache refreshed after product update.');

    res.status(200).json({
      message: 'Producto actualizado exitosamente y caché refrescado.',
      data: updatedProduct
    });

  } catch (error) {
    console.error(`[Controller] Error updating product with Codigo_Producto ${req.params.codigoProducto}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar el producto.',
      error: error.message 
    });
  }
};

// --- NUEVO: Handler para eliminar un producto por Codigo_Producto ---
// @desc    Delete a product by its Codigo_Producto
// @route   DELETE /api/products/code/:codigoProducto
// @access  Public (o Private)
const deleteProductController = async (req, res) => {
  try {
    const { codigoProducto } = req.params;

    if (!codigoProducto) {
      return res.status(400).json({ message: 'El parámetro codigoProducto es requerido.' });
    }

    console.log(`[Controller] Attempting to delete product with Codigo_Producto: ${codigoProducto}`);
    const wasDeleted = await deleteProductFromDB(codigoProducto);

    if (!wasDeleted) {
      return res.status(404).json({ message: `Producto con Codigo_Producto ${codigoProducto} no encontrado para eliminar.` });
    }

    // Actualizar caché después de la eliminación
    console.log('Product deleted, attempting to refresh cache...');
    const productsFromDB = await fetchBaseProductsFromDB();
    cachedProducts = productsFromDB;
    saveCacheToDisk();
    console.log('Cache refreshed after product deletion.');

    res.status(200).json({
      message: `Producto con Codigo_Producto ${codigoProducto} eliminado exitosamente y caché refrescado.`
    });

  } catch (error) {
    console.error(`[Controller] Error deleting product with Codigo_Producto ${req.params.codigoProducto}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar el producto.',
      error: error.message 
    });
  }
};

// Añadir las funciones de carga de Excel que faltaban
const uploadTechnicalSpecifications = async (req, res) => {
  console.log('[Bulk Upload Specs - New Format] Request received.');
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo.' });
  }
  console.log(`[Bulk Upload Specs - New Format] Processing file: ${req.file.originalname}`);

  const summary = {
    totalProductsInFile: 0,
    productsForUpdateAttempt: 0,
    productsSuccessfullyUpdated: 0,
    productsNotFound: [],
    productsWithDbErrors: [],
    parseErrors: [] 
  };

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dataAoA = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (!dataAoA || dataAoA.length < 3) { // Mínimo: Fila Códigos, Fila Modelos, Fila 1 de Spec
      summary.parseErrors.push({ general: 'El archivo no contiene suficientes filas (mínimo 3: Códigos, Modelos, 1 de Specs).' });
      return res.status(400).json({ message: 'El archivo no contiene suficientes datos o estructura no válida.', summary });
    }

    // --- 1. Extraer Códigos de Producto y Modelos --- 
    const productCodesRow = dataAoA[0]; // Fila 1 del Excel
    const modelsRow = dataAoA[1];     // Fila 2 del Excel

    if (!productCodesRow || !modelsRow) {
      summary.parseErrors.push({ general: 'Faltan las filas de cabecera para Códigos de Producto o Modelos.' });
      return res.status(400).json({ message: 'Faltan filas de cabecera esenciales.', summary });
    }

    // Validar etiquetas de cabecera (opcional pero bueno para robustez)
    // if (String(productCodesRow[0]).trim().toLowerCase() !== 'código fabricante') { ... error ... }
    // if (String(modelsRow[0]).trim().toLowerCase() !== 'modelo') { ... error ... }

    const productHeaders = []; // { codigo: 'XYZ', modelo: 'ABC', columnIndex: 1 }
    for (let j = 1; j < productCodesRow.length; j++) { // Empezar desde columna B (índice 1)
      const code = productCodesRow[j] ? String(productCodesRow[j]).trim() : null;
      const model = modelsRow[j] ? String(modelsRow[j]).trim() : null;
      if (code) {
        productHeaders.push({ codigo: code, modelo: model, columnIndex: j });
      } else if (j > 1 && (productCodesRow[j-1] || modelsRow[j-1])) { // Si la columna anterior tenía datos, pero esta no tiene código, es un hueco.
         console.warn(`[Bulk Upload Specs - New Format] Columna ${j+1} sin Código Producto, pero con posible modelo o specs. Se ignorará.`);
      }
    }

    summary.totalProductsInFile = productHeaders.length;
    if (productHeaders.length === 0) {
      summary.parseErrors.push({ general: 'No se encontraron Códigos de Producto en la primera fila (a partir de la columna B).' });
      return res.status(400).json({ message: 'No se encontraron códigos de producto en la cabecera.', summary });
    }

    console.log(`[Bulk Upload Specs - New Format] Productos en cabecera: ${productHeaders.map(p => p.codigo).join(', ')}`);

    // --- 2. Procesar Especificaciones --- 
    const updatesByProduct = {}; // { 'CODIGO1': { modelo: 'M1', especificaciones_tecnicas: {...} }, ... }

    productHeaders.forEach(p => {
      updatesByProduct[p.codigo] = { 
        modelo: p.modelo, // Asignar modelo desde la fila de modelos
        especificaciones_tecnicas: {} 
      };
    });

    let currentSectionKey = null;
    for (let i = 2; i < dataAoA.length; i++) { // Empezar desde Fila 3 del Excel (índice 2)
      const currentRow = dataAoA[i];
      if (!currentRow || currentRow.length === 0 || currentRow[0] === null || String(currentRow[0]).trim() === '') {
        currentSectionKey = null; // Resetear sección en fila vacía o sin nombre de spec
        continue;
      }

      const specName = String(currentRow[0]).trim();

      // Heurística simple para detectar secciones: TODO EN MAYÚSCULAS y sin valores en las celdas de producto para esa fila
      let isSection = specName === specName.toUpperCase();
      if (isSection) {
        let sectionHasValues = false;
        for (const pHeader of productHeaders) {
          if (currentRow[pHeader.columnIndex] !== null && String(currentRow[pHeader.columnIndex]).trim() !== '') {
            sectionHasValues = true;
            break;
          }
        }
        if (sectionHasValues) isSection = false; // Si tiene valores, no es solo una sección
      }

      if (isSection) {
        currentSectionKey = specName;
        // Crear la sección en todos los productos si aún no existe
        productHeaders.forEach(pHeader => {
          if (!updatesByProduct[pHeader.codigo].especificaciones_tecnicas[currentSectionKey]) {
            updatesByProduct[pHeader.codigo].especificaciones_tecnicas[currentSectionKey] = {};
          }
        });
        continue; // Pasar a la siguiente fila
      }

      // Es una especificación normal, asignar valores
      for (const pHeader of productHeaders) {
        const productData = updatesByProduct[pHeader.codigo];
        const specValue = currentRow[pHeader.columnIndex] !== null ? String(currentRow[pHeader.columnIndex]).trim() : null;

        if (specValue !== null) {
          if (currentSectionKey) {
            if (!productData.especificaciones_tecnicas[currentSectionKey]) { // Asegurar que la sección existe
                 productData.especificaciones_tecnicas[currentSectionKey] = {};
            }
            productData.especificaciones_tecnicas[currentSectionKey][specName] = specValue;
          } else {
            productData.especificaciones_tecnicas[specName] = specValue;
          }
        }
      }
    }
    
    console.log('[Bulk Upload Specs - New Format] Datos parseados:', JSON.stringify(updatesByProduct, null, 2));
    summary.productsForUpdateAttempt = Object.keys(updatesByProduct).length;

    // --- 3. Construir y Ejecutar Operaciones de DB --- 
    const operations = [];
    for (const codigoProducto of Object.keys(updatesByProduct)) {
      const updatePayload = updatesByProduct[codigoProducto];
      let fieldsToUpdate = {};

      // ELIMINADO/COMENTADO: No actualizaremos el modelo desde la carga de especificaciones.
      /*
      if (updatePayload.modelo !== null && updatePayload.modelo !== '') {
        fieldsToUpdate['caracteristicas.modelo'] = updatePayload.modelo;
      }
      */

      // Limpiar especificaciones_tecnicas de secciones vacías o specs vacías
      Object.keys(updatePayload.especificaciones_tecnicas).forEach(key => {
        if (typeof updatePayload.especificaciones_tecnicas[key] === 'object') {
          Object.keys(updatePayload.especificaciones_tecnicas[key]).forEach(subKey => {
            if (updatePayload.especificaciones_tecnicas[key][subKey] === null || updatePayload.especificaciones_tecnicas[key][subKey] === '') {
              delete updatePayload.especificaciones_tecnicas[key][subKey];
            }
          });
          if (Object.keys(updatePayload.especificaciones_tecnicas[key]).length === 0) {
            delete updatePayload.especificaciones_tecnicas[key];
          }
        } else if (updatePayload.especificaciones_tecnicas[key] === null || updatePayload.especificaciones_tecnicas[key] === '') {
          delete updatePayload.especificaciones_tecnicas[key];
        }
      });

      if (Object.keys(updatePayload.especificaciones_tecnicas).length > 0) {
        fieldsToUpdate['especificaciones_tecnicas'] = updatePayload.especificaciones_tecnicas;
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
          const productoExistente = await Producto.findOne({ Codigo_Producto: codigoProducto });
          if (productoExistente) {
            operations.push({
                updateOne: {
                    filter: { Codigo_Producto: codigoProducto },
                    update: { $set: fieldsToUpdate }
                }
            });
          } else {
            summary.productsNotFound.push(codigoProducto);
          }
      } else {
          console.log(`[Bulk Upload Specs - New Format] Producto ${codigoProducto} sin especificaciones válidas para actualizar.`);
      }
    }

    if (operations.length > 0) {
      const result = await Producto.bulkWrite(operations, { ordered: false });
      summary.productsSuccessfullyUpdated = result.modifiedCount || 0;
      if (result.hasWriteErrors()) {
        result.getWriteErrors().forEach(err => {
          const codigo = err.err.op?.updateOne?.filter?.Codigo_Producto || 'Desconocido';
          summary.productsWithDbErrors.push({ codigo, message: err.errmsg, details: `Código de error: ${err.code}` });
        });
      }
    } else {
        console.log('[Bulk Upload Specs - New Format] No hay operaciones de DB para ejecutar.')
    }

    if (summary.productsSuccessfullyUpdated > 0) {
        console.log('[Bulk Upload Specs - New Format] Products updated, attempting to refresh cache...');
        try { await initializeProductCache(); console.log('[Bulk Upload Specs - New Format] Cache refreshed.'); }
        catch (cacheError) { 
            console.error('[Bulk Upload Specs - New Format] Error refreshing cache:', cacheError);
            summary.parseErrors.push({ general: 'Error al refrescar caché: ' + cacheError.message });
        }
    }

    const status = (summary.productsNotFound.length > 0 || summary.productsWithDbErrors.length > 0 || summary.parseErrors.length > 0) ? 207 : 200;
    let message = `Carga completada. Actualizados: ${summary.productsSuccessfullyUpdated}.`;
    if(summary.productsNotFound.length > 0) message += ` No encontrados: ${summary.productsNotFound.length}.`;
    if(summary.productsWithDbErrors.length > 0) message += ` Errores DB: ${summary.productsWithDbErrors.length}.`;
    if(summary.parseErrors.length > 0) message += ` Errores de parseo: ${summary.parseErrors.length}.`;
    
    console.log('[Bulk Upload Specs - New Format] Final Summary:', JSON.stringify(summary, null, 2));
    res.status(status).json({ message, summary });

  } catch (error) {
    console.error('[Bulk Upload Specs - New Format] General error processing uploaded file:', error);
    summary.parseErrors.push({ general: error.message, stack: error.stack });
    res.status(500).json({ 
        message: 'Error interno del servidor al procesar el archivo (nuevo formato especificaciones).', 
        summary, 
        error: error.message 
    });
  }
};

const uploadBulkProductsMatrixDetailed = async (req, res) => {
    console.log('[Bulk Upload Matrix] Request received.');
    // ... el resto de la implementación larga de la función matricial ...
};

// Helper para normalizar cabeceras (opcional pero recomendado)
const normalizeHeader = (header) => {
  if (!header) return '';
  // Convertir a string, trim, lowerCase, reemplazar espacios y caracteres especiales por guion bajo
  return header.toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
};

// Mapeo de cabeceras normalizadas a rutas del modelo Producto
// Basado en excelTemplateHeaders del frontend y la estructura inferida del modelo Producto
const headerToModelPath = {
  'codigo_producto': { path: 'Codigo_Producto', type: 'string', required: true },
  'producto': { path: 'producto', type: 'string' },
  'nombre_producto': { path: 'caracteristicas.nombre_del_producto', type: 'string' },
  'descripcion': { path: 'descripcion', type: 'string' },
  'modelo': { path: 'caracteristicas.modelo', type: 'string', required: true },
  'categoria': { path: 'categoria', type: 'string' },
  'fecha_cotizacion': { path: 'datos_contables.fecha_cotizacion', type: 'string' },
  'fecha_cotizacion_': { path: 'datos_contables.fecha_cotizacion', type: 'string' },
  'costo_fabrica': { path: 'datos_contables.costo_fabrica', type: 'number' },
  'largo_mm': { path: 'dimensiones.largo_mm', type: 'number' },
  'ancho_mm': { path: 'dimensiones.ancho_mm', type: 'number' },
  'alto_mm': { path: 'dimensiones.alto_mm', type: 'number' },
  'peso_kg': { path: 'peso_kg', type: 'number', required: true },
  'equipo_u_opcional': { path: 'es_opcional', type: 'boolean' },
  'detalle_adicional_1': { path: 'especificaciones_tecnicas.detalle_adicional_1', type: 'string' },
  'detalle_adicional_2': { path: 'especificaciones_tecnicas.detalle_adicional_2', type: 'string' },
  'detalle_adicional_3': { path: 'especificaciones_tecnicas.detalle_adicional_3', type: 'string' },
  'combustible': { path: 'especificaciones_tecnicas.combustible', type: 'string' },
  'hp': { path: 'especificaciones_tecnicas.hp', type: 'string' },
  'diametro_mm': { path: 'especificaciones_tecnicas.diametro_mm', type: 'string' },
  'movilidad': { path: 'especificaciones_tecnicas.movilidad', type: 'string' },
  'rotacion': { path: 'especificaciones_tecnicas.rotacion', type: 'string' },
  'modelo_compatible_manual': { path: 'especificaciones_tecnicas.modelo_compatible_manual', type: 'string' },
  'numero_caracteristicas_tecnicas': { path: 'especificaciones_tecnicas.numero_caracteristicas_tecnicas', type: 'string' },
  'descripcion_detallada': { path: 'especificaciones_tecnicas.descripcion_detallada', type: 'string' },
  'elemento_corte': { path: 'especificaciones_tecnicas.elemento_corte', type: 'string' },
  'garganta_alimentacion_mm': { path: 'especificaciones_tecnicas.garganta_alimentacion_mm', type: 'string' },
  'tipo_motor': { path: 'especificaciones_tecnicas.tipo_motor', type: 'string' },
  'potencia_motor_kw_hp': { path: 'especificaciones_tecnicas.potencia_motor_kw_hp', type: 'string' },
  'tipo_enganche': { path: 'especificaciones_tecnicas.tipo_enganche', type: 'string' },
  'tipo_chasis': { path: 'especificaciones_tecnicas.tipo_chasis', type: 'string' },
  'capacidad_chasis_velocidad': { path: 'especificaciones_tecnicas.capacidad_chasis_velocidad', type: 'string' },
  'tipo_producto_detalles': { path: 'especificaciones_tecnicas.tipo_producto_detalles', type: 'string' },
  'clasificacion_easysystems': { path: 'clasificacion_easysystems', type: 'string' },
  'codigo_ea': { path: 'codigo_ea', type: 'string' },
  'proveedor': { path: 'proveedor', type: 'string' },
  'procedencia': { path: 'procedencia', type: 'string' },
  'familia': { path: 'familia', type: 'string' },
  'nombre_comercial': { path: 'nombre_comercial', type: 'string' },
};

// Helper para parsear valores
const parseValue = (value, type) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return undefined;
  }
  switch (type) {
    case 'string':
      return String(value).trim();
    case 'number':
      const numStr = String(value).replace(/\./g, '').replace(',', '.');
      const num = parseFloat(numStr);
      return isNaN(num) ? undefined : num;
    case 'boolean':
      const lowerVal = String(value).trim().toLowerCase();
      if (['true', 'verdadero', 'si', '1', 'yes'].includes(lowerVal)) return true;
      if (['false', 'falso', 'no', '0'].includes(lowerVal)) return false;
      return undefined;
    case 'date':
      if (value instanceof Date) { // Si cellDates:true funcionó
        return value;
      }
      if (typeof value === 'number') { // Fecha de Excel (número de serie)
        const d = xlsx.SSF.parse_date_code(value); // Usar xlsx (minúscula) como se importó
        if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
      }
      const dateStr = String(value).trim();
      if (/^\d{4}$/.test(dateStr)) {
        return new Date(Date.UTC(parseInt(dateStr), 0, 1));
      }
      const parsedDate = Date.parse(dateStr);
      return isNaN(parsedDate) ? undefined : new Date(parsedDate);
    default:
      return String(value).trim();
  }
};

// Helper para setear valor en un path anidado
function setValueByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  if (value !== undefined) {
    current[keys[keys.length - 1]] = value;
  } else { // Si el valor es undefined, asegurar que la ruta exista para evitar errores, pero no setear el valor final
    // Esto es útil si se quiere que Mongoose aplique defaults para campos no provistos explícitamente.
    // Opcionalmente, se podría decidir eliminar el campo si es undefined.
     current[keys[keys.length - 1]] = undefined; 
  }
}

const uploadBulkProductsPlain = async (req, res) => {
  console.log('[Bulk Upload Plain] Request received.');
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo.' });
  }
  console.log(`[Bulk Upload Plain] Processing file: ${req.file.originalname}`);

  const summary = {
    totalRowsInExcel: 0,
    rowsProcessed: 0,
    inserted: 0,
    updated: 0,
    rowsWithErrors: 0,
    errors: []
  };

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: undefined }); // undefined para celdas vacias

    summary.totalRowsInExcel = jsonData.length;
    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'El archivo Excel está vacío o no tiene datos procesables.' });
    }

    const operations = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      summary.rowsProcessed++;
      let productData = {};
      let currentProductCodigo = null;
      let rowErrorMessages = [];

      const excelHeaders = Object.keys(row);

      for (const excelHeader of excelHeaders) {
        const normalizedHeaderKey = normalizeHeader(excelHeader);
        const mapping = headerToModelPath[normalizedHeaderKey];
        
        if (mapping) {
          const rawValue = row[excelHeader];
          const parsedVal = parseValue(rawValue, mapping.type);

          if (mapping.required && (parsedVal === undefined || String(parsedVal).trim() === '')) {
            rowErrorMessages.push(`Campo obligatorio '${excelHeader}' está vacío o es inválido.`);
          }
          
          setValueByPath(productData, mapping.path, parsedVal);

          if (mapping.path === 'Codigo_Producto') {
            currentProductCodigo = parsedVal;
          }
        }
      }
      
      if (!currentProductCodigo) {
        rowErrorMessages.push('Codigo_Producto no encontrado o inválido en la fila.');
      }

      if (rowErrorMessages.length > 0) {
        summary.rowsWithErrors++;
        summary.errors.push({ 
          rowNumberExcel: i + 2, 
          codigoProducto: currentProductCodigo || 'N/A',
          messages: rowErrorMessages
        });
        continue; 
      }
      
      // <<< INICIO: Lógica para manejar "opcional" en nombre_del_producto >>>
      if (productData.caracteristicas && 
          typeof productData.caracteristicas.nombre_del_producto === 'string' &&
          productData.caracteristicas.nombre_del_producto.toLowerCase().includes('opcional')) {
        
        // Quitar "opcional" del nombre del producto, insensible a mayúsculas/minúsculas, y limpiar espacios
        productData.caracteristicas.nombre_del_producto = productData.caracteristicas.nombre_del_producto
          .replace(/opcional/gi, '') // Elimina "opcional" (case-insensitive)
          .replace(/\s\s+/g, ' ')    // Reemplaza múltiples espacios con uno solo
          .trim();                   // Elimina espacios al inicio y al final

        productData.tipo = 'opcional';
      }
      // <<< FIN: Lógica para manejar "opcional" en nombre_del_producto >>>
      
      // Limpieza de campos undefined explícitos para que Mongoose aplique defaults si existen
      // o para evitar enviar { campo: undefined }
      function removeUndefinedFields(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        Object.keys(obj).forEach(key => {
          if (obj[key] === undefined) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeUndefinedFields(obj[key]);
            if (Object.keys(obj[key]).length === 0) {
              delete obj[key]; // Eliminar sub-objetos vacíos
            }
          }
        });
        return obj;
      }
      productData = removeUndefinedFields(productData);

      // <<< DEBUG: Mostrar el objeto productData que se enviará a MongoDB >>>
      if (jsonData.length === 1) { // Solo loguear si es una carga de un solo item para no inundar la consola
          console.log('\n[DEBUG] Objeto productData construido para MongoDB (fila única):');
          console.log(JSON.stringify(productData, null, 2));
          console.log('--- Fin DEBUG ---\n');
      }
      // <<< Fin DEBUG >>>

      operations.push({
        updateOne: {
          filter: { Codigo_Producto: currentProductCodigo },
          update: { $set: productData },
          upsert: true
        }
      });
    }

    if (operations.length > 0) {
      const result = await Producto.bulkWrite(operations, { ordered: false });
      summary.inserted = result.upsertedCount || 0;
      summary.updated = result.modifiedCount || 0;
      
      if (result.hasWriteErrors()) {
        result.getWriteErrors().forEach(err => {
          const codigo = err.err.op?.updateOne?.filter?.Codigo_Producto || 'Desconocido';
          summary.rowsWithErrors++; // Incrementar por cada producto con error de DB
          summary.errors.push({
            rowNumberExcel: `Error DB (Producto: ${codigo})`,
            codigoProducto: codigo,
            messages: [err.errmsg || 'Error de escritura en Base de Datos', `Código Mongoose: ${err.code}`]
          });
        });
      }
    } else if (summary.totalRowsInExcel > 0 && summary.rowsWithErrors === summary.totalRowsInExcel) {
      // Todas las filas tuvieron errores de parsing, no se intentó ninguna operación de DB
      console.log('[Bulk Upload Plain] No operations to perform due to parsing errors in all rows.');
    }
    
    console.log('[Bulk Upload Plain] Summary:', JSON.stringify(summary, null, 2));
    const status = summary.errors.length > 0 ? 207 : 200;
    let message = summary.errors.length > 0 ? 
        `Carga completada con errores. Filas procesadas: ${summary.rowsProcessed}, Errores en filas: ${summary.rowsWithErrors}.` : 
        'Carga masiva (plana) completada exitosamente.';
    if (summary.inserted > 0) message += ` Insertados: ${summary.inserted}.`;
    if (summary.updated > 0) message += ` Actualizados: ${summary.updated}.`;

    if (summary.inserted > 0 || summary.updated > 0) {
        console.log('[Bulk Upload Plain] Products changed, attempting to refresh cache...');
        try {
            await initializeProductCache();
            console.log('[Bulk Upload Plain] Cache refreshed.');
        } catch (cacheError) {
            console.error('[Bulk Upload Plain] Error refreshing cache:', cacheError);
            summary.errors.push({ rowNumberExcel: 'N/A', codigoProducto: 'Cache', messages: ['Error al refrescar el caché: ' + cacheError.message] });
        }
    }

    res.status(status).json({ message, summary });

  } catch (error) {
    console.error('[Bulk Upload Plain] General error processing uploaded file:', error);
    summary.errors.push({ rowNumberExcel: 'General', codigoProducto: 'N/A', messages: [error.message, error.stack] });
    res.status(500).json({ 
      message: 'Error interno del servidor al procesar el archivo subido (plano).', 
      summary,
      error: error.message 
    });
  }
};

module.exports = { 
  fetchProducts, 
  getCachedProducts, 
  fetchFilteredProductsController, 
  fetchCurrencyValuesController, 
  getCachedDollarValue, 
  getCachedEuroValue,
  getAllProductsAndCache, 
  resetCache,
  clearCache,
  getProductDetail,
  getOptionalProducts,
  getRawOptionalProducts,
  createProductController,
  getProductByCodeController,
  updateProductController,
  deleteProductController,
  testGetBaseProductsFromDBController,
  uploadTechnicalSpecifications,
  uploadBulkProductsMatrix: uploadBulkProductsMatrixDetailed,
  uploadBulkProductsPlain
};