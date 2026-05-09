const admin = require('firebase-admin');

// ── Guard against double-init ──────────────────────────
if (!admin.apps.length) {
  let serviceAccount;

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is empty');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', err.message);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log('✅ Firebase Admin initialized');
}

// ── Exports — use lazy getters so nothing crashes at load time ──
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// bucket is a getter — resolved only when first used
const getBucket = () => admin.storage().bucket();

module.exports = { db, getBucket, admin };
