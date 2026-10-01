/**
 * convert-assets.js
 * Convierte todos los .jpeg/.jpg de assets/ a .png y reemplaza los existentes.
 * Ejecutar: node convert-assets.js (desde d:\Dsicario1)
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');

// Mapa de conversiones: jpeg nuevo → png de destino (reemplaza)
const CONVERSIONS = [
  { src: 'header.jpeg',      dst: 'header.png' },
  { src: 'header_dark.jpeg', dst: 'header_dark.png' },
  { src: 'logo.jpeg',        dst: 'logo.png' },
  { src: 'logo_dark.jpeg',   dst: 'logo_dark.png' },
  { src: 'icon.jpeg',        dst: 'icon.png' },
  { src: 'splash.jpeg',      dst: 'splash.png' },
];

// En React Native / Expo, PNG y JPEG son solo contenedores —
// podemos hacer la conversión correcta con sharp si está disponible,
// o simplemente renombrar/copiar si el contenido ya es válido como PNG.
// Usamos sharp para una conversión real.

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  sharp no instalado. Instalando...');
  const { execSync } = require('child_process');
  execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: __dirname });
  sharp = require('sharp');
}

async function convertAll() {
  let ok = 0;
  let fail = 0;

  for (const { src, dst } of CONVERSIONS) {
    const srcPath = path.join(ASSETS_DIR, src);
    const dstPath = path.join(ASSETS_DIR, dst);

    if (!fs.existsSync(srcPath)) {
      console.log(`⏭  Saltando (no existe): ${src}`);
      continue;
    }

    try {
      // Backup del PNG anterior
      if (fs.existsSync(dstPath)) {
        fs.copyFileSync(dstPath, dstPath + '.bak');
        console.log(`   💾 Backup: ${dst}.bak`);
      }

      // Conversión JPEG → PNG real
      await sharp(srcPath).png({ quality: 100 }).toFile(dstPath);
      console.log(`✅ ${src}  →  ${dst}`);
      ok++;
    } catch (err) {
      console.error(`❌ Error convirtiendo ${src}:`, err.message);
      fail++;
    }
  }

  console.log(`\n🎨 Conversión completa: ${ok} OK · ${fail} errores`);
  console.log('💡 Los .bak son los PNG anteriores, puedes borrarlos si todo se ve bien.');
}

convertAll().catch(console.error);
