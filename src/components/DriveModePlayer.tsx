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
  const { triggerNearbyVostcard, isDriveModeEnabled } = useDriveMode();
  const { user } = useAuth();
  
  // Track played Drivecards to avoid repeats
  const playedDrivecards = useRef<Set<string>>(new Set());
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // Calculate trigger distance based on speed for ~30 seconds lead time
  const calculateTriggerDistance = useCallback((speed: number): number => {
    // Handle stationary or very slow speeds
    if (speed <= 5) return 0.05; // ~100 yards for walking/stationary
    
    // Base calculation: Speed * time (in hours) = distance
    // We want roughly 15-30 seconds depending on speed
    // Faster speeds get less time to avoid overwhelming the driver
    
    let leadTimeSeconds: number;
    
    if (speed >= 55) {
      // Highway speeds: 15 seconds lead time
      leadTimeSeconds = 15;
    } else if (speed >= 35) {
      // City/suburban speeds: 20-25 seconds lead time  
      leadTimeSeconds = 20 + ((speed - 35) / 20) * 5; // 20-25 seconds
    } else {
      // Slow speeds: 25-30 seconds lead time
      leadTimeSeconds = 25 + ((35 - speed) / 30) * 5; // 25-30 seconds
    }
    
    // Convert to distance: speed (mph) * time (seconds) / 3600 (seconds per hour)
    const distance = speed * (leadTimeSeconds / 3600);
    
    // Minimum distance of 0.05 miles (~90 yards), maximum of 1 mile
    return Math.max(0.05, Math.min(distance, 1.0));
  }, []);

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
      
      // Filter by actual distance and exclude already played
      const nearbyDrivecards = allDrivecards.filter(drivecard => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          drivecard.geo.latitude,
          drivecard.geo.longitude
        );
        
        return (
          distance <= maxDistance && 
          !playedDrivecards.current.has(drivecard.id) &&
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
    
    console.log(`🚗 Checking Drivecards at ${userSpeed} mph (trigger distance: ${(triggerDistance * 5280).toFixed(0)} feet)`);
    
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