const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'data', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(config);
  } catch (error) {
    console.error('Error loading config:', error);
    res.status(500).json({ error: 'Failed to load config', message: error.message });
  }
};
