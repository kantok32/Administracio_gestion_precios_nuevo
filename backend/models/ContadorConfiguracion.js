const mongoose = require('mongoose');

const ContadorConfiguracionSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // e.g., 'configuracionCounter'
    secuencia: { type: Number, default: 0 }
});

// Asegurarse de que el contador se inicialice si no existe la primera vez.
// mongoose.model ya maneja la no recompilación del modelo.
// No se necesita una función de inicialización explícita aquí si se usa upsert:true y setDefaultsOnInsert:true en findOneAndUpdate.

module.exports = mongoose.model('ContadorConfiguracion', ContadorConfiguracionSchema); 