import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { FaArrowLeft, FaCheck, FaTimes, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
const defaultIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
git add .
git commit -m "Ready for Netlify deploy"
git push origin main
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

const PinPlacerTool: React.FC<PinPlacerToolProps> = ({ pinData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get pin data from route state if not provided as prop
  const actualPinData = pinData || location.state?.pinData;
  
  const [pinPosition, setPinPosition] = useState<[number, number]>([
    actualPinData?.latitude || 40.7128,
    actualPinData?.longitude || -74.0060
  ]);
  
  const [originalPosition] = useState<[number, number]>([
    actualPinData?.latitude || 40.7128,
    actualPinData?.longitude || -74.0060
  ]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
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
  };

  const handleSave = async () => {
    if (!actualPinData?.id) {
      setError('No pin data available to save');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📍 Updating pin location for:', actualPinData.id);
      
      const [newLat, newLng] = pinPosition;
      
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
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <FaArrowLeft 
          size={20} 
          color="#007aff" 
          style={{ cursor: 'pointer' }}
          onClick={handleCancel}
        />
        <div style={{ flex: 1 }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 600,
            color: '#333'
          }}>
            Pin Placer - {actualPinData.title}
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#666',
            marginTop: '2px'
          }}>
            {actualPinData.isOffer ? 'Offer' : 'Vostcard'} • Tap or drag to adjust position
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ 
        height: '100%', 
        width: '100%', 
        paddingTop: '64px',
        paddingBottom: '80px'
      }}>
        <MapContainer
          center={pinPosition}
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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          disabled={!hasChanges}
          style={{
            backgroundColor: hasChanges ? '#666' : '#e0e0e0',
            color: hasChanges ? 'white' : '#999',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
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
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaTimes size={14} />
          Cancel
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          style={{
            backgroundColor: hasChanges ? '#ff6b35' : '#e0e0e0',
            color: hasChanges ? 'white' : '#999',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: (hasChanges && !isLoading) ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Saving...
            </>
          ) : (
            <>
              <FaCheck size={14} />
              Save
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '80px',
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
