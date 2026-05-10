/**
 * scripts/apply-gcs-cors.js
 * Applies CORS policy to Firebase Storage bucket using the service account
 * credentials already in .env — no gcloud login needed.
 *
 * Usage: node scripts/apply-gcs-cors.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');

// ── Parse service account ────────────────────────────────────────────────────
let sa;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try { sa = JSON.parse(raw); } catch { sa = JSON.parse(raw.replace(/\\n/g, '\n')); }
} catch (e) {
  console.error('❌ Could not parse FIREBASE_SERVICE_ACCOUNT:', e.message);
  process.exit(1);
}

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
if (!BUCKET) { console.error('❌ FIREBASE_STORAGE_BUCKET not set'); process.exit(1); }

const CORS_CONFIG = [
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

// ── Minimal JWT for service-account OAuth2 ───────────────────────────────────
const { createSign } = require('crypto');

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${payload}.${sig}`;
}

// ── Get access token ─────────────────────────────────────────────────────────
function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error(JSON.stringify(parsed)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Patch CORS on bucket ─────────────────────────────────────────────────────
function patchBucketCors(token, bucket, cors) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cors });
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${encodeURIComponent(bucket)}?fields=cors`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔑 Authenticating as ${sa.client_email}...`);
  const jwt   = makeJwt(sa);
  const token = await getAccessToken(jwt);
  console.log('   ✅ Access token obtained');

  console.log(`\n🌐 Applying CORS to gs://${BUCKET}...`);
  const result = await patchBucketCors(token, BUCKET, CORS_CONFIG);
  console.log('   ✅ Done:', JSON.stringify(result, null, 2));

  console.log('\n✅ CORS policy applied successfully!');
  console.log('   Origins allowed:', CORS_CONFIG[0].origin.join(', '));
})().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
