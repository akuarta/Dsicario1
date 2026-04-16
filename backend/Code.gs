const SETTINGS = { DEFAULT_BUSINESS_NAME: "D'SICARIO" };

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = e?.parameter || {};
  if (params.action === 'getReviews') return handleGetReviews(ss, params.id);
  const result = { success: true };
  let targetSheetName = params.sheet;
  let sheets = targetSheetName ? [ss.getSheets().find(s => s.getName().toLowerCase() === targetSheetName.toLowerCase())] : ss.getSheets();

  sheets.forEach(s => {
    if (!s) return;
    const name = s.getName();
    const lastRow = getSafeLastRow(s);
    if (lastRow < 1) { result[name] = []; return; }
    const data = s.getRange(1, 1, lastRow, s.getLastColumn()).getValues();
    const headers = data[0];
    result[name] = data.slice(1).filter(r => r.some(c => c !== "")).map(r => {
      const obj = {};
      headers.forEach((h, i) => { if (h) { obj[h] = r[i]; obj[h.toString().toLowerCase().trim().replace(/\s+/g, '_')] = r[i]; } });
      return obj;
    });
  });
  return createJsonResponse(result);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toUpperCase();
    const sheetName = body.sheet;
    const data = body.data || body.item || body;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    
    if (body.action === "GENERATE_PDF") return generateRealPDF(body);

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
  const blob = HtmlService.createHtmlOutput("<h1>ORDEN #" + (o.idorden || "N/A") + "</h1>").getBlob().getAs('application/pdf');
  return createJsonResponse({ success: true, pdfBase64: Utilities.base64Encode(blob.getBytes()) });
}
