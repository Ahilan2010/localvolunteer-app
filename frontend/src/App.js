import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { 
  Search, MapPin, Clock, Globe, Filter, Heart, 
  Users, Book, Leaf, Calendar, Loader2, AlertCircle, 
  CheckCircle, ExternalLink, Phone, Mail, Star,
  Compass, Target, Zap, Shield, Award
} from 'lucide-react';
import axios from 'axios';

const VolunteerScraper = () => {
  // State management
  const [searchParams, setSearchParams] = useState({
    location: '',
    categories: [],
    maxDistance: 25,
    availability: 'flexible',
    remoteOnly: false,
    keywords: ''
  });
  
  const [opportunities, setOpportunities] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  
  // Local filtering states
  const [localFilters, setLocalFilters] = useState({
    searchTerm: '',
    sortBy: 'distance',
    showRemoteOnly: false,
    selectedCategories: []
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Category definitions with icons and colors
  const categoryDefinitions = {
    education: { 
      label: 'Education & Tutoring', 
      icon: '📚', 
      color: 'bg-blue-100 border-blue-300 text-blue-800'
    },
    environment: { 
      label: 'Environment & Conservation', 
      icon: '🌱', 
      color: 'bg-green-100 border-green-300 text-green-800'
    },
    healthcare: { 
      label: 'Healthcare & Wellness', 
      icon: '🏥', 
      color: 'bg-red-100 border-red-300 text-red-800'
    },
    food: { 
      label: 'Food & Hunger Relief', 
      icon: '🍽️', 
      color: 'bg-orange-100 border-orange-300 text-orange-800'
    },
    animals: { 
      label: 'Animal Welfare', 
      icon: '🐾', 
      color: 'bg-purple-100 border-purple-300 text-purple-800'
    },
    seniors: { 
      label: 'Senior Care', 
      icon: '👥', 
      color: 'bg-pink-100 border-pink-300 text-pink-800'
    },
    youth: { 
      label: 'Children & Youth', 
      icon: '👶', 
      color: 'bg-indigo-100 border-indigo-300 text-indigo-800'
    },
    homeless: { 
      label: 'Homeless Support', 
      icon: '🏠', 
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
    },
    community: { 
      label: 'Community Service', 
      icon: '🤝', 
      color: 'bg-gray-100 border-gray-300 text-gray-800'
    },
    technology: { 
      label: 'Technology & Digital', 
      icon: '💻', 
      color: 'bg-cyan-100 border-cyan-300 text-cyan-800'
    }
  };

  // Load available categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        setAvailableCategories(response.data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Handle search parameter changes
  const handleSearchParamChange = (key, value) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle category selection
  const toggleCategory = (categoryId) => {
    setSearchParams(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  // Main search function
  const performSearch = async () => {
    if (!searchParams.location.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/search`, searchParams);
      
      if (response.data.opportunities) {
        setOpportunities(response.data.opportunities);
        setFilteredOpportunities(response.data.opportunities);
        setSources(response.data.sources || []);
        setSearchStats({
          total: response.data.total,
          location: response.data.location,
          filters: response.data.filters_applied
        });
        
        if (response.data.opportunities.length === 0) {
          setError('No opportunities found matching your criteria. Try expanding your search parameters.');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Search failed. Please try again.');
      setOpportunities([]);
      setFilteredOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply local filters
  const applyLocalFilters = useMemo(() => {
    let filtered = [...opportunities];

    // Text search
    if (localFilters.searchTerm) {
      const searchLower = localFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(opp =>
        opp.title.toLowerCase().includes(searchLower) ||
        opp.description?.toLowerCase().includes(searchLower) ||
        opp.organization?.toLowerCase().includes(searchLower)
      );
    }

    // Remote only filter
    if (localFilters.showRemoteOnly) {
      filtered = filtered.filter(opp => opp.remote_option);
    }

    // Category filter
    if (localFilters.selectedCategories.length > 0) {
      filtered = filtered.filter(opp => 
        localFilters.selectedCategories.includes(opp.category)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (localFilters.sortBy) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'date':
          return new Date(b.posting_date) - new Date(a.posting_date);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'organization':
          return (a.organization || '').localeCompare(b.organization || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [opportunities, localFilters]);

  // Update filtered opportunities when filters change
  useEffect(() => {
    setFilteredOpportunities(applyLocalFilters);
  }, [applyLocalFilters]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && e.ctrlKey && !isLoading) {
        performSearch();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchParams, isLoading]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently posted';
    }
  };

  // Get category info
  const getCategoryInfo = (categoryId) => {
    return categoryDefinitions[categoryId] || {
      label: categoryId,
      icon: '📋',
      color: 'bg-gray-100 border-gray-300 text-gray-800'
    };
  };

  // Render search form
  const renderSearchForm = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <div className="flex items-center mb-6">
        <Search className="w-8 h-8 text-blue-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-800">
          AI-Powered Volunteer Opportunity Finder
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Location Input */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location (City, State, or ZIP Code)
          </label>
          <input
            type="text"
            value={searchParams.location}
            onChange={(e) => handleSearchParamChange('location', e.target.value)}
            placeholder="e.g., Houston, TX or 77001"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            autoFocus
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Target className="w-4 h-4 inline mr-1" />
            Keywords (Optional)
          </label>
          <input
            type="text"
            value={searchParams.keywords}
            onChange={(e) => handleSearchParamChange('keywords', e.target.value)}
            placeholder="e.g., tutoring, food bank, animal care"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Max Distance */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Compass className="w-4 h-4 inline mr-1" />
            Maximum Distance
          </label>
          <select
            value={searchParams.maxDistance}
            onChange={(e) => handleSearchParamChange('maxDistance', parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>Within 5 miles</option>
            <option value={10}>Within 10 miles</option>
            <option value={25}>Within 25 miles</option>
            <option value={50}>Within 50 miles</option>
            <option value={100}>Within 100 miles</option>
          </select>
        </div>

        {/* Categories */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <Heart className="w-4 h-4 inline mr-1" />
            Areas of Interest (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(categoryDefinitions).map(([id, category]) => (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  searchParams.categories.includes(id)
                    ? category.color + ' border-opacity-100 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="block text-xl mb-1">{category.icon}</span>
                <span className="block leading-tight">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="lg:col-span-2 flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={searchParams.remoteOnly}
              onChange={(e) => handleSearchParamChange('remoteOnly', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Remote opportunities only</span>
          </label>

          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <select
              value={searchParams.availability}
              onChange={(e) => handleSearchParamChange('availability', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="flexible">Flexible availability</option>
              <option value="weekends">Weekends only</option>
              <option value="weekdays">Weekdays only</option>
              <option value="evenings">Evenings only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={performSearch}
          disabled={isLoading || !searchParams.location.trim()}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Searching for opportunities...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Find Volunteer Opportunities
            </>
          )}
        </button>
      </div>

      <div className="mt-4 text-center text-sm text-gray-600">
        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + Enter</kbd> to search quickly
      </div>
    </div>
  );

  // Render search filters and results header
  const renderResultsHeader = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {filteredOpportunities.length} Volunteer Opportunities Found
          </h2>
          {searchStats && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>📍 Near {searchStats.location}</p>
              {sources.length > 0 && (
                <p>🔍 Sources: {sources.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search within results</label>
          <input
            type="text"
            value={localFilters.searchTerm}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Search titles, descriptions..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sort by</label>
          <select
            value={localFilters.sortBy}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="distance">Distance</option>
            <option value="date">Posting Date</option>
            <option value="title">Title</option>
            <option value="organization">Organization</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by category</label>
          <select
            value={localFilters.selectedCategories[0] || ''}
            onChange={(e) => setLocalFilters(prev => ({ 
              ...prev, 
              selectedCategories: e.target.value ? [e.target.value] : [] 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {Object.entries(categoryDefinitions).map(([id, category]) => (
              <option key={id} value={id}>{category.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.showRemoteOnly}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, showRemoteOnly: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Remote only</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Render opportunity card
  const renderOpportunityCard = (opportunity, index) => {
    const categoryInfo = getCategoryInfo(opportunity.category);
    
    return (
      <div
        key={opportunity.id}
        onClick={() => setSelectedOpportunity(opportunity)}
        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${
          selectedOpportunity?.id === opportunity.id 
            ? 'ring-2 ring-blue-500 bg-blue-50 border-l-blue-500' 
            : 'hover:bg-gray-50 border-l-gray-300'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex-1 pr-4 line-clamp-2">
              {opportunity.title}
            </h3>
            <div className="text-right flex-shrink-0">
              {opportunity.distance && (
                <span className="text-sm text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {opportunity.distance} mi
                </span>
              )}
              {opportunity.remote_option && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  <Zap className="w-3 h-3 mr-1" />
                  Remote
                </span>
              )}
            </div>
          </div>

          {opportunity.organization && (
            <p className="text-sm font-medium text-blue-600 mb-2">
              {opportunity.organization}
            </p>
          )}

          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {opportunity.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}>
                {categoryInfo.icon} {categoryInfo.label}
              </span>
              
              {opportunity.posting_date && (
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(opportunity.posting_date)}
                </span>
              )}
            </div>

            <div className="flex items-center text-xs text-gray-500">
              <span className="font-medium">{opportunity.source}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render opportunity details panel
  const renderOpportunityDetails = () => {
    if (!selectedOpportunity) return null;

    const categoryInfo = getCategoryInfo(selectedOpportunity.category);

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex-1 pr-4">
            {selectedOpportunity.title}
          </h3>
          <button
            onClick={() => setSelectedOpportunity(null)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {selectedOpportunity.organization && (
          <p className="text-lg font-medium text-blue-600 mb-4">
            {selectedOpportunity.organization}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
              <Book className="w-4 h-4 mr-2" />
              About this opportunity
            </h4>
            <p className="text-gray-600 leading-relaxed">
              {selectedOpportunity.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Location
              </h4>
              <p className="text-gray-600">{selectedOpportunity.address || selectedOpportunity.location}</p>
              {selectedOpportunity.distance && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedOpportunity.distance} miles from your location
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Time Commitment
              </h4>
              <p className="text-gray-600">{selectedOpportunity.time_commitment || 'Contact for details'}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Category
              </h4>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${categoryInfo.color}`}>
                {categoryInfo.icon} {categoryInfo.label}
              </span>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Posted
              </h4>
              <p className="text-gray-600">{formatDate(selectedOpportunity.posting_date)}</p>
            </div>
          </div>

          {selectedOpportunity.requirements && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Requirements
              </h4>
              <p className="text-gray-600">{selectedOpportunity.requirements}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Apply or Learn More</h4>
            <div className="space-y-3">
              {selectedOpportunity.apply_link && (
                <a
                  href={selectedOpportunity.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply on {selectedOpportunity.source}
                </a>
              )}

              {selectedOpportunity.contact_info && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium mb-1">Contact Information:</h5>
                  <p>{selectedOpportunity.contact_info}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Search Form */}
        {renderSearchForm()}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {searchPerformed && !isLoading && (
          <>
            {filteredOpportunities.length > 0 && renderResultsHeader()}
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Opportunities List */}
              <div className="lg:col-span-2 space-y-4 max-h-[800px] overflow-y-auto">
                {filteredOpportunities.length > 0 ? (
                  filteredOpportunities.map((opportunity, index) => 
                    renderOpportunityCard(opportunity, index)
                  )
                ) : (
                  !isLoading && (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No opportunities found</h3>
                      <p className="text-gray-600 mb-6">
                        Try adjusting your search criteria or expanding your location radius.
                      </p>
                      <button
                        onClick={() => {
                          setSearchParams(prev => ({ ...prev, maxDistance: Math.min(prev.maxDistance * 2, 100) }));
                          performSearch();
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Expand Search Area
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Details Panel */}
              <div className="lg:col-span-1">
                {selectedOpportunity ? (
                  renderOpportunityDetails()
                ) : (
                  filteredOpportunities.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Select an opportunity
                      </h3>
                      <p className="text-gray-600">
                        Click on any opportunity card to view detailed information and apply.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Searching volunteer opportunities...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Scraping multiple sources for the latest postings
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            AI-Powered Volunteer Opportunity Finder • 
            Respecting robots.txt and terms of service • 
            Data sourced from multiple volunteer platforms
          </p>
        </footer>
      </div>
    </div>
  );
};

export default VolunteerScraper;