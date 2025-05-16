const asyncHandler = require('express-async-handler');
const CalculoHistorial = require('../models/CalculoHistorial');
const Producto = require('../models/Producto');
const ContadorConfiguracion = require('../models/ContadorConfiguracion');
const pdf = require('html-pdf');

// Función helper para obtener el siguiente número de configuración
async function obtenerSiguienteNumeroConfiguracion() {
    const contador = await ContadorConfiguracion.findOneAndUpdate(
        { _id: 'configuracionCounter' }, // Un ID fijo para el documento contador
        { $inc: { secuencia: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true } // new:true devuelve el doc modificado, upsert:true crea si no existe
    );
    return contador.secuencia;
}

// @desc    Guardar resultados de cálculo y devolverlos en formato CSV para exportación
// @route   POST /api/calculos-historial/guardar-y-exportar
// @access  Public (o Private, según configuración de ruta)
const guardarYExportarCalculos = asyncHandler(async (req, res) => {
    const {
        itemsParaCotizar,
        resultadosCalculados, 
        selectedProfileId,
        nombrePerfil,
        anoEnCursoGlobal,
        cotizacionDetails // Objeto que contiene todos los datos del formulario de ConfiguracionPanel.tsx
    } = req.body;

    // Validación básica de datos de entrada
    if (!itemsParaCotizar || !Array.isArray(itemsParaCotizar) || itemsParaCotizar.length === 0 || !resultadosCalculados || !cotizacionDetails) {
        res.status(400);
        throw new Error('Faltan datos requeridos o el formato es incorrecto: itemsParaCotizar, resultadosCalculados y cotizacionDetails son necesarios.');
    }

    try {
        // 0. Obtener el siguiente número de configuración ANTES de cualquier otra cosa
        const numeroSecuencialConfig = await obtenerSiguienteNumeroConfiguracion();

        // 1. Obtener descripciones de productos y opcionales
        const productosConDescripcion = [];
        for (const item of itemsParaCotizar) {
            let descripcionPrincipal = 'Descripción no disponible';
            try {
                const productoDb = await Producto.findOne({ Codigo_Producto: item.principal.codigo_producto });
                if (productoDb && productoDb.descripcion) {
                    descripcionPrincipal = productoDb.descripcion;
                }
            } catch (err) {
                console.error(`Error fetching description for principal ${item.principal.codigo_producto}:`, err);
            }

            const opcionalesConDescripcion = [];
            if (item.opcionales && item.opcionales.length > 0) {
                for (const opcional of item.opcionales) {
                    let descripcionOpcional = 'Descripción no disponible';
                    try {
                        const opcionalDb = await Producto.findOne({ Codigo_Producto: opcional.codigo_producto });
                        if (opcionalDb && opcionalDb.descripcion) {
                            descripcionOpcional = opcionalDb.descripcion;
                        }
                    } catch (err) {
                        console.error(`Error fetching description for opcional ${opcional.codigo_producto}:`, err);
                    }
                    opcionalesConDescripcion.push({
                        ...opcional,
                        // El schema ProductoSchema dentro de CalculoHistorial ya tiene un campo Descripcion (con D mayúscula)
                        // Asegurémonos de mapear al campo correcto o ajustar el schema si es necesario.
                        // Por ahora, asumiré que el schema interno espera "Descripcion" (con D)
                        Descripcion: descripcionOpcional 
                    });
                }
            }
            productosConDescripcion.push({
                principal: {
                    ...item.principal,
                    Descripcion: descripcionPrincipal // Mapear a Descripcion (con D)
                },
                opcionales: opcionalesConDescripcion
            });
        }

        // 2. Guardar en MongoDB con todos los datos
        const nuevoHistorial = await CalculoHistorial.create({
            itemsParaCotizar: productosConDescripcion, // Usar los items con descripciones populadas
            resultadosCalculados: resultadosCalculados,
            selectedProfileId: selectedProfileId || null,
            nombrePerfil,
            anoEnCursoGlobal,
            // Mapeo de cotizacionDetails a los campos del schema CalculoHistorial
            empresaQueCotiza: cotizacionDetails.empresaQueCotiza || 'Mi Empresa por Defecto',
            clienteNombre: cotizacionDetails.clienteNombre,
            clienteRut: cotizacionDetails.clienteRut,
            clienteDireccion: cotizacionDetails.clienteDireccion,
            clienteComuna: cotizacionDetails.clienteComuna,
            clienteCiudad: cotizacionDetails.clienteCiudad,
            clientePais: cotizacionDetails.clientePais,
            clienteContactoNombre: cotizacionDetails.clienteContactoNombre,
            clienteContactoEmail: cotizacionDetails.clienteContactoEmail,
            clienteContactoTelefono: cotizacionDetails.clienteContactoTelefono,
            numeroCotizacion: numeroSecuencialConfig, // Usar el número secuencial generado
            referenciaDocumento: cotizacionDetails.referenciaDocumento,
            fechaCreacionCotizacion: cotizacionDetails.fechaCreacion ? new Date(cotizacionDetails.fechaCreacion) : new Date(),
            fechaCaducidadCotizacion: cotizacionDetails.fechaCaducidad ? new Date(cotizacionDetails.fechaCaducidad) : undefined,
            emisorNombre: cotizacionDetails.emisorNombre,
            emisorAreaComercial: cotizacionDetails.emisorAreaComercial,
            emisorEmail: cotizacionDetails.emisorEmail,
            comentariosAdicionales: cotizacionDetails.comentariosAdicionales,
            terminosPago: cotizacionDetails.terminosPago,
            medioPago: cotizacionDetails.medioPago,
            formaPago: cotizacionDetails.formaPago,
            // usuarioId: req.user ? req.user.id : null, // Descomentar si se usa autenticación
        });

        // 3. Generar HTML para el PDF
        // Pasamos nuevoHistorial completo, ya que contiene todos los datos de la cotización
        const htmlParaPdf = generarHtmlParaPdf({
            calculoHistorialCompleto: nuevoHistorial, // Pasar el documento guardado
            // itemsParaCotizar y resultadosCalculados ya están dentro de nuevoHistorial.itemsParaCotizar y nuevoHistorial.resultadosCalculados
            // pero los mantenemos por si la función generarHtmlParaPdf los usa directamente de esta forma por ahora.
            itemsParaCotizar: nuevoHistorial.itemsParaCotizar, // Ya tienen la descripción
            resultadosCalculados: nuevoHistorial.resultadosCalculados,
            nombrePerfil: nuevoHistorial.nombrePerfil, // Tomar del objeto guardado para consistencia
            anoEnCursoGlobal: nuevoHistorial.anoEnCursoGlobal
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
            // Usar el número secuencial para el nombre del archivo
            res.header('Content-Disposition', `attachment; filename="Configuracion_${numeroSecuencialConfig}.pdf"`);
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
    const { calculoHistorialCompleto } = datos; // Todos los datos necesarios están aquí

    const { 
        itemsParaCotizar, 
        resultadosCalculados, 
        nombrePerfil, 
        anoEnCursoGlobal,
        empresaQueCotiza,
        clienteNombre,
        clienteRut,
        clienteDireccion,
        clienteComuna,
        clienteCiudad,
        clientePais,
        clienteContactoNombre,
        clienteContactoEmail,
        clienteContactoTelefono,
        numeroCotizacion,
        referenciaDocumento,
        fechaCreacionCotizacion,
        fechaCaducidadCotizacion,
        emisorNombre,
        emisorAreaComercial,
        emisorEmail,
        comentariosAdicionales,
        terminosPago,
        medioPago,
        formaPago
    } = calculoHistorialCompleto; 

    // Datos de la empresa que cotiza (ejemplo, podrían ser configurables o venir de otro lado)
    const miEmpresa = {
        nombre: empresaQueCotiza || "Nombre de Mi Empresa S.A.",
        rut: "76.123.456-7",
        direccion: "Av. Siempre Viva 742, Springfield",
        ciudad: "Santiago",
        pais: "Chile",
        telefono: "+56 2 2123 4567",
        email: emisorEmail || "ventas@miempresa.cl",
        logoUrl: "" // URL eliminada
    };

    let itemsHtml = '';
    let subtotalNetoGeneral = 0;
    let contadorItem = 1;

    itemsParaCotizar.forEach(item => {
        const productoPrincipal = item.principal;
        const keyProductoPrincipal = `principal-${productoPrincipal.codigo_producto}`;
        const calculosProducto = resultadosCalculados.get(keyProductoPrincipal); // resultadosCalculados es un Map

        let precioUnitarioNetoPrincipal = 0;
        if (calculosProducto && calculosProducto.calculados && calculosProducto.calculados.precios_cliente) {
            precioUnitarioNetoPrincipal = calculosProducto.calculados.precios_cliente.precioNetoVentaFinalCLP || 0;
        }
        subtotalNetoGeneral += precioUnitarioNetoPrincipal; // Asumiendo cantidad 1

        itemsHtml += `
            <tr>
                <td>${contadorItem++}</td>
                <td>${productoPrincipal.codigo_producto || 'N/A'}</td>
                <td>
                    <b>${productoPrincipal.nombre_del_producto || 'Producto Principal Sin Nombre'}</b><br>
                    <small>${productoPrincipal.Descripcion || ''}</small></td>
                </td>
                <td style="text-align:center;">1</td>
                <td style="text-align:right;">${formatCLP(precioUnitarioNetoPrincipal)}</td>
                <td style="text-align:right;">${formatCLP(precioUnitarioNetoPrincipal)}</td>
            </tr>
        `;

        if (item.opcionales && item.opcionales.length > 0) {
            item.opcionales.forEach(opcional => {
                const keyOpcional = `opcional-${opcional.codigo_producto}`;
                const calculosOpcional = resultadosCalculados.get(keyOpcional);
                let precioNetoOpcional = 0;
                if (calculosOpcional && calculosOpcional.calculados && calculosOpcional.calculados.precios_cliente) {
                    precioNetoOpcional = calculosOpcional.calculados.precios_cliente.precioNetoVentaFinalCLP || 0;
                }
                subtotalNetoGeneral += precioNetoOpcional;

                itemsHtml += `
                    <tr class="opcional-row">
                        <td></td>
                        <td>${opcional.codigo_producto || 'N/A'}</td>
                        <td>
                            &nbsp;&nbsp;&nbsp;└─ <i>${opcional.nombre_del_producto || 'Opcional Sin Nombre'}</i><br>
                            &nbsp;&nbsp;&nbsp;<small style="padding-left:15px;"><i>${opcional.Descripcion || ''}</i></small>
                        </td>
                        <td style="text-align:center;">1</td>
                        <td style="text-align:right;">${formatCLP(precioNetoOpcional)}</td>
                        <td style="text-align:right;">${formatCLP(precioNetoOpcional)}</td>
                    </tr>
                `;
            });
        }
    });

    const ivaPct = 0.19; // Asumir 19% IVA
    const montoIva = subtotalNetoGeneral * ivaPct;
    const totalGeneral = subtotalNetoGeneral + montoIva;

    let htmlContent = `
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #333; }
            .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { margin-top: 0; }
            .info-grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-col-left, .info-col-right { font-size: 0.9em; }
            .section-title { font-weight: bold; margin-bottom: 8px; color: #555; font-size: 1.05em; }
            .detail-item { margin-bottom: 4px; display: flex; }
            .detail-item .label { font-weight: bold; width: 100px; color: #555; flex-shrink: 0; }
            .detail-item .value { flex-grow: 1; }

            .config-details-table { width: 100%; margin-top: 5px; }
            .config-details-table td { padding: 3px 0; vertical-align: top; }
            .config-details-table td.label { font-weight: bold; width: 130px; color: #555; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            .items-table th { background-color: #f2f2f2; font-weight: bold; }
            .opcional-row td { font-style: italic; color: #555; background-color: #fdfdfd; }
            .opcional-row small { color: #777; }
            .totals-table { width: 100%; margin-top: 20px; }
            .totals-table td { padding: 5px; }
            .totals-table .label { text-align: right; font-weight: bold; width: 75%; }
            .totals-table .value { text-align: right; width: 25%; }
            .terms, .comments { margin-top: 20px; padding-top:10px; border-top: 1px solid #eee; font-size: 0.9em; }
            .terms strong, .comments strong { display: block; margin-bottom: 5px; color: #555; }
            .footer { font-size: 0.8em; color: #777; margin-top: 30px; border-top: 1px solid #ccc; padding-top:10px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="header">
                <h2>CONFIGURACION</h2>
            </div>

            <div class="info-grid-container">
                <div class="info-col-left">
                    <div class="section-title">Datos del Emisor</div>
                    <div class="detail-item"><span class="label">Empresa:</span><span class="value">${miEmpresa.nombre}</span></div>
                    <div class="detail-item"><span class="label">RUT:</span><span class="value">${miEmpresa.rut}</span></div>
                    <div class="detail-item"><span class="label">Dirección:</span><span class="value">${miEmpresa.direccion}</span></div>
                    <div class="detail-item"><span class="label">Ciudad:</span><span class="value">${miEmpresa.ciudad}, ${miEmpresa.pais}</span></div>
                    <div class="detail-item"><span class="label">Teléfono:</span><span class="value">${miEmpresa.telefono}</span></div>
                    <div class="detail-item"><span class="label">Email:</span><span class="value">${miEmpresa.email}</span></div>
                    ${emisorNombre ? `<div class="detail-item"><span class="label">Atención:</span><span class="value">${emisorNombre}${emisorAreaComercial ? ` (${emisorAreaComercial})` : ''}</span></div>` : ''}
                    
                    <div class="section-title" style="margin-top: 20px;">Datos del Cliente</div>
                    <div class="detail-item"><span class="label">Cliente:</span><span class="value">${clienteNombre || 'N/A'}</span></div>
                    ${clienteRut ? `<div class="detail-item"><span class="label">RUT:</span><span class="value">${clienteRut}</span></div>` : ''}
                    ${clienteDireccion ? `<div class="detail-item"><span class="label">Dirección:</span><span class="value">${clienteDireccion}</span></div>` : ''}
                    ${(clienteComuna || clienteCiudad || clientePais) ? `<div class="detail-item"><span class="label">Ubicación:</span><span class="value">${clienteComuna ? `${clienteComuna}, ` : ''} ${clienteCiudad || ''} ${clientePais ? `, ${clientePais}` : ''}</span></div>` : ''}
                    ${clienteContactoNombre ? `<div class="detail-item"><span class="label">Contacto:</span><span class="value">${clienteContactoNombre}</span></div>` : ''}
                    ${clienteContactoTelefono ? `<div class="detail-item"><span class="label">Teléfono:</span><span class="value">${clienteContactoTelefono}</span></div>` : ''}
                    ${clienteContactoEmail ? `<div class="detail-item"><span class="label">Email:</span><span class="value">${clienteContactoEmail}</span></div>` : ''}
                </div>
                
                <div class="info-col-right">
                    <div class="section-title">Detalles de la Configuración</div>
                    <table class="config-details-table">
                        <tr><td class="label">Nº Configuración:</td><td>${numeroCotizacion || 'Por definir'}</td></tr>
                        <tr><td class="label">Fecha Emisión:</td><td>${fechaCreacionCotizacion ? new Date(fechaCreacionCotizacion).toLocaleDateString('es-CL') : 'N/A'}</td></tr>
                        <tr><td class="label">Validez Oferta:</td><td>${fechaCaducidadCotizacion ? new Date(fechaCaducidadCotizacion).toLocaleDateString('es-CL') : 'N/A'}</td></tr>
                        ${referenciaDocumento ? `<tr><td class="label">Referencia:</td><td>${referenciaDocumento}</td></tr>` : ''}
                        ${nombrePerfil ? `<tr><td class="label">Perfil Aplicado:</td><td>${nombrePerfil}</td></tr>` : ''}
                    </table>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width:5%;">Ítem</th>
                        <th style="width:15%;">Código</th>
                        <th style="width:45%;">Descripción</th>
                        <th style="width:10%; text-align:center;">Cant.</th>
                        <th style="width:12.5%; text-align:right;">P. Neto Unit.</th>
                        <th style="width:12.5%; text-align:right;">P. Neto Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <table class="totals-table">
                <tr>
                    <td class="label">SUBTOTAL NETO:</td>
                    <td class="value">${formatCLP(subtotalNetoGeneral)}</td>
                </tr>
                <tr>
                    <td class="label">IVA (${(ivaPct * 100).toFixed(0)}%):</td>
                    <td class="value">${formatCLP(montoIva)}</td>
                </tr>
                <tr>
                    <td class="label" style="font-size: 1.1em;">TOTAL GENERAL:</td>
                    <td class="value" style="font-size: 1.1em;"><b>${formatCLP(totalGeneral)}</b></td>
                </tr>
            </table>

            ${(terminosPago || medioPago || formaPago) ? 
            `<div class="terms">
                <strong>CONDICIONES COMERCIALES:</strong>
                ${terminosPago ? `<div>Términos de Pago: ${terminosPago}</div>` : ''}
                ${medioPago ? `<div>Medio de Pago: ${medioPago}</div>` : ''}
                ${formaPago ? `<div>Forma de Pago: ${formaPago}</div>` : ''}
            </div>` : ''}

            ${comentariosAdicionales ? 
            `<div class="comments">
                <strong>COMENTARIOS ADICIONALES:</strong>
                <div style="white-space: pre-wrap;">${comentariosAdicionales}</div>
            </div>` : ''}
            
            <div class="footer">
                Este documento es una cotización y no constituye una factura.<br>
                Precios sujetos a cambio sin previo aviso después de la fecha de validez.
                ID de Cálculo Interno: ${calculoHistorialCompleto._id.toString()}
            </div>
        </div>
    </body>
    </html>
    `;

    return htmlContent;
};

module.exports = {
    guardarYExportarCalculos,
    generarHtmlParaPdf
}; 