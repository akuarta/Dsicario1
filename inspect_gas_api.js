const fetch = require('node-fetch');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwz39D_mOnZJNFd7J9uvdJHVLpwK9URurHM8irt0M0ejdQljQfMzdLyVYOdP0eTQ8G5/exec';

async function inspectSheets() {
  console.log('--- INSPECCIONANDO TODO EL SPREADSHEET ---');
  try {
    const response = await fetch(GAS_URL + '?action=READ_ALL'); // Probando si hay una acción general o solo fetch por defecto
    const data = await response.json();
    
    const sheets = Object.keys(data);
    console.log('Hojas encontradas:', sheets);
    
    for (const sheetName of sheets) {
      const rows = data[sheetName];
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`\nHoja [${sheetName}] - Columnas detectadas:`);
        console.log(Object.keys(rows[0]));
        console.log('Primera fila de datos:', rows[0]);
      } else {
        console.log(`\nHoja [${sheetName}] está vacía o no es un array.`);
      }
    }
  } catch (error) {
    console.error('Error al inspeccionar:', error.message);
    
    console.log('\nIntentando fetch por defecto (todas las hojas)...');
    try {
        const response2 = await fetch(GAS_URL);
        const data2 = await response2.json();
        console.log('Hojas en respuesta por defecto:', Object.keys(data2));
    } catch (e) {
        console.error('Fallo también el fetch por defecto.');
    }
  }
}

inspectSheets();
