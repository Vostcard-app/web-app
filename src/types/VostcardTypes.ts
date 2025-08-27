// Enhanced TypeScript types for Vostcard application

import { Timestamp } from 'firebase/firestore';

// Core Vostcard interface (moved from context for reusability)
export interface Vostcard {
  id: string;
  state: 'private' | 'posted';
  visibility: 'private' | 'public';
  type: 'vostcard';
  video: Blob | null;
  title: string;
  description: string;
  photos: Blob[];
  categories: string[];
  geo: { latitude: number; longitude: number } | null;
  username: string;
  userID: string;
  userRole?: string;
  recipientUserID?: string;
  createdAt: string;
  updatedAt: string;
  isOffer?: boolean;
  // Removed isQuickcard field
  offerDetails?: OfferDetails;
  script?: string;
  scriptId?: string;
  hasVideo?: boolean;
  hasPhotos?: boolean;
  youtubeURL?: string | null;
  _videoBase64?: string | null;
  _photosBase64?: string[];
  _firebaseVideoURL?: string | null;
  _firebasePhotoURLs?: string[];
  _isMetadataOnly?: boolean;
}

// Offer details interface
export interface OfferDetails {
  discount?: string;
  validUntil?: string;
  terms?: string;
}

// Firebase Vostcard (from Firestore)
export interface FirebaseVostcard {
  id: string;
  title: string;
  description: string;
  username: string;
  userID: string;
  state: 'private' | 'posted';
  visibility: 'private' | 'public';
  type: 'vostcard';
  categories: string[];
  geo?: { latitude: number; longitude: number } | null;
  latitude?: number;
  longitude?: number;
  userRole?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  hasVideo?: boolean;
  hasPhotos?: boolean;
  youtubeURL?: string | null;
  videoURL?: string;
  photoURLs?: string[];
  isOffer?: boolean;
  offerDetails?: OfferDetails;
  avatarURL?: string;
  script?: string;
  scriptId?: string;
  _isMetadataOnly?: boolean;
}

// User profile interface
export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatarURL?: string;
  userRole?: 'user' | 'guide' | 'advertiser' | 'admin';
  createdAt: string;
}

// Validation state interface
export interface ValidationState {
  hasTitle: boolean;
  hasDescription: boolean;
  hasCategories: boolean;
  hasPhotos: boolean;
  hasVideo?: boolean;
  hasGeo?: boolean;
}

// Location interface
export interface Location {
  latitude: number;
  longitude: number;
}

// Search result interface
export interface SearchResult {
  id: string;
  name: string;
  coordinates: [number, number];
  type: string;
  place: string;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Filter states
export interface FilterState {
  selectedCategories: string[];
  selectedTypes: string[];
  showFriendsOnly: boolean;
}

// Available categories constant
export const AVAILABLE_CATEGORIES = [
  'None',
  'View',
  'Landmark',
  'Fun Fact',
  'Macabre',
  'Architecture',
  'Historical',
  'Museum',
  'Gallery',
  'Restaurant',
  'Nature',
  'Park',
  'Drive Mode Event',
  'Wish you were here',
  'Made for kids',
  'Mural',
  'Plaque',
  'Pub',
  'Monument',
  'Boondocking',
] as const;

// Available types constant  
export const AVAILABLE_TYPES = ['Vostcard', 'Guide'] as const;

export type CategoryType = typeof AVAILABLE_CATEGORIES[number];
export type PostType = typeof AVAILABLE_TYPES[number];

// Drivecard interface - for Drive Mode usage with title, location, audio, and default category
export interface Drivecard {
  id: string;
  title: string;
  audio: Blob | null;
  geo: { latitude: number; longitude: number; address?: string };
  category: string; // Defaults to "Drive mode"
  userID: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  _audioBase64?: string | null;
  _firebaseAudioURL?: string | null;
}

// Firebase Drivecard (from Firestore)
export interface FirebaseDrivecard {
  id: string;
  title: string;
  username: string;
  userID: string;
  audioURL?: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 