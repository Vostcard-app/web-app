// Drive Mode Integration - Complete integration of all Drive Mode features
import React, { useEffect, useState } from 'react';
import { DriveModeProvider, useDriveMode } from '../context/DriveModeContext';
import { DriveModeUI } from './DriveModeUI';
import { LocationService } from '../utils/locationService';
import { GeofencingService } from '../services/geofencingService';
import type { LocationResult } from '../utils/locationService';

// Enhanced category list with Drive Mode
export const VOSTCARD_CATEGORIES = [
  'View',
  'Entertainment',
  'Food & Dining',
  'Shopping',
  'Travel & Tourism',
  'Health & Wellness',
  'Education',
  'Business',
  'Events',
  'Community',
  'Art & Culture',
  'Sports & Recreation',
  'Technology',
  'Drive Mode', // New category for location-triggered content
  'Other'
] as const;

export type VostcardCategory = typeof VOSTCARD_CATEGORIES[number];

interface DriveModeIntegrationProps {
  children: React.ReactNode;
}

// Main integration component
export const DriveModeIntegration: React.FC<DriveModeIntegrationProps> = ({ children }) => {
  return (
    <DriveModeProvider>
      <DriveModeController>
        {children}
      </DriveModeController>
    </DriveModeProvider>
  );
};

// Drive Mode controller that manages location tracking and geofencing
const DriveModeController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const driveMode = useDriveMode();
  const [showDriveModeUI, setShowDriveModeUI] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  // Initialize location tracking when drive mode is enabled
  useEffect(() => {
    if (driveMode.isDriveModeEnabled && locationPermissionGranted) {
      startLocationTracking();
      startGeofencing();
    } else {
      stopLocationTracking();
      stopGeofencing();
    }

    return () => {
      stopLocationTracking();
      stopGeofencing();
    };
  }, [driveMode.isDriveModeEnabled, locationPermissionGranted]);

  // Check for location permissions on mount
  useEffect(() => {
    checkLocationPermissions();
  }, []);

  const checkLocationPermissions = async () => {
    try {
      const hasPermission = await LocationService.checkLocationAvailability();
      setLocationPermissionGranted(hasPermission);
      
      if (!hasPermission) {
        console.warn('🚗 Location permission required for Drive Mode');
      }
    } catch (error) {
      console.error('Failed to check location permissions:', error);
      setLocationPermissionGranted(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('🚗 Starting location tracking for Drive Mode...');
      
      await LocationService.startContinuousTracking(
        (location: LocationResult) => {
          // Handle location updates
          console.log(`📍 Location update: ${location.latitude}, ${location.longitude}, Speed: ${location.speed || 'Unknown'} mph`);
        },
        (speed: number) => {
          // Handle speed updates
          driveMode.updateSpeed(speed);
          console.log(`🚗 Speed update: ${speed.toFixed(1)} mph`);
        }
      );
      
      console.log('✅ Location tracking started for Drive Mode');
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    LocationService.stopContinuousTracking();
    console.log('🛑 Stopped location tracking');
  };

  const startGeofencing = () => {
    try {
      const geofencingService = GeofencingService.getInstance();
      
      geofencingService.startMonitoring(
        // On enter geofence (vostcard nearby)
        (event) => {
          console.log(`🔲 ✅ Entered geofence for: "${event.vostcard.title}"`);
          
          // Convert GeofenceVostcard to Vostcard format
          const vostcard = {
            id: event.vostcard.id,
            title: event.vostcard.title,
            description: '', // Not available in geofence data
            username: event.vostcard.username,
            userID: event.vostcard.userID,
            categories: event.vostcard.categories,
            state: 'posted' as const,
            video: null, // Will be loaded from Firebase URL
            photos: [],
            geo: {
              latitude: event.vostcard.latitude,
              longitude: event.vostcard.longitude
            },
            _firebaseVideoURL: event.vostcard.videoURL,
            _firebasePhotoURLs: event.vostcard.photoURLs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Trigger the vostcard in drive mode
          driveMode.triggerNearbyVostcard(vostcard);
        },
        // On exit geofence (optional)
        (event) => {
          console.log(`🔲 ❌ Exited geofence for: "${event.vostcard.title}"`);
        }
      );
      
      console.log('✅ Geofencing started for Drive Mode');
    } catch (error) {
      console.error('❌ Failed to start geofencing:', error);
    }
  };

  const stopGeofencing = () => {
    const geofencingService = GeofencingService.getInstance();
    geofencingService.stopMonitoring();
    console.log('🛑 Stopped geofencing');
  };

  const handleShowDriveModeUI = () => {
    setShowDriveModeUI(true);
  };

  const handleHideDriveModeUI = () => {
    setShowDriveModeUI(false);
  };

  const handleDriveModeSettings = () => {
    // Could open a settings modal
    console.log('🚗 Drive Mode settings requested');
  };

  return (
    <>
      {children}
      
      {/* Drive Mode UI overlay when active */}
      {driveMode.isDriveModeEnabled && showDriveModeUI && (
        <DriveModeUI
          onExit={handleHideDriveModeUI}
          onSettings={handleDriveModeSettings}
        />
      )}

      {/* Drive Mode indicator/trigger button when enabled but UI not shown */}
      {driveMode.isDriveModeEnabled && !showDriveModeUI && (
        <div
          onClick={handleShowDriveModeUI}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            fontSize: '24px',
            border: '3px solid #fff'
          }}
          title="Drive Mode Active - Tap to view"
        >
          🚗
        </div>
      )}
    </>
  );
};

// Helper component to add Drive Mode toggle to existing UI
export const DriveModeToggle: React.FC = () => {
  const {
    isDriveModeEnabled,
    enableDriveMode,
    disableDriveMode,
    settings,
    updateSettings,
    currentSpeed
  } = useDriveMode();

  const handleToggle = () => {
    if (isDriveModeEnabled) {
      disableDriveMode();
    } else {
      enableDriveMode(true); // Manual enable
    }
  };

  const handleAutoEnableToggle = () => {
    updateSettings({
      isEnabled: !settings.isEnabled
    });
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      margin: '10px 0'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>🚗 Drive Mode</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Manual toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={isDriveModeEnabled}
            onChange={handleToggle}
          />
          <span>Drive Mode Active ({currentSpeed.toFixed(0)} mph)</span>
        </label>

        {/* Auto-enable setting */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={settings.isEnabled}
            onChange={handleAutoEnableToggle}
          />
          <span>Auto-enable at {settings.autoEnableSpeed} mph</span>
        </label>

        {/* Speed threshold setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label>Auto-enable speed:</label>
          <input
            type="range"
            min="15"
            max="45"
            step="5"
            value={settings.autoEnableSpeed}
            onChange={(e) => updateSettings({ autoEnableSpeed: parseInt(e.target.value) })}
          />
          <span>{settings.autoEnableSpeed} mph</span>
        </div>

        {/* Trigger distance setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label>Trigger distance:</label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={settings.triggerDistance}
            onChange={(e) => updateSettings({ triggerDistance: parseFloat(e.target.value) })}
          />
          <span>{settings.triggerDistance} miles</span>
        </div>
      </div>

      {isDriveModeEnabled && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#4CAF50',
          color: 'white',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          ✅ Drive Mode active - Listening for nearby vostcards with "Drive Mode" category
        </div>
      )}
    </div>
  );
};

// Example usage component
export const DriveModeExample: React.FC = () => {
  return (
    <DriveModeIntegration>
      <div style={{ padding: '20px' }}>
        <h1>Vostcard App with Drive Mode</h1>
        
        <DriveModeToggle />
        
        <div style={{ marginTop: '30px' }}>
          <h2>How Drive Mode Works:</h2>
          <ol>
            <li><strong>Speed Detection:</strong> Automatically enables at 25+ mph</li>
            <li><strong>Location Monitoring:</strong> Continuously tracks GPS location</li>
            <li><strong>Geofencing:</strong> Detects vostcards within 1/3 mile radius</li>
            <li><strong>Category Filtering:</strong> Only triggers "Drive Mode" category vostcards</li>
            <li><strong>Audio-only Playback:</strong> Extracts audio from video for safe driving</li>
            <li><strong>Queue Management:</strong> Multiple nearby vostcards are queued automatically</li>
            <li><strong>Safety Features:</strong> Large buttons, voice feedback, reduced volume</li>
          </ol>

          <h3>Creating Drive Mode Content:</h3>
          <p>When creating a vostcard, select <strong>"Drive Mode"</strong> from the categories to make it discoverable by drivers.</p>
          
          <h3>Technical Features:</h3>
          <ul>
            <li>🎵 Audio extraction from video files</li>
            <li>📍 Real-time GPS tracking and speed calculation</li>
            <li>🔲 Efficient geofencing with Firebase queries</li>
            <li>⚡ Background location services</li>
            <li>🔊 Automatic volume adjustment for safety</li>
            <li>📊 Statistics tracking (triggers, play time, average speed)</li>
          </ul>
        </div>
      </div>
    </DriveModeIntegration>
  );
}; 