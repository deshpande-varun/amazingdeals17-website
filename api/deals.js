const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dealsPath = path.join(process.cwd(), 'data', 'deals.json');
    const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(deals);
  } catch (error) {
    console.error('Error loading deals:', error);
    res.status(500).json({ error: 'Failed to load deals' });
  }
};
