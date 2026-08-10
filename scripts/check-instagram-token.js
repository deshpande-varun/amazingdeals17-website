// Verifies the Instagram Graph API access token is still valid.
// Exits 0 if valid, 1 if invalid/expired. Used by the token-health-check workflow
// to alert (via a GitHub issue) BEFORE posting silently breaks for days.

const https = require('https');

const INSTAGRAM_ACCOUNT_ID = '17841428043117890';
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'graph.facebook.com', path: urlPath }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('INSTAGRAM_ACCESS_TOKEN is not set.');
    process.exit(1);
  }

  // Cheapest authenticated call: fetch the IG account id back.
  const path = `/v19.0/${INSTAGRAM_ACCOUNT_ID}?fields=id,username&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  const res = await get(path);

  if (res.error) {
    console.error(`❌ Token INVALID: ${res.error.message} (code: ${res.error.code})`);
    process.exit(1);
  }

  console.log(`✅ Token valid. Connected to @${res.username || res.id}`);

  // If the token has an expiry, warn when it's within 7 days.
  const debug = await get(
    `/v19.0/debug_token?input_token=${encodeURIComponent(ACCESS_TOKEN)}&access_token=${encodeURIComponent(ACCESS_TOKEN)}`
  );
  const expiresAt = debug?.data?.expires_at; // unix seconds; 0 = never expires
  if (expiresAt && expiresAt > 0) {
    const daysLeft = Math.round((expiresAt * 1000 - Date.now()) / 86400000);
    console.log(`   Token expires in ~${daysLeft} day(s).`);
    if (daysLeft <= 7) {
      console.error(`⚠️  Token expires in ${daysLeft} day(s) — renew it soon.`);
      process.exit(1);
    }
  } else {
    console.log('   Token does not expire (permanent Page token). 🎉');
  }
}

main().catch((e) => {
  console.error(`Health check error: ${e.message}`);
  process.exit(1);
});
