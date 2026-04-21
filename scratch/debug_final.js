/**
 * Diagnóstico definitivo: ver ambos sheets y sus columnas exactas
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycby5xMlsWhrNDB2O5tqE_GUTbeznMaB4pqTfx8gRZnvcvCB4zIS0IqwDMaptlaRbrUwe/exec';

async function run() {
  const res = await fetch(GAS_URL);
  const data = await res.json();
  
  // Ver ambos sheets de productos
  const sheets = ['productos', 'Producto'];
  for (const sheet of sheets) {
    const rows = data[sheet] || [];
    if (rows.length > 0) {
      process.stdout.write(`\n=== Sheet: "${sheet}" (${rows.length} filas) ===\n`);
      process.stdout.write(`Columnas: ${JSON.stringify(Object.keys(rows[0]))}\n`);
      process.stdout.write(`Primer registro:\n`);
      const first = rows[0];
      const idKey = Object.keys(first).find(k => k.toLowerCase().includes('id'));
      const nombKey = Object.keys(first).find(k => k.toLowerCase().includes('nom'));
      process.stdout.write(`  ID key="${idKey}" value="${first[idKey]}"\n`);
      process.stdout.write(`  Nombre key="${nombKey}" value="${first[nombKey]}"\n`);
    } else {
      process.stdout.write(`\n=== Sheet: "${sheet}" (EMPTY o no existe) ===\n`);
    }
  }
  
  // Ver qué devuelve resolveSheetData('Producto')
  process.stdout.write('\n=== Test resolveSheetData logic ===\n');
  const sn = 'Producto'.toLowerCase().trim(); // 'producto'
  const foundKey = Object.keys(data).find(k => {
    const name = k.toLowerCase().trim();
    return name === sn || (name + 's') === sn || name === (sn + 's');
  });
  process.stdout.write(`resolveSheetData('Producto') encontró clave: "${foundKey}"\n`);
  if (foundKey) {
    const rows = data[foundKey];
    if (rows && rows.length > 0) {
      process.stdout.write(`Columnas: ${JSON.stringify(Object.keys(rows[0]))}\n`);
    }
  }
}

run().catch(e => process.stderr.write(e.message + '\n'));
