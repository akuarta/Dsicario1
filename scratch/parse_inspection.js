const fs = require('fs');
try {
    const raw = fs.readFileSync('c:/Dsicario1/api_inspection_v3.json');
    let content = raw.toString('utf16le');
    if (content.startsWith('\uFEFF')) content = content.slice(1);
    const data = JSON.parse(content);
    if (data.Metodos_pagos) console.log('Metodos_pagos (ALL):', JSON.stringify(data.Metodos_pagos, null, 2));
} catch (e) {
    console.error('ERROR:', e.message);
}
