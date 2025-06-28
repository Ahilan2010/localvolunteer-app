import React, { useState, useEffect } from 'react';
import './App.css';
import { MapPin, Clock, Globe, Car, Heart, Users, Book, Leaf, Calendar, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const VolunteerMatch = () => {
  const [step, setStep] = useState('welcome');
  const [location, setLocation] = useState('');
  const [preferences, setPreferences] = useState({
    driveDistance: '10',
    interests: [],
    availability: 'flexible'
  });
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);

  const API_ENDPOINT = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/volunteer-opportunities';

  const interestCategories = [
    { id: 'food', label: 'Food & Hunger', icon: '🍽️', color: 'bg-orange-100 border-orange-300' },
    { id: 'animals', label: 'Animal Welfare', icon: '🐾', color: 'bg-blue-100 border-blue-300' },
    { id: 'education', label: 'Education', icon: '📚', color: 'bg-purple-100 border-purple-300' },
    { id: 'environment', label: 'Environment', icon: '🌱', color: 'bg-green-100 border-green-300' },
    { id: 'seniors', label: 'Senior Care', icon: '👥', color: 'bg-pink-100 border-pink-300' },
    { id: 'homeless', label: 'Homeless Support', icon: '🏠', color: 'bg-yellow-100 border-yellow-300' },
    { id: 'health', label: 'Healthcare', icon: '🏥', color: 'bg-red-100 border-red-300' },
    { id: 'children', label: 'Children & Youth', icon: '👶', color: 'bg-indigo-100 border-indigo-300' }
  ];

  const handleLocationSubmit = () => {
    if (location.trim()) {
      setStep('preferences');
    }
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
      const response = await axios.post(`${API_ENDPOINT}/search`, {
        location: location,
        maxDistance: parseInt(preferences.driveDistance),
        interests: preferences.interests,
        availability: preferences.availability
      });

      if (response.data && response.data.opportunities) {
        setMatches(response.data.opportunities);
        setSources(response.data.sources || []);
      } else {
        throw new Error('No opportunities found');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to load opportunities. Please try again.');
      setMatches([]);
    } finally {
      setIsLoading(false);
      setStep('results');
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="max-w-2xl mx-auto pt-12 md:pt-20">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 transform transition-all duration-500 hover:scale-[1.02]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Local VolunteerMatch
              </h1>
              <p className="text-lg text-gray-600">
                Find meaningful volunteer opportunities in your community
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <p className="text-sm text-blue-800 leading-relaxed">
                  We'll help you find the perfect volunteer opportunity based on your location, interests, and availability. Make a difference in your community today!
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter your city or ZIP code
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleLocationSubmit)}
                  placeholder="e.g., New York or 10001"
                  className="input-field text-lg"
                  autoFocus
                />
              </div>

              <button
                onClick={handleLocationSubmit}
                disabled={!location.trim()}
                className="w-full btn-primary text-lg py-4"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="max-w-3xl mx-auto pt-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              Tell us about your preferences
            </h2>

            <div className="space-y-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <Car className="w-5 h-5 mr-2 text-blue-600" />
                  Maximum driving distance
                </label>
                <select
                  value={preferences.driveDistance}
                  onChange={(e) => setPreferences({ ...preferences, driveDistance: e.target.value })}
                  className="input-field text-lg"
                >
                  <option value="5">Up to 5 miles</option>
                  <option value="10">Up to 10 miles</option>
                  <option value="20">Up to 20 miles</option>
                  <option value="50">Up to 50 miles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Areas of interest (select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {interestCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleInterestToggle(category.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${
                        preferences.interests.includes(category.id)
                          ? `${category.color} border-opacity-100 shadow-md`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{category.icon}</span>
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  When are you available?
                </label>
                <select
                  value={preferences.availability}
                  onChange={(e) => setPreferences({ ...preferences, availability: e.target.value })}
                  className="input-field text-lg"
                >
                  <option value="flexible">Flexible schedule</option>
                  <option value="weekends">Weekends only</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="evenings">Evenings only</option>
                </select>
              </div>

              <button
                onClick={findMatches}
                disabled={isLoading}
                className="w-full btn-success text-lg py-4 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Find Volunteer Opportunities'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="max-w-7xl mx-auto pt-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {matches.length > 0 
                ? `We found ${matches.length} volunteer opportunities for you!`
                : 'Searching for opportunities...'}
            </h2>
            {sources.length > 0 && (
              <p className="text-sm text-gray-600">
                Sources: {sources.join(', ')}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-6 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="loading-spinner"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-gray-600 text-lg">
                No opportunities found. Try adjusting your search criteria or location.
              </p>
              <button
                onClick={() => setStep('preferences')}
                className="mt-6 btn-primary"
              >
                Modify Search
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                {matches.map((opportunity, index) => (
                  <div
                    key={opportunity.id || index}
                    onClick={() => setSelectedMatch(opportunity)}
                    className={`opportunity-card card cursor-pointer ${
                      selectedMatch?.id === opportunity.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 flex-1 pr-4">
                        {opportunity.name}
                      </h3>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {opportunity.distance} miles
                        </span>
                        {opportunity.source && (
                          <span className="text-xs text-blue-600 mt-1 block">
                            via {opportunity.source}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {opportunity.organization && (
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {opportunity.organization}
                      </p>
                    )}
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {opportunity.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                        ${opportunity.type === 'food' ? 'bg-orange-100 text-orange-800' :
                          opportunity.type === 'animals' ? 'bg-blue-100 text-blue-800' :
                          opportunity.type === 'education' ? 'bg-purple-100 text-purple-800' :
                          opportunity.type === 'environment' ? 'bg-green-100 text-green-800' :
                          opportunity.type === 'seniors' ? 'bg-pink-100 text-pink-800' :
                          opportunity.type === 'health' ? 'bg-red-100 text-red-800' :
                          opportunity.type === 'children' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {opportunity.type}
                      </span>
                      <span className="text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        View details
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:sticky lg:top-0 space-y-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Volunteer Opportunities Map
                  </h3>
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-blue-600 animate-bounce" />
                    </div>
                    <p className="text-gray-600 z-10 bg-white px-4 py-2 rounded-lg shadow">
                      Interactive map coming soon
                    </p>
                  </div>
                </div>

                {selectedMatch && (
                  <div className="card">
                    <h4 className="font-bold text-xl text-gray-800 mb-2">
                      {selectedMatch.name}
                    </h4>
                    {selectedMatch.organization && (
                      <p className="text-sm font-medium text-gray-700 mb-4">
                        {selectedMatch.organization}
                      </p>
                    )}
                    
                    <div className="space-y-4 text-sm">
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-1">About this opportunity</h5>
                        <p className="text-gray-600 leading-relaxed">
                          {selectedMatch.description}
                        </p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-1">Location</h5>
                        <p className="text-gray-600">{selectedMatch.address}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-1">Schedule</h5>
                        <p className="text-gray-600">{selectedMatch.schedule}</p>
                      </div>
                      
                      {selectedMatch.website && (
                        <div>
                          <h5 className="font-semibold text-gray-700 mb-1">Learn more</h5>
                          <a 
                            href={selectedMatch.website.startsWith('http') ? selectedMatch.website : `https://${selectedMatch.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            {selectedMatch.website}
                          </a>
                        </div>
                      )}
                      
                      <button className="w-full btn-success mt-6 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        I'm Interested
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setStep('welcome');
                setMatches([]);
                setSelectedMatch(null);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Start a New Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VolunteerMatch;