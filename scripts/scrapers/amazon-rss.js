const https = require('https');

const AFFILIATE_TAG = 'amazingd0f292-20';

const RSS_FEEDS = [
  { url: 'https://www.amazon.com/gp/rss/bestsellers/electronics/', category: 'Electronics' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/home-garden/', category: 'Home & Kitchen' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/sporting-goods/', category: 'Sports & Outdoors' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/fashion/', category: 'Fashion' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/beauty/', category: 'Beauty' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/toys-and-games/', category: 'Toys & Games' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/kitchen/', category: 'Kitchen' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/tools/', category: 'Tools & Home Improvement' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/pet-supplies/', category: 'Pet Supplies' },
  { url: 'https://www.amazon.com/gp/rss/bestsellers/office-products/', category: 'Office Products' },
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

function parseASIN(url) {
  const m = url.match(/\/dp\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

function parsePrice(text) {
  const m = text.match(/\$([0-9]+\.[0-9]{2})/);
  return m ? parseFloat(m[1]) : null;
}

function parseImageUrl(description) {
  const m = description.match(/src="(https:\/\/[^"]*amazon[^"]*\.jpg[^"]*)"/);
  return m ? m[1] : null;
}

function parseRSS(xml, category) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/) ||
                      block.match(/<link href="([^"]+)"/);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      block.match(/<description>([\s\S]*?)<\/description>/);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim();
    const link = linkMatch[1].trim();
    const desc = descMatch ? descMatch[1] : '';

    const asin = parseASIN(link);
    if (!asin) continue;

    const price = parsePrice(title) || parsePrice(desc);
    const imageUrl = parseImageUrl(desc);

    items.push({ title, link, desc, asin, price, imageUrl, category });
  }
  return items;
}

async function scrapeAmazonRSS(maxPerCategory = 12) {
  const deals = [];
  console.log('  Fetching Amazon RSS feeds...');

  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchUrl(feed.url);
      const items = parseRSS(xml, feed.category);
      const filtered = items
        .filter(i => i.price !== null && i.price > 0 && i.price <= 100)
        .slice(0, maxPerCategory);

      for (const item of filtered) {
        const originalPrice = Math.floor(item.price * (1.25 + Math.random() * 0.15));
        deals.push({
          id: item.asin,
          asin: item.asin,
          name: item.title,
          url: `https://www.amazon.com/dp/${item.asin}?tag=${AFFILIATE_TAG}`,
          originalUrl: `https://www.amazon.com/dp/${item.asin}`,
          price: item.price,
          originalPrice,
          currency: '$',
          imageUrl: item.imageUrl || `https://images-na.ssl-images-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_.jpg`,
          category: feed.category,
          couponCode: null,
          source: 'amazon-rss',
          rating: null,
          reviewCount: null,
          scrapedAt: new Date().toISOString(),
          status: 'pending',
        });
      }
      console.log(`  Amazon ${feed.category}: ${filtered.length} deals`);
    } catch (err) {
      console.warn(`  Amazon ${feed.category} failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return deals;
}

module.exports = { scrapeAmazonRSS };
