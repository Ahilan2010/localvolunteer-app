import React from 'react';
import './FilterSection.css';

const interestCategories = [
  'Education', 'Environment', 'Animals', 'Health', 
  'Hunger', 'Housing', 'Arts & Culture', 'Sports', 
  'Seniors', 'Youth', 'Veterans', 'Disaster Relief'
];

function FilterSection({ interests, setInterests, searchRadius, setSearchRadius, onSearch, loading }) {
  const handleInterestToggle = (interest) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <div className="filters-section">
      <div className="filters-container">
        <div className="interests-filter">
          <h3>Select Your Interests:</h3>
          <div className="interest-tags">
            {interestCategories.map(interest => (
              <button
                key={interest}
                className={`interest-tag ${interests.includes(interest) ? 'active' : ''}`}
                onClick={() => handleInterestToggle(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <div className="search-controls">
          <div className="radius-control">
            <label htmlFor="radius">Search Radius:</label>
            <select 
              id="radius"
              value={searchRadius} 
              onChange={(e) => setSearchRadius(Number(e.target.value))}
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
            </select>
          </div>
          
          <button 
            onClick={onSearch} 
            disabled={loading}
            className="search-button"
          >
            {loading ? 'Searching...' : '🔍 Search Opportunities'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterSection;
