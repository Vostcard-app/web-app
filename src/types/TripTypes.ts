// Trip types for personal collections of user's own content

import { Timestamp } from 'firebase/firestore';

// Main Trip interface - personal collection of user's own vostcards/quickcards
export interface Trip {
  id: string;
  name: string;
  description?: string;
  userID: string; // Always the current user
  username: string;
  items: TripItem[];
  isPrivate: boolean; // Trips are private by default, unlike itineraries
  shareableLink?: string; // Only if made shareable
  createdAt: string;
  updatedAt: string;
}

// Individual item in a trip - only user's own content
export interface TripItem {
  id: string;
  vostcardID: string; // Reference to user's own vostcard/quickcard
  type: 'vostcard' | 'quickcard';
  order: number; // Position in the trip (0-based)
  addedAt: string;
  
  // Cached data for quick display
  title?: string;
  description?: string;
  photoURL?: string; // First photo for thumbnail
  latitude?: number;
  longitude?: number;
}

// For creating new trips
export interface CreateTripData {
  name: string;
  description?: string;
  isPrivate?: boolean; // Default to true (private)
  firstItem?: {
    vostcardID: string;
    type: 'vostcard' | 'quickcard';
  };
}

// For updating trips
export interface UpdateTripData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

// For adding items to trips - only user's own content
export interface AddItemToTripData {
  vostcardID: string; // Must be user's own vostcard/quickcard
  type: 'vostcard' | 'quickcard';
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
}

// Firebase document structure for trips
export interface TripFirebaseDoc {
  id: string;
  name: string;
  description?: string;
  userID: string;
  username: string;
  isPrivate: boolean;
  shareableLink?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firebase document structure for trip items
export interface TripItemFirebaseDoc {
  id: string;
  vostcardID: string;
  type: 'vostcard' | 'quickcard';
  order: number;
  addedAt: Timestamp;
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
}

// For public sharing of trips (simplified view)
export interface PublicTrip {
  id: string;
  name: string;
  description?: string;
  username: string;
  items: PublicTripItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicTripItem {
  id: string;
  vostcardID: string;
  type: 'vostcard' | 'quickcard';
  order: number;
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
}