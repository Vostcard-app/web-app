import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { FaHome, FaCheck, FaTimes, FaMapMarkerAlt, FaCrosshairs, FaSearch } from 'react-icons/fa';
import VostcardPin from '../assets/Vostcard_pin.png';
import 'leaflet/dist/leaflet.css';

// Use Vostcard_pin for the marker icon
const defaultIcon = new Icon({
  iconUrl: VostcardPin,
  iconSize: [100, 100],
  iconAnchor: [50, 100],
  popupAnchor: [0, -100],
});

// Custom hook for handling map click events
const MapClickHandler: React.FC<{
  onLocationSelect: (lat: number, lng: number) => void;
  isDragging: boolean;
}> = ({ onLocationSelect, isDragging }) => {
  useMapEvents({
    click: (e) => {
      if (!isDragging) {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      }
    }
  });
  return null;
};

const DrivecardPinPlacer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current user location or default to NYC
  const [pinPosition, setPinPosition] = useState<[number, number]>([40.7128, -74.0060]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    latitude: number;
    longitude: number;
    displayAddress: string;
    name: string;
  }>>([]);
  const [showResults, setShowResults] = useState(false);
  
  const markerRef = useRef<any>(null);
  const { title = 'New Drivecard' } = location.state || {};

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPinPosition([latitude, longitude]);
        },
        (error) => {
          console.warn('Could not get current location:', error);
          // Keep default NYC location
        }
      );
    }
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    setPinPosition([lat, lng]);
    setShowResults(false); // Hide search results when clicking map
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setShowResults(false);

    try {
      // Use the existing Netlify geocode function
      const response = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'search',
          searchQuery: searchQuery.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setShowResults(true);
        
        // Auto-select first result
        const firstResult = data.results[0];
        setPinPosition([firstResult.latitude, firstResult.longitude]);
      } else {
        setError('Location not found. Please try a different search.');
        setSearchResults([]);
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search for location. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result: typeof searchResults[0]) => {
    setPinPosition([result.latitude, result.longitude]);
    setSearchQuery(result.name);
    setShowResults(false);
  };

  const handleConfirm = () => {
    const [latitude, longitude] = pinPosition;
    
    // Store the location in session storage
    sessionStorage.setItem('drivecardLocation', JSON.stringify({
      latitude,
      longitude,
      address: searchQuery || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }));
    
    // Navigate back to studio
    navigate('/studio');
  };

  const handleCancel = () => {
    navigate('/studio');
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        zIndex: 1000
      }}>
        {/* Top row - Title and Home */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaHome 
              size={20} 
              color="#007aff" 
              style={{ cursor: 'pointer' }}
              onClick={handleCancel}
            />
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600,
              color: '#333'
            }}>
              Pin Placer - {title}
            </h2>
          </div>
          
          <button
            onClick={handleConfirm}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCheck size={16} />
            Confirm
          </button>
        </div>

        {/* Search row */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (showResults) setShowResults(false); // Hide results while typing
              }}
              placeholder="Search for a location..."
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              style={{
                backgroundColor: isSearching || !searchQuery.trim() ? '#ccc' : '#007aff',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FaSearch size={12} />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1001,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSearchResultClick(result)}
                  style={{
                    padding: '12px',
                    borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                    {result.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {result.displayAddress}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ 
        height: '100%', 
        width: '100%', 
        paddingTop: '120px',
        paddingBottom: '80px'
      }}>
        <MapContainer
          center={pinPosition}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          key={`${pinPosition[0]}-${pinPosition[1]}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler 
            onLocationSelect={handleLocationSelect}
            isDragging={isDragging}
          />
          
          <Marker
            position={pinPosition}
            ref={markerRef}
            icon={defaultIcon}
            draggable={true}
            eventHandlers={{
              dragstart: () => {
                setIsDragging(true);
              },
              dragend: (e) => {
                setIsDragging(false);
                const marker = e.target;
                const newPos = marker.getLatLng();
                setPinPosition([newPos.lat, newPos.lng]);
              }
            }}
          />
        </MapContainer>
      </div>

      {/* Bottom Controls */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#666' }}>
          📍 Tap map or drag pin to set Drivecard location
        </div>

        <button
          onClick={handleCancel}
          style={{
            backgroundColor: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaTimes size={14} />
          Cancel
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '140px',
          left: '16px',
          right: '16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default DrivecardPinPlacer; 