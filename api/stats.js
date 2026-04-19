const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dealsPath = path.join(__dirname, '..', 'data', 'deals.json');
    const postedPath = path.join(__dirname, '..', 'data', 'posted.json');

    const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'));
    const posted = JSON.parse(fs.readFileSync(postedPath, 'utf8'));

    const stats = {
      totalDeals: deals.length,
      pendingDeals: deals.filter(d => d.status === 'pending').length,
      postedDeals: posted.length,
      lastScrape: deals.length > 0 ? deals[0].scrapedAt : null,
      avgPrice: deals.length > 0 ? (deals.reduce((sum, d) => sum + d.price, 0) / deals.length).toFixed(2) : 0
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error loading stats:', error);
    res.status(500).json({ error: 'Failed to load stats', message: error.message });
  }
};
