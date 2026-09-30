const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'config', 'firebaseServiceAccount.json'));

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount)
});

const db = getFirestore(app);

async function updateVersion({ version, downloadUrl, releaseNotes, forceUpdate = false }) {
  await db.doc('app_config/version_control').set({
    latest_version: version,
    force_update: forceUpdate,
    download_url: downloadUrl,
    release_notes: releaseNotes || ''
  }, { merge: true });
  console.log(`[Firestore] version_control actualizado a v${version}`);
}

// Si se ejecuta directamente con node updateFirestore.js <version> <url> <notes>
if (require.main === module) {
  const [version, url, ...notesParts] = process.argv.slice(2);
  const notes = notesParts.join(' ');
  if (!version || !url) {
    console.error('Uso: node updateFirestore.js <version> <download_url> [release_notes]');
    process.exit(1);
  }
  updateVersion({ version, downloadUrl: url, releaseNotes: notes })
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = { updateVersion };
