const https = require('https');
const API_URL = 'https://script.google.com/macros/s/AKfycbzObeW78gKUtWhiZarThm5BPW-1ISBciOJW_sF07iOeT5qt3ALPWbbelqAmzsAJbln0/exec';

async function testDelete(orderId) {
  console.log(`🗑️ Intentando borrar pedido: ${orderId}...`);
  const payload = {
    action: 'DELETE',
    sheet: 'Pedidos',
    idField: 'ID_Pedido',
    data: { 'ID_Pedido': String(orderId) }
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log('📥 Respuesta del Servidor:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ Error en el fetch:', e.message);
  }
}

testDelete('W-1777258785614');
