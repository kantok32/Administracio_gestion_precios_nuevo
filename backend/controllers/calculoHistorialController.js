const asyncHandler = require('express-async-handler');
const CalculoHistorial = require('../models/CalculoHistorial');
const pdf = require('html-pdf');

// @desc    Guardar resultados de cálculo y devolverlos en formato CSV para exportación
// @route   POST /api/calculos-historial/guardar-y-exportar
// @access  Public (o Private, según configuración de ruta)
const guardarYExportarCalculos = asyncHandler(async (req, res) => {
    const {
        itemsParaCotizar,
        resultadosCalculados, // Este es un objeto/mapa donde la clave es el ID del producto
        selectedProfileId,
        nombrePerfil,
        anoEnCursoGlobal
    } = req.body;

    // Validación básica de datos de entrada
    if (!itemsParaCotizar || !Array.isArray(itemsParaCotizar) || itemsParaCotizar.length === 0 || !resultadosCalculados) {
        res.status(400);
        throw new Error('Faltan datos requeridos o el formato es incorrecto: itemsParaCotizar y resultadosCalculados son necesarios.');
    }

    try {
        // 1. Guardar en MongoDB
        const nuevoHistorial = await CalculoHistorial.create({
            itemsParaCotizar,
            resultadosCalculados: resultadosCalculados, // Directamente el objeto/mapa
            selectedProfileId: selectedProfileId || null,
            nombrePerfil,
            anoEnCursoGlobal,
            // usuarioId: req.user ? req.user.id : null, // Descomentar si se usa autenticación
        });

        const htmlParaPdf = generarHtmlParaPdf({
            nuevoHistorial, itemsParaCotizar, resultadosCalculados,
            nombrePerfil, anoEnCursoGlobal, selectedProfileId
        });

        const opcionesPdf = {
            format: 'A4', // o Letter, etc.
            orientation: "portrait", // "portrait" or "landscape"
            border: {
                top: "0.5in",
                right: "0.5in",
                bottom: "0.5in",
                left: "0.5in"
            },
            timeout: 30000, // Tiempo de espera para la generación del PDF
            // Si tienes problemas con rutas locales (imágenes, fuentes) podrías necesitar 'base'
            // base: `file:///${path.join(__dirname, '../public/')}` // Ejemplo si tienes assets locales
        };

        pdf.create(htmlParaPdf, opcionesPdf).toBuffer((err, buffer) => {
            if (err) {
                console.error('Error al generar PDF:', err);
                // No enviar res.status(500) si ya se envió uno antes por error de validación, etc.
                if (!res.headersSent) {
                    return res.status(500).send('Error al generar el archivo PDF.');
                }
                return;
            }

            res.header('Content-Type', 'application/pdf');
            res.header('Content-Disposition', `attachment; filename="CalculoCostos_${nombrePerfil || 'General'}_${new Date().toISOString().split('T')[0]}.pdf"`);
            res.send(buffer);
        });

    } catch (error) {
        console.error('Error en guardarYExportarCalculos (antes de PDF):', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Error interno del servidor al procesar la solicitud.' });
        }
    }
});

// --- Funciones Helper para Formato en HTML (similares a las del frontend) ---
const formatCLP = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return `$ ${Number(value).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const formatGenericCurrency = (value, currency, digits = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const options = { style: 'currency', currency: currency, minimumFractionDigits: digits, maximumFractionDigits: digits };
    return Number(value).toLocaleString(currency === 'EUR' ? 'de-DE' : 'en-US', options);
};
const formatPercentDisplay = (value, digits = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return `${(Number(value) * 100).toFixed(digits)}%`;
};
const formatNumber = (value, digits = 4) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return Number(value).toFixed(digits);
};

// --- Función para generar el HTML del PDF ---
const generarHtmlParaPdf = (datos) => {
    const { nuevoHistorial, itemsParaCotizar, resultadosCalculados, nombrePerfil, anoEnCursoGlobal } = datos;

    let htmlContent = `
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    h1 { text-align: center; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #3498db; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    h3 { color: #2980b9; margin-top: 20px; }
                    h4 { color: #16a085; margin-top: 15px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .summary-table th, .summary-table td { text-align: right; }
                    .summary-table th:first-child, .summary-table td:first-child { text-align: left; }
                    .item-card { border: 1px solid #ccc; border-radius: 5px; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; }
                    .section-title { font-size: 1.1em; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .detail-grid { display: grid; grid-template-columns: auto 1fr; gap: 5px 15px; margin-bottom:8px;}
                    .detail-grid span:nth-child(odd) { font-weight: bold; color: #555; }
                    .detail-grid span:nth-child(even) { text-align: right; }
                    .profile-info { text-align: center; margin-bottom: 20px; font-size: 0.9em; color: #555; }
                    .opcionales-section { margin-left: 20px; margin-top:15px; border-left: 3px solid #76c7c0; padding-left:15px; }
                </style>
            </head>
            <body>
                <h1>Resultados del Cálculo de Costos</h1>
                <div class="profile-info">
                    ID Historial: ${nuevoHistorial._id.toString()}<br>
                    Fecha Guardado: ${new Date(nuevoHistorial.fechaGuardado).toLocaleString('es-CL')}<br>
                    Perfil de Costo Aplicado: ${nombrePerfil || datos.selectedProfileId || 'No especificado'} | Año en Curso: ${anoEnCursoGlobal || 'N/A'}
                </div>
    `;

    // --- Sección de Resumen General (similar al frontend) ---
    const totales = {
        principal: { costoTotalFabricaUSD_EXW: 0, landedCostTotalUSD: 0, precioVentaNetoTotalCLP: 0, precioVentaTotalClienteCLP: 0, count: 0 },
        opcional: { costoTotalFabricaUSD_EXW: 0, landedCostTotalUSD: 0, precioVentaNetoTotalCLP: 0, precioVentaTotalClienteCLP: 0, count: 0 }
    };

    Object.values(resultadosCalculados).forEach(result => {
        if (result.calculados && !result.error) {
            const tipoItem = result.inputs?.tipoItem === 'Opcional' ? 'opcional' : 'principal'; // Asumiendo que se puede identificar tipoItem desde inputs
            const target = totales[tipoItem];
            target.count++;
            if(result.calculados.costo_producto?.costoFinalFabricaUSD_EXW) target.costoTotalFabricaUSD_EXW += result.calculados.costo_producto.costoFinalFabricaUSD_EXW;
            if(result.calculados.landed_cost?.precioNetoCompraBaseUSD_LandedCost) target.landedCostTotalUSD += result.calculados.landed_cost.precioNetoCompraBaseUSD_LandedCost;
            if(result.calculados.precios_cliente?.precioNetoVentaFinalCLP) target.precioVentaNetoTotalCLP += result.calculados.precios_cliente.precioNetoVentaFinalCLP;
            if(result.calculados.precios_cliente?.precioVentaTotalClienteCLP) target.precioVentaTotalClienteCLP += result.calculados.precios_cliente.precioVentaTotalClienteCLP;
        }
    });

    if (totales.principal.count > 0 || totales.opcional.count > 0) {
        htmlContent += `
            <h2>Resumen General de la Carga</h2>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Concepto de Costo</th>
                        <th>Total Principales (${totales.principal.count})</th>
                        <th>Total Opcionales (${totales.opcional.count})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Costo Total Fábrica (EXW)</td><td>${formatGenericCurrency(totales.principal.costoTotalFabricaUSD_EXW, 'USD')}</td><td>${formatGenericCurrency(totales.opcional.costoTotalFabricaUSD_EXW, 'USD')}</td></tr>
                    <tr><td>Landed Cost Total Estimado</td><td>${formatGenericCurrency(totales.principal.landedCostTotalUSD, 'USD')}</td><td>${formatGenericCurrency(totales.opcional.landedCostTotalUSD, 'USD')}</td></tr>
                    <tr><td>Precio Venta Neto Total</td><td>${formatCLP(totales.principal.precioVentaNetoTotalCLP)}</td><td>${formatCLP(totales.opcional.precioVentaNetoTotalCLP)}</td></tr>
                    <tr><td><b>Precio Venta Total Cliente (IVA Incl.)</b></td><td><b>${formatCLP(totales.principal.precioVentaTotalClienteCLP)}</b></td><td><b>${formatCLP(totales.opcional.precioVentaTotalClienteCLP)}</b></td></tr>
                </tbody>
            </table>
        `;
    }

    // --- Detalles por Item --- 
    itemsParaCotizar.forEach(item => {
        const productoPrincipal = item.principal;
        const keyProductoPrincipal = `principal-${productoPrincipal.codigo_producto}`;
        const calculosProducto = resultadosCalculados[keyProductoPrincipal];

        htmlContent += `<div class="item-card">
                            <h3>${productoPrincipal.nombre_del_producto || 'Producto Principal Sin Nombre'} (${productoPrincipal.codigo_producto || 'N/A'})</h3>`;
        
        if (calculosProducto && calculosProducto.calculados && !calculosProducto.error) {
            const calc = calculosProducto.calculados;
            const inputs = calculosProducto.inputs || {};

            htmlContent += `<div class="section-title">Costo de Producto</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Factor Actualización:</span><span>${formatPercentDisplay(calc.costo_producto?.factorActualizacion)}</span>
                <span>Costo Fáb. Act. EUR (Antes Desc.):</span><span>${formatGenericCurrency(calc.costo_producto?.costoFabricaActualizadoEUR, 'EUR')}</span>
                <span>Costo Fábrica Descontado EUR EXW:</span><span>${formatGenericCurrency(calc.costo_producto?.costoFinalFabricaEUR_EXW, 'EUR')}</span>
                <span>TC EUR/USD Aplicado:</span><span>${formatNumber(calc.costo_producto?.tipoCambioEurUsdAplicado)}</span>
                <span>Costo Final Fáb. USD (EXW):</span><span>${formatGenericCurrency(calc.costo_producto?.costoFinalFabricaUSD_EXW, 'USD')}</span>
            </div>`;

            htmlContent += `<div class="section-title">Logística y Seguro</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Costos Origen USD:</span><span>${formatGenericCurrency(calc.logistica_seguro?.costosOrigenUSD, 'USD')}</span>
                <span>Costo Total Flete y Manejos USD:</span><span>${formatGenericCurrency(calc.logistica_seguro?.costoTotalFleteManejosUSD, 'USD')}</span>
                <span>Base para Seguro (CFR Aprox - USD):</span><span>${formatGenericCurrency(calc.logistica_seguro?.baseParaSeguroUSD, 'USD')}</span>
                <span>Prima Seguro USD:</span><span>${formatGenericCurrency(calc.logistica_seguro?.primaSeguroUSD, 'USD')}</span>
                <span>Total Transporte y Seguro EXW (USD):</span><span>${formatGenericCurrency(calc.logistica_seguro?.totalTransporteSeguroEXW_USD, 'USD')}</span>
            </div>`;
            
            htmlContent += `<div class="section-title">Costos de Importación</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Valor CIF (USD):</span><span>${formatGenericCurrency(calc.importacion?.valorCIF_USD, 'USD')}</span>
                <span>Derecho AdValorem (USD):</span><span>${formatGenericCurrency(calc.importacion?.derechoAdvaloremUSD, 'USD')}</span>
                <span>Base IVA Importación (USD):</span><span>${formatGenericCurrency(calc.importacion?.baseIvaImportacionUSD, 'USD')}</span>
                <span>IVA Importación (USD):</span><span>${formatGenericCurrency(calc.importacion?.ivaImportacionUSD, 'USD')}</span>
                <span>Total Costos Imp. (Duty+Fees) (USD):</span><span>${formatGenericCurrency(calc.importacion?.totalCostosImportacionDutyFeesUSD, 'USD')}</span>
            </div>`;

            htmlContent += `<div class="section-title">Costo puesto en Bodega (Landed Cost)</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Transporte Nacional (USD):</span><span>${formatGenericCurrency(calc.landed_cost?.transporteNacionalUSD, 'USD')}</span>
                <span>Precio Neto Compra Base (USD) - Landed Cost:</span><span>${formatGenericCurrency(calc.landed_cost?.precioNetoCompraBaseUSD_LandedCost, 'USD')}</span>
            </div>`;

            htmlContent += `<div class="section-title">Conversión a CLP y Margen</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Tipo Cambio USD/CLP Aplicado:</span><span>${formatNumber(calc.conversion_margen?.tipoCambioUsdClpAplicado)}</span>
                <span>Precio Neto Compra Base (CLP):</span><span>${formatCLP(calc.conversion_margen?.precioNetoCompraBaseCLP)}</span>
                <span>Margen (CLP):</span><span>${formatCLP(calc.conversion_margen?.margenCLP)}</span>
                <span>Precio Venta Neto (CLP):</span><span>${formatCLP(calc.conversion_margen?.precioVentaNetoCLP)}</span>
            </div>`;

            htmlContent += `<div class="section-title">Precios para Cliente</div>`;
            htmlContent += `<div class="detail-grid">
                <span>Precio Neto Venta Final (CLP):</span><span>${formatCLP(calc.precios_cliente?.precioNetoVentaFinalCLP)}</span>
                <span>IVA Venta (19%) (CLP):</span><span>${formatCLP(calc.precios_cliente?.ivaVentaCLP)}</span>
                <span>Precio Venta Total Cliente (CLP):</span><span><b>${formatCLP(calc.precios_cliente?.precioVentaTotalClienteCLP)}</b></span>
            </div>`;

        } else if (calculosProducto && calculosProducto.error) {
            htmlContent += `<p style="color:red;">Error en cálculo para este producto: ${calculosProducto.error}</p>`;
        } else {
            htmlContent += '<p>No se encontraron resultados de cálculo para este producto principal.</p>';
        }

        // Opcionales
        if (item.opcionales && item.opcionales.length > 0) {
            htmlContent += '<div class="opcionales-section">';
            htmlContent += '<h4>Opcionales:</h4>';
            item.opcionales.forEach(opcional => {
                const keyOpcional = `opcional-${opcional.codigo_producto}`;
                const calculosOpcional = resultadosCalculados[keyOpcional];
                htmlContent += `<div class="item-card" style="background-color: #fff; margin-left:0; padding:10px;">
                                    <h5>${opcional.nombre_del_producto || 'Opcional Sin Nombre'} (${opcional.codigo_producto || 'N/A'})</h5>`;
                if (calculosOpcional && calculosOpcional.calculados && !calculosOpcional.error) {
                    const calcOpc = calculosOpcional.calculados;
                     htmlContent += `<div class="detail-grid">
                                        <span>Costo Fábrica Descontado EUR EXW:</span><span>${formatGenericCurrency(calcOpc.costo_producto?.costoFinalFabricaEUR_EXW, 'EUR')}</span>
                                        <span>Costo Final Fáb. USD (EXW):</span><span>${formatGenericCurrency(calcOpc.costo_producto?.costoFinalFabricaUSD_EXW, 'USD')}</span>
                                        <span>Precio Venta Neto (CLP):</span><span>${formatCLP(calcOpc.precios_cliente?.precioVentaNetoCLP)}</span>
                                        <span>Precio Venta Total Cliente (CLP):</span><span><b>${formatCLP(calcOpc.precios_cliente?.precioVentaTotalClienteCLP)}</b></span>
                                     </div>`;
                } else if (calculosOpcional && calculosOpcional.error) {
                    htmlContent += `<p style="color:red;">Error: ${calculosOpcional.error}</p>`;
                } else {
                    htmlContent += '<p>No se encontraron resultados para este opcional.</p>';
                }
                htmlContent += '</div>';
            });
            htmlContent += '</div>';
        }
        htmlContent += '</div>'; // Cierre de item-card principal
    });

    htmlContent += '</body></html>';
    return htmlContent;
};

module.exports = {
    guardarYExportarCalculos
}; 