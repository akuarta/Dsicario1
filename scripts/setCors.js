/**
 * Script one-time para configurar CORS en Firebase Storage
 * Ejecutar: node scripts/setCors.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Configuración usando la API key del proyecto (no service account)
// Usamos fetch directamente contra la Cloud Storage JSON API
const BUCKET = 'dsicario-cd723.firebasestorage.app';
const PROJECT_ID = 'dsicario-cd723';

const corsConfig = [
  {
    origin: [
      "http://localhost:8081",
      "http://localhost:8080",
      "http://localhost:19006",
      "http://localhost:*",
      "https://*.web.app",
      "https://*.firebaseapp.com"
    ],
    method: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    responseHeader: ["Content-Type", "Authorization", "Content-Length", "x-goog-resumable"],
    maxAgeSeconds: 3600
  }
];

async function setCors() {
  try {
    // Usamos gcloud storage via firebase-admin si hay service account
    // Si no, imprimimos instrucciones
    console.log('\n✅ Para aplicar CORS a tu bucket de Firebase Storage, ejecuta este comando en Google Cloud Shell:');
    console.log('\n  1. Ve a: https://console.cloud.google.com/cloudshell');
    console.log(`  2. Ejecuta:`);
    console.log(`\n     cat > /tmp/cors.json << 'EOF'`);
    console.log(JSON.stringify(corsConfig, null, 2));
    console.log(`EOF`);
    console.log(`\n     gcloud storage buckets update gs://${BUCKET} --cors-file=/tmp/cors.json`);
    console.log('\n  O alternativamente desde Firebase Console:');
    console.log('  https://console.firebase.google.com/project/dsicario-cd723/storage');
  } catch(e) {
    console.error(e);
  }
}

setCors();
