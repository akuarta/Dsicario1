const fetch = require('node-fetch');
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwz39D_mOnZJNFd7J9uvdJHVLpwK9URurHM8irt0M0ejdQljQfMzdLyVYOdP0eTQ8G5/exec';

async function inspectUsers() {
  try {
    const response = await fetch(GAS_URL);
    const data = await response.json();
    
    console.log('Hojas disponibles:', Object.keys(data));
    
    // Buscar la hoja de usuarios (puede llamarse USUARIOS, Usuarios, users, etc.)
    const userSheetName = Object.keys(data).find(k => k.toLowerCase().includes('usuario') || k.toLowerCase().includes('user'));
    
    if (userSheetName) {
      console.log(`\n--- DATA EN LA HOJA: ${userSheetName} ---`);
      const rows = data[userSheetName];
      if (rows.length > 0) {
        console.log('Columnas (Headers):', Object.keys(rows[0]));
        console.log('Primera fila:', rows[0]);
        
        // Buscar al dueño para comparar
        const owner = rows.find(r => String(r.EmailUser || r.Email || r.email || '').toLowerCase().includes('hairoman28'));
        if (owner) {
            console.log('\nRegistro del dueño encontrado:', owner);
        } else {
            console.log('\nDueño NO encontrado en esta hoja.');
        }
      }
    } else {
      console.log('No se encontró ninguna hoja con nombre "usuario" o "user".');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectUsers();
