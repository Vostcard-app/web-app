// Utility functions for Vostcard operations
import type { Vostcard, ValidationState, FirebaseVostcard } from '../types/VostcardTypes';

/**
 * Validates a vostcard and returns what's missing
 */
export const getVostcardStatus = (vostcard: Partial<Vostcard>): string[] => {
  const missing: string[] = [];
  
  if (!vostcard.title) missing.push('Title');
  if (!vostcard.description) missing.push('Description');
  if (!vostcard.categories || vostcard.categories.length === 0) missing.push('Categories');
  
  const photoCount = (vostcard.photos?.length || 0) + 
    ((vostcard as any).photoURLs?.length || 0) + 
    ((vostcard as any)._firebasePhotoURLs?.length || 0);
  if (photoCount < 2) {
    missing.push('Photos (need at least 2)');
  }
  
  // Check for location in multiple formats (geo object, or separate lat/lng fields)
  const hasLocation = vostcard.geo || 
    (vostcard.latitude && vostcard.longitude) ||
    ((vostcard as any).latitude && (vostcard as any).longitude);
  if (!hasLocation) missing.push('Location');
  
  return missing;
};

/**
 * Checks if vostcard is ready to post
 */
export const isReadyToPost = (vostcard: Partial<Vostcard>): boolean => {
  return getVostcardStatus(vostcard).length === 0;
};

/**
 * Gets validation state for a vostcard
 */
export const getValidationState = (vostcard: Partial<Vostcard>): ValidationState => {
  return {
    hasTitle: (vostcard.title?.trim() || '') !== '',
    hasDescription: (vostcard.description?.trim() || '') !== '',
    hasCategories: (vostcard.categories?.length || 0) > 0,
    hasPhotos: ((vostcard.photos?.length || 0) + 
      ((vostcard as any).photoURLs?.length || 0) + 
      ((vostcard as any)._firebasePhotoURLs?.length || 0)) >= 2,
    hasVideo: true, // Video is always optional
    hasGeo: !!(vostcard.geo || 
      (vostcard.latitude && vostcard.longitude) ||
      ((vostcard as any).latitude && (vostcard as any).longitude))
  };
};

/**
 * Calculates distance between two coordinates (in miles)
 */
export const calculateDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Formats date for display
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formats time ago (e.g., "5 minutes ago")
 */
export const formatTimeAgo = (timestamp: number): string => {
  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  return `${hoursAgo}h ago`;
};

/**
 * Gets the appropriate icon type for a vostcard
 */
export const getVostcardIconType = (vostcard: Partial<Vostcard | FirebaseVostcard>): string => {
  if (vostcard.isOffer) return 'offer';
  if (vostcard.userRole === 'guide' || vostcard.userRole === 'admin') return 'guide';
  return 'vostcard';
};

/**
 * Creates a safe username from various sources
 */
export const getSafeUsername = (
  username?: string | null, 
  displayName?: string | null, 
  email?: string | null
): string => {
  if (username?.trim()) return username.trim();
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return email.split('@')[0];
  return 'Anonymous';
};

/**
 * Generates share text for a vostcard
 */
export const generateShareText = (vostcard: Partial<Vostcard>, shareUrl: string): string => {
  return `Check it out I made this with Vōstcard


"${vostcard.title || 'Untitled Vostcard'}"


"${vostcard.description || 'No description'}"


${shareUrl}`;
};

/**
 * Debounce function to limit API calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): T => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

/**
 * Creates a consistent error message
 */
export const createErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};
