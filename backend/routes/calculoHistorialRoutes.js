const express = require('express');
const router = express.Router();
const { guardarYExportarCalculos } = require('../controllers/calculoHistorialController');

// Middleware de autenticación (descomentar si se requiere proteger la ruta)
// const { protect } = require('../middleware/authMiddleware');

// @desc    Guardar resultados de cálculo y preparar para exportación CSV
// @route   POST /api/calculos-historial/guardar-y-exportar
// @access  Public (o Private si se usa 'protect')
router.post('/guardar-y-exportar', /* protect, */ guardarYExportarCalculos);

module.exports = router; 