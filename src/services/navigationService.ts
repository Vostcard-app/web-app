// Navigation service for real turn-by-turn directions
export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
  coordinates: [number, number];
}

export interface NavigationRoute {
  steps: NavigationStep[];
  totalDistance: number;
  totalDuration: number;
  overview_polyline: string;
}

export class NavigationService {
  private static readonly GOOGLE_DIRECTIONS_API_KEY = import.meta.env.VITE_GOOGLE_DIRECTIONS_API_KEY;
  
  /**
   * Get turn-by-turn directions using Google Directions API
   */
  static async getDirections(
    origin: [number, number],
    destination: [number, number]
  ): Promise<NavigationRoute | null> {
    if (!this.GOOGLE_DIRECTIONS_API_KEY) {
      console.warn('⚠️ Google Directions API key not configured, using fallback');
      return this.getFallbackDirections(origin, destination);
    }

    try {
      const originStr = `${origin[0]},${origin[1]}`;
      const destinationStr = `${destination[0]},${destination[1]}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${originStr}&destination=${destinationStr}&` +
        `mode=driving&key=${this.GOOGLE_DIRECTIONS_API_KEY}`;

      console.log('🗺️ Fetching directions from Google API');
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes?.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        const steps: NavigationStep[] = leg.steps.map((step: any) => ({
          instruction: this.cleanInstruction(step.html_instructions),
          distance: step.distance.value, // meters
          duration: step.duration.value, // seconds
          maneuver: step.maneuver || 'straight',
          coordinates: [
            step.start_location.lat,
            step.start_location.lng
          ] as [number, number]
        }));

        return {
          steps,
          totalDistance: leg.distance.value,
          totalDuration: leg.duration.value,
          overview_polyline: route.overview_polyline.points
        };
      } else {
        console.warn('❌ Google Directions API error:', data.status);
        return this.getFallbackDirections(origin, destination);
      }
    } catch (error) {
      console.error('❌ Navigation service error:', error);
      return this.getFallbackDirections(origin, destination);
    }
  }

  /**
   * Fallback directions when API is unavailable
   */
  private static getFallbackDirections(
    origin: [number, number],
    destination: [number, number]
  ): NavigationRoute {
    const distance = this.calculateDistance(origin[0], origin[1], destination[0], destination[1]);
    const bearing = this.calculateBearing(origin[0], origin[1], destination[0], destination[1]);
    
    const direction = this.getDirectionFromBearing(bearing);
    
    return {
      steps: [
        {
          instruction: `Head ${direction} toward your destination`,
          distance: distance * 1000, // convert to meters
          duration: Math.round(distance * 1000 / 13.89), // ~50 km/h average
          maneuver: 'straight',
          coordinates: origin
        },
        {
          instruction: 'You have arrived at your destination',
          distance: 0,
          duration: 0,
          maneuver: 'arrive',
          coordinates: destination
        }
      ],
      totalDistance: distance * 1000,
      totalDuration: Math.round(distance * 1000 / 13.89),
      overview_polyline: ''
    };
  }

  /**
   * Clean HTML instructions from Google Directions
   */
  private static cleanInstruction(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate bearing between two coordinates
   */
  private static calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  }

  /**
   * Convert bearing to cardinal direction
   */
  private static getDirectionFromBearing(bearing: number): string {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours}h ${minutes}min`;
    }
  }
}
