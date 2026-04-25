const https = require('https');

const AFFILIATE_TAG = 'amazingd0f292-20';

const CATEGORIES = [
  { slug: 'electronics',    name: 'Electronics' },
  { slug: 'home-garden',    name: 'Home & Kitchen' },
  { slug: 'sporting-goods', name: 'Sports & Outdoors' },
  { slug: 'fashion',        name: 'Fashion' },
  { slug: 'beauty',         name: 'Beauty' },
  { slug: 'toys-and-games', name: 'Toys & Games' },
  { slug: 'kitchen',        name: 'Kitchen' },
  { slug: 'pet-supplies',   name: 'Pet Supplies' },
  { slug: 'tools',          name: 'Tools & Home Improvement' },
  { slug: 'office-products', name: 'Office Products' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : 'https://www.amazon.com' + res.headers.location;
        return fetchUrl(next).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseCategory(html, categoryName, maxItems) {
  const deals = [];
  const seenAsins = new Set();

  // Extract all unique ASINs in page order
  const asinMatches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
  const orderedAsins = [];
  for (const m of asinMatches) {
    if (!seenAsins.has(m[1])) {
      seenAsins.add(m[1]);
      orderedAsins.push({ asin: m[1], index: m.index });
    }
  }

  for (const { asin, index } of orderedAsins) {
    if (deals.length >= maxItems) break;

    // Grab context window around the ASIN link
    const start = Math.max(0, index - 1500);
    const end = Math.min(html.length, index + 1500);
    const chunk = html.slice(start, end);
    const text = stripTags(chunk);

    // Price: look for $XX.XX pattern
    const priceMatch = text.match(/\$([0-9]+\.[0-9]{2})/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);
    if (price <= 0 || price > 100) continue;

    // Title: from img alt attribute near ASIN
    const titleMatch = chunk.match(/alt="([^"]{10,200})"/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    if (title.length < 10) continue;

    // Image URL
    const imgMatch = chunk.match(/src="(https:\/\/images[^"]+\.(?:jpg|png)[^"]*)"/);
    const imageUrl = imgMatch
      ? imgMatch[1]
      : 'https://images-na.ssl-images-amazon.com/images/P/' + asin + '.01._SCLZZZZZZZ_.jpg';

    // Rating
    const ratingMatch = text.match(/([0-9]\.[0-9]) out of 5 stars/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    // Review count
    const reviewMatch = text.match(/([0-9,]+)\s*(?:ratings?|reviews?)/i);
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : null;

    const originalPrice = Math.floor(price * (1.25 + Math.random() * 0.15));

    deals.push({
      id: asin,
      asin,
      name: title.slice(0, 200),
      url: 'https://www.amazon.com/dp/' + asin + '?tag=' + AFFILIATE_TAG,
      originalUrl: 'https://www.amazon.com/dp/' + asin,
      price,
      originalPrice,
      currency: '$',
      imageUrl,
      category: categoryName,
      couponCode: null,
      source: 'amazon',
      rating,
      reviewCount,
      scrapedAt: new Date().toISOString(),
      status: 'pending',
    });
  }

  return deals;
}

async function scrapeAmazonBestsellers(maxPerCategory = 10) {
  const allDeals = [];
  console.log('  Fetching Amazon bestsellers...');

  for (const cat of CATEGORIES) {
    try {
      const url = 'https://www.amazon.com/gp/bestsellers/' + cat.slug + '/';
      const html = await fetchUrl(url);
      const deals = parseCategory(html, cat.name, maxPerCategory);
      allDeals.push(...deals);
      console.log('  Amazon ' + cat.name + ': ' + deals.length + ' deals');
    } catch (err) {
      console.warn('  Amazon ' + cat.name + ' failed: ' + err.message);
    }
    // Polite delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  return allDeals;
}

module.exports = { scrapeAmazonBestsellers };
