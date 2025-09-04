import React, { useState, useEffect } from 'react';
import { FaTimes, FaDirections, FaMapMarkerAlt, FaCopy, FaExternalLinkAlt, FaRoute, FaWalking, FaCar, FaBicycle } from 'react-icons/fa';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title: string;
  address?: string;
  onGetDirections?: () => void;
}

const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  title,
  address,
  onGetDirections
}) => {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Get user's current location when modal opens
  useEffect(() => {
    if (isOpen && !userLocation) {
      getCurrentLocation();
    }
  }, [isOpen]);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError('');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          calculateDistance(userLoc);
          setGettingLocation(false);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          setLocationError('Unable to get your location. Please enable location services.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setGettingLocation(false);
    }
  };

  const calculateDistance = (userLoc: {lat: number, lng: number}) => {
    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (latitude - userLoc.lat) * Math.PI / 180;
    const dLon = (longitude - userLoc.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceInMiles = R * c;

    if (distanceInMiles < 0.1) {
      setDistance(`${Math.round(distanceInMiles * 5280)} ft`);
      setEstimatedTime('1-2 min walk');
    } else if (distanceInMiles < 1) {
      setDistance(`${(distanceInMiles * 5280).toFixed(0)} ft`);
      setEstimatedTime(`${Math.round(distanceInMiles * 20)} min walk`);
    } else {
      setDistance(`${distanceInMiles.toFixed(1)} mi`);
      setEstimatedTime(`${Math.round(distanceInMiles * 3)} min drive`);
    }
  };

  const copyCoordinates = () => {
    const coords = `${latitude}, ${longitude}`;
    navigator.clipboard.writeText(coords);
    alert('Coordinates copied to clipboard!');
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openInAppleMaps = () => {
    const url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openInWaze = () => {
    const url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    window.open(url, '_blank');
  };

  const getWalkingDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const getDrivingDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const getBicyclingDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=bicycling`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#134369'
            }}>
              Navigate to Location
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#666',
              fontWeight: 'normal'
            }}>
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaTimes size={18} color="#666" />
          </button>
        </div>

        {/* Location Info */}
        <div style={{ padding: '20px' }}>
          {/* Distance and Time */}
          {userLocation && !gettingLocation && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FaMapMarkerAlt size={20} color="#134369" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                  {distance} away
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Estimated: {estimatedTime}
                </div>
              </div>
            </div>
          )}

          {gettingLocation && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#666'
            }}>
              Getting your location...
            </div>
          )}

          {locationError && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              color: '#856404',
              fontSize: '14px'
            }}>
              {locationError}
            </div>
          )}

          {/* Address */}
          {address && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#666'
            }}>
              📍 {address}
            </div>
          )}

          {/* Navigation Apps */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Open in Navigation App
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={openInGoogleMaps}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3367d6'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4285f4'}
              >
                <FaExternalLinkAlt size={16} />
                Google Maps
              </button>

              <button
                onClick={openInAppleMaps}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056cc'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
              >
                <FaExternalLinkAlt size={16} />
                Apple Maps
              </button>

              <button
                onClick={openInWaze}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#33ccff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00b8e6'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#33ccff'}
              >
                <FaExternalLinkAlt size={16} />
                Waze
              </button>
            </div>
          </div>

          {/* Travel Mode Options */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Get Directions By
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={getDrivingDirections}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#495057',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.borderColor = '#134369';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <FaCar size={24} color="#134369" />
                Driving
              </button>

              <button
                onClick={getWalkingDirections}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#495057',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.borderColor = '#134369';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <FaWalking size={24} color="#134369" />
                Walking
              </button>

              <button
                onClick={getBicyclingDirections}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#495057',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.borderColor = '#134369';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <FaBicycle size={24} color="#134369" />
                Cycling
              </button>

              {/* In-App Directions */}
              {onGetDirections && (
                <button
                  onClick={() => {
                    onGetDirections();
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 12px',
                    backgroundColor: '#134369',
                    border: '2px solid #134369',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#0f2d4f';
                    e.currentTarget.style.borderColor = '#0f2d4f';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#134369';
                    e.currentTarget.style.borderColor = '#134369';
                  }}
                >
                  <FaRoute size={24} />
                  In-App
                </button>
              )}
            </div>
          </div>

          {/* Coordinates */}
          <div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Coordinates
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              <span style={{ flex: 1, color: '#495057' }}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
              <button
                onClick={copyCoordinates}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Copy coordinates"
              >
                <FaCopy size={14} color="#134369" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationModal;
