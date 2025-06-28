// backend/server.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Cache to store scraped data
let opportunitiesCache = {
  data: [],
  lastUpdated: null,
  ttl: 3600000 // 1 hour
};

// Helper function to determine opportunity type from text
function categorizeOpportunity(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('food') || text.includes('hunger') || text.includes('meal')) return 'food';
  if (text.includes('animal') || text.includes('pet') || text.includes('shelter')) return 'animals';
  if (text.includes('education') || text.includes('tutor') || text.includes('literacy')) return 'education';
  if (text.includes('environment') || text.includes('green') || text.includes('garden')) return 'environment';
  if (text.includes('senior') || text.includes('elderly') || text.includes('elder')) return 'seniors';
  if (text.includes('homeless') || text.includes('housing')) return 'homeless';
  
  return 'general';
}

// Calculate approximate distance (simplified)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Scrape JustServe.org
async function scrapeJustServe(location) {
  const opportunities = [];
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navigate to JustServe with location
    await page.goto(`https://www.justserve.org/projects?location=${encodeURIComponent(location)}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('.project-card', { timeout: 10000 }).catch(() => {});
    
    // Extract opportunities
    const scrapedData = await page.evaluate(() => {
      const cards = document.querySelectorAll('.project-card');
      return Array.from(cards).map(card => ({
        name: card.querySelector('.project-title')?.textContent?.trim() || 
              card.querySelector('h3')?.textContent?.trim() || 'Volunteer Opportunity',
        organization: card.querySelector('.organization-name')?.textContent?.trim() || 'Local Organization',
        description: card.querySelector('.project-description')?.textContent?.trim() || 
                    card.querySelector('.description')?.textContent?.trim() || 'Community volunteer opportunity',
        address: card.querySelector('.location')?.textContent?.trim() || location,
        date: card.querySelector('.date')?.textContent?.trim() || 'Ongoing'
      }));
    });
    
    await browser.close();
    
    // Process scraped data
    scrapedData.forEach((item, index) => {
      opportunities.push({
        id: `js-${index + 1}`,
        name: item.name,
        organization: item.organization,
        type: categorizeOpportunity(item.name, item.description),
        description: item.description,
        address: item.address,
        schedule: item.date,
        source: 'JustServe',
        // Generate random coordinates near the location (for demo)
        coordinates: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1
        }
      });
    });
    
  } catch (error) {
    console.error('Error scraping JustServe:', error);
  }
  
  return opportunities;
}

// Scrape local government/nonprofit RSS feeds
async function scrapeRSSFeeds(location) {
  const opportunities = [];
  
  // Example RSS feeds (you would add real ones based on location)
  const rssFeeds = [
    'https://www.volunteermatch.org/search/rss',
    // Add more RSS feeds here
  ];
  
  for (const feedUrl of rssFeeds) {
    try {
      const response = await axios.get(feedUrl);
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      $('item').each((i, elem) => {
        const title = $(elem).find('title').text();
        const description = $(elem).find('description').text();
        const link = $(elem).find('link').text();
        
        opportunities.push({
          id: `rss-${i + 1}`,
          name: title,
          type: categorizeOpportunity(title, description),
          description: description.substring(0, 200) + '...',
          website: link,
          source: 'RSS Feed',
          coordinates: {
            lat: 40.7128 + (Math.random() - 0.5) * 0.1,
            lng: -74.0060 + (Math.random() - 0.5) * 0.1
          }
        });
      });
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
    }
  }
  
  return opportunities;
}

// Scrape volunteer.gov
async function scrapeVolunteerGov(location) {
  const opportunities = [];
  
  try {
    // Note: volunteer.gov uses a complex React app, so we'd need to use their API if available
    // or implement more sophisticated scraping. This is a simplified example.
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.volunteer.gov/s/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Search for location
    await page.waitForSelector('input[type="search"]', { timeout: 5000 });
    await page.type('input[type="search"]', location);
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Extract opportunities
    const govOpportunities = await page.evaluate(() => {
      const items = document.querySelectorAll('.opportunity-item');
      return Array.from(items).slice(0, 5).map(item => ({
        name: item.querySelector('.title')?.textContent?.trim() || 'Government Volunteer Opportunity',
        organization: 'U.S. Government',
        description: item.querySelector('.description')?.textContent?.trim() || 'Federal volunteer opportunity',
        location: item.querySelector('.location')?.textContent?.trim() || ''
      }));
    });
    
    await browser.close();
    
    govOpportunities.forEach((item, index) => {
      opportunities.push({
        id: `gov-${index + 1}`,
        name: item.name,
        organization: item.organization,
        type: categorizeOpportunity(item.name, item.description),
        description: item.description,
        address: item.location || location,
        source: 'Volunteer.gov',
        coordinates: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.2,
          lng: -74.0060 + (Math.random() - 0.5) * 0.2
        }
      });
    });
    
  } catch (error) {
    console.error('Error scraping volunteer.gov:', error);
  }
  
  return opportunities;
}

// Main search endpoint
app.post('/api/volunteer-opportunities/search', async (req, res) => {
  try {
    const { location, maxDistance, interests, availability } = req.body;
    
    // Check cache
    if (opportunitiesCache.lastUpdated && 
        Date.now() - opportunitiesCache.lastUpdated < opportunitiesCache.ttl) {
      return res.json({ 
        opportunities: filterOpportunities(opportunitiesCache.data, interests, maxDistance),
        cached: true 
      });
    }
    
    // Scrape from multiple sources
    console.log('Scraping volunteer opportunities for:', location);
    
    const [justServeData, rssData, govData] = await Promise.all([
      scrapeJustServe(location),
      scrapeRSSFeeds(location),
      scrapeVolunteerGov(location)
    ]);
    
    // Combine all opportunities
    const allOpportunities = [
      ...justServeData,
      ...rssData,
      ...govData
    ];
    
    // Add distance calculations (using dummy center for now)
    const centerLat = 40.7128;
    const centerLng = -74.0060;
    
    allOpportunities.forEach(opp => {
      if (opp.coordinates) {
        opp.distance = calculateDistance(
          centerLat, centerLng,
          opp.coordinates.lat, opp.coordinates.lng
        );
      } else {
        opp.distance = Math.floor(Math.random() * maxDistance);
      }
    });
    
    // Update cache
    opportunitiesCache.data = allOpportunities;
    opportunitiesCache.lastUpdated = Date.now();
    
    // Filter and return
    const filtered = filterOpportunities(allOpportunities, interests, maxDistance);
    
    res.json({ 
      opportunities: filtered,
      total: filtered.length,
      sources: ['JustServe', 'RSS Feeds', 'Volunteer.gov']
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opportunities',
      message: error.message 
    });
  }
});

// Helper function to filter opportunities
function filterOpportunities(opportunities, interests, maxDistance) {
  return opportunities.filter(opp => {
    const distanceMatch = !maxDistance || opp.distance <= maxDistance;
    const interestMatch = !interests || interests.length === 0 || 
                         interests.includes(opp.type);
    return distanceMatch && interestMatch;
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Volunteer scraper API is running' });
});

app.listen(PORT, () => {
  console.log(`Volunteer opportunities scraper running on port ${PORT}`);
});

// package.json for the backend
/*
{
  "name": "volunteer-scraper-backend",
  "version": "1.0.0",
  "description": "Backend scraper for volunteer opportunities",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "puppeteer": "^21.0.0",
    "cheerio": "^1.0.0-rc.12",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
*/