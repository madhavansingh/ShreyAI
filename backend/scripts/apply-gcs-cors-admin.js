/**
 * scripts/apply-gcs-cors-admin.js
 * Uses the same Firebase Admin SDK the backend already uses to apply CORS.
 * Run from: backend/  →  node scripts/apply-gcs-cors-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const admin = require('firebase-admin');

// ── Init Firebase Admin (same as config/firebase.js) ────────────────────────
if (!admin.apps.length) {
  let sa;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try { sa = JSON.parse(raw); } catch { sa = JSON.parse(raw.replace(/\\n/g, '\n')); }
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const CORS = [
  {
    origin: [
      'https://roviq.xyz',
      'https://*.roviq.xyz',
      'http://localhost:5173',
      'http://localhost:4173',
    ],
    method: ['GET', 'HEAD'],
    responseHeader: ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
    maxAgeSeconds: 3600,
  },
];

(async () => {
  const bucket = admin.storage().bucket();
  console.log(`\n🌐 Applying CORS to bucket: ${bucket.name}`);

  await bucket.setCorsConfiguration(CORS);
  console.log('✅ CORS applied successfully!\n');
  console.log('Allowed origins:', CORS[0].origin);

  // Verify
  const [meta] = await bucket.getMetadata();
  console.log('\n📋 Current CORS config:');
  console.log(JSON.stringify(meta.cors || [], null, 2));

  process.exit(0);
})().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
