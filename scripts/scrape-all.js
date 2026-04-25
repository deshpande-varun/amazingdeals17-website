const fs = require('fs');
const path = require('path');

const { scrapeAmazonBestsellers } = require('./scrapers/amazon-bestsellers');
const { scrapeSlickdeals } = require('./scrapers/slickdeals');
const { scrapeGetMattsDeals } = require('./scrapers/getmattsdeals');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));
const TARGET = 100;
const MAX_PRICE = config.amazonConfig.priceRange.max || 100;
const AFFILIATE_TAG = config.amazonConfig.affiliateTag;

console.log('Starting deal scraper — target: ' + TARGET + ' deals under $' + MAX_PRICE);

async function runAll() {
  // Amazon runs first (sequential, polite delays built in), then deal sites in parallel
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

  const allDeals = [...amazonDeals];
  const labels = ['Slickdeals', 'GetMattsDeals'];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(labels[i] + ': ' + r.value.length + ' deals');
      allDeals.push(...r.value);
    } else {
      console.warn(labels[i] + ' failed: ' + r.reason.message);
    }
  });

  // Deduplicate by ASIN — first seen wins (Amazon RSS has priority)
  const seen = new Set();
  const deduped = [];
  for (const deal of allDeals) {
    if (deal.asin && !seen.has(deal.asin)) {
      seen.add(deal.asin);
      deduped.push(deal);
    }
  }

  // Filter price range and ensure affiliate tag is on every URL
  const filtered = deduped
    .filter(d => d.price > 0 && d.price <= MAX_PRICE)
    .map(d => ({
      ...d,
      url: 'https://www.amazon.com/dp/' + d.asin + '?tag=' + AFFILIATE_TAG,
    }))
    .slice(0, TARGET);

  console.log('Total after dedupe + filter: ' + filtered.length + ' deals');

  const dealsFile = path.join(__dirname, '../data/deals.json');
  fs.writeFileSync(dealsFile, JSON.stringify(filtered, null, 2));
  console.log('Saved ' + filtered.length + ' deals to deals.json');

  return filtered;
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
