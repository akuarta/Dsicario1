/**
 * Inspeccionar los productos con sus IDs reales
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycby5xMlsWhrNDB2O5tqE_GUTbeznMaB4pqTfx8gRZnvcvCB4zIS0IqwDMaptlaRbrUwe/exec';

async function run() {
  const res = await fetch(`${GAS_URL}?sheet=Producto`);
  const data = await res.json();
  
  const key = Object.keys(data).find(k => k === 'Producto') || 
              Object.keys(data).find(k => k.toLowerCase().includes('producto'));
  
  const rows = data[key] || [];
  process.stdout.write(`Total productos: ${rows.length}\n`);
  
  rows.slice(0, 10).forEach((p, i) => {
    process.stdout.write(`[${i}] ID="${p.ID_Producto}" | Nombre="${p.Nombre}"\n`);
  });
  
  const withId = rows.filter(p => p.ID_Producto && String(p.ID_Producto).trim() !== '');
  const withoutId = rows.filter(p => !p.ID_Producto || String(p.ID_Producto).trim() === '');
  
  process.stdout.write(`\nCON ID: ${withId.length} | SIN ID: ${withoutId.length}\n`);
  
  if (withId.length > 0) {
    process.stdout.write(`\nPrimer producto con ID: ${JSON.stringify(withId[0])}\n`);
  }
}

run().catch(e => process.stderr.write(e.message + '\n'));
