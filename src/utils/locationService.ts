export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'network' | 'fallback';
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
            source
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
      source: 'fallback'
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
      source: 'fallback'
    };
  }
} 