// backend/server.js - AI-Powered Volunteer Opportunity Scraper
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'volunteer_opportunities.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    organization TEXT,
    location TEXT,
    address TEXT,
    posting_date TEXT,
    deadline DATE,
    apply_link TEXT,
    contact_info TEXT,
    category TEXT,
    remote_option BOOLEAN,
    time_commitment TEXT,
    requirements TEXT,
    coordinates_lat REAL,
    coordinates_lng REAL,
    source TEXT,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_location ON opportunities(location)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_category ON opportunities(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posting_date ON opportunities(posting_date)`);
});

// Geocoding helper with caching
const geocodeCache = new Map();

async function geocodeLocation(location) {
  if (geocodeCache.has(location)) {
    return geocodeCache.get(location);
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: location,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
      },
      headers: {
        'User-Agent': 'VolunteerScraper/1.0 (educational-purpose)'
      },
      timeout: 10000
    });

    if (response.data && response.data[0]) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        display_name: response.data[0].display_name
      };
      geocodeCache.set(location, result);
      return result;
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }

  // Fallback coordinates for major cities
  const cityDefaults = {
    'houston': { lat: 29.7604, lng: -95.3698 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'miami': { lat: 25.7617, lng: -80.1918 }
  };

  const normalized = location.toLowerCase();
  for (const [city, coords] of Object.entries(cityDefaults)) {
    if (normalized.includes(city)) {
      geocodeCache.set(location, coords);
      return coords;
    }
  }

  return { lat: 40.7128, lng: -74.0060 }; // Default to NYC
}

// Distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

// AI-powered categorization
function categorizeOpportunity(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  const categories = {
    education: {
      keywords: ['tutor', 'teach', 'mentor', 'literacy', 'school', 'student', 'education', 'reading', 'homework', 'academic'],
      weight: 0
    },
    environment: {
      keywords: ['environment', 'green', 'garden', 'park', 'clean', 'recycle', 'conservation', 'nature', 'sustainability', 'climate'],
      weight: 0
    },
    healthcare: {
      keywords: ['health', 'medical', 'hospital', 'clinic', 'care', 'wellness', 'mental health', 'therapy', 'patient'],
      weight: 0
    },
    food: {
      keywords: ['food', 'hunger', 'meal', 'pantry', 'kitchen', 'nutrition', 'feeding', 'soup', 'bank', 'cooking'],
      weight: 0
    },
    animals: {
      keywords: ['animal', 'pet', 'shelter', 'dog', 'cat', 'rescue', 'wildlife', 'spca', 'humane', 'veterinary'],
      weight: 0
    },
    seniors: {
      keywords: ['senior', 'elderly', 'elder', 'aging', 'retirement', 'nursing', 'assisted living', 'geriatric'],
      weight: 0
    },
    youth: {
      keywords: ['child', 'youth', 'kid', 'young', 'daycare', 'pediatric', 'juvenile', 'teen', 'adolescent'],
      weight: 0
    },
    homeless: {
      keywords: ['homeless', 'housing', 'shelter', 'outreach', 'transitional', 'street', 'vagrant'],
      weight: 0
    },
    community: {
      keywords: ['community', 'neighborhood', 'local', 'civic', 'public', 'social', 'cultural', 'arts'],
      weight: 0
    },
    technology: {
      keywords: ['technology', 'digital', 'computer', 'coding', 'tech', 'website', 'online', 'virtual'],
      weight: 0
    }
  };

  // Calculate weights for each category
  for (const [category, data] of Object.entries(categories)) {
    data.weight = data.keywords.reduce((sum, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return sum + matches;
    }, 0);
  }

  // Find category with highest weight
  const bestMatch = Object.entries(categories).reduce((a, b) => 
    categories[a[0]].weight > categories[b[0]].weight ? a : b
  );

  return bestMatch[1].weight > 0 ? bestMatch[0] : 'general';
}

// Check if posting is recent (within 2 weeks)
function isRecentPosting(dateString) {
  if (!dateString) return true; // Assume recent if no date
  
  try {
    const postingDate = new Date(dateString);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return postingDate >= twoWeeksAgo;
  } catch {
    return true; // Assume recent if date parsing fails
  }
}

// Modular scraper for VolunteerMatch.org
async function scrapeVolunteerMatch(location, category = null) {
  const opportunities = [];
  
  try {
    console.log(`Scraping VolunteerMatch for ${location}...`);
    
    // Check robots.txt compliance
    const robotsResponse = await axios.get('https://www.volunteermatch.org/robots.txt', { timeout: 5000 });
    if (robotsResponse.data.includes('Disallow: /search')) {
      console.log('VolunteerMatch: robots.txt disallows scraping search pages');
      return opportunities;
    }

    const searchUrl = `https://www.volunteermatch.org/search/opp_detail.jsp`;
    const searchParams = {
      criteriaForm: 'advanced',
      l: location,
      r: '25', // 25 mile radius
      categories: category || '',
      keywords: '',
      sort: 'postedDate'
    };

    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    const fullUrl = `${searchUrl}?${new URLSearchParams(searchParams).toString()}`;
    await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await page.waitForTimeout(3000);

    const results = await page.evaluate(() => {
      const opportunities = [];
      const opportunityCards = document.querySelectorAll('.searchresult, .opp-card, [data-opp-id]');

      opportunityCards.forEach((card, index) => {
        if (index >= 15) return; // Limit results

        try {
          const titleElement = card.querySelector('.title a, h3 a, .opp-title a');
          const title = titleElement?.textContent?.trim();
          
          const orgElement = card.querySelector('.org, .organization, .opp-org');
          const organization = orgElement?.textContent?.trim();
          
          const descElement = card.querySelector('.description, .opp-description, .summary');
          const description = descElement?.textContent?.trim();
          
          const locationElement = card.querySelector('.location, .opp-location');
          const location = locationElement?.textContent?.trim();
          
          const dateElement = card.querySelector('.date, .posted-date, .opp-date');
          const postingDate = dateElement?.textContent?.trim();
          
          const linkElement = titleElement || card.querySelector('a[href*="opp_detail"]');
          const applyLink = linkElement?.href;

          if (title && title.length > 5) {
            opportunities.push({
              title,
              organization: organization || 'Local Organization',
              description: description || 'Volunteer opportunity available',
              location: location || 'Location TBD',
              posting_date: postingDate || new Date().toISOString().split('T')[0],
              apply_link: applyLink || 'https://www.volunteermatch.org',
              source: 'VolunteerMatch'
            });
          }
        } catch (error) {
          console.error('Error parsing opportunity card:', error);
        }
      });

      return opportunities;
    });

    await browser.close();
    
    // Process and enhance results
    for (const opp of results) {
      if (isRecentPosting(opp.posting_date)) {
        const coords = await geocodeLocation(opp.location);
        
        opportunities.push({
          id: `vm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: opp.title,
          description: opp.description,
          organization: opp.organization,
          location: opp.location,
          address: opp.location,
          posting_date: opp.posting_date,
          deadline: null,
          apply_link: opp.apply_link,
          contact_info: 'Contact through VolunteerMatch platform',
          category: categorizeOpportunity(opp.title, opp.description),
          remote_option: opp.description.toLowerCase().includes('remote') || opp.description.toLowerCase().includes('virtual'),
          time_commitment: 'Flexible',
          requirements: 'See opportunity details',
          coordinates_lat: coords.lat,
          coordinates_lng: coords.lng,
          source: 'VolunteerMatch'
        });
      }
    }

    console.log(`VolunteerMatch: Found ${opportunities.length} recent opportunities`);
    
  } catch (error) {
    console.error('VolunteerMatch scraping error:', error.message);
  }
  
  return opportunities;
}

// Modular scraper for JustServe.org
async function scrapeJustServe(location, category = null) {
  const opportunities = [];
  
  try {
    console.log(`Scraping JustServe for ${location}...`);
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limiting

    const searchUrl = 'https://www.justserve.org/projects/search';
    const response = await axios.get(searchUrl, {
      params: {
        address: location,
        distance: 25,
        page: 1,
        category: category || ''
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    $('.project-card, .opportunity-card, .project-listing').each((index, element) => {
      if (index >= 12) return;

      try {
        const $elem = $(element);
        const title = $elem.find('.project-title, .title, h3, h4').first().text().trim();
        const organization = $elem.find('.organization, .sponsor, .org-name').first().text().trim();
        const description = $elem.find('.description, .project-description, .summary').first().text().trim();
        const location = $elem.find('.location, .address, .project-location').first().text().trim();
        const datePosted = $elem.find('.date, .posted-date, .project-date').first().text().trim();
        const link = $elem.find('a').first().attr('href');
        
        if (title && title.length > 3) {
          const fullLink = link ? (link.startsWith('http') ? link : `https://www.justserve.org${link}`) : 'https://www.justserve.org';
          
          opportunities.push({
            id: `js-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            description: description || 'Community service opportunity',
            organization: organization || 'Community Organization',
            location: location || 'Local Area',
            address: location || 'Contact for address',
            posting_date: datePosted || new Date().toISOString().split('T')[0],
            deadline: null,
            apply_link: fullLink,
            contact_info: 'Contact through JustServe platform',
            category: categorizeOpportunity(title, description),
            remote_option: description.toLowerCase().includes('remote') || description.toLowerCase().includes('virtual'),
            time_commitment: 'Varies',
            requirements: 'See project details',
            coordinates_lat: null,
            coordinates_lng: null,
            source: 'JustServe'
          });
        }
      } catch (error) {
        console.error('Error parsing JustServe opportunity:', error);
      }
    });

    // Geocode locations
    for (const opp of opportunities) {
      if (opp.location) {
        const coords = await geocodeLocation(opp.location);
        opp.coordinates_lat = coords.lat;
        opp.coordinates_lng = coords.lng;
      }
    }

    console.log(`JustServe: Found ${opportunities.length} opportunities`);
    
  } catch (error) {
    console.error('JustServe scraping error:', error.message);
  }
  
  return opportunities;
}

// Store opportunities in database
function storeOpportunities(opportunities) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO opportunities (
      id, title, description, organization, location, address, posting_date, 
      deadline, apply_link, contact_info, category, remote_option, 
      time_commitment, requirements, coordinates_lat, coordinates_lng, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    let completed = 0;
    const total = opportunities.length;

    if (total === 0) {
      resolve(0);
      return;
    }

    opportunities.forEach(opp => {
      stmt.run([
        opp.id, opp.title, opp.description, opp.organization, opp.location,
        opp.address, opp.posting_date, opp.deadline, opp.apply_link,
        opp.contact_info, opp.category, opp.remote_option ? 1 : 0,
        opp.time_commitment, opp.requirements, opp.coordinates_lat,
        opp.coordinates_lng, opp.source
      ], function(err) {
        if (err) {
          console.error('Database insert error:', err);
        }
        completed++;
        if (completed === total) {
          stmt.finalize();
          resolve(completed);
        }
      });
    });
  });
}

// Main search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const {
      location,
      categories = [],
      maxDistance = 25,
      availability = 'flexible',
      remoteOnly = false,
      keywords = ''
    } = req.body;

    console.log('=== Search Request ===');
    console.log('Location:', location);
    console.log('Categories:', categories);
    console.log('Max Distance:', maxDistance);
    console.log('Remote Only:', remoteOnly);

    if (!location || location.trim().length < 2) {
      return res.status(400).json({
        error: 'Location is required',
        opportunities: []
      });
    }

    // Get user coordinates
    const userCoords = await geocodeLocation(location);
    console.log('User coordinates:', userCoords);

    // Scrape fresh data from multiple sources
    const scrapingPromises = [
      scrapeVolunteerMatch(location, categories[0]),
      scrapeJustServe(location, categories[0])
    ];

    console.log('Starting concurrent scraping...');
    const scrapingResults = await Promise.allSettled(scrapingPromises);
    
    let allOpportunities = [];
    const sources = [];

    scrapingResults.forEach((result, index) => {
      const sourceNames = ['VolunteerMatch', 'JustServe'];
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allOpportunities.push(...result.value);
        sources.push(sourceNames[index]);
      }
    });

    // Store in database
    if (allOpportunities.length > 0) {
      await storeOpportunities(allOpportunities);
      console.log(`Stored ${allOpportunities.length} opportunities in database`);
    }

    // Query database with filters
    let query = `
      SELECT * FROM opportunities 
      WHERE is_active = 1 
      AND date(posting_date) >= date('now', '-14 days')
    `;
    const params = [];

    // Apply filters
    if (categories.length > 0) {
      query += ` AND category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    if (remoteOnly) {
      query += ` AND remote_option = 1`;
    }

    if (keywords) {
      query += ` AND (title LIKE ? OR description LIKE ? OR organization LIKE ?)`;
      const keywordPattern = `%${keywords}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    query += ` ORDER BY scraped_at DESC LIMIT 50`;

    const dbResults = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate distances and apply distance filter
    let filteredResults = dbResults
      .map(opp => ({
        ...opp,
        distance: opp.coordinates_lat && opp.coordinates_lng
          ? calculateDistance(userCoords.lat, userCoords.lng, opp.coordinates_lat, opp.coordinates_lng)
          : null
      }))
      .filter(opp => !opp.distance || opp.distance <= maxDistance)
      .sort((a, b) => {
        // Sort by distance first, then by posting date
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return new Date(b.posting_date) - new Date(a.posting_date);
      })
      .slice(0, 30);

    console.log(`Returning ${filteredResults.length} filtered opportunities`);

    res.json({
      opportunities: filteredResults,
      total: filteredResults.length,
      sources: [...new Set(sources)],
      location: userCoords.display_name || location,
      coordinates: userCoords,
      filters_applied: {
        categories: categories.length > 0 ? categories : ['all'],
        max_distance: maxDistance,
        remote_only: remoteOnly,
        keywords: keywords || 'none'
      }
    });

  } catch (error) {
    console.error('Search endpoint error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      opportunities: []
    });
  }
});

// Get opportunity details
app.get('/api/opportunity/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM opportunities WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'Opportunity not found' });
    }
  });
});

// Get available categories
app.get('/api/categories', (req, res) => {
  db.all(
    'SELECT category, COUNT(*) as count FROM opportunities WHERE is_active = 1 GROUP BY category ORDER BY count DESC',
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI-Powered Volunteer Scraper API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Multi-source scraping',
      'AI-powered categorization',
      'Location-based filtering',
      'Recent posting filter',
      'Distance calculation',
      'SQLite storage',
      'Rate limiting'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        AI-Powered Volunteer Opportunity Scraper       ║
║                Running on http://localhost:${PORT}        ║
║                                                        ║
║  Features:                                             ║
║  ✓ Multi-source web scraping (VolunteerMatch, JustServe) ║
║  ✓ AI-powered opportunity categorization               ║
║  ✓ Location-based filtering with distance calculation  ║
║  ✓ Recent posting filter (last 2 weeks)               ║
║  ✓ SQLite database with caching                       ║
║  ✓ Rate limiting and error handling                   ║
║  ✓ Robots.txt compliance checking                     ║
║                                                        ║
║  Endpoints:                                            ║
║  - POST /api/search           (Main search)           ║
║  - GET  /api/opportunity/:id  (Get details)           ║
║  - GET  /api/categories       (Available categories)   ║
║  - GET  /api/health           (Health check)          ║
╚════════════════════════════════════════════════════════╝
  `);
});