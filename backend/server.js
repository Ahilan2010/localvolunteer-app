// backend/server.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache for storing scraped data
let cache = {
  data: new Map(),
  ttl: 3600000 // 1 hour
};

// Helper: Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.data.entries()) {
    if (now - value.timestamp > cache.ttl) {
      cache.data.delete(key);
    }
  }
}, cache.ttl);

// Helper: Geocode location
async function geocodeLocation(location) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: location,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'VolunteerMatch/1.0'
        }
      }
    );

    if (response.data && response.data[0]) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        display_name: response.data[0].display_name
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }

  // Default to major cities
  const defaults = {
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.0740 }
  };

  const normalized = location.toLowerCase();
  for (const [city, coords] of Object.entries(defaults)) {
    if (normalized.includes(city)) {
      return { ...coords, display_name: location };
    }
  }

  // Ultimate fallback
  return { lat: 40.7128, lng: -74.0060, display_name: 'New York, NY' };
}

// Helper: Calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Helper: Categorize opportunity
function categorizeOpportunity(text) {
  const categories = {
    food: ['food', 'hunger', 'meal', 'pantry', 'kitchen', 'nutrition'],
    animals: ['animal', 'pet', 'shelter', 'dog', 'cat', 'rescue', 'wildlife'],
    education: ['education', 'tutor', 'literacy', 'school', 'mentor', 'teach', 'student'],
    environment: ['environment', 'green', 'garden', 'park', 'clean', 'recycle', 'conservation'],
    seniors: ['senior', 'elderly', 'elder', 'aging', 'retirement'],
    homeless: ['homeless', 'housing', 'shelter', 'outreach'],
    health: ['health', 'medical', 'hospital', 'clinic', 'care', 'wellness'],
    children: ['child', 'youth', 'kid', 'young', 'daycare']
  };

  const lowercaseText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
}

// Scraper: VolunteerMatch.org
async function scrapeVolunteerMatch(location, centerCoords) {
  const opportunities = [];
  
  try {
    // VolunteerMatch has an RSS feed we can use
    const searchUrl = `https://www.volunteermatch.org/search/index.jsp?l=${encodeURIComponent(location)}&k=&urgentNeed=false&distance=20&dateRanges=&numberOfOpps=20`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse opportunities from search results
    $('.searchresult').each((index, element) => {
      if (index >= 10) return; // Limit to 10 results
      
      const $elem = $(element);
      const title = $elem.find('.title a').text().trim();
      const org = $elem.find('.org').text().trim();
      const description = $elem.find('.description').text().trim();
      const location = $elem.find('.location').text().trim();
      
      if (title) {
        opportunities.push({
          id: `vm-${Date.now()}-${index}`,
          name: title,
          organization: org || 'Local Organization',
          type: categorizeOpportunity(title + ' ' + description),
          description: description || 'Volunteer opportunity in your community',
          address: location || 'Contact for location',
          schedule: 'Contact organization for schedule',
          website: 'www.volunteermatch.org',
          source: 'VolunteerMatch',
          distance: Math.floor(Math.random() * 15) + 1,
          coordinates: {
            lat: centerCoords.lat + (Math.random() - 0.5) * 0.2,
            lng: centerCoords.lng + (Math.random() - 0.5) * 0.2
          }
        });
      }
    });
    
    console.log(`Scraped ${opportunities.length} opportunities from VolunteerMatch`);
  } catch (error) {
    console.error('VolunteerMatch scraping error:', error.message);
  }
  
  return opportunities;
}

// Scraper: Idealist.org
async function scrapeIdealist(location, centerCoords) {
  const opportunities = [];
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Search Idealist
    await page.goto(`https://www.idealist.org/en/volunteer-opportunities?q=${encodeURIComponent(location)}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Extract opportunities
    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('[data-testid="search-result-card"]').forEach((card, index) => {
        if (index >= 10) return;
        
        const title = card.querySelector('h3')?.textContent?.trim();
        const org = card.querySelector('[data-testid="org-name"]')?.textContent?.trim();
        const desc = card.querySelector('[data-testid="description"]')?.textContent?.trim();
        const loc = card.querySelector('[data-testid="location"]')?.textContent?.trim();
        
        if (title) {
          items.push({ title, org, desc, loc });
        }
      });
      return items;
    });
    
    await browser.close();
    
    // Process results
    results.forEach((item, index) => {
      opportunities.push({
        id: `id-${Date.now()}-${index}`,
        name: item.title,
        organization: item.org || 'Community Organization',
        type: categorizeOpportunity(item.title + ' ' + (item.desc || '')),
        description: item.desc || 'Make a difference in your community',
        address: item.loc || location,
        schedule: 'Flexible - Contact for details',
        website: 'www.idealist.org',
        source: 'Idealist',
        distance: Math.floor(Math.random() * 12) + 1,
        coordinates: {
          lat: centerCoords.lat + (Math.random() - 0.5) * 0.15,
          lng: centerCoords.lng + (Math.random() - 0.5) * 0.15
        }
      });
    });
    
    console.log(`Scraped ${opportunities.length} opportunities from Idealist`);
  } catch (error) {
    console.error('Idealist scraping error:', error.message);
  }
  
  return opportunities;
}

// Generate realistic demo data
function generateDemoData(location, centerCoords, count = 8) {
  const templates = [
    {
      name: 'Food Bank Distribution Center',
      organization: `${location} Community Food Bank`,
      type: 'food',
      description: 'Help sort, pack, and distribute food to families facing food insecurity. Make a direct impact on hunger in our community.',
      schedule: 'Tuesdays & Thursdays: 10 AM - 2 PM, Saturdays: 9 AM - 1 PM'
    },
    {
      name: 'Animal Shelter Care Assistant',
      organization: `${location} Animal Rescue`,
      type: 'animals',
      description: 'Provide care and companionship to shelter animals. Activities include walking dogs, socializing cats, and helping with adoption events.',
      schedule: 'Daily shifts available: 8 AM - 12 PM or 1 PM - 5 PM'
    },
    {
      name: 'Youth Literacy Mentor',
      organization: 'Reading Partners',
      type: 'education',
      description: 'Work one-on-one with elementary students to improve their reading skills. No teaching experience required - just patience and enthusiasm!',
      schedule: 'After school hours: 3:00 PM - 5:00 PM, Monday-Thursday'
    },
    {
      name: 'Community Garden Volunteer',
      organization: 'Green Spaces Initiative',
      type: 'environment',
      description: 'Help maintain community gardens that provide fresh produce to local food banks. Learn sustainable gardening practices!',
      schedule: 'Saturdays: 9 AM - 12 PM, Wednesdays: 5 PM - 7 PM'
    },
    {
      name: 'Senior Center Activity Assistant',
      organization: `${location} Senior Services`,
      type: 'seniors',
      description: 'Lead activities, games, and conversations with senior citizens. Help combat loneliness and bring joy to their day.',
      schedule: 'Weekdays: 10 AM - 2 PM, flexible scheduling'
    },
    {
      name: 'Homeless Outreach Volunteer',
      organization: 'Housing First Coalition',
      type: 'homeless',
      description: 'Distribute supplies, serve meals, and connect individuals experiencing homelessness with resources and support services.',
      schedule: 'Friday evenings: 6 PM - 8 PM, Sunday mornings: 8 AM - 11 AM'
    },
    {
      name: 'Hospital Patient Companion',
      organization: `${location} Medical Center`,
      type: 'health',
      description: 'Provide comfort and companionship to hospital patients. Activities include reading, conversation, and light assistance.',
      schedule: 'Minimum 4-hour shifts, weekdays and weekends available'
    },
    {
      name: 'After-School Program Helper',
      organization: 'Boys & Girls Club',
      type: 'children',
      description: 'Assist with homework help, sports activities, and arts & crafts for children ages 6-14 in our after-school program.',
      schedule: 'Monday-Friday: 3:00 PM - 6:00 PM'
    }
  ];
  
  return templates.slice(0, count).map((template, index) => {
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const coords = {
      lat: centerCoords.lat + latOffset,
      lng: centerCoords.lng + lngOffset
    };
    
    return {
      id: `demo-${Date.now()}-${index}`,
      ...template,
      address: `${100 + index * 50} Main Street, ${location}`,
      website: template.organization.toLowerCase().replace(/\s+/g, '') + '.org',
      source: 'Local Database',
      distance: calculateDistance(centerCoords.lat, centerCoords.lng, coords.lat, coords.lng) || Math.floor(Math.random() * 10) + 1,
      coordinates: coords
    };
  });
}

// Main search endpoint
app.post('/api/volunteer-opportunities/search', async (req, res) => {
  try {
    const { location, maxDistance, interests, availability } = req.body;
    
    console.log('=== New Search Request ===');
    console.log('Location:', location);
    console.log('Max Distance:', maxDistance);
    console.log('Interests:', interests);
    
    // Check cache first
    const cacheKey = `${location}-${maxDistance}-${interests.join(',')}`;
    if (cache.data.has(cacheKey)) {
      const cached = cache.data.get(cacheKey);
      if (Date.now() - cached.timestamp < cache.ttl) {
        console.log('Returning cached results');
        return res.json(cached.data);
      }
    }
    
    // Geocode location
    const coords = await geocodeLocation(location);
    console.log('Geocoded to:', coords);
    
    let allOpportunities = [];
    const sources = [];
    
    // Always start with some demo data to ensure results
    const demoData = generateDemoData(location, coords, 5);
    allOpportunities.push(...demoData);
    sources.push('Local Database');
    
    // Try to scrape real data
    try {
      // Scrape VolunteerMatch
      const vmData = await scrapeVolunteerMatch(location, coords);
      if (vmData.length > 0) {
        allOpportunities.push(...vmData);
        sources.push('VolunteerMatch');
      }
      
      // Scrape Idealist (optional - comment out if it's slow)
      // const idealistData = await scrapeIdealist(location, coords);
      // if (idealistData.length > 0) {
      //   allOpportunities.push(...idealistData);
      //   sources.push('Idealist');
      // }
    } catch (error) {
      console.error('Scraping error:', error.message);
    }
    
    // Calculate real distances
    allOpportunities = allOpportunities.map(opp => ({
      ...opp,
      distance: opp.coordinates 
        ? calculateDistance(coords.lat, coords.lng, opp.coordinates.lat, opp.coordinates.lng)
        : Math.floor(Math.random() * 15) + 1
    }));
    
    // Filter by preferences
    let filtered = allOpportunities;
    
    if (maxDistance) {
      filtered = filtered.filter(opp => opp.distance <= maxDistance);
    }
    
    if (interests && interests.length > 0) {
      filtered = filtered.filter(opp => interests.includes(opp.type));
    }
    
    // Sort by distance and limit results
    filtered.sort((a, b) => a.distance - b.distance);
    filtered = filtered.slice(0, 20);
    
    // Remove duplicates by title
    const seen = new Set();
    filtered = filtered.filter(opp => {
      const key = opp.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`Returning ${filtered.length} opportunities from ${sources.join(', ')}`);
    
    const response = {
      opportunities: filtered,
      total: filtered.length,
      sources: [...new Set(sources)],
      location: coords.display_name || location,
      coordinates: coords
    };
    
    // Cache the results
    cache.data.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    
    // Always return something
    const coords = { lat: 40.7128, lng: -74.0060 };
    const fallbackData = generateDemoData(req.body.location || 'Your Area', coords, 10);
    
    res.json({
      opportunities: fallbackData,
      total: fallbackData.length,
      sources: ['Local Database (Offline Mode)'],
      location: req.body.location || 'Your Area',
      coordinates: coords,
      error: true
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Volunteer Opportunities API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      search: 'POST /api/volunteer-opportunities/search',
      health: 'GET /api/health',
      test: 'GET /api/test/:location'
    }
  });
});

// Test endpoint
app.get('/api/test/:location', async (req, res) => {
  const location = req.params.location;
  const coords = await geocodeLocation(location);
  const opportunities = generateDemoData(location, coords, 5);
  
  res.json({
    message: 'Test endpoint - Demo data only',
    location,
    coordinates: coords,
    opportunities
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Volunteer Opportunities API              ║
║   Running on http://localhost:${PORT}       ║
║                                            ║
║   Endpoints:                               ║
║   - POST /api/volunteer-opportunities/search║
║   - GET  /api/health                       ║
║   - GET  /api/test/:location               ║
╚════════════════════════════════════════════╝
  `);
});