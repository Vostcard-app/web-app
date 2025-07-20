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
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const state = location.state as {
      title: string;
      onLocationSelected: (location: any) => void;
    } | null;

    if (state && state.onLocationSelected) {
      state.onLocationSelected(selectedLocation);
    }
  }, [selectedLocation, location.state]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ latitude: lat, longitude: lng });
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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