const https = require('https');
const fs = require('fs');
const path = require('path');

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));

console.log('🌧️ Starting Rainforest API scraper for Amazon US...');
console.log(`📊 Target: ${config.amazonConfig.dealsPerDay} deals under $${config.amazonConfig.priceRange.max}`);

function rainforestRequest(endpoint, params) {
  return new Promise((resolve, reject) => {
    const API_KEY = process.env.RAINFOREST_API_KEY;

    if (!API_KEY) {
      reject(new Error('RAINFOREST_API_KEY not found. Sign up at: https://www.rainforestapi.com/'));
      return;
    }

    const queryParams = new URLSearchParams({
      api_key: API_KEY,
      ...params
    });

    const options = {
      hostname: 'api.rainforestapi.com',
      path: `/request?${queryParams.toString()}`,
      method: 'GET'
    };

    console.log(`Calling: ${endpoint}...`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function scrapeAmazonUS() {
  try {
    const categories = [
      'electronics',
      'home-garden',
      'sporting-goods',
      'fashion',
      'beauty'
    ];

    let allProducts = [];

    for (const category of categories) {
      try {
        console.log(`\nFetching ${category} bestsellers...`);

        const response = await rainforestRequest('bestsellers', {
          type: 'bestsellers',
          url: `https://www.amazon.com/Best-Sellers-${category}/zgbs/${category}/`
        });

        if (response.bestsellers) {
          console.log(`  Found ${response.bestsellers.length} products`);
          allProducts = allProducts.concat(response.bestsellers.map(item => ({
            ...item,
            category: category
          })));
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  Error fetching ${category}:`, error.message);
      }
    }

    console.log(`\n📦 Total products scraped: ${allProducts.length}`);

    // Format deals
    const deals = allProducts
      .filter(item => {
        const price = item.price?.value || 0;
        return price > 0 && price <= config.amazonConfig.priceRange.max;
      })
      .slice(0, config.amazonConfig.dealsPerDay)
      .map(item => {
        const currentPrice = item.price?.value || 0;
        const originalPrice = item.list_price?.value || Math.floor(currentPrice * 1.35);

        return {
          id: item.asin,
          name: item.title || 'Product',
          url: `https://www.amazon.com/dp/${item.asin}?tag=${config.amazonConfig.affiliateTag}`,
          originalUrl: `https://www.amazon.com/dp/${item.asin}`,
          asin: item.asin,
          price: currentPrice,
          currency: '$',
          rating: item.rating || 0,
          reviewCount: item.ratings_total || 0,
          imageUrl: item.image,
          category: item.category || 'General',
          position: item.position || 0,
          scrapedAt: new Date().toISOString(),
          status: 'pending',
          originalPrice: originalPrice
        };
      });

    console.log(`✅ Filtered to ${deals.length} deals under $${config.amazonConfig.priceRange.max}`);

    // Save deals
    const dealsFile = path.join(__dirname, '../data/deals.json');
    fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));

    console.log(`💾 Saved ${deals.length} deals to deals.json`);
    console.log('✨ Scraping complete!');

    return deals;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  scrapeAmazonUS()
    .then(deals => {
      console.log('\n🎉 SUCCESS! Ready to post deals.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FAILED');
      process.exit(1);
    });
}

module.exports = { scrapeAmazonUS };
