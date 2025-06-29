// 1. src/App.js
import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import OpportunityList from './components/OpportunityList';
import LocationPermission from './components/LocationPermission';
import FilterSection from './components/FilterSection';
import './App.css';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(10);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setLocationPermission('unsupported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationPermission('granted');
        fetchOpportunities({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Location error:', error);
        setLocationPermission('denied');
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchOpportunities = async (location) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/volunteer-opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCoordinates: location,
          interests: interests,
          radius: searchRadius
        })
      });

      const data = await response.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      alert('Failed to fetch volunteer opportunities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (userLocation) {
      fetchOpportunities(userLocation);
    }
  };

  // Show location permission screen if needed
  if (locationPermission !== 'granted') {
    return (
      <LocationPermission 
        status={locationPermission}
        onRetry={requestLocationPermission}
      />
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🤝 Volunteer Opportunity Finder</h1>
        <p>Find meaningful ways to help your community</p>
      </header>

      <FilterSection
        interests={interests}
        setInterests={setInterests}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        onSearch={handleSearch}
        loading={loading}
      />

      <div className="content-area">
        <Map
          userLocation={userLocation}
          opportunities={opportunities}
          selectedOpportunity={selectedOpportunity}
          onMarkerClick={setSelectedOpportunity}
        />
        
        <OpportunityList
          opportunities={opportunities}
          loading={loading}
          onCardClick={setSelectedOpportunity}
        />
      </div>
    </div>
  );
}

export default App;