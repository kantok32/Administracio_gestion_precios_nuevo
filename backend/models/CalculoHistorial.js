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
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('CalculoHistorial', CalculoHistorialSchema); 