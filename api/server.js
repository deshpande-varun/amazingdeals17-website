const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { scrapeAmazonDeals } = require('../scripts/scrape-deals');
const { preparePostForDeal } = require('../scripts/prepare-post');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/images', express.static('images'));

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));

// API Routes
app.get('/api/deals', (req, res) => {
  try {
    const deals = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/deals.json'), 'utf8'));
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load deals' });
  }
});

app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/scrape', async (req, res) => {
  try {
    console.log('🚀 Manual scrape triggered...');
    const deals = await scrapeAmazonDeals();
    res.json({ success: true, dealsCount: deals.length, deals });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prepare-post/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const postData = await preparePostForDeal(dealId);
    res.json({ success: true, post: postData });
  } catch (error) {
    console.error('Prepare post error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mark-posted/:dealId', (req, res) => {
  try {
    const { dealId } = req.params;

    // Load deals
    const dealsFile = path.join(__dirname, '../data/deals.json');
    let deals = JSON.parse(fs.readFileSync(dealsFile, 'utf8'));

    // Find and update deal
    const dealIndex = deals.findIndex(d => d.id === dealId || d.asin === dealId);
    if (dealIndex === -1) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = deals[dealIndex];
    deal.status = 'posted';
    deal.postedAt = new Date().toISOString();

    // Save updated deals
    fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));

    // Add to posted history
    const postedFile = path.join(__dirname, '../data/posted.json');
    let posted = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    posted.push(deal);
    fs.writeFileSync(postedFile, JSON.stringify(posted, null, 2));

    res.json({ success: true, deal });
  } catch (error) {
    console.error('Mark posted error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const deals = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/deals.json'), 'utf8'));
    const posted = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/posted.json'), 'utf8'));

    const stats = {
      totalDeals: deals.length,
      pendingDeals: deals.filter(d => d.status === 'pending').length,
      postedDeals: posted.length,
      lastScrape: deals.length > 0 ? deals[0].scrapedAt : null,
      avgPrice: deals.length > 0 ? (deals.reduce((sum, d) => sum + d.price, 0) / deals.length).toFixed(2) : 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Schedule automatic scraping
if (config.scrapeConfig.autoRun) {
  console.log(`⏰ Scheduled scraping: ${config.scrapeConfig.scheduleReadable}`);
  cron.schedule(config.scrapeConfig.schedule, async () => {
    console.log('🕒 Auto-scrape triggered by schedule...');
    try {
      await scrapeAmazonDeals();
      console.log('✅ Auto-scrape completed successfully');
    } catch (error) {
      console.error('❌ Auto-scrape failed:', error.message);
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Public site: http://localhost:${PORT}`);
  console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔧 Config: ${config.amazonConfig.dealsPerDay} deals, max $${config.amazonConfig.priceRange.max}`);
});
