const https = require('https');
const API_URL = 'https://script.google.com/macros/s/AKfycbzObeW78gKUtWhiZarThm5BPW-1ISBciOJW_sF07iOeT5qt3ALPWbbelqAmzsAJbln0/exec';

async function testSheet(name) {
  console.log(`📡 Probando acceso directo a la hoja: [${name}]...`);
  try {
    const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(name)}`);
    const data = await res.json();
    console.log(`✅ Respuesta para [${name}]:`, Array.isArray(data) ? `${data.length} registros` : 'No es un array');
    if (Array.isArray(data) && data.length > 0) {
      console.log('📌 Columnas:', Object.keys(data[0]));
    } else {
      console.log('⚠️ Data:', JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    console.log(`❌ Error probando [${name}]:`, e.message);
  }
}

async function run() {
  await testSheet('Mesas');
  await testSheet('mesas');
  await testSheet('Mesa');
  await testSheet('pedido detalle');
}

run();
