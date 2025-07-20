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
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);

    try {
      // Use a geocoding service to search for the location
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const results = await response.json();
      
      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPinPosition([lat, lng]);
        setSearchQuery(''); // Clear search after successful search
      } else {
        setError('Location not found. Please try a different search.');
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
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
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              backgroundColor: '#007aff',
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
      </div>

      {/* Map */}
      <div style={{ 
        height: '100%', 
        width: '100%', 
        paddingTop: '100px',
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
          top: '120px',
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
  const handleBack = () => {
    navigate('/drivecard-studio');
  };

  const handleSave = () => {
    if (selectedLocation) {
      const { latitude, longitude } = selectedLocation;
      const locationData = {
        latitude,
        longitude,
        address: selectedLocation.address || 'Unknown Location',
      };
      // In a real application, you would send this locationData to your backend
      // For now, we'll just log it and navigate back
      console.log('Selected Location:', locationData);
      navigate('/drivecard-studio');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <button
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: '#002B4D',
          color: 'white',
          border: 'none',
          padding: '12px 8px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <FaTimes size={14} />
        Back
      </button>

      <MapContainer
        center={[51.505, -0.09]} // Default center
        zoom={13} // Default zoom
        style={{ width: '100%', height: '100%' }}
        whenCreated={(map) => {
          map.on('dragend', handleDragEnd);
          map.on('click', (e) => {
            handleMapClick(e.latlng.lat, e.latlng.lng);
          });
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {selectedLocation && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={defaultIcon}
            draggable={true}
            onDragend={handleDragEnd}
          >
            <Popup>
              <FaMapMarkerAlt size={20} />
              <p>Latitude: {selectedLocation.latitude.toFixed(4)}</p>
              <p>Longitude: {selectedLocation.longitude.toFixed(4)}</p>
              <p>Address: {selectedLocation.address || 'Unknown'}</p>
            </Popup>
          </Marker>
        )}
        <MapClickHandler onLocationSelect={handleMapClick} isDragging={isDragging} />
      </MapContainer>

      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)' }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#002B4D',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <FaCheck size={20} />
          Save Location
        </button>
      </div>
    </div>
  );
};

export default DrivecardPinPlacer; 