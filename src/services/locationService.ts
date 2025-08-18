// Location service for getting user's location
interface Location {
  latitude: number;
  longitude: number;
}

export class LocationService {
  static async getCurrentLocation(): Promise<Location> {
    console.log('📍 Getting current location...');
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation is not supported by this browser');
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Got location:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy + 'm'
          });
          
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  static getFallbackLocation(): Location {
    // Default to San Francisco if location is not available
    return {
      latitude: 37.7749,
      longitude: -122.4194
    };
  }
}
