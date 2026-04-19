const fs = require('fs');
const path = require('path');
const https = require('https');

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));

console.log('🚀 Starting Amazon deals scraper...');
console.log(`📊 Target: ${config.amazonConfig.dealsPerDay} deals under $${config.amazonConfig.priceRange.max}`);

async function scrapeAmazonDeals() {
  try {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) {
      throw new Error('APIFY_TOKEN environment variable is required');
    }

    // Build Apify input
    const apifyInput = {
      categoryUrls: [
        "https://www.amazon.com/Best-Sellers/zgbs/",
        "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/",
        "https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden/",
        "https://www.amazon.com/Best-Sellers-Fashion/zgbs/fashion/",
        "https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty/",
        "https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods/"
      ],
      maxItemsPerStartUrl: Math.ceil(config.amazonConfig.dealsPerDay / 6),
      depthOfCrawl: 1
    };

    console.log('🔍 Scraping Amazon bestsellers...');

    // Start Apify actor run
    const runResponse = await apifyRequest('POST', `/v2/acts/junglee~amazon-bestsellers/runs?token=${APIFY_TOKEN}`, apifyInput);
    const runId = runResponse.data.id;
    const datasetId = runResponse.data.defaultDatasetId;

    console.log(`Run ID: ${runId}`);
    console.log(`Dataset ID: ${datasetId}`);

    // Wait for run to complete
    let status = 'RUNNING';
    while (status === 'RUNNING') {
      await sleep(5000);
      const statusResponse = await apifyRequest('GET', `/v2/acts/junglee~amazon-bestsellers/runs/${runId}?token=${APIFY_TOKEN}`);
      status = statusResponse.data.status;
      console.log(`Status: ${status}`);
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Actor run ${status}`);
    }

    // Get results
    const datasetResponse = await apifyRequest('GET', `/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
    const rawDeals = datasetResponse;

    // Save raw data
    const outputFile = path.join(__dirname, '../data/raw_deals.json');
    fs.writeFileSync(outputFile, JSON.stringify(rawDeals, null, 2));

    console.log(`📦 Found ${rawDeals.length} products from Amazon`);

    // Filter by price range and format
    const filteredDeals = rawDeals
      .filter(item => {
        if (!item.price || !item.price.value) return false;
        const price = item.price.value;
        return price >= config.amazonConfig.priceRange.min &&
               price <= config.amazonConfig.priceRange.max;
      })
      .slice(0, config.amazonConfig.dealsPerDay)
      .map(item => {
        const deal = {
          id: item.asin,
          name: item.name,
          url: `${item.url}?tag=${config.amazonConfig.affiliateTag}`,
          originalUrl: item.url,
          asin: item.asin,
          price: item.price.value,
          currency: item.price.currency,
          rating: item.stars,
          reviewCount: item.reviewsCount,
          imageUrl: item.thumbnailUrl,
          category: item.categoryName,
          position: item.position,
          scrapedAt: new Date().toISOString(),
          status: 'pending'
        };

        // Add original price if available (check various possible field names)
        if (item.beforeDiscountPrice?.value && item.beforeDiscountPrice.value > item.price.value) {
          deal.originalPrice = item.beforeDiscountPrice.value;
        } else if (item.listPrice?.value && item.listPrice.value > item.price.value) {
          deal.originalPrice = item.listPrice.value;
        } else if (item.wasPrice?.value && item.wasPrice.value > item.price.value) {
          deal.originalPrice = item.wasPrice.value;
        } else {
          // Add estimated original price for display (20-35% discount)
          deal.originalPrice = item.price.value < 50
            ? Math.floor(item.price.value * 1.35)
            : Math.floor(item.price.value * 1.3);
        }

        return deal;
      });

    console.log(`✅ Filtered to ${filteredDeals.length} deals under $${config.amazonConfig.priceRange.max}`);

    // Save filtered deals
    const dealsFile = path.join(__dirname, '../data/deals.json');
    fs.writeFileSync(dealsFile, JSON.stringify(filteredDeals, null, 2));

    console.log(`💾 Saved ${filteredDeals.length} deals to deals.json`);
    console.log('✨ Scraping complete!');

    return filteredDeals;

  } catch (error) {
    console.error('❌ Error scraping deals:', error.message);
    throw error;
  }
}

// Helper function to make Apify API requests
function apifyRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.apify.com',
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Helper sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  scrapeAmazonDeals()
    .then(deals => {
      console.log('\n🎉 SUCCESS! Ready to post deals.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { scrapeAmazonDeals };
