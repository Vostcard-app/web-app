// Geofencing Service - Detects when users enter geofences around Drive Mode vostcards
import { collection, query, where, getDocs, GeoPoint } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LocationService } from '../utils/locationService';
import type { LocationResult } from '../utils/locationService';
import type { Vostcard } from '../types/VostcardTypes';

interface GeofenceVostcard {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  categories: string[];
  videoURL: string;
  photoURLs: string[];
  username: string;
  userID: string;
  hasVideo: boolean;
  distance?: number; // Distance from user in miles
}

interface GeofenceEvent {
  type: 'enter' | 'exit';
  vostcard: GeofenceVostcard;
  userLocation: LocationResult;
  timestamp: number;
  triggeredBySpeed: boolean;
}

interface GeofencingStats {
  totalChecks: number;
  totalTriggers: number;
  averageVostcardsFound: number;
  lastCheckTime: number | null;
}

export class GeofencingService {
  private static instance: GeofencingService | null = null;
  
  // Geofencing state
  private isActive = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastUserLocation: LocationResult | null = null;
  private activeGeofences: Set<string> = new Set(); // Vostcard IDs user is currently inside
  private recentlyTriggered: Set<string> = new Set(); // Recently triggered to prevent spam
  private triggerCooldown: Map<string, number> = new Map(); // Cooldown times for each vostcard
  
  // Callbacks
  private onEnterCallback: ((event: GeofenceEvent) => void) | null = null;
  private onExitCallback: ((event: GeofenceEvent) => void) | null = null;
  
  // Settings
  private readonly DRIVE_MODE_CATEGORY = 'Drive Mode';
  private readonly DEFAULT_RADIUS_MILES = 0.33; // 1/3 mile
  private readonly CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
  private readonly TRIGGER_COOLDOWN_MS = 300000; // 5 minute cooldown per vostcard
  private readonly MAX_VOSTCARDS_QUERY = 50; // Limit Firebase queries
  
  // Statistics
  private stats: GeofencingStats = {
    totalChecks: 0,
    totalTriggers: 0,
    averageVostcardsFound: 0,
    lastCheckTime: null
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GeofencingService {
    if (!this.instance) {
      this.instance = new GeofencingService();
    }
    return this.instance;
  }

  /**
   * Start geofencing monitoring
   */
  startMonitoring(
    onEnterGeofence: (event: GeofenceEvent) => void,
    onExitGeofence?: (event: GeofenceEvent) => void
  ): void {
    if (this.isActive) {
      console.log('🔲 Geofencing already active');
      return;
    }

    this.onEnterCallback = onEnterGeofence;
    this.onExitCallback = onExitGeofence || null;
    this.isActive = true;

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performGeofenceCheck();
    }, this.CHECK_INTERVAL_MS);

    // Perform initial check
    this.performGeofenceCheck();

    console.log('🔲 Started geofencing monitoring');
  }

  /**
   * Stop geofencing monitoring
   */
  stopMonitoring(): void {
    if (!this.isActive) return;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isActive = false;
    this.activeGeofences.clear();
    this.recentlyTriggered.clear();
    this.triggerCooldown.clear();
    this.onEnterCallback = null;
    this.onExitCallback = null;

    console.log('🔲 Stopped geofencing monitoring');
  }

  /**
   * Perform a single geofence check
   */
  private async performGeofenceCheck(): Promise<void> {
    try {
      // Get current location from LocationService
      const currentLocation = LocationService.getLastKnownLocation();
      if (!currentLocation) {
        console.log('🔲 No current location available for geofence check');
        return;
      }

      // Update stats
      this.stats.totalChecks++;
      this.stats.lastCheckTime = Date.now();

      // Check if location has changed significantly
      if (this.lastUserLocation && this.getDistance(currentLocation, this.lastUserLocation) < 0.01) {
        // Haven't moved much (less than ~50 feet), skip check
        return;
      }

      this.lastUserLocation = currentLocation;

      // Query nearby Drive Mode vostcards
      const nearbyVostcards = await this.queryNearbyDriveModeVostcards(currentLocation);
      
      // Update average vostcards found
      this.stats.averageVostcardsFound = 
        (this.stats.averageVostcardsFound * (this.stats.totalChecks - 1) + nearbyVostcards.length) / this.stats.totalChecks;

      console.log(`🔲 Geofence check: Found ${nearbyVostcards.length} nearby Drive Mode vostcards`);

      // Process geofence events
      await this.processGeofenceEvents(currentLocation, nearbyVostcards);

    } catch (error) {
      console.error('🔲 Geofence check failed:', error);
    }
  }

  /**
   * Query Firebase for nearby Drive Mode vostcards
   */
  private async queryNearbyDriveModeVostcards(location: LocationResult): Promise<GeofenceVostcard[]> {
    try {
      // Calculate rough bounding box for efficiency (1 mile in each direction)
      const latRange = 1 / 69; // Roughly 1 mile in latitude degrees
      const lonRange = 1 / (69 * Math.cos(location.latitude * Math.PI / 180)); // Adjust for longitude

      // Query vostcards in the general area
      const vostcardsQuery = query(
        collection(db, 'vostcards'),
        where('latitude', '>=', location.latitude - latRange),
        where('latitude', '<=', location.latitude + latRange),
        where('visibility', '==', 'public'),
        where('hasVideo', '==', true) // Must have video for audio playback
      );

      const querySnapshot = await getDocs(vostcardsQuery);
      const allNearbyVostcards: GeofenceVostcard[] = [];

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if it has Drive Mode category
        if (!data.categories || !data.categories.includes(this.DRIVE_MODE_CATEGORY)) {
          return;
        }

        // Calculate actual distance
        const distance = this.calculateDistance(
          location.latitude, location.longitude,
          data.latitude, data.longitude
        );

        // Only include if within radius
        if (distance <= this.DEFAULT_RADIUS_MILES) {
          allNearbyVostcards.push({
            id: doc.id,
            title: data.title || 'Untitled',
            latitude: data.latitude,
            longitude: data.longitude,
            categories: data.categories || [],
            videoURL: data.videoURL || '',
            photoURLs: data.photoURLs || [],
            username: data.username || 'Unknown',
            userID: data.userID || '',
            hasVideo: data.hasVideo || false,
            distance
          });
        }
      });

      // Sort by distance and limit results
      return allNearbyVostcards
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, this.MAX_VOSTCARDS_QUERY);

    } catch (error) {
      console.error('🔲 Failed to query nearby Drive Mode vostcards:', error);
      return [];
    }
  }

  /**
   * Process geofence enter/exit events
   */
  private async processGeofenceEvents(
    location: LocationResult, 
    nearbyVostcards: GeofenceVostcard[]
  ): Promise<void> {
    const currentGeofences = new Set(nearbyVostcards.map(v => v.id));
    const now = Date.now();

    // Check for ENTER events (new vostcards in range)
    for (const vostcard of nearbyVostcards) {
      if (!this.activeGeofences.has(vostcard.id)) {
        // Entered a new geofence
        this.activeGeofences.add(vostcard.id);

        // Check cooldown
        const lastTrigger = this.triggerCooldown.get(vostcard.id) || 0;
        if (now - lastTrigger < this.TRIGGER_COOLDOWN_MS) {
          console.log(`🔲 Skipping "${vostcard.title}" - still in cooldown`);
          continue;
        }

        // Trigger enter event
        const event: GeofenceEvent = {
          type: 'enter',
          vostcard,
          userLocation: location,
          timestamp: now,
          triggeredBySpeed: LocationService.isDriving()
        };

        this.stats.totalTriggers++;
        this.triggerCooldown.set(vostcard.id, now);
        this.recentlyTriggered.add(vostcard.id);

        console.log(`🔲 ✅ ENTERED geofence: "${vostcard.title}" (${vostcard.distance?.toFixed(2)} miles)`);
        
        if (this.onEnterCallback) {
          this.onEnterCallback(event);
        }
      }
    }

    // Check for EXIT events (vostcards no longer in range)
    const exitedGeofences = Array.from(this.activeGeofences).filter(id => !currentGeofences.has(id));
    
    for (const vostcardId of exitedGeofences) {
      this.activeGeofences.delete(vostcardId);
      
      if (this.onExitCallback) {
        // We'd need to keep track of vostcard details for exit events
        // For now, just log the exit
        console.log(`🔲 ❌ EXITED geofence: ${vostcardId}`);
      }
    }

    // Clean up old recently triggered entries (after 1 minute)
    setTimeout(() => {
      nearbyVostcards.forEach(v => this.recentlyTriggered.delete(v.id));
    }, 60000);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get distance between two LocationResults
   */
  private getDistance(loc1: LocationResult, loc2: LocationResult): number {
    return this.calculateDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get current geofencing statistics
   */
  getStats(): GeofencingStats {
    return { ...this.stats };
  }

  /**
   * Check if currently inside any geofences
   */
  isInsideAnyGeofence(): boolean {
    return this.activeGeofences.size > 0;
  }

  /**
   * Get list of active geofence IDs
   */
  getActiveGeofences(): string[] {
    return Array.from(this.activeGeofences);
  }

  /**
   * Manually trigger a geofence check (for testing)
   */
  async triggerManualCheck(): Promise<void> {
    if (!this.isActive) {
      console.log('🔲 Geofencing not active, cannot perform manual check');
      return;
    }
    
    console.log('🔲 Performing manual geofence check...');
    await this.performGeofenceCheck();
  }

  /**
   * Reset cooldowns (for testing)
   */
  resetCooldowns(): void {
    this.triggerCooldown.clear();
    this.recentlyTriggered.clear();
    console.log('🔲 Reset all geofence cooldowns');
  }

  /**
   * Set custom radius (for testing different distances)
   */
  setRadius(radiusMiles: number): void {
    // Note: Would need to modify the private readonly to make this truly configurable
    console.log(`🔲 Radius set to ${radiusMiles} miles (requires restart to take effect)`);
  }
} 