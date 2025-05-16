const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
    codigo_producto: String,
    nombre_del_producto: String,
    Descripcion: String,
    Modelo: String,
    categoria: String,
    pf_eur: mongoose.Schema.Types.Mixed, // Puede ser string o number
    datos_contables: {
        costo_fabrica: Number,
        divisa_costo: String,
        fecha_cotizacion: String,
        // Podríamos querer definir más explícitamente si conocemos más campos
    }
}, { _id: false });

const ProductoConOpcionalesSchema = new mongoose.Schema({
    principal: ProductoSchema,
    opcionales: [ProductoSchema]
}, { _id: false });

// Definición más explícita y anidada para GroupedPruebaResultsSchema
const CostoProductoDetalleSchema = new mongoose.Schema({
    factorActualizacion: Number,
    costoFabricaActualizadoEUR: Number,
    costoFinalFabricaEUR_EXW: Number,
    tipoCambioEurUsdAplicado: Number,
    costoFinalFabricaUSD_EXW: Number
}, { _id: false });

const LogisticaSeguroDetalleSchema = new mongoose.Schema({
    costosOrigenUSD: Number,
    costoTotalFleteManejosUSD: Number,
    baseParaSeguroUSD: Number,
    primaSeguroUSD: Number,
    totalTransporteSeguroEXW_USD: Number
}, { _id: false });

const ImportacionDetalleSchema = new mongoose.Schema({
    valorCIF_USD: Number,
    derechoAdvaloremUSD: Number,
    baseIvaImportacionUSD: Number,
    ivaImportacionUSD: Number,
    totalCostosImportacionDutyFeesUSD: Number
}, { _id: false });

const LandedCostDetalleSchema = new mongoose.Schema({
    transporteNacionalUSD: Number,
    precioNetoCompraBaseUSD_LandedCost: Number
}, { _id: false });

const ConversionMargenDetalleSchema = new mongoose.Schema({
    tipoCambioUsdClpAplicado: Number,
    precioNetoCompraBaseCLP: Number,
    margenCLP: Number,
    precioVentaNetoCLP: Number
}, { _id: false });

const PreciosClienteDetalleSchema = new mongoose.Schema({
    precioNetoVentaFinalCLP: Number,
    ivaVentaCLP: Number,
    precioVentaTotalClienteCLP: Number
}, { _id: false });


const GroupedPruebaResultsSchema = new mongoose.Schema({
    costo_producto: CostoProductoDetalleSchema,
    logistica_seguro: LogisticaSeguroDetalleSchema,
    importacion: ImportacionDetalleSchema,
    landed_cost: LandedCostDetalleSchema,
    conversion_margen: ConversionMargenDetalleSchema,
    precios_cliente: PreciosClienteDetalleSchema,
}, { _id: false });

const CalculationResultSchema = new mongoose.Schema({
    inputs: mongoose.Schema.Types.Mixed, // Objeto flexible, considerar definir si es estable
    calculados: GroupedPruebaResultsSchema,
    error: String
}, { _id: false });

const CalculoHistorialSchema = new mongoose.Schema({
    fechaGuardado: {
        type: Date,
        default: Date.now
    },
    itemsParaCotizar: [ProductoConOpcionalesSchema],
    resultadosCalculados: {
        type: Map,
        of: CalculationResultSchema // La clave del Map será el código_producto (string)
    },
    selectedProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostoPerfil', // Asegúrate que 'CostoPerfil' es el nombre correcto del modelo
        default: null
    },
    nombrePerfil: String,
    anoEnCursoGlobal: Number,
    usuarioId: { // Opcional, si se implementa autenticación para esta acción
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Asegúrate que 'User' es el nombre correcto del modelo
    },

    // Campos de la cotización desde ConfiguracionPanel.tsx
    empresaQueCotiza: { type: String, default: 'Nombre de tu Empresa Aquí' }, // Configurable
    
    // Datos del Cliente
    clienteNombre: { type: String, required: false },
    clienteRut: { type: String, required: false },
    clienteDireccion: { type: String, required: false },
    clienteComuna: { type: String, required: false },
    clienteCiudad: { type: String, required: false },
    clientePais: { type: String, required: false },
    clienteContactoNombre: { type: String, required: false },
    clienteContactoEmail: { type: String, required: false },
    clienteContactoTelefono: { type: String, required: false },

    // Datos del Documento (Cotización)
    numeroCotizacion: { type: String, required: false }, // Podría ser generado
    referenciaDocumento: { type: String, required: false },
    fechaCreacionCotizacion: { type: Date, default: Date.now }, // Específico para la cotización
    fechaCaducidadCotizacion: { type: Date, required: false },

    // Datos del Emisor (Vendedor)
    emisorNombre: { type: String, required: false },
    emisorAreaComercial: { type: String, required: false },
    emisorEmail: { type: String, required: false },

    // Comentarios y Términos
    comentariosAdicionales: { type: String, required: false },
    terminosPago: { type: String, required: false },
    medioPago: { type: String, required: false },
    formaPago: { type: String, required: false },

    // Campos que ya estaban y se renombraron/integraron:
    // nombreCliente -> clienteNombre o clienteContactoNombre
    // numeroCliente -> clienteContactoTelefono
    // emailCliente -> clienteContactoEmail
    // comentariosAdicionales -> ya está arriba

}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('CalculoHistorial', CalculoHistorialSchema); 