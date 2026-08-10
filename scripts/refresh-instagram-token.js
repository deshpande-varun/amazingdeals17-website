// Re-exchanges the current long-lived Instagram token for a fresh 60-day token.
// A long-lived user token can be exchanged again before it expires, which rolls
// the expiry forward. Run every ~50 days so the token never actually lapses.
//
// Prints the new token to stdout as: NEW_TOKEN=<token>
// The workflow captures this and writes it back to the INSTAGRAM_ACCESS_TOKEN
// secret via `gh secret set`.

const https = require('https');

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const CURRENT_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'graph.facebook.com', path: urlPath }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  if (!APP_ID || !APP_SECRET || !CURRENT_TOKEN) {
    console.error('Missing one of INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / INSTAGRAM_ACCESS_TOKEN');
    process.exit(1);
  }

  const res = await get(
    `/v19.0/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(APP_ID)}` +
    `&client_secret=${encodeURIComponent(APP_SECRET)}` +
    `&fb_exchange_token=${encodeURIComponent(CURRENT_TOKEN)}`
  );

  if (res.error || !res.access_token) {
    console.error(`Refresh failed: ${res.error ? res.error.message : 'no access_token returned'}`);
    process.exit(1);
  }

  const days = res.expires_in ? Math.round(res.expires_in / 86400) : '?';
  console.error(`✅ Refreshed. New token valid ~${days} days.`);

  // Emit for the workflow to capture.
  console.log(`NEW_TOKEN=${res.access_token}`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
