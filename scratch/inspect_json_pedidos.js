

const URL = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec?sheet=pedidos';

async function inspectPedidos() {
    console.log('📡 Conectando a Google Sheets (pedidos)...');
    try {
        const response = await fetch(URL);
        const data = await response.json();
        
        let rows = [];
        if (data.pedidos) rows = data.pedidos;
        else if (data.data) rows = data.data;
        else if (Array.isArray(data)) rows = data;

        if (rows.length > 0) {
            console.log('\n✅ ¡Datos recibidos!');
            console.log('--- ESTRUCTURA DE CABECERA ---');
            console.log(Object.keys(rows[0]));
            
            const rawItems = rows[0].Pedido_Items || rows[0].pedido_items;
            if (rawItems) {
                console.log('\n📦 CONTENIDO DE PEDIDO_ITEMS:');
                try {
                    const parsedItems = JSON.parse(rawItems);
                    console.log(parsedItems);
                    if (parsedItems.length > 0) {
                        console.log('\n🔍 CLAVES DENTRO DE CADA PRODUCTO:');
                        console.log(Object.keys(parsedItems[0]));
                    }
                } catch (e) {
                    console.log('⚠️ No es un JSON válido:', rawItems);
                }
            }
            console.log('-----------------------------------------------');
        } else {
            console.log('\n⚠️ La hoja de pedidos parece estar vacía.');
        }
    } catch (e) {
        console.error('❌ Error al conectar:', e.message);
    }
}

inspectPedidos();
