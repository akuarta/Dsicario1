
const fetch = require('node-fetch');

const URL = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec?sheet=pedidos';

async function finalReveal() {
    try {
        const res = await fetch(URL);
        const json = await res.json();
        const data = json.data || json;

        console.log('\n=============================================================');
        console.log('📊 REPORTE DE MAPEO - HOJA "PEDIDOS"');
        console.log('=============================================================\n');

        if (!Array.isArray(data) || data.length === 0) {
            console.log('⚠️ No hay pedidos registrados en la hoja actualmente.');
            return;
        }

        // Solo mostramos los últimos 5 para no saturar, pero de forma completa
        const lastOrders = data.filter(o => o.ID_Pedido || o.id_pedido).slice(-5);

        lastOrders.forEach((o, i) => {
            console.log(`Pedido [${i + 1}]`);
            console.log(`   ├─ ID Real en JSON : "${o.ID_Pedido || o.id_pedido}"`);
            console.log(`   ├─ Cliente         : "${o.Cliente || o.cliente}"`);
            console.log(`   ├─ Estado Actual   : "${o.Estado || o.estado}"`);
            console.log(`   ├─ Total           : RD$ ${o.Total || o.total}`);
            
            const rawItems = o.Pedido_Items || o.pedido_items;
            console.log(`   └─ Pedido_Items (CELDA):`);
            
            if (rawItems && typeof rawItems === 'string' && rawItems.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(rawItems);
                    parsed.forEach(item => {
                        console.log(`      • ${item.cantidad || 1}x ${item.nombre || 'Producto'}${item.notas ? ' ['+item.notas+']' : ''}`);
                    });
                } catch(e) {
                    console.log(`      ⚠️ (Texto plano detectado): "${rawItems}"`);
                }
            } else {
                console.log(`      ⚠️ (Texto plano detectado): "${rawItems || 'Vacio'}"`);
            }
            console.log('─────────────────────────────────────────────────────────────');
        });

        console.log('\n✅ Este es el mapeo que la App procesa cada 30 segundos.');
        console.log('=============================================================\n');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

finalReveal();
