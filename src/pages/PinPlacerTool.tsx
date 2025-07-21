import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
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

interface PinData {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  isOffer: boolean;
  userID?: string;
  userId?: string;
}

interface PinPlacerToolProps {
  pinData?: PinData;
}

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

// Component to update map view when position changes
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    console.log('🗺️ MapUpdater updating to:', center);
    console.log('🗺️ Map current center:', map.getCenter());
    try {
      // Add a small delay to ensure the map is ready
      setTimeout(() => {
        map.setView(center, 16, { animate: true });
        console.log('✅ Map view updated successfully to:', center);
      }, 50);
    } catch (error) {
      console.error('❌ Error updating map view:', error);
    }
  }, [center[0], center[1], map]); // Watch individual coordinates
  
  return null;
};

const PinPlacerTool: React.FC<PinPlacerToolProps> = ({ pinData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get pin data from route state if not provided as prop
  const actualPinData = pinData || location.state?.pinData;
  
  const [pinPosition, setPinPosition] = useState<[number, number]>([
    actualPinData?.latitude || 40.7128,
    actualPinData?.longitude || -74.0060
  ]);
  
  // Debug: Log when pinPosition changes
  useEffect(() => {
    console.log('📍 Pin position changed to:', pinPosition);
  }, [pinPosition]);
  
  const [originalPosition] = useState<[number, number]>([
    actualPinData?.latitude || 40.7128,
    actualPinData?.longitude || -74.0060
  ]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Search functionality
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

  // Check if position has changed
  useEffect(() => {
    const [currentLat, currentLng] = pinPosition;
    const [originalLat, originalLng] = originalPosition;
    const latChanged = Math.abs(currentLat - originalLat) > 0.000001;
    const lngChanged = Math.abs(currentLng - originalLng) > 0.000001;
    setHasChanges(latChanged || lngChanged);
  }, [pinPosition, originalPosition]);

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
        console.log('🔍 Auto-selecting first result:', firstResult.name, 'at', [firstResult.latitude, firstResult.longitude]);
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
    const newPosition: [number, number] = [result.latitude, result.longitude];
    console.log('🎯 Search result clicked:', result.name, 'Position:', newPosition);
    
    // Force state update with a new array reference
    setPinPosition([...newPosition]);
    setSearchQuery(result.displayAddress || result.name);
    setShowResults(false);
    
    // Additional debugging
    setTimeout(() => {
      console.log('🕐 After state update, pinPosition should be:', newPosition);
    }, 100);
  };

  const handleSave = async () => {
    const [newLat, newLng] = pinPosition;
    
    // Check if this is quickcard creation mode
    if (location.state?.quickcardCreation) {
      console.log('📍 Saving quickcard location');
      
      // Store location for quickcard creation
      sessionStorage.setItem('quickcardLocation', JSON.stringify({
        latitude: newLat,
        longitude: newLng,
        address: searchQuery || `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`
      }));
      
      // Navigate back to studio
      navigate('/studio');
      return;
    }

    if (!actualPinData?.id) {
      setError('No pin data available to save');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📍 Updating pin location for:', actualPinData.id);
      
      // Update the vostcard/offer in Firestore
      const docRef = doc(db, 'vostcards', actualPinData.id);
      await updateDoc(docRef, {
        latitude: newLat,
        longitude: newLng,
        geo: {
          latitude: newLat,
          longitude: newLng
        },
        updatedAt: new Date()
      });

      console.log('✅ Pin location updated successfully');
      
      // Navigate back to the detail view
      if (actualPinData.isOffer) {
        navigate(`/offer/${actualPinData.id}`);
      } else {
        navigate(`/vostcard/${actualPinData.id}`);
      }
      
    } catch (err) {
      console.error('❌ Error updating pin location:', err);
      setError('Failed to save pin location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Check if this is quickcard creation mode
    if (location.state?.quickcardCreation) {
      navigate('/studio');
      return;
    }

    // Navigate back to the detail view without saving
    if (actualPinData?.isOffer) {
      navigate(`/offer/${actualPinData.id}`);
    } else if (actualPinData?.id) {
      navigate(`/vostcard/${actualPinData.id}`);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  const handleRecenter = () => {
    setPinPosition(originalPosition);
  };

  if (!actualPinData) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <FaMapMarkerAlt size={48} color="#ff6b35" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#333', marginBottom: '16px' }}>No Pin Data Available</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Unable to load pin information. Please try again.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

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
        {/* Top row - Title and Save */}
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
              Pin Placer - {actualPinData?.title}
            </h2>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
            style={{
              backgroundColor: hasChanges ? '#002B4D' : '#e0e0e0',
              color: hasChanges ? 'white' : '#999',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (hasChanges && !isLoading) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Saving...
              </>
            ) : (
              <>
                <FaCheck size={16} />
                Save
              </>
            )}
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
                    backgroundColor: 'white'
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
          center={[originalPosition[0], originalPosition[1]]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler 
            onLocationSelect={handleLocationSelect}
            isDragging={isDragging}
          />
          
          <MapUpdater center={pinPosition} />
          
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

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: 75,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        zIndex: 1000
      }}>
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          disabled={!hasChanges}
          style={{
            backgroundColor: hasChanges ? '#666' : '#e0e0e0',
            color: hasChanges ? 'white' : '#999',
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '80px'
          }}
        >
          <FaCrosshairs size={14} />
          Reset
        </button>

        {/* Status */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {hasChanges ? (
            <span style={{ color: '#ff6b35', fontSize: '12px', fontWeight: 500 }}>
              📍 Position changed - tap Save to confirm
            </span>
          ) : (
            <span style={{ color: '#666', fontSize: '12px' }}>
              📍 Original position
            </span>
          )}
        </div>

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          disabled={isLoading}
          style={{
            backgroundColor: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '80px'
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
          top: '130px',
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

      {/* Loading Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PinPlacerTool;
