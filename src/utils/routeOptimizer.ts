import { ItineraryItem } from '../types/ItineraryTypes';

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find nearest neighbor from current point
function findNearestNeighbor(
  current: ItineraryItem,
  unvisited: ItineraryItem[],
  distances: Map<string, Map<string, number>>
): ItineraryItem | null {
  let minDistance = Infinity;
  let nearest: ItineraryItem | null = null;

  for (const item of unvisited) {
    const distance = distances.get(current.id)?.get(item.id) || Infinity;
    if (distance < minDistance) {
      minDistance = distance;
      nearest = item;
    }
  }

  return nearest;
}

// Pre-calculate distances between all points
function calculateAllDistances(items: ItineraryItem[]): Map<string, Map<string, number>> {
  const distances = new Map<string, Map<string, number>>();

  items.forEach(item1 => {
    if (!item1.latitude || !item1.longitude) return;
    
    distances.set(item1.id, new Map());
    items.forEach(item2 => {
      if (!item2.latitude || !item2.longitude) return;
      if (item1.id === item2.id) return;

      const distance = calculateDistance(
        item1.latitude,
        item1.longitude,
        item2.latitude,
        item2.longitude
      );
      distances.get(item1.id)?.set(item2.id, distance);
    });
  });

  return distances;
}

export interface OptimizedRoute {
  items: ItineraryItem[];
  totalDistance: number;
  itemsWithoutLocation: ItineraryItem[];
}

/**
 * Optimize route using Nearest Neighbor algorithm (a greedy approach to TSP)
 * @param items Array of itinerary items to optimize
 * @returns Optimized route with total distance and any items without location data
 */
export function optimizeRoute(items: ItineraryItem[]): OptimizedRoute {
  // Separate items with and without location data
  const itemsWithLocation = items.filter(item => item.latitude && item.longitude);
  const itemsWithoutLocation = items.filter(item => !item.latitude || !item.longitude);

  // If we have 0-1 items with location, no optimization needed
  if (itemsWithLocation.length <= 1) {
    return {
      items: [...items], // Return original order
      totalDistance: 0,
      itemsWithoutLocation
    };
  }

  // Pre-calculate all distances
  const distances = calculateAllDistances(itemsWithLocation);

  // Start with the first item as our starting point
  const optimizedRoute: ItineraryItem[] = [itemsWithLocation[0]];
  let unvisited = itemsWithLocation.slice(1);
  let totalDistance = 0;

  // Build route using nearest neighbor
  let current = itemsWithLocation[0];
  while (unvisited.length > 0) {
    const next = findNearestNeighbor(current, unvisited, distances);
    if (!next) break;

    const distance = distances.get(current.id)?.get(next.id) || 0;
    totalDistance += distance;
    
    optimizedRoute.push(next);
    unvisited = unvisited.filter(item => item.id !== next.id);
    current = next;
  }

  // Append items without location data at the end
  return {
    items: [...optimizedRoute, ...itemsWithoutLocation],
    totalDistance,
    itemsWithoutLocation
  };
}
