// Itinerary types for Vostcard application

import { Timestamp } from 'firebase/firestore';

// Main Itinerary interface
export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  userID: string;
  username: string;
  items: ItineraryItem[];
  isPublic: boolean;
  shareableLink?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual item in an itinerary
export interface ItineraryItem {
  id: string; // Unique ID for this item in the itinerary
  vostcardID: string; // Reference to the vostcard
  type: 'vostcard';
  order: number; // Position in the itinerary (0-based)
  addedAt: string;
  
  // Cached data for quick display (updated when vostcard changes)
  title?: string;
  description?: string;
  photoURL?: string; // First photo for thumbnail
  latitude?: number;
  longitude?: number;
  username?: string;
}

// For creating new itineraries
export interface CreateItineraryData {
  name: string;
  description?: string;
  isPublic?: boolean;
  firstItem?: {
    vostcardID: string;
    type: 'vostcard';
  };
}

// For updating itineraries
export interface UpdateItineraryData {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

// For adding items to itineraries
export interface AddItemToItineraryData {
  vostcardID: string;
  type: 'vostcard';
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
  username?: string;
}

// Firebase document structure for itineraries
export interface ItineraryFirebaseDoc {
  id: string;
  name: string;
  description?: string;
  userID: string;
  username: string;
  isPublic: boolean;
  shareableLink?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firebase document structure for itinerary items (sub-collection)
export interface ItineraryItemFirebaseDoc {
  id: string;
  vostcardID: string;
  type: 'vostcard';
  order: number;
  addedAt: Timestamp;
  
  // Cached vostcard data
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
  username?: string;
}

// For sharing and public access
export interface PublicItinerary {
  id: string;
  name: string;
  description?: string;
  username: string;
  items: PublicItineraryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicItineraryItem {
  id: string;
  vostcardID: string;
  type: 'vostcard';
  order: number;
  title?: string;
  description?: string;
  photoURL?: string;
  latitude?: number;
  longitude?: number;
  username?: string;
}