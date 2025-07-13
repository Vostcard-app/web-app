export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayAddress: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  displayAddress: string;
  // Optional: keep original address components for reference
  streetAddress?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
}

export interface BusinessAddress {
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface MapLocation {
  latitude: number;
  longitude: number;
  displayAddress: string; // Human-readable description of the location
  setBy: 'user' | 'address'; // How the location was set
  setAt: Date; // When it was set
}

export class GeocodingService {
  /**
   * Geocode an address to get coordinates
   */
  static async geocodeAddress(
    streetAddress: string,
    city: string,
    stateProvince: string,
    postalCode: string,
    country: string
  ): Promise<GeocodingResult> {
    try {
      console.log('🌍 Geocoding store address...');
      
      // Check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // In development, return mock data or use a different approach
        console.log('🚧 Development mode: Using mock geocoding data');
        
        // Create a mock response based on the input
        const fullAddress = [streetAddress, city, stateProvince, postalCode, country]
          .filter(part => part && part.trim())
          .join(', ');
        
        // Return mock coordinates (Dublin, Ireland area as fallback)
        return {
          latitude: 53.3498 + (Math.random() - 0.5) * 0.1, // Add some randomness
          longitude: -6.2603 + (Math.random() - 0.5) * 0.1,
          displayAddress: fullAddress || 'Mock Location'
        };
      }
      
      const response = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'forward',
          streetAddress,
          city,
          stateProvince,
          postalCode,
          country
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Geocoding error: ${response.status}`);
      }

      console.log('✅ Geocoding successful:', data);
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        displayAddress: data.displayAddress
      };
      
    } catch (error) {
      console.error('❌ Geocoding failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to geocode address');
    }
  }
  
  /**
   * Validate if an address has all required fields for geocoding
   */
  static validateAddress(
    streetAddress: string,
    city: string,
    stateProvince: string,
    country: string
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    if (!streetAddress?.trim()) missingFields.push('Street Address');
    if (!city?.trim()) missingFields.push('City');
    if (!stateProvince?.trim()) missingFields.push('State/Province');
    if (!country?.trim()) missingFields.push('Country');
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  // Add address formatting helper
  static formatAddressForGeocoding(
    streetAddress: string,
    city: string,
    stateProvince: string,
    postalCode: string,
    country: string
  ): string {
    const parts = [
      streetAddress?.trim(),
      city?.trim(),
      stateProvince?.trim(),
      postalCode?.trim(),
      country?.trim()
    ].filter(part => part);
    
    return parts.join(', ');
  }

  // Add a fallback geocoding method
  static async geocodeAddressWithFallback(
    streetAddress: string,
    city: string,
    stateProvince: string,
    postalCode: string,
    country: string
  ): Promise<GeocodingResult> {
    // Try full address first
    try {
      return await this.geocodeAddress(streetAddress, city, stateProvince, postalCode, country);
    } catch (error) {
      console.warn('Full address geocoding failed, trying with city only...', error);
      
      // Fallback to city + state + country
      try {
        return await this.geocodeAddress('', city, stateProvince, postalCode, country);
      } catch (fallbackError) {
        console.warn('City geocoding failed, trying with state only...', fallbackError);
        
        // Final fallback to state + country
        return await this.geocodeAddress('', '', stateProvince, postalCode, country);
      }
    }
  }

  /**
   * Geocode address and return location data immediately
   */
  static async geocodeToLocation(
    streetAddress: string,
    city: string,
    stateProvince: string,
    postalCode: string,
    country: string
  ): Promise<LocationData> {
    try {
      const result = await this.geocodeAddressWithFallback(
        streetAddress,
        city,
        stateProvince,
        postalCode,
        country
      );

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        displayAddress: result.displayAddress,
        streetAddress,
        city,
        stateProvince,
        postalCode,
        country
      };
    } catch (error) {
      throw new Error(`Failed to geocode address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate location data
   */
  static validateLocation(location: LocationData | null): boolean {
    if (!location) return false;
    return !isNaN(location.latitude) && !isNaN(location.longitude) && 
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }

  /**
   * Validate business address
   */
  static validateBusinessAddress(address: BusinessAddress | null): { isValid: boolean; missingFields: string[] } {
    if (!address) return { isValid: false, missingFields: ['All address fields'] };
    
    const missingFields: string[] = [];
    
    if (!address.streetAddress?.trim()) missingFields.push('Street Address');
    if (!address.city?.trim()) missingFields.push('City');
    if (!address.stateProvince?.trim()) missingFields.push('State/Province');
    if (!address.country?.trim()) missingFields.push('Country');
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Validate map location
   */
  static validateMapLocation(location: MapLocation | null): boolean {
    if (!location) return false;
    return !isNaN(location.latitude) && !isNaN(location.longitude) && 
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }

  /**
   * Format business address for display
   */
  static formatBusinessAddress(address: BusinessAddress): string {
    const parts = [
      address.streetAddress?.trim(),
      address.city?.trim(),
      address.stateProvince?.trim(),
      address.postalCode?.trim(),
      address.country?.trim()
    ].filter(part => part);
    
    return parts.join(', ');
  }

  /**
   * Create map location from coordinates
   */
  static async createMapLocationFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<MapLocation> {
    try {
      // Get human-readable address for these coordinates
      const response = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reverse',
          latitude,
          longitude
        }),
      });

      const data = await response.json();
      
      return {
        latitude,
        longitude,
        displayAddress: data.displayAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        setBy: 'user',
        setAt: new Date()
      };
    } catch (error) {
      // Fallback if reverse geocoding fails
      return {
        latitude,
        longitude,
        displayAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        setBy: 'user',
        setAt: new Date()
      };
    }
  }

  /**
   * Create map location from business address (optional feature)
   */
  static async createMapLocationFromAddress(address: BusinessAddress): Promise<MapLocation> {
    try {
      const result = await this.geocodeAddressWithFallback(
        address.streetAddress,
        address.city,
        address.stateProvince,
        address.postalCode,
        address.country
      );

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        displayAddress: result.displayAddress,
        setBy: 'address',
        setAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to create location from address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 