
const fetch = require('node-fetch');

const URL = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec'; // Sin parámetros para traer TODO

async function scanEverything() {
    try {
        console.log('📡 Escaneando todas las hojas de tu Google Sheets...\n');
        const res = await fetch(URL);
        const json = await res.json();
        
        const sheetNames = Object.keys(json);
        console.log(`✅ Se encontraron ${sheetNames.length} hojas: [${sheetNames.join(', ')}]\n`);

        sheetNames.forEach(name => {
            console.log(`--- 📄 HOJA: ${name.toUpperCase()} ---`);
            const rows = json[name];
            if (rows && rows.length > 0) {
                console.log(`   Columnas detectadas: [${Object.keys(rows[0]).join(', ')}]`);
                console.log(`   Ejemplo de la primera fila:`);
                console.log(JSON.stringify(rows[0], null, 2).split('\n').map(l => '      ' + l).join('\n'));
            } else {
                console.log('   (Hoja vacía o sin datos)');
            }
            console.log('---------------------------------------------------\n');
        });

    } catch (e) {
        console.error('❌ Error en el escaneo:', e.message);
    }
}

scanEverything();
