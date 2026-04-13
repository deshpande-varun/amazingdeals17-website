# Amazing Deals 17 🔥

Daily Amazon deals website with Instagram integration for [@amazingdeals_17](https://instagram.com/amazingdeals_17)

## Features

✅ **Public Website** - Instagram-style grid showing all deals  
✅ **Admin Dashboard** - Manage and prepare Instagram posts  
✅ **Automated Scraping** - Daily Amazon deals up to $100  
✅ **Instagram Post Prep** - One-click caption + image download  
✅ **Affiliate Integration** - Amazon Associates tracking  
✅ **Smart Filtering** - By category, price, and search  

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js + Express
- **Scraping:** Apify API
- **Hosting:** Vercel (free tier)
- **Scheduling:** node-cron

## Setup Instructions

### 1. Install Dependencies

```bash
cd amazingdeals17-website
npm install
```

### 2. Configure Environment

Create `.env` file in the root directory:

```
APIFY_TOKEN=your_apify_token_here
PORT=3000
```

### 3. Run Locally

```bash
npm start
```

- **Public site:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin

### 4. Test Scraper

```bash
npm run scrape
```

## Daily Workflow

1. **Morning (9 AM)** - Auto-scraper runs and fetches 50 new deals
2. **Review Deals** - Open admin panel, review new deals
3. **Prepare Posts** - Click "Prepare Post" for deals you like
4. **Post to Instagram:**
   - Caption auto-copied
   - Image downloaded
   - Paste in Instagram app
   - Mark as posted

## Configuration

Edit `data/config.json` to customize:

- Price range
- Categories
- Scrape schedule
- Instagram caption template
- Affiliate tag

## Deployment to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variable: `APIFY_TOKEN`
4. Deploy!

## File Structure

```
amazingdeals17-website/
├── public/           # Public website
├── admin/            # Admin dashboard
├── api/              # Express server
├── scripts/          # Scraping & post prep
├── data/             # JSON data files
└── images/           # Product images
```

## Support

Questions? DM [@amazingdeals_17](https://instagram.com/amazingdeals_17)

---

Made with ❤️ for finding amazing Amazon deals!
