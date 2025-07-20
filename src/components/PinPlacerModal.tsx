import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaTimes, FaSearch, FaMapPin, FaCheck } from 'react-icons/fa';
import { GeocodingService } from '../services/geocodingService';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PinPlacerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (location: { latitude: number; longitude: number; address?: string }) => void;
  initialLocation?: { latitude: number; longitude: number; address?: string } | null;
  title?: string;
}

interface LocationMarkerProps {
  position: [number, number] | null;
  onPositionChange: (position: [number, number]) => void;
}

// Component to handle map clicks and marker placement
const LocationMarker: React.FC<LocationMarkerProps> = ({ position, onPositionChange }) => {
  const map = useMapEvents({
    click(e) {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      onPositionChange(newPosition);
    },
  });

  // Move map to position when position changes externally
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
};

// Component to center map on a location
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const PinPlacerModal: React.FC<PinPlacerModalProps> = ({
  isOpen,
  onClose,
  onLocationSelected,
  initialLocation,
  title = "Pin Location"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(13);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(
    initialLocation?.address || null
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user's current location on mount
  useEffect(() => {
    if (isOpen && !initialLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(userLoc);
          setMapCenter(userLoc);
          setMapZoom(15);
        },
        (error) => {
          console.log('Could not get user location:', error);
          // Keep default NYC location
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else if (isOpen && initialLocation) {
      setMapCenter([initialLocation.latitude, initialLocation.longitude]);
      setMapZoom(15);
    }
  }, [isOpen, initialLocation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      // Simple geocoding using the existing GeocodingService
      // For search, we'll try to parse the query as "city, state, country" format
      const parts = searchQuery.split(',').map(part => part.trim());
      
      let streetAddress = '';
      let city = '';
      let state = '';
      let postalCode = '';
      let country = 'United States'; // Default country
      
      if (parts.length === 1) {
        // Single term - treat as city
        city = parts[0];
      } else if (parts.length === 2) {
        // Two parts - city, state or city, country
        city = parts[0];
        if (parts[1].length === 2) {
          state = parts[1]; // Likely a state abbreviation
        } else {
          country = parts[1];
        }
      } else if (parts.length >= 3) {
        // Three or more parts - city, state, country
        city = parts[0];
        state = parts[1];
        country = parts[2];
      }

      const result = await GeocodingService.geocodeAddress(
        streetAddress,
        city,
        state,
        postalCode,
        country
      );
      
      const newPosition: [number, number] = [result.latitude, result.longitude];
      
      setMapCenter(newPosition);
      setMapZoom(15);
      setSelectedPosition(newPosition);
      setCurrentAddress(result.displayAddress);
      
      console.log('📍 Location found:', result.displayAddress, newPosition);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Location not found. Please try a different search term.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePositionChange = async (position: [number, number]) => {
    setSelectedPosition(position);
    
    // Reverse geocode to get address using GeocodingService
    try {
      const mapLocation = await GeocodingService.createMapLocationFromCoordinates(
        position[0], 
        position[1]
      );
      setCurrentAddress(mapLocation.displayAddress);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setCurrentAddress(`${position[0].toFixed(6)}, ${position[1].toFixed(6)}`);
    }
  };

  const handleSave = () => {
    if (selectedPosition) {
      onLocationSelected({
        latitude: selectedPosition[0],
        longitude: selectedPosition[1],
        address: currentAddress || undefined
      });
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ margin: 0, color: '#002B4D', fontSize: '20px' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px'
            }}
          >
            <FaTimes size={20} color="#666" />
          </button>
        </div>

        {/* Search Section */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for a location (e.g., New York, NY)"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: searchQuery.trim() && !isSearching ? 'pointer' : 'not-allowed',
                opacity: searchQuery.trim() && !isSearching ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaSearch size={14} />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Error */}
          {searchError && (
            <div style={{
              marginTop: '8px',
              color: '#d32f2f',
              fontSize: '14px',
              backgroundColor: '#ffebee',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ffcdd2'
            }}>
              {searchError}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div style={{
          flex: 1,
          minHeight: '400px',
          position: 'relative'
        }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <LocationMarker 
              position={selectedPosition} 
              onPositionChange={handlePositionChange}
            />
          </MapContainer>

          {/* Instructions Overlay */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '12px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            fontSize: '14px',
            maxWidth: '250px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              <FaMapPin style={{ marginRight: '6px', color: '#002B4D' }} />
              Pin Instructions
            </div>
            <div>Click anywhere on the map to place your pin</div>
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedPosition && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#002B4D' }}>
              Selected Location:
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              {currentAddress || 'Loading address...'}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Coordinates: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedPosition}
            style={{
              backgroundColor: selectedPosition ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: selectedPosition ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaCheck size={14} />
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinPlacerModal; 