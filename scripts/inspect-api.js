const https = require('https');

// La URL actual del script de google
const API_URL = 'https://script.google.com/macros/s/AKfycbzObeW78gKUtWhiZarThm5BPW-1ISBciOJW_sF07iOeT5qt3ALPWbbelqAmzsAJbln0/exec';

console.log('🔍 Inspeccionando API (Mapeo de Datos)...');
console.log('URL:', API_URL);

// Hacemos el request

fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    const keys = Object.keys(data);
    console.log('\n✅ Conexión exitosa. Hojas detectadas en la base de datos:\n');
    
    keys.forEach(key => {
      const rows = data[key];
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`===========================================`);
        console.log(`📦 HOJA: [${key}] - ${rows.length} registros`);
        console.log(`===========================================`);
        console.log('📌 Encabezados de Columna (Primera Fila):');
        Object.keys(rows[0]).forEach(col => {
          console.log(`   - ${col}: ${rows[0][col]}`);
        });
        console.log('\n');
      } else {
        console.log(`📦 HOJA: [${key}] - Vacía o formato diferente`);
        if (typeof rows === 'object') {
           console.log(rows);
        }
      }
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar con la API:', err.message);
  });
