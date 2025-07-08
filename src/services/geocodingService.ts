export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayAddress: string;
}

export class GeocodingService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org/search';
  
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
      // Build the query string
      const addressParts = [streetAddress, city, stateProvince, postalCode, country]
        .filter(part => part && part.trim())
        .join(', ');
      
      console.log('🌍 Geocoding address:', addressParts);
      
      const params = new URLSearchParams({
        q: addressParts,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      });
      
      const response = await fetch(`${this.BASE_URL}?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No results found for this address');
      }
      
      const result = data[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates received from geocoding service');
      }
      
      console.log('✅ Geocoding successful:', { latitude, longitude });
      
      return {
        latitude,
        longitude,
        displayAddress: result.display_name || addressParts
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
  ): boolean {
    return Boolean(
      streetAddress?.trim() &&
      city?.trim() &&
      stateProvince?.trim() &&
      country?.trim()
    );
  }
} 