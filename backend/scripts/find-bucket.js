/**
 * scripts/find-bucket.js
 * Lists all GCS buckets accessible to the service account
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');
const { createSign } = require('crypto');

let sa;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try { sa = JSON.parse(raw); } catch { sa = JSON.parse(raw.replace(/\\n/g, '\n')); }
} catch (e) { console.error('❌ SA parse failed:', e.message); process.exit(1); }

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg:'RS256', typ:'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  return `${header}.${payload}.${sig}`;
}

function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({ hostname:'oauth2.googleapis.com', path:'/token', method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'} }, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
        const p=JSON.parse(d); if(p.access_token) resolve(p.access_token); else reject(new Error(JSON.stringify(p)));
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

function listBuckets(token, projectId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b?project=${projectId}`,
      headers: { 'Authorization': `Bearer ${token}` },
    }, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
        if(res.statusCode===200) resolve(JSON.parse(d)); else reject(new Error(`HTTP ${res.statusCode}: ${d}`));
      });
    });
    req.on('error',reject); req.end();
  });
}

(async () => {
  const jwt   = makeJwt(sa);
  const token = await getAccessToken(jwt);
  console.log('✅ Token obtained, listing buckets for project:', sa.project_id);
  const result = await listBuckets(token, sa.project_id);
  const names = (result.items || []).map(b => b.name);
  console.log('Buckets:', names.length ? names : '(none found)');
})().catch(e => { console.error('❌', e.message); });
