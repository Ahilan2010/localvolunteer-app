import React, { useEffect, useRef } from 'react';
import './Map.css';

function Map({ userLocation, opportunities, selectedOpportunity, onMarkerClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!userLocation) return;

    // Initialize map
    if (!mapInstanceRef.current && window.google) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: userLocation,
        zoom: 12,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      // Add user location marker
      new window.google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
      });
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add opportunity markers
    opportunities.forEach(opp => {
      if (opp.coordinates) {
        const marker = new window.google.maps.Marker({
          position: opp.coordinates,
          map: mapInstanceRef.current,
          title: opp.title,
          animation: window.google.maps.Animation.DROP
        });

        marker.addListener('click', () => {
          onMarkerClick(opp);
        });

        markersRef.current.push(marker);
      }
    });
  }, [userLocation, opportunities, onMarkerClick]);

  // Highlight selected opportunity
  useEffect(() => {
    if (selectedOpportunity && selectedOpportunity.coordinates) {
      mapInstanceRef.current?.panTo(selectedOpportunity.coordinates);
      
      // Bounce the selected marker
      const selectedMarker = markersRef.current.find(
        marker => marker.getPosition().lat() === selectedOpportunity.coordinates.lat
      );
      if (selectedMarker) {
        selectedMarker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => selectedMarker.setAnimation(null), 2000);
      }
    }
  }, [selectedOpportunity]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map"></div>
      {!window.google && (
        <div className="map-placeholder">
          <p>📍 Map will appear here</p>
          <p className="map-note">Add Google Maps API key to enable map functionality</p>
        </div>
      )}
    </div>
  );
}

export default Map;
