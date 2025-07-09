export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayAddress: string;
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
} 