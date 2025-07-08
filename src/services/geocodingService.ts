export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayAddress: string;
}

export class GeocodingService {
  private static readonly BACKEND_URL = process.env.NODE_ENV === 'production' 
    ? 'https://vostcard-backend.onrender.com'  // Update with your actual backend URL
    : 'http://localhost:3002';
  
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
      
      const response = await fetch(`${this.BACKEND_URL}/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streetAddress,
          city,
          stateProvince,
          postalCode,
          country
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Backend error: ${response.status}`);
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
  ): boolean {
    return Boolean(
      streetAddress?.trim() &&
      city?.trim() &&
      stateProvince?.trim() &&
      country?.trim()
    );
  }
} 