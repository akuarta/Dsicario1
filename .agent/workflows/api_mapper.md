---
description: Mapear e Inspeccionar las hojas de la API de Google Sheets
---

Esta skill automatiza la inspección de la estructura de datos devuelta por el backend de Google Apps Script. 
Cada vez que se invoque, ejecutará un script que descarga el JSON principal y mapea los nombres de las hojas y sus encabezados de columna.

Para ejecutarla de forma autónoma:

// turbo
1. **Inspeccionar API en Terminal:**
```powershell
node .\scripts\inspect-api.js
```

2. **Resultados Esperados:**
El script analizará el payload y mostrará en consola:
- Todas las hojas (pestañas) reconocidas.
- La cantidad de registros de cada hoja.
- Los nombres exactos de las columnas (claves del objeto JSON) basados en la primera fila, lo que permite realizar mapeos precisos en el frontend de React Native.
