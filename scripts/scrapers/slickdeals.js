const https = require('https');

const AFFILIATE_TAG = 'amazingd0f292-20';

const RSS_URLS = [
  'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1',
  'https://slickdeals.net/newsearch.php?mode=popdeals&searcharea=deals&searchin=first&rss=1',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseASIN(text) {
  const m = text.match(/\/dp\/([A-Z0-9]{10})/) ||
            text.match(/\/gp\/product\/([A-Z0-9]{10})/) ||
            text.match(/asin=([A-Z0-9]{10})/i);
  return m ? m[1] : null;
}

function parsePrice(text) {
  const m = text.match(/\$([0-9]+\.[0-9]{2})/);
  return m ? parseFloat(m[1]) : null;
}

function parseCouponCode(text) {
  const patterns = [
    /(?:code|coupon|promo)[:\s]+([A-Z0-9]{4,20})/i,
    /use\s+code[:\s]+([A-Z0-9]{4,20})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].toUpperCase();
  }
  return null;
}

function isAmazonDeal(text) {
  return /amazon\.com/i.test(text) || /\bamazon\b/i.test(text);
}

function parseRSS(xml) {
  const deals = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       block.match(/<title>([\s\S]*?)<\/title>/);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      block.match(/<description>([\s\S]*?)<\/description>/);
    const contentMatch = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);

    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const desc = descMatch ? descMatch[1] : '';
    const content = contentMatch ? contentMatch[1] : '';
    const fullText = title + ' ' + desc + ' ' + content;

    if (!isAmazonDeal(fullText)) continue;

    const price = parsePrice(title) || parsePrice(desc);
    if (!price || price > 100) continue;

    const asin = parseASIN(fullText);
    if (!asin) continue;

    const couponCode = parseCouponCode(fullText);
    const originalPrice = Math.floor(price * (1.25 + Math.random() * 0.2));

    deals.push({
      id: asin,
      asin,
      name: title.replace(/^\$[\d.]+ \| /, '').replace(/\s+\$[\d.]+$/, '').trim(),
      url: 'https://www.amazon.com/dp/' + asin + '?tag=' + AFFILIATE_TAG,
      originalUrl: 'https://www.amazon.com/dp/' + asin,
      price,
      originalPrice,
      currency: '$',
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/P/' + asin + '.01._SCLZZZZZZZ_.jpg',
      category: 'Deals',
      couponCode,
      source: 'slickdeals',
      rating: null,
      reviewCount: null,
      scrapedAt: new Date().toISOString(),
      status: 'pending',
    });
  }
  return deals;
}

async function scrapeSlickdeals() {
  const allDeals = [];
  const seenAsins = new Set();
  console.log('  Fetching Slickdeals RSS feeds...');

  for (const url of RSS_URLS) {
    try {
      const xml = await fetchUrl(url);
      const deals = parseRSS(xml);
      for (const deal of deals) {
        if (!seenAsins.has(deal.asin)) {
          seenAsins.add(deal.asin);
          allDeals.push(deal);
        }
      }
      const label = url.includes('popdeals') ? 'popular' : 'frontpage';
      console.log('  Slickdeals (' + label + '): ' + deals.length + ' Amazon deals');
    } catch (err) {
      console.warn('  Slickdeals feed failed: ' + err.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return allDeals;
}

module.exports = { scrapeSlickdeals };
