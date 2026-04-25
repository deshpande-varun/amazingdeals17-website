const fs = require('fs');
const path = require('path');

const { scrapeAmazonBestsellers } = require('./scrapers/amazon-bestsellers');
const { scrapeSlickdeals } = require('./scrapers/slickdeals');
const { scrapeGetMattsDeals } = require('./scrapers/getmattsdeals');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));
const MAX_TOTAL = 1000;
const MAX_PRICE = config.amazonConfig.priceRange.max || 100;
const AFFILIATE_TAG = config.amazonConfig.affiliateTag;

console.log('Starting deal scraper — cap: ' + MAX_TOTAL + ' deals under $' + MAX_PRICE);

async function runAll() {
  // Load existing accumulated deals
  const dealsFile = path.join(__dirname, '../data/deals.json');
  let existingDeals = [];
  if (fs.existsSync(dealsFile)) {
    try {
      const raw = fs.readFileSync(dealsFile, 'utf8');
      existingDeals = JSON.parse(raw);
      console.log('Loaded ' + existingDeals.length + ' existing deals');
    } catch (e) {
      console.warn('Could not parse existing deals.json, starting fresh');
    }
  }

  // Scrape today's deals — Amazon first (has built-in polite delays), then others in parallel
  let amazonDeals = [];
  try {
    amazonDeals = await scrapeAmazonBestsellers(10);
  } catch (err) {
    console.warn('Amazon scraper failed: ' + err.message);
  }

  const results = await Promise.allSettled([
    scrapeSlickdeals(),
    scrapeGetMattsDeals(),
  ]);

  const todayRaw = [...amazonDeals];
  const labels = ['Slickdeals', 'GetMattsDeals'];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(labels[i] + ': ' + r.value.length + ' deals');
      todayRaw.push(...r.value);
    } else {
      console.warn(labels[i] + ' failed: ' + r.reason.message);
    }
  });

  // Deduplicate today's batch and apply filters
  const seenToday = new Set();
  const todayDeals = [];
  for (const deal of todayRaw) {
    if (!deal.asin || seenToday.has(deal.asin)) continue;
    if (!deal.price || deal.price <= 0 || deal.price > MAX_PRICE) continue;
    seenToday.add(deal.asin);
    todayDeals.push({
      ...deal,
      url: 'https://www.amazon.com/dp/' + deal.asin + '?tag=' + AFFILIATE_TAG,
    });
  }

  console.log('New deals today: ' + todayDeals.length);

  // Remove from existing any ASINs we're refreshing today, then prepend today's deals.
  // If over cap, drop the oldest from the tail.
  const existingFiltered = existingDeals.filter(d => !seenToday.has(d.asin));
  const merged = [...todayDeals, ...existingFiltered].slice(0, MAX_TOTAL);

  console.log('Total after merge: ' + merged.length + ' deals (dropped ' +
    Math.max(0, todayDeals.length + existingFiltered.length - MAX_TOTAL) + ' oldest)');

  fs.writeFileSync(dealsFile, JSON.stringify(merged, null, 2));
  console.log('Saved ' + merged.length + ' deals to deals.json');

  return merged;
}

if (require.main === module) {
  runAll()
    .then(deals => {
      console.log('Done. ' + deals.length + ' deals ready.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { runAll };
