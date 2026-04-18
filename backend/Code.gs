const SETTINGS = { DEFAULT_BUSINESS_NAME: "D'SICARIO" };

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = e?.parameter || {};
  if (params.action === 'getReviews') return handleGetReviews(ss, params.id);
  const result = { success: true };
  let targetSheetName = params.sheet;
  let sheets = targetSheetName ? [ss.getSheetByName(targetSheetName)] : ss.getSheets();

  sheets.forEach(s => {
    if (!s) return;
    const name = s.getName();
    result[name] = resolveSheetData(name);
  });
  return createJsonResponse(result);
}

function resolveSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = r[i];
    });
    return obj;
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toUpperCase();
    const sheetName = body.sheet;
    const data = body.data || body.item || body;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName || "Data");
    
    if (body.action === "GENERATE_PDF") return generateRealPDF(body);

    // Validación mandataria para la hoja USUARIOS: requiere ID_User y NombreUser
    if (sheetName && sheetName.toUpperCase() === "USUARIOS" && (action === "UPSERT" || action === "ADD")) {
      const hasId = data.ID_User || data.id_user || data.id;
      const hasName = data.NombreUser || data.nombreuser || data.username;
      
      if (!hasId || !hasName) {
        return createJsonResponse({ 
          success: false, 
          message: "Error de Validación: No se permite agregar usuarios sin ID_User y NombreUser." 
        });
      }
    }

    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    if (headers[0] === "" && Object.keys(data).length > 0) sheet.appendRow(Object.keys(data));
    
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());

    if (action === "UPSERT" || action === "ADD") {
      const idField = (body.idField || "ID_Pedido").toLowerCase().trim();
      const idToFind = data[body.idField] || data["ID_Pedido"] || data.id || data.orderId;
      const lastRow = getSafeLastRow(sheet);
      let foundIndex = -1;
      const idCol = lowerHeaders.indexOf(idField);

      if (idCol !== -1 && lastRow >= 2) {
        const vals = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
        const idToFindSub = String(idToFind).trim().toLowerCase();
        for (let i = 0; i < vals.length; i++) { 
          if (String(vals[i][0]).trim().toLowerCase() === idToFindSub) { 
            foundIndex = i + 2; 
            break; 
          } 
        }
      }

      if (foundIndex !== -1) {
        headers.forEach((h, ci) => {
          const hl = h.toLowerCase().trim();
          for (let k in data) { if (k.toLowerCase().trim() === hl) { sheet.getRange(foundIndex, ci + 1).setValue(data[k]); break; } }
        });
        
        // AUTO-CREAR COLUMNAS FALTANTES
        for (let k in data) {
          const kl = k.toLowerCase().trim();
          if (!lowerHeaders.includes(kl)) {
            const nextCol = headers.length + 1;
            sheet.getRange(1, nextCol).setValue(k);
            sheet.getRange(foundIndex, nextCol).setValue(data[k]);
            headers.push(k);
            lowerHeaders.push(kl);
          }
        }
        return createJsonResponse({ success: true, message: "OK" });
      } else {
        const nr = headers.map(h => {
          const hl = h.toLowerCase().trim();
          for (let k in data) { if (k.toLowerCase().trim() === hl) return data[k]; }
          return "";
        });
        sheet.appendRow(nr);
        return createJsonResponse({ success: true, message: "OK" });
      }
    }

    if (action === "UPDATE") {
      // Buscar el ID del pedido para actualizar la fila correspondiente
      const idField = (body.idField || "ID_Pedido").toLowerCase().trim();
      const idToFind = data[body.idField] || data["ID_Pedido"] || data.id;
      const lastRow = getSafeLastRow(sheet);
      const idCol = lowerHeaders.indexOf(idField);
      let foundIndex = -1;

      if (idCol !== -1 && lastRow >= 2) {
        const vals = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
        const idToFindStr = String(idToFind).trim().toLowerCase();
        for (let i = 0; i < vals.length; i++) {
          if (String(vals[i][0]).trim().toLowerCase() === idToFindStr) {
            foundIndex = i + 2;
            break;
          }
        }
      }

      if (foundIndex !== -1) {
        // Escribir TODOS los campos enviados, incluyendo los vacíos (para limpiar celdas)
        headers.forEach((h, ci) => {
          const hl = h.toLowerCase().trim();
          for (let k in data) {
            if (k.toLowerCase().trim() === hl) {
              sheet.getRange(foundIndex, ci + 1).setValue(data[k]); // Escribe "" si está vacío
              break;
            }
          }
        });
        return createJsonResponse({ success: true, updated: foundIndex });
      } else {
        return createJsonResponse({ success: false, message: "Fila no encontrada para UPDATE" });
      }
    }

    if (action === "DELETE") {
      const idField = (body.idField || "id").toLowerCase().trim();
      const idToFind = data[body.idField] || data.id || data.ID;
      const lastRow = getSafeLastRow(sheet);
      const idCol = lowerHeaders.indexOf(idField);
      
      if (idCol !== -1 && lastRow >= 2) {
        const vals = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
        const idToFindStr = String(idToFind).trim().toLowerCase();
        for (let i = 0; i < vals.length; i++) {
          if (String(vals[i][0]).trim().toLowerCase() === idToFindStr) {
            sheet.deleteRow(i + 2);
            return createJsonResponse({ success: true, message: "Eliminado correctamente" });
          }
        }
      }
      return createJsonResponse({ success: false, message: "No se encontro el registro para eliminar" });
    }

    return createJsonResponse({ success: false, message: "Accion no reconocida" });
  } catch (err) { return createJsonResponse({ success: false, message: err.message }); }
}

function getSafeLastRow(s) {
  const d = s.getDataRange().getValues();
  for (let i = d.length - 1; i >= 0; i--) { if (d[i].some(c => c !== "")) return i + 1; }
  return 0;
}

function handleGetReviews(ss, pid) {
  const s = ss.getSheetByName("Valoraciones");
  if (!s) return createJsonResponse({ success: true, reviews: [] });
  const d = s.getDataRange().getValues();
  const h = d[0];
  const ci = h.indexOf("ID_Producto");
  return createJsonResponse({ success: true, reviews: d.slice(1).filter(r => String(r[ci]) === String(pid)).map(r => {
    let o = {}; h.forEach((sh, i) => o[sh] = r[i]); return o;
  })});
}

function createJsonResponse(d) { return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }

function generateRealPDF(o) {
  const businessName = SETTINGS.DEFAULT_BUSINESS_NAME;
  const orderId = o.idorden || o.id_pedido || o.id || "N/A";
  const date = o.fecha || new Date().toLocaleDateString();
  const client = o.cliente || o.nombreuser || o.username || "Consumidor Final";
  const items = o.items || [];
  const total = o.total || 0;
  const paymentMethod = o.metodo_pago || "Efectivo";

  let itemsHtml = "";
  items.forEach(item => {
    const itemTotal = (item.precio || 0) * (item.cantidad || 1);
    itemsHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.nombre || item.producto || "Producto"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad || 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.precio || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #333; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 800px; margin: auto; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E63946; padding-bottom: 20px; margin-bottom: 20px; }
          .business-info h1 { margin: 0; color: #E63946; font-size: 28px; }
          .order-info { text-align: right; }
          .client-info { margin-bottom: 30px; }
          .client-info h3 { margin-bottom: 5px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #f8f8f8; color: #333; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; }
          .summary { text-align: right; }
          .summary-item { margin-bottom: 5px; font-size: 16px; }
          .total { font-size: 22px; font-weight: bold; color: #E63946; margin-top: 10px; border-top: 2px solid #eee; padding-top: 10px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="business-info">
              <h1>${businessName}</h1>
              <p>Expertos en Sabor Sicario</p>
            </div>
            <div class="order-info">
              <h2>FACTURA</h2>
              <p><strong>Orden #:</strong> ${orderId}</p>
              <p><strong>Fecha:</strong> ${date}</p>
            </div>
          </div>

          <div class="client-info">
            <h3>Cliente:</h3>
            <p>${client}</p>
            <p><strong>Método de Pago:</strong> ${paymentMethod}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Producto</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">No hay productos en esta orden</td></tr>'}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item">Subtotal: $${(total / 1.18).toFixed(2)}</div>
            <div class="summary-item">ITBIS (18%): $${(total - (total / 1.18)).toFixed(2)}</div>
            <div class="total">TOTAL: $${parseFloat(total).toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>¡Gracias por su preferencia! Visítenos pronto.</p>
            <p>${new Date().getFullYear()} ${businessName} - San Juan de la Maguana, RD.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf');
  blob.setName("Invoice_" + orderId + ".pdf");
  
  return createJsonResponse({ 
    success: true, 
    pdfBase64: Utilities.base64Encode(blob.getBytes()),
    orderId: orderId
  });
}
