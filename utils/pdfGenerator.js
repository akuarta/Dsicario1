import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Genera un HTML optimizado para Ticket de Impresora Térmica (80mm)
 */
const getTicketHTML = (data) => {
  const { 
    idorden, 
    fecha, 
    hora, 
    NombreLocal = 'DSICARIO APP', 
    DireccionLocal = 'República Dominicana', 
    TelefonoLocal = '809-000-0000', 
    items = [], 
    Subtotal = "0.00", 
    ITBIS = "0.00", 
    Total = "0.00",
    metodo = 'N/A',
    Cliente = 'Invitado',
    Descuento = "0.00",
    Propina = "0.00",
    Pagado = "0.00",
    Devuelta = "0.00"
  } = data;

  const itemsHtml = items.map(item => `
    <div class="item-row">
      <div class="item-desc">${item.Detalle || item.nombre} x${item.Cant || item.cantidad || 1}</div>
      <div class="item-price">RD$${parseFloat(item.Total || (item.precio * item.cantidad)).toFixed(2)}</div>
    </div>
  `).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 15px;
            color: #000;
            width: 280px; 
            margin: 0 auto;
            background-color: white;
            -webkit-print-color-adjust: exact;
          }
          @media print {
            body { 
              width: 100%; 
              padding: 0;
              margin: 0;
            }
            .ticket-container {
              width: 80mm;
              margin: 0;
              padding: 5mm;
            }
          }
          .ticket-container {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .business-name {
            font-size: 20px;
            font-weight: bold;
            margin: 5px 0;
            text-transform: uppercase;
          }
          .info {
            font-size: 12px;
            margin-bottom: 2px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .order-info {
            font-size: 13px;
            margin-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 5px;
          }
          .item-desc {
            flex: 1;
            padding-right: 5px;
          }
          .totals {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 3px;
          }
          .final-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
          }
          .qr-placeholder {
            margin-top: 15px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <div class="business-name">${NombreLocal}</div>
            <div class="info">${DireccionLocal}</div>
            <div class="info">Tel: ${TelefonoLocal}</div>
            <div class="info">${fecha} ${hora}</div>
          </div>

          <div class="divider"></div>

          <div class="order-info">
            <div>ORDEN: #${idorden}</div>
            <div>CLIENTE: ${Cliente || 'Invitado'}</div>
            <div>PAGO: ${metodo}</div>
          </div>

          <div class="divider"></div>

          <div class="items">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>RD$${parseFloat(Subtotal).toFixed(2)}</span>
            </div>
            ${parseFloat(Descuento) > 0 ? `
            <div class="total-row">
              <span>Descuento:</span>
              <span>-RD$${parseFloat(Descuento).toFixed(2)}</span>
            </div>` : ''}
            <div class="total-row">
              <span>ITBIS (18%):</span>
              <span>RD$${parseFloat(ITBIS).toFixed(2)}</span>
            </div>
            ${parseFloat(Propina) > 0 ? `
            <div class="total-row">
              <span>Propina:</span>
              <span>RD$${parseFloat(Propina).toFixed(2)}</span>
            </div>` : ''}
            <div class="total-row final-total">
              <span>TOTAL:</span>
              <span>RD$${parseFloat(Total).toFixed(2)}</span>
            </div>
            
            ${metodo === 'Efectivo' ? `
            <div class="divider" style="margin: 5px 0;"></div>
            <div class="total-row">
              <span>Efectivo:</span>
              <span>RD$${parseFloat(Pagado).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Cambio:</span>
              <span style="font-weight: bold;">RD$${parseFloat(Devuelta).toFixed(2)}</span>
            </div>` : ''}
          </div>

          <div class="footer">
            <p>*** GRACIAS POR SU COMPRA ***</p>
            <p>www.dsicario.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Genera PDF y permite compartir/guardar
 */
export const generatePDFBase64 = async (orderData) => {
  try {
    const html = getTicketHTML(orderData);
    
    if (Platform.OS === 'web') {
      // ✅ Solución Robusta para Web: Iframe Oculto
      // Esto garantiza que el navegador SÓLO vea el ticket.
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      // Esperar un momento a que los estilos carguen y luego imprimir
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
      
      return true;
    } else {
      // ✅ Soporte para Mobile: Generar archivo y compartir
      const result = await Print.printToFileAsync({ 
        html,
        base64: false,
        width: 280, 
      });

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Imprimir Ticket DSicario',
        UTI: 'com.adobe.pdf'
      });
      return true;
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
