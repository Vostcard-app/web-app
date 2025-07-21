import React, { useEffect, useRef, useCallback } from 'react';
import { useDriveMode } from '../context/DriveModeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Drivecard } from '../types/VostcardTypes';

interface DriveModePlayerProps {
  userLocation: { latitude: number; longitude: number } | null;
  userSpeed: number; // mph
  isEnabled: boolean;
}

const DriveModePlayer: React.FC<DriveModePlayerProps> = ({
  userLocation,
  userSpeed,
  isEnabled
}) => {
  const { triggerNearbyVostcard, isDriveModeEnabled, settings } = useDriveMode();
  const { user } = useAuth();
  
  // Track played Drivecards to avoid repeats
  const playedDrivecards = useRef<Set<string>>(new Set());
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // Calculate trigger distance based on settings and speed
  const calculateTriggerDistance = useCallback((speed: number): number => {
    // Use fixed distance mode
    if (!settings.usePredictiveTrigger) {
      return settings.triggerDistance;
    }
    
    // Use predictive mode - calculate distance based on speed and lead time
    
    // Handle stationary or very slow speeds
    if (speed <= 5) return 0.05; // ~100 yards for walking/stationary
    
    // Convert speed (mph) and lead time (seconds) to distance (miles)
    // Distance = speed × time, where time is converted from seconds to hours
    const leadTimeHours = settings.predictiveLeadTime / 3600;
    const distance = speed * leadTimeHours;
    
    // Apply reasonable limits: minimum 0.05 miles (~90 yards), maximum 2 miles
    return Math.max(0.05, Math.min(distance, 2.0));
  }, [settings.usePredictiveTrigger, settings.triggerDistance, settings.predictiveLeadTime]);

  // Calculate distance between two coordinates in miles
  const calculateDistance = useCallback((
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Load nearby Drivecards from Firebase
  const loadNearbyDrivecards = useCallback(async (
    location: { latitude: number; longitude: number }, 
    maxDistance: number
  ): Promise<Drivecard[]> => {
    try {
      // Query Drivecards within a reasonable radius (we'll filter more precisely afterward)
      // Firebase doesn't support radius queries, so we'll get a broad area and filter in-memory
      const searchRadius = Math.max(maxDistance * 2, 0.1); // At least 0.1 mile search radius
      
      const latRange = searchRadius / 69; // Approximate miles per degree latitude
      const lonRange = searchRadius / (69 * Math.cos(location.latitude * Math.PI / 180));
      
      const q = query(
        collection(db, 'drivecards'),
        where('latitude', '>=', location.latitude - latRange),
        where('latitude', '<=', location.latitude + latRange)
      );
      
      const snapshot = await getDocs(q);
      const allDrivecards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Drivecard[];
      
      // Filter by actual distance, exclude already played, and apply category filters
      const nearbyDrivecards = allDrivecards.filter(drivecard => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          drivecard.geo.latitude,
          drivecard.geo.longitude
        );
        
        // Check if the drivecard's category is in the excluded list
        const hasExcludedCategory = settings.excludedCategories?.includes(drivecard.category) || false;
        
        return (
          distance <= maxDistance && 
          !playedDrivecards.current.has(drivecard.id) &&
          !hasExcludedCategory &&
          Math.abs(drivecard.geo.longitude - location.longitude) <= lonRange
        );
      });
      
      console.log(`🔍 Found ${nearbyDrivecards.length} nearby Drivecards within ${maxDistance.toFixed(3)} miles`);
      return nearbyDrivecards;
      
    } catch (error) {
      console.error('❌ Failed to load nearby Drivecards:', error);
      return [];
    }
  }, [calculateDistance]);

  // Check for Drivecards to trigger
  const checkForDrivecards = useCallback(async () => {
    if (!isEnabled || !isDriveModeEnabled || !userLocation || !user) {
      return;
    }
    
    // Skip if location hasn't changed significantly (< 50 feet)
    if (lastLocationRef.current) {
      const distanceMoved = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (distanceMoved < 0.01) { // Less than ~50 feet
        return;
      }
    }
    
    lastLocationRef.current = userLocation;
    
    const triggerDistance = calculateTriggerDistance(userSpeed);
    
    const modeText = settings.usePredictiveTrigger 
      ? `predictive mode, ${settings.predictiveLeadTime}s lead time`
      : `fixed distance mode`;
    
    console.log(`🚗 Checking Drivecards at ${userSpeed} mph (${modeText}, trigger distance: ${(triggerDistance * 5280).toFixed(0)} feet)`);
    
    const nearbyDrivecards = await loadNearbyDrivecards(userLocation, triggerDistance);
    
    if (nearbyDrivecards.length > 0) {
      // Sort by distance and play the closest one
      const sortedDrivecards = nearbyDrivecards
        .map(drivecard => ({
          drivecard,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            drivecard.geo.latitude,
            drivecard.geo.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance);
      
      const closest = sortedDrivecards[0];
      
      console.log(`🎵 Triggering Drivecard: "${closest.drivecard.title}" (${(closest.distance * 5280).toFixed(0)} feet away)`);
      
      // Mark as played and trigger playback
      playedDrivecards.current.add(closest.drivecard.id);
      
      // Convert Drivecard to Vostcard format for the existing drive mode system
      const vostcardForPlayback = {
        id: closest.drivecard.id,
        title: closest.drivecard.title,
        description: `Drive Mode: ${closest.drivecard.title}`,
        categories: ['Drive mode'],
        username: closest.drivecard.username,
        userID: closest.drivecard.userID,
        geo: closest.drivecard.geo,
        createdAt: closest.drivecard.createdAt,
        updatedAt: closest.drivecard.updatedAt,
        // Audio will be handled by the drive mode context
        video: closest.drivecard.audio, // Use audio as video for existing playback system
        _firebaseVideoURL: closest.drivecard._firebaseAudioURL,
        state: 'posted' as const,
        photos: [],
        isQuickcard: false
      };
      
      triggerNearbyVostcard(vostcardForPlayback as any);
    }
  }, [
    isEnabled,
    isDriveModeEnabled,
    userLocation,
    userSpeed,
    user,
    calculateDistance,
    calculateTriggerDistance,
    loadNearbyDrivecards,
    triggerNearbyVostcard
  ]);

  // Check for Drivecards periodically when driving
  useEffect(() => {
    if (!isEnabled || !isDriveModeEnabled || !userLocation) {
      return;
    }
    
    // Check immediately
    checkForDrivecards();
    
    // Set up periodic checking based on speed
    let interval: NodeJS.Timeout;
    
    if (userSpeed > 35) {
      // Highway speeds: check every 2 seconds
      interval = setInterval(checkForDrivecards, 2000);
    } else if (userSpeed > 15) {
      // City speeds: check every 3 seconds  
      interval = setInterval(checkForDrivecards, 3000);
    } else if (userSpeed > 5) {
      // Slow speeds: check every 5 seconds
      interval = setInterval(checkForDrivecards, 5000);
    } else {
      // Stationary: check every 10 seconds
      interval = setInterval(checkForDrivecards, 10000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isEnabled, isDriveModeEnabled, userLocation, userSpeed, checkForDrivecards]);

  // Clear played Drivecards when Drive Mode is disabled
  useEffect(() => {
    if (!isDriveModeEnabled) {
      playedDrivecards.current.clear();
      lastLocationRef.current = null;
    }
  }, [isDriveModeEnabled]);

  // This component doesn't render anything - it's purely functional
  return null;
};

export default DriveModePlayer; 