import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function handler(req, res) {
  try {
    const dealsPath = join(__dirname, '..', 'data', 'deals.json');
    const deals = JSON.parse(readFileSync(dealsPath, 'utf8'));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(deals);
  } catch (error) {
    console.error('Error loading deals:', error);
    res.status(500).json({ error: 'Failed to load deals', message: error.message });
  }
}
