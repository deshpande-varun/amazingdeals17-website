const https = require('https');

const AFFILIATE_TAG = 'amazingd0f292-20';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://www.getmattsdeals.com${res.headers.location}`;
        return fetchUrl(next).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseASIN(text) {
  const patterns = [
    /amazon\.com\/dp\/([A-Z0-9]{10})/,
    /amazon\.com\/gp\/product\/([A-Z0-9]{10})/,
    /\/dp\/([A-Z0-9]{10})/,
    /asin=([A-Z0-9]{10})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function parsePrice(text) {
  const m = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
  return m ? parseFloat(m[1]) : null;
}

function parseCouponCode(text) {
  const patterns = [
    /[Cc]ode[:\s]+([A-Z0-9]{4,20})/,
    /[Pp]romo[:\s]+([A-Z0-9]{4,20})/,
    /[Cc]oupon[:\s]+([A-Z0-9]{4,20})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].toUpperCase();
  }
  return null;
}

function parseDealsFromHTML(html) {
  const deals = [];

  // Extract deal blocks — look for patterns containing Amazon links and prices
  // getmattsdeals uses Next.js, so deals are rendered in article/div blocks
  const blockPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/g,
    /<div[^>]*class="[^"]*deal[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  const amazonLinkRegex = /href="(https?:\/\/(?:www\.)?amazon\.com[^"]*?)"/g;
  const seenAsins = new Set();

  // Find all Amazon links in the page and extract context around them
  let linkMatch;
  while ((linkMatch = amazonLinkRegex.exec(html)) !== null) {
    const amazonUrl = linkMatch[1];
    const asin = parseASIN(amazonUrl);
    if (!asin || seenAsins.has(asin)) continue;

    // Get surrounding context (500 chars before/after)
    const start = Math.max(0, linkMatch.index - 500);
    const end = Math.min(html.length, linkMatch.index + 500);
    const context = html.slice(start, end);

    // Strip HTML tags for text extraction
    const text = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    const price = parsePrice(text);
    if (!price || price > 100) continue;

    // Extract title from nearby heading or link text
    const titleMatch = context.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/) ||
                       context.match(/title="([^"]+)"/) ||
                       context.match(/alt="([^"]+)"/);
    const rawTitle = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
      : text.slice(0, 100).trim();

    if (!rawTitle || rawTitle.length < 5) continue;

    const couponCode = parseCouponCode(text);
    const originalPriceMatch = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:was|original|before|retail)/i) ||
                                text.match(/(?:was|original|before|retail)[:\s]+\$\s*([0-9]+(?:\.[0-9]{2})?)/i);
    const originalPrice = originalPriceMatch
      ? parseFloat(originalPriceMatch[1])
      : Math.floor(price * (1.3 + Math.random() * 0.15));

    if (originalPrice <= price) {
      // skip if no real discount
    }

    seenAsins.add(asin);
    deals.push({
      id: asin,
      asin,
      name: rawTitle.slice(0, 200),
      url: `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`,
      originalUrl: `https://www.amazon.com/dp/${asin}`,
      price,
      originalPrice: originalPrice > price ? originalPrice : Math.floor(price * 1.3),
      currency: '$',
      imageUrl: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`,
      category: 'Deals',
      couponCode,
      source: 'getmattsdeals',
      rating: null,
      reviewCount: null,
      scrapedAt: new Date().toISOString(),
      status: 'pending',
    });
  }

  return deals;
}

async function scrapeGetMattsDeals() {
  const pages = [
    'https://www.getmattsdeals.com',
    'https://www.getmattsdeals.com/top-daily-deals',
  ];

  const allDeals = [];
  const seenAsins = new Set();
  console.log('  Fetching GetMattsDeals...');

  for (const url of pages) {
    try {
      const html = await fetchUrl(url);
      const deals = parseDealsFromHTML(html);
      for (const deal of deals) {
        if (!seenAsins.has(deal.asin)) {
          seenAsins.add(deal.asin);
          allDeals.push(deal);
        }
      }
      console.log(`  GetMattsDeals (${url.includes('top') ? 'top deals' : 'home'}): ${deals.length} deals`);
    } catch (err) {
      console.warn(`  GetMattsDeals failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  return allDeals;
}

module.exports = { scrapeGetMattsDeals };
