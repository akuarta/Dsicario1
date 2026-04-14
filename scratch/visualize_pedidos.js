
const fetch = require('node-fetch');

const URL = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec?sheet=pedidos';

async function showMeEverything() {
    try {
        console.log('📡 Pidiendo datos a Google Sheets...');
        const res = await fetch(URL);
        const json = await res.json();
        
        console.log('\n📦 --- UNIVERSON JSON (LO QUE LLEGA DE LA API) ---');
        console.log(JSON.stringify(json, null, 2)); // Imprime TODO el JSON con espacios
        console.log('\n---------------------------------------------------');

        let rows = json.data || json.pedidos || json;
        if (!Array.isArray(rows)) {
            console.log('⚠️ Los datos no vinieron como una lista.');
            return;
        }

        console.log(`\n📋 ---MAPEANDO ${rows.length} FILA(S) DETECTADAS ---`);
        rows.forEach((row, i) => {
            console.log(`\n[FILA ${i + 1}]`);
            Object.keys(row).forEach(key => {
                console.log(`   ${key}: ${JSON.stringify(row[key])}`);
            });
        });
        
        console.log('\n================ FIN DEL MAPEO ================');
    } catch (e) {
        console.error('❌ Error al obtener datos:', e.message);
    }
}

showMeEverything();
