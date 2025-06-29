import React from 'react';
import './LocationPermission.css';

function LocationPermission({ status, onRetry }) {
  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <>
            <div className="icon">📍</div>
            <h1>Location Permission Required</h1>
            <p>This app needs your location to find volunteer opportunities near you.</p>
            <button onClick={onRetry} className="primary-button">
              Enable Location
            </button>
          </>
        );
      
      case 'denied':
        return (
          <>
            <div className="icon">❌</div>
            <h1>Location Access Denied</h1>
            <p>Please enable location services in your browser settings to use this app.</p>
            <ol className="instructions">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Location" in the permissions</li>
              <li>Change it to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
            <button onClick={onRetry} className="primary-button">
              Try Again
            </button>
          </>
        );
      
      case 'unsupported':
        return (
          <>
            <div className="icon">⚠️</div>
            <h1>Location Not Supported</h1>
            <p>Your browser doesn't support location services. Please try a different browser.</p>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="permission-screen">
      <div className="permission-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default LocationPermission;