/**
 * MOTOR DE SINCRONIZACIÓN Y PDF — DSicario (Food Delivery)
 * Hoja: https://docs.google.com/spreadsheets/d/1xNVeHGBr3T93ZOSfRaPKu4qd29uQK1ZxwVnp061B63Q
 *
 * Hojas reconocidas:
 *   Hoja1   → catálogo de productos (ID_Producto, imagen, categoria, subcategoria,
 *             nombre, descripcion, precio, cantidad, descuento, itebis, agotado,
 *             masVendidos, delaCasa, enOferta, agregadoRecien, recomendados, carrito?, rating)
 *
 * Para añadir más hojas (PEDIDOS, USUARIOS, etc.) simplemente créalas en el mismo
 * spreadsheet con la misma convención de "primera fila = cabeceras".
 */

var SS_ID = "1xNVeHGBr3T93ZOSfRaPKu4qd29uQK1ZxwVnp061B63Q";

// ─── ID_FIELD por hoja ─────────────────────────────────────────────────────────
// Indica cuál columna usamos como identificador único en cada hoja.
var ID_FIELD_MAP = {
  "Hoja1"   : "ID_Producto",   // catálogo principal DSicario
  "PEDIDOS" : "ID_Pedido",
  "USUARIOS": "ID_Usuario",
  // Si el nombre de tu hoja es diferente, agrégalo aquí.
};

/**
 * Devuelve el nombre del campo ID para una hoja dada.
 * Si no está en el mapa se prueba con columnas comunes.
 */
function getIdField(sheetName, headers) {
  if (ID_FIELD_MAP[sheetName]) {
    return ID_FIELD_MAP[sheetName];
  }
  // fallback: busca la primera columna que suene a ID
  var candidates = ["id", "ID", "ID_Producto", "ID_Pedido", "ID_Orden",
                    "ID_Facturacion", "TURNO", "ID_Usuario"];
  for (var i = 0; i < candidates.length; i++) {
    if (headers.indexOf(candidates[i]) !== -1) { return candidates[i]; }
  }
  return headers[0]; // última opción: primera columna
}

// ─── doGet ─────────────────────────────────────────────────────────────────────
function doGet(e) {
  // Protección: cuando se ejecuta desde el editor (sin request real)
  // el objeto `e` puede ser undefined o no tener `.parameter`.
  if (!e || !e.parameter) {
    e = { parameter: {} };
  }

  var ss = SpreadsheetApp.openById(SS_ID);

  // ── Generación de PDF ────────────────────────────────────────────────────────
  if (e.parameter.action === "generatePDF") {
    var sheetName = e.parameter.sheet || e.parameter.type || "Hoja1";
    return generateUniversalPDF(e.parameter.id, sheetName);
  }

  // ── Filtros opcionales del GET ───────────────────────────────────────────────
  // ?sheet=Hoja1               → devuelve solo esa hoja
  // ?sheet=Hoja1&categoria=Hamburguesa → filtra por columna=valor
  if (e.parameter.sheet) {
    var sheetName = e.parameter.sheet;
    var ss = SpreadsheetApp.openById(SS_ID);
    
    // Búsqueda insensible a mayúsculas/minúsculas
    var sheets = ss.getSheets();
    var sheet = sheets.find(function(s) { 
      return s.getName().toLowerCase() === sheetName.toLowerCase(); 
    });

    if (!sheet) { return jsonResponse(false, "Hoja no encontrada: " + sheetName); }

    var data    = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows    = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });

    // Filtro por cualquier parámetro extra (excepto "sheet" y "action")
    var filtered = rows.filter(function(row) {
      return Object.keys(e.parameter).every(function(key) {
        if (key === "sheet" || key === "action") { return true; }
        
        // Buscar el valor en la fila (row) ignorando caja de la "key" del URL
        var normalizedKey = key.toLowerCase();
        var rowKey = Object.keys(row).find(function(rk) { return rk.toLowerCase() === normalizedKey; });
        
        if (!rowKey) return true; // Si la columna no existe en la hoja, no filtramos por ella
        return String(row[rowKey]).toLowerCase() === String(e.parameter[key]).toLowerCase();
      });
    });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: filtered }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Todas las hojas ──────────────────────────────────────────────────────────
  var sheets = ss.getSheets();
  var result = {};
  sheets.forEach(function(s) {
    var data = s.getDataRange().getValues();
    if (data.length > 0) {
      var headers = data[0];
      var rows    = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      });
      result[s.getName()] = rows;
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── doPost ────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var body      = JSON.parse(e.postData.contents);
    var action    = (body.action  || "").toUpperCase();
    var sheetName = body.sheet;
    var data      = body.data || {};

    if (!sheetName) { return jsonResponse(false, "Falta el campo 'sheet'."); }

    var ss    = SpreadsheetApp.openById(SS_ID);
    
    // Búsqueda insensible a mayúsculas/minúsculas para POST
    var sheets = ss.getSheets();
    var sheet = sheets.find(function(s) { 
      return s.getName().toLowerCase() === (sheetName || "").toLowerCase(); 
    });

    if (!sheet) { return jsonResponse(false, "Hoja no encontrada: " + sheetName); }

    var allValues = sheet.getDataRange().getValues();
    var headers   = allValues[0];
    var idField   = getIdField(sheetName, headers);

    switch (action) {

      // ── CREAR ──────────────────────────────────────────────────────────────
      case "ADD":
      case "CREATE": {
        // Autogenerar ID si no se proporciona
        if (!data[idField] || data[idField] === "") {
          data[idField] = generateNextId(allValues, headers, idField);
        }
        var newRow = headers.map(function(h) {
          return data.hasOwnProperty(h) ? data[h] : "";
        });
        sheet.appendRow(newRow);
        return jsonResponse(true, "Registro creado.", { id: data[idField] });
      }

      // ── ACTUALIZAR ─────────────────────────────────────────────────────────
      case "UPDATE": {
        var idToFind = data[idField] || data.id || data.ID;
        if (!idToFind) { return jsonResponse(false, "No se proporcionó ID válido."); }

        for (var i = 1; i < allValues.length; i++) {
          var rowValues = allValues[i].map(function(c) { return String(c).trim(); });
          if (rowValues.indexOf(String(idToFind).trim()) !== -1) {
            headers.forEach(function(h, colIndex) {
              // Buscar el valor en data ignorando caja/acentos si no existe exacto
              var val = data[h];
              if (val === undefined) {
                // Búsqueda flexible en el objeto data
                var normalizedH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[?()\s./-]/g, "");
                var foundKey = Object.keys(data).find(function(k) {
                  return k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[?()\s./-]/g, "") === normalizedH;
                });
                if (foundKey) val = data[foundKey];
              }

              if (val !== undefined) {
                sheet.getRange(i + 1, colIndex + 1).setValue(val);
              }
            });
            return jsonResponse(true, "Registro actualizado.");
          }
        }
        return jsonResponse(false, "No se encontró el ID: " + idToFind);
      }

      // ── ELIMINAR ───────────────────────────────────────────────────────────
      case "DELETE": {
        var idToFind = data[idField] || data.id || data.ID;
        if (!idToFind) { return jsonResponse(false, "No se proporcionó ID válido."); }

        for (var i = 1; i < allValues.length; i++) {
          var rowValues = allValues[i].map(function(c) { return String(c).trim(); });
          if (rowValues.indexOf(String(idToFind).trim()) !== -1) {
            sheet.deleteRow(i + 1);
            return jsonResponse(true, "Registro eliminado.");
          }
        }
        return jsonResponse(false, "No se encontró el ID: " + idToFind);
      }

      // ── BUSCAR (opcional, para búsquedas ligeras desde la app) ─────────────
      case "SEARCH": {
        var query  = (body.query  || "").toLowerCase();
        var field  = body.field;                   // columna específica (opcional)
        var result = [];

        allValues.slice(1).forEach(function(row) {
          var obj   = {};
          var match = false;
          headers.forEach(function(h, i) {
            obj[h] = row[i];
            if (field ? h === field : true) {
              if (String(row[i]).toLowerCase().indexOf(query) !== -1) { match = true; }
            }
          });
          if (match) { result.push(obj); }
        });
        return ContentService
          .createTextOutput(JSON.stringify({ success: true, data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      default:
        return jsonResponse(false, "Acción no válida: " + action);
    }
  } catch (err) {
    return jsonResponse(false, err.message);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Genera el próximo ID numérico sumando 1 al máximo encontrado en la columna ID.
 */
function generateNextId(allValues, headers, idField) {
  var idIndex = headers.indexOf(idField);
  if (idIndex === -1) { return 1; }
  var maxId = 0;
  allValues.slice(1).forEach(function(row) {
    var val = parseInt(row[idIndex], 10);
    if (!isNaN(val) && val > maxId) { maxId = val; }
  });
  return maxId + 1;
}

/**
 * Genera un PDF sencillo con los datos del registro indicado.
 * Para productos de DSicario muestra nombre, precio, categoría, etc.
 *
 * @param {string} docId      Valor del campo ID a buscar.
 * @param {string} sheetName  Nombre de la hoja donde buscar.
 */
function generateUniversalPDF(docId, sheetName) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  
  // Búsqueda insensible a mayúsculas/minúsculas
  var sheets = ss.getSheets();
  var sheet = sheets.find(function(s) { 
    return s.getName().toLowerCase() === (sheetName || "").toLowerCase(); 
  });

  if (!sheet) {
    return ContentService
      .createTextOutput("Error: No se encontró la pestaña " + sheetName)
      .setMimeType(ContentService.MimeType.TEXT);
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];

  // Índices útiles para Hoja1 (catálogo DSicario)
  var idField   = getIdField(sheetName, headers);
  var idIdx     = headers.indexOf(idField);

  // Buscar la fila
  var rowData = null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === String(docId).trim()) {
      rowData = data[i];
      break;
    }
  }

  if (!rowData) {
    return ContentService
      .createTextOutput("Error: No se encontró el registro " + docId + " en " + sheetName)
      .setMimeType(ContentService.MimeType.TEXT);
  }

  // Construir el objeto completo
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = rowData[i]; });

  // — Detalle legible para producto DSicario ——————————————————————————————
  var lines = [];
  lines.push("╔══════════════════════════════════════╗");
  lines.push("║       FICHA DE PRODUCTO — DSicario    ║");
  lines.push("╚══════════════════════════════════════╝");
  lines.push("");
  lines.push("🆔 ID          : " + (obj["ID_Producto"] || docId));
  lines.push("📌 Nombre      : " + (obj["nombre"]      || "N/A"));
  lines.push("📂 Categoría   : " + (obj["categoria"]   || "N/A"));
  lines.push("   Subcategoría: " + (obj["subcategoria"] || "N/A"));
  lines.push("💲 Precio      : RD$ " + (obj["precio"]   || "0"));
  lines.push("📝 Descripción : " + (obj["descripcion"] || "N/A"));
  lines.push("");

  // Flags booleanos
  var flags = ["masVendidos","delaCasa","enOferta","agregadoRecien","recomendados","agotado"];
  flags.forEach(function(f) {
    if (obj[f] === true || String(obj[f]).toLowerCase() === "true") {
      lines.push("✅ " + f);
    }
  });

  lines.push("");
  lines.push("⭐ Rating      : " + (obj["rating"] || "N/A"));
  lines.push("📦 Cantidad    : " + (obj["cantidad"] || "N/A"));
  lines.push("");
  lines.push("(Generado por DSicario API — " + new Date().toLocaleString() + ")");

  return ContentService
    .createTextOutput(lines.join("\n"))
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Respuesta JSON estándar.
 */
function jsonResponse(success, message, extra) {
  var payload = { success: success, message: message };
  if (extra) {
    Object.keys(extra).forEach(function(k) { payload[k] = extra[k]; });
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
