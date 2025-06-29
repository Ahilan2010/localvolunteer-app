const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Sample volunteer data (since we can't actually scrape without proper setup)
const sampleOpportunities = [
  {
    id: '1',
    title: 'Food Bank Helper',
    organization: 'Local Community Food Bank',
    description: 'Help sort and distribute food to families in need',
    location: 'Downtown Community Center',
    date: 'Every Saturday',
    url: 'https://example.com/food-bank',
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  {
    id: '2',
    title: 'Youth Tutor',
    organization: 'Boys & Girls Club',
    description: 'Tutor elementary school students in math and reading',
    location: 'East Side Community Center',
    date: 'Weekday afternoons',
    url: 'https://example.com/tutoring',
    coordinates: { lat: 37.7849, lng: -122.4094 }
  },
  {
    id: '3',
    title: 'Park Cleanup Volunteer',
    organization: 'Green Earth Initiative',
    description: 'Help keep our local parks clean and beautiful',
    location: 'Central Park',
    date: 'First Sunday of each month',
    url: 'https://example.com/park-cleanup',
    coordinates: { lat: 37.7649, lng: -122.4294 }
  },
  {
    id: '4',
    title: 'Animal Shelter Assistant',
    organization: 'Happy Paws Animal Shelter',
    description: 'Walk dogs and help care for shelter animals',
    location: 'North District Animal Shelter',
    date: 'Flexible schedule',
    url: 'https://example.com/animal-shelter',
    coordinates: { lat: 37.7949, lng: -122.3994 }
  },
  {
    id: '5',
    title: 'Senior Companion',
    organization: 'Elder Care Services',
    description: 'Spend time with seniors, play games, and provide companionship',
    location: 'Sunset Senior Center',
    date: 'Weekday mornings',
    url: 'https://example.com/senior-care',
    coordinates: { lat: 37.7549, lng: -122.4394 }
  }
];

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI/180);
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.post('/api/volunteer-opportunities', async (req, res) => {
  try {
    const { userCoordinates, radius = 10, interests = [] } = req.body;
    
    console.log('Received request:', { userCoordinates, radius, interests });
    
    // Filter opportunities by radius if coordinates provided
    let filteredOpportunities = [...sampleOpportunities];
    
    if (userCoordinates && userCoordinates.lat && userCoordinates.lng) {
      // Add random nearby coordinates based on user location
      filteredOpportunities = sampleOpportunities.map((opp, index) => ({
        ...opp,
        coordinates: {
          lat: userCoordinates.lat + (Math.random() - 0.5) * 0.2,
          lng: userCoordinates.lng + (Math.random() - 0.5) * 0.2
        }
      }));
      
      // Filter by radius
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const distance = calculateDistance(
          userCoordinates.lat,
          userCoordinates.lng,
          opp.coordinates.lat,
          opp.coordinates.lng
        );
        return distance <= radius;
      });
    }
    
    // Filter by interests if provided
    if (interests.length > 0) {
      // For demo purposes, randomly assign some opportunities to match interests
      filteredOpportunities = filteredOpportunities.filter(() => Math.random() > 0.3);
    }
    
    res.json({
      success: true,
      count: filteredOpportunities.length,
      opportunities: filteredOpportunities
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch volunteer opportunities',
      details: error.message 
    });
  }
});

// Real scraping endpoint (for future implementation)
app.post('/api/scrape-opportunities', async (req, res) => {
  try {
    // This would contain actual scraping logic
    // For now, return a message
    res.json({
      message: 'Scraping functionality would be implemented here',
      info: 'This would use puppeteer or playwright to scrape real volunteer websites'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});