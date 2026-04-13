const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));

console.log('🚀 Starting Amazon deals scraper...');
console.log(`📊 Target: ${config.amazonConfig.dealsPerDay} deals under $${config.amazonConfig.priceRange.max}`);

async function scrapeAmazonDeals() {
  try {
    const apifyScriptPath = '/Users/varun.deshpande/.claude/skills/apify-ultimate-scraper/reference/scripts/run_actor.js';
    const outputFile = path.join(__dirname, '../data/raw_deals.json');

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

    // Run Apify scraper
    const command = `node --env-file=/Users/varun.deshpande/.env ${apifyScriptPath} --actor "junglee/amazon-bestsellers" --input '${JSON.stringify(apifyInput)}' --format json --output ${outputFile}`;

    execSync(command, { stdio: 'inherit' });

    // Load and filter results
    const rawDeals = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
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
      .map(item => ({
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
      }));

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
