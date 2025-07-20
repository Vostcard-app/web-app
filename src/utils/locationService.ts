export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'network' | 'fallback';
  speed?: number; // Speed in mph (if available)
  heading?: number; // Direction in degrees (if available)
  timestamp: number; // When the location was obtained
}

export interface LocationError {
  code: number;
  message: string;
  userFriendlyMessage: string;
  suggestions: string[];
}

export class LocationService {
  private static readonly TIMEOUT_MS = 15000; // 15 seconds
  private static readonly MAX_AGE_MS = 300000; // 5 minutes
  
  /**
   * Get user location with progressive fallback
   */
  static async getCurrentLocation(): Promise<LocationResult> {
    if (!navigator.geolocation) {
      throw this.createLocationError(
        0,
        'Geolocation not supported',
        'Your browser doesn\'t support location services.',
        ['Try using a modern browser like Chrome, Firefox, or Safari']
      );
    }

    // Progressive approach: High accuracy first, then fallback
    const attempts = [
      // Attempt 1: High accuracy (GPS)
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        source: 'gps' as const
      },
      // Attempt 2: Network-based (faster)
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 180000,
        source: 'network' as const
      },
      // Attempt 3: Cached location (very fast)
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000,
        source: 'network' as const
      }
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`📍 Location attempt ${i + 1}/${attempts.length}:`, attempts[i]);
        const result = await this.getLocationWithTimeout(attempts[i]);
        console.log(`✅ Location success on attempt ${i + 1}:`, result);
        return result;
      } catch (error) {
        console.warn(`❌ Location attempt ${i + 1} failed:`, error);
        if (i === attempts.length - 1) {
          throw error; // Last attempt failed
        }
      }
    }

    throw this.createLocationError(
      3,
      'All location attempts failed',
      'Unable to get your location after multiple attempts.',
      ['Check your location settings', 'Try refreshing the page']
    );
  }

  /**
   * Get location with timeout wrapper
   */
  private static getLocationWithTimeout(options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
    source: 'gps' | 'network';
  }): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      const { source, ...geoOptions } = options;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source,
            speed: position.coords.speed ? position.coords.speed * 2.237 : undefined, // Convert m/s to mph
            heading: position.coords.heading || undefined,
            timestamp: Date.now()
          });
        },
        (error) => {
          reject(this.createLocationError(
            error.code,
            error.message,
            this.getErrorMessage(error.code),
            this.getErrorSuggestions(error.code)
          ));
        },
        geoOptions
      );
    });
  }

  /**
   * Check if location is available
   */
  static async checkLocationAvailability(): Promise<boolean> {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state !== 'denied';
    } catch (error) {
      console.warn('Permission check failed:', error);
      return !!navigator.geolocation;
    }
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(code: number): string {
    switch (code) {
      case 1: // PERMISSION_DENIED
        return 'Location access was denied. Please allow location permissions.';
      case 2: // POSITION_UNAVAILABLE
        return 'Your location is currently unavailable. Please check your device settings.';
      case 3: // TIMEOUT
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get your location. Please check your settings.';
    }
  }

  /**
   * Get error suggestions
   */
  private static getErrorSuggestions(code: number): string[] {
    switch (code) {
      case 1: // PERMISSION_DENIED
        return [
          'Click the location icon in your browser\'s address bar',
          'Go to Settings > Privacy & Security > Location Services',
          'Make sure location is enabled for your browser',
          'Try refreshing the page and allowing location access'
        ];
      case 2: // POSITION_UNAVAILABLE
        return [
          'Check if location services are enabled on your device',
          'Try moving to an area with better GPS signal',
          'Restart your device if the issue persists',
          'Check if you\'re using the app over HTTPS'
        ];
      case 3: // TIMEOUT
        return [
          'Try again in a few seconds',
          'Check your internet connection',
          'Move to an area with better signal',
          'Restart the app if the problem continues'
        ];
      default:
        return [
          'Check your browser settings',
          'Try using a different browser',
          'Contact support if the issue persists'
        ];
    }
  }

  /**
   * Create structured location error
   */
  private static createLocationError(
    code: number,
    message: string,
    userFriendlyMessage: string,
    suggestions: string[]
  ): LocationError {
    return {
      code,
      message,
      userFriendlyMessage,
      suggestions
    };
  }

  /**
   * Get fallback location for New York area
   */
  static getFallbackLocation(): LocationResult {
    // Default to NYC coordinates if location fails
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 0,
      source: 'fallback',
      timestamp: Date.now()
    };
  }

  // Add NYC-specific configuration
  private static readonly NYC_BOUNDS = {
    north: 40.9176,
    south: 40.4774,
    east: -73.7004,
    west: -74.2591
  };

  /**
   * Check if coordinates are in NYC area
   */
  static isInNYC(latitude: number, longitude: number): boolean {
    return latitude >= this.NYC_BOUNDS.south &&
           latitude <= this.NYC_BOUNDS.north &&
           longitude >= this.NYC_BOUNDS.west &&
           longitude <= this.NYC_BOUNDS.east;
  }

  /**
   * Get NYC-specific fallback location
   */
  static getNYCFallbackLocation(): LocationResult {
    // Manhattan center coordinates
    return {
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 0,
      source: 'fallback',
      timestamp: Date.now()
    };
  }

  // === DRIVE MODE ENHANCEMENTS ===

  private static watchId: number | null = null;
  private static lastKnownLocation: LocationResult | null = null;
  private static locationHistory: LocationResult[] = [];
  private static speedUpdateCallback: ((speed: number) => void) | null = null;
  private static locationUpdateCallback: ((location: LocationResult) => void) | null = null;

  /**
   * Start continuous location tracking for Drive Mode
   */
  static startContinuousTracking(
    onLocationUpdate: (location: LocationResult) => void,
    onSpeedUpdate: (speed: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Store callbacks
      this.locationUpdateCallback = onLocationUpdate;
      this.speedUpdateCallback = onSpeedUpdate;

      // High accuracy options for driving
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // 5 seconds max age for drive mode
      };

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationResult = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps',
            speed: position.coords.speed ? position.coords.speed * 2.237 : undefined, // Convert m/s to mph
            heading: position.coords.heading || undefined,
            timestamp: Date.now()
          };

          // Calculate speed if GPS doesn't provide it
          const calculatedSpeed = this.calculateSpeedFromHistory(location);
          if (!location.speed && calculatedSpeed !== null) {
            location.speed = calculatedSpeed;
          }

          // Update location history (keep last 10 locations)
          this.locationHistory.push(location);
          if (this.locationHistory.length > 10) {
            this.locationHistory.shift();
          }

          this.lastKnownLocation = location;

          // Call callbacks
          onLocationUpdate(location);
          if (location.speed !== undefined) {
            onSpeedUpdate(location.speed);
          }

          console.log(`📍 Drive Mode location update: ${location.latitude}, ${location.longitude}, Speed: ${location.speed?.toFixed(1) || 'Unknown'} mph`);
        },
        (error) => {
          console.error('Drive Mode location error:', error);
          // Don't reject on single failures, keep trying
        },
        options
      );

      // Resolve immediately since watchPosition is async
      resolve();
    });
  }

  /**
   * Stop continuous location tracking
   */
  static stopContinuousTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.locationUpdateCallback = null;
    this.speedUpdateCallback = null;
    this.locationHistory = [];
    
    console.log('📍 Stopped continuous location tracking');
  }

  /**
   * Calculate speed from location history when GPS doesn't provide it
   */
  private static calculateSpeedFromHistory(currentLocation: LocationResult): number | null {
    if (this.locationHistory.length === 0) return null;

    const lastLocation = this.locationHistory[this.locationHistory.length - 1];
    const timeDiff = (currentLocation.timestamp - lastLocation.timestamp) / 1000; // seconds
    
    if (timeDiff < 2) return null; // Too short interval for accurate calculation

    const distance = this.calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    // Convert distance (miles) and time (seconds) to mph
    const speed = (distance / timeDiff) * 3600; // miles per hour
    
    // Filter out unrealistic speeds (over 200 mph indicates GPS error)
    return speed > 200 ? null : speed;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private static calculateDistance(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number {
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
   * Convert degrees to radians
   */
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get current speed (mph) from most recent location
   */
  static getCurrentSpeed(): number {
    return this.lastKnownLocation?.speed || 0;
  }

  /**
   * Check if user is currently driving (speed > threshold)
   */
  static isDriving(speedThreshold: number = 15): boolean {
    const speed = this.getCurrentSpeed();
    return speed > speedThreshold;
  }

  /**
   * Get smoothed speed from recent history
   */
  static getAverageSpeed(samples: number = 5): number {
    if (this.locationHistory.length === 0) return 0;
    
    const recentLocations = this.locationHistory.slice(-samples);
    const speedReadings = recentLocations
      .map(loc => loc.speed)
      .filter(speed => speed !== undefined) as number[];
    
    if (speedReadings.length === 0) return 0;
    
    return speedReadings.reduce((sum, speed) => sum + speed, 0) / speedReadings.length;
  }

  /**
   * Find vostcards within specified radius
   */
  static findNearbyVostcards(
    userLocation: LocationResult, 
    vostcards: any[], 
    radiusMiles: number = 0.33
  ): any[] {
    return vostcards.filter(vostcard => {
      if (!vostcard.latitude || !vostcard.longitude) return false;
      
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        vostcard.latitude,
        vostcard.longitude
      );
      
      return distance <= radiusMiles;
    });
  }

  /**
   * Check if location has good accuracy for driving
   */
  static hasGoodAccuracy(location: LocationResult): boolean {
    // Good accuracy for driving: within 20 meters (65 feet)
    return location.accuracy <= 20;
  }

  /**
   * Get last known location
   */
  static getLastKnownLocation(): LocationResult | null {
    return this.lastKnownLocation;
  }

  /**
   * Get location history for debugging
   */
  static getLocationHistory(): LocationResult[] {
    return [...this.locationHistory];
  }
} 