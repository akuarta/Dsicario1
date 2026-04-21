/**
 * Script de Diagnóstico: Actualización de Productos
 * Ejecutar con: node scratch/debug_product_update.js
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycby5xMlsWhrNDB2O5tqE_GUTbeznMaB4pqTfx8gRZnvcvCB4zIS0IqwDMaptlaRbrUwe/exec';

async function run() {
  console.log('=== DIAGNÓSTICO DE ACTUALIZACIÓN DE PRODUCTOS ===\n');

  // PASO 1: Ver qué devuelve el GET para la hoja "Producto"
  console.log('1. Leyendo hoja "Producto" (GET)...');
  try {
    const res = await fetch(`${GAS_URL}?sheet=Producto`);
    const data = await res.json();
    const keys = Object.keys(data);
    console.log('   Claves en la respuesta:', keys);
    
    // Ver qué hoja encontró
    const productoKey = keys.find(k => k.toLowerCase().includes('producto'));
    if (productoKey) {
      const rows = data[productoKey];
      if (rows && rows.length > 0) {
        console.log(`   ✅ Hoja encontrada: "${productoKey}" con ${rows.length} filas`);
        console.log('   Columnas de la hoja:', Object.keys(rows[0]));
        console.log('   Primera fila (datos crudos):', JSON.stringify(rows[0], null, 2));
      } else {
        console.log(`   ⚠️  Hoja "${productoKey}" encontrada pero VACÍA`);
      }
    } else {
      console.log('   ❌ No se encontró ninguna hoja que contenga "producto"');
      console.log('   Hojas disponibles en la respuesta:', keys);
    }
  } catch (err) {
    console.error('   Error en GET:', err.message);
  }

  // PASO 2: Ver todas las hojas disponibles (GET sin parámetros - puede ser lento)
  console.log('\n2. Leyendo todas las hojas (esto puede tardar)...');
  try {
    const res = await fetch(GAS_URL);
    const data = await res.json();
    console.log('   Todas las hojas:', Object.keys(data));
  } catch (err) {
    console.error('   Error:', err.message);
  }

  // PASO 3: Probar un UPSERT real con el primer producto
  console.log('\n3. Probando UPSERT en hoja "Producto"...');
  try {
    // Primero obtener un ID real
    const getRes = await fetch(`${GAS_URL}?sheet=Producto`);
    const getData = await getRes.json();
    const productoKey = Object.keys(getData).find(k => k.toLowerCase().includes('producto'));
    
    if (!productoKey || !getData[productoKey]?.length) {
      console.log('   ⚠️  No hay productos para probar el UPSERT');
      return;
    }
    
    const firstProduct = getData[productoKey][0];
    const columns = Object.keys(firstProduct);
    console.log('   Columnas encontradas:', columns);
    
    // Identificar el campo ID
    const idCol = columns.find(c => c.toLowerCase().includes('id'));
    console.log('   Campo ID detectado:', idCol, '=', firstProduct[idCol]);
    
    // Intentar UPSERT SIN modificar nada (test)
    const testPayload = {
      action: 'UPSERT',
      sheet: productoKey, // usar el nombre EXACTO de la hoja
      idField: idCol,     // usar el nombre EXACTO del campo ID
      data: {
        [idCol]: firstProduct[idCol],
        'UltimaActualizacion': new Date().toISOString()
      }
    };
    
    console.log('   Enviando payload de prueba:', JSON.stringify(testPayload, null, 2));
    
    const postRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(testPayload),
      redirect: 'follow'
    });
    
    const postData = await postRes.json();
    console.log('   Respuesta del servidor:', JSON.stringify(postData, null, 2));
    
    if (postData.success) {
      console.log('\n✅ UPSERT FUNCIONA.');
      console.log(`\n👉 NOMBRE EXACTO DE HOJA: "${productoKey}"`);
      console.log(`👉 NOMBRE EXACTO DEL CAMPO ID: "${idCol}"`);
      console.log('\n⚠️  Si la app usa un nombre diferente, ese es el bug.');
    } else {
      console.log('\n❌ UPSERT FALLÓ:', postData.message);
    }
    
  } catch (err) {
    console.error('   Error en UPSERT:', err.message);
  }
}

run();
