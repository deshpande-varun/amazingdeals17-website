const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // Read deals file from project root
    const dealsPath = path.join(__dirname, '..', 'data', 'deals.json');
    const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(deals);
  } catch (error) {
    console.error('Error loading deals:', error);
    res.status(500).json({
      error: 'Failed to load deals',
      message: error.message,
      path: path.join(__dirname, '..', 'data', 'deals.json')
    });
  }
};
