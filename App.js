import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Globe, Car, Heart, Users, Home, Book, Leaf, Calendar } from 'lucide-react';

const VolunteerMatch = () => {
  const [step, setStep] = useState('welcome');
  const [location, setLocation] = useState('');
  const [preferences, setPreferences] = useState({
    driveDistance: '10',
    interests: [],
    availability: 'weekends'
  });
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Backend API endpoint (you'll need to set up your backend server)
  const API_ENDPOINT = 'http://localhost:3001/api/volunteer-opportunities';

  // Fallback data for demonstration
  const fallbackOpportunities = [
    {
      id: 1,
      name: "Community Food Bank",
      type: "food",
      description: "Help sort and distribute food to families in need",
      address: "123 Main St",
      coordinates: { lat: 40.7128, lng: -74.0060 },
      website: "www.communityfoodbank.org",
      schedule: "Weekdays: 9 AM - 5 PM, Weekends: 10 AM - 2 PM",
      distance: 5,
      source: "demo"
    },
    {
      id: 2,
      name: "Local Animal Shelter",
      type: "animals",
      description: "Care for rescued animals and help with adoption events",
      address: "456 Oak Ave",
      coordinates: { lat: 40.7580, lng: -73.9855 },
      website: "www.cityanimalshelter.org",
      schedule: "Daily: 8 AM - 6 PM",
      distance: 8,
      source: "demo"
    }
  ];

  const interestCategories = [
    { id: 'food', label: 'Food & Hunger', icon: '🍽️' },
    { id: 'animals', label: 'Animal Welfare', icon: '🐾' },
    { id: 'education', label: 'Education & Literacy', icon: '📚' },
    { id: 'environment', label: 'Environment', icon: '🌱' },
    { id: 'seniors', label: 'Senior Care', icon: '👥' },
    { id: 'homeless', label: 'Homeless Support', icon: '🏠' }
  ];

  const handleLocationSubmit = () => {
    // Simulate geocoding based on city/zip
    const mockCoordinates = {
      'New York': { lat: 40.7128, lng: -74.0060 },
      '10001': { lat: 40.7484, lng: -73.9857 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      '90001': { lat: 33.9725, lng: -118.2491 }
    };

    const coords = mockCoordinates[location] || { lat: 40.7128, lng: -74.0060 };
    setMapCenter(coords);
    setStep('preferences');
  };

  const handleInterestToggle = (interestId) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const findMatches = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch real data from backend
      const response = await fetch(`${API_ENDPOINT}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location,
          maxDistance: parseInt(preferences.driveDistance),
          interests: preferences.interests,
          availability: preferences.availability
        })
      });

      if (!response.ok) {
        throw new Error('Backend not available');
      }

      const data = await response.json();
      
      // Process scraped data
      const processedData = data.opportunities.map((opp, index) => ({
        ...opp,
        id: opp.id || index + 1,
        distance: opp.distance || Math.floor(Math.random() * parseInt(preferences.driveDistance))
      }));

      setMatches(processedData);
    } catch (err) {
      console.log('Using fallback data:', err.message);
      // Use fallback data if backend is not available
      const filtered = fallbackOpportunities.filter(opp => {
        const distanceMatch = opp.distance <= parseInt(preferences.driveDistance);
        const interestMatch = preferences.interests.length === 0 || 
          preferences.interests.includes(opp.type);
        
        return distanceMatch && interestMatch;
      });

      setMatches(filtered);
      setError('Using demo data. Connect backend for real opportunities.');
    } finally {
      setIsLoading(false);
      setStep('results');
    }
  };

  const generateAIDescription = (opportunity) => {
    const dayDescriptions = {
      weekends: "Perfect for your weekend availability!",
      weekdays: "Great weekday opportunities available!",
      flexible: "Flexible scheduling to match your availability!"
    };

    return `${opportunity.description} This opportunity is located just ${opportunity.distance} miles from your location. ${dayDescriptions[preferences.availability] || ''} The ${opportunity.name} is committed to making a real difference in our community through dedicated volunteers like you.`;
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-2xl mx-auto pt-16">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <Heart className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Local VolunteerMatch</h1>
              <p className="text-gray-600">Find meaningful volunteer opportunities in your community</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  We'll help you find the perfect volunteer opportunity based on your location, interests, and availability.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your city or ZIP code
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York or 10001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleLocationSubmit}
                disabled={!location}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preferences') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tell us about your preferences</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Car className="inline w-4 h-4 mr-1" />
                  Maximum driving distance (miles)
                </label>
                <select
                  value={preferences.driveDistance}
                  onChange={(e) => setPreferences({ ...preferences, driveDistance: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">Up to 5 miles</option>
                  <option value="10">Up to 10 miles</option>
                  <option value="20">Up to 20 miles</option>
                  <option value="50">Up to 50 miles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Areas of interest (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {interestCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleInterestToggle(category.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        preferences.interests.includes(category.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mr-2">{category.icon}</span>
                      <span className="text-sm">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  When are you available?
                </label>
                <select
                  value={preferences.availability}
                  onChange={(e) => setPreferences({ ...preferences, availability: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekends">Weekends only</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="flexible">Flexible schedule</option>
                </select>
              </div>

              <button
                onClick={findMatches}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? 'Searching...' : 'Find Volunteer Opportunities'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            We found {matches.length} volunteer opportunities for you!
          </h2>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {matches.map(opportunity => (
                <div
                  key={opportunity.id}
                  onClick={() => setSelectedMatch(opportunity)}
                  className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                    selectedMatch?.id === opportunity.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">{opportunity.name}</h3>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-gray-500">
                        <MapPin className="inline w-4 h-4" /> {opportunity.distance} miles
                      </span>
                      {opportunity.source && (
                        <span className="text-xs text-blue-600 mt-1">
                          via {opportunity.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{opportunity.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Click for schedule details</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Map</h3>
                <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100"></div>
                  <MapPin className="w-8 h-8 text-blue-600 absolute" />
                  <p className="text-gray-600 z-10">Interactive map would display here</p>
                </div>
              </div>

              {selectedMatch && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{selectedMatch.name}</h4>
                  <div className="space-y-3 text-sm">
                    <p className="text-gray-600">
                      {generateAIDescription(selectedMatch)}
                    </p>
                    <div>
                      <span className="font-medium text-gray-700">Address:</span>
                      <p className="text-gray-600">{selectedMatch.address}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Schedule:</span>
                      <p className="text-gray-600">{selectedMatch.schedule}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Website:</span>
                      <a href="#" className="text-blue-600 hover:underline block">
                        <Globe className="inline w-4 h-4 mr-1" />
                        {selectedMatch.website}
                      </a>
                    </div>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors mt-4">
                      Contact This Organization
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VolunteerMatch;