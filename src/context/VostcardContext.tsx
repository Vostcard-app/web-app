// VostcardContext.tsx - Unified Vostcard Context
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import type { Vostcard, FirebaseVostcard } from '../types/VostcardTypes';

// Constants
const STORE_NAME = 'vostcards';
const METADATA_STORE_NAME = 'vostcard_metadata';
const DB_VERSION = 3; // Increment this when schema changes - v3: after quickcard removal

// Context interface
interface VostcardContextType {
  savedVostcards: Vostcard[];
  setSavedVostcards: React.Dispatch<React.SetStateAction<Vostcard[]>>;
  postedVostcards: Vostcard[];
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  clearVostcard: () => void;
  createNewVostcard: () => void;
  saveVostcard: () => Promise<void>;
  postVostcard: () => Promise<void>;
  deletePrivateVostcard: (vostcardId: string) => Promise<void>;
  loadAllLocalVostcards: () => Promise<void>;
  loadPrivateVostcards: () => Promise<void>;
  loadPostedVostcards: () => Promise<void>;
  syncVostcardMetadata: () => Promise<void>;
  downloadVostcardContent: (vostcardId: string) => Promise<void>;
  cleanupDeletionMarkers: () => Promise<void>;
  clearDeletionMarkers: () => void;
  manualCleanupFirebase: () => Promise<void>;
  loadLocalVostcard: (vostcardId: string, options?: { restoreVideo?: boolean; restorePhotos?: boolean }) => Promise<void>;
  refreshFirebaseStorageURLs: (vostcardId: string, vostcardData?: any) => Promise<{ photoURLs: string[]; videoURL: string | null; audioURL: string | null } | null>;
  fixExpiredURLs: (vostcardData: any) => { photoURLs: string[]; videoURL: string | null; audioURL: string | null };
  cleanupBrokenFileReferences: () => Promise<void>;
  debugFirebaseStorage: (vostcardId: string) => Promise<void>;
  setVideo: (video: Blob, location?: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  debugIndexedDB: () => Promise<void>;
}

// Create context
const VostcardContext = createContext<VostcardContextType | null>(null);

// Provider component
export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);
  const [postedVostcards, setPostedVostcards] = useState<Vostcard[]>([]);
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [, setLastSyncTimestamp] = useState<Date | null>(null);
  const authContext = useAuth();

  // Helper function to get correct username
  const getCorrectUsername = (authContext: any, fallback?: string): string => {
    if (fallback) return fallback;
    if (authContext.username) return authContext.username;
    if (authContext.user?.email) return authContext.user.email.split('@')[0];
    return 'Unknown';
  };

  // Helper function to open IndexedDB with user-specific name
  const openUserDB = useCallback(async () => {
    const user = auth.currentUser;
    const username = getCorrectUsername(authContext);
    const dbName = `VostcardDB_${user?.uid || 'anonymous'}_${username}`;
    
    return new Promise<IDBDatabase>((resolve, reject) => {
      // Try to open existing database first
      const request = indexedDB.open(dbName, DB_VERSION);
      
      request.onerror = () => {
        const error = request.error;
        if (error?.name === 'VersionError') {
          console.log('Version error, attempting to migrate data...');
          // Get old version
          const oldRequest = indexedDB.open(dbName);
          oldRequest.onsuccess = () => {
            const oldDb = oldRequest.result;
            const oldVersion = oldDb.version;
            oldDb.close();
            
            // Get data from old database
            const getDataRequest = indexedDB.open(dbName, oldVersion);
            getDataRequest.onsuccess = async () => {
              const oldDb = getDataRequest.result;
              const oldTx = oldDb.transaction([STORE_NAME], 'readonly');
              const oldStore = oldTx.objectStore(STORE_NAME);
              const oldData = await new Promise<any[]>((resolve, reject) => {
                const request = oldStore.getAll();
                request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
              oldDb.close();
              
              // Delete old database
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              deleteRequest.onsuccess = () => {
                // Create new database with current version
                const newRequest = indexedDB.open(dbName, DB_VERSION);
                newRequest.onupgradeneeded = () => {
                  const db = newRequest.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
        }
                  const store = newRequest.transaction?.objectStore(STORE_NAME);
                  if (store && !store.indexNames.contains('userID')) {
                    store.createIndex('userID', 'userID', { unique: false });
                  }
                };
                newRequest.onsuccess = async () => {
                  const newDb = newRequest.result;
                  // Migrate data to new database
                  const tx = newDb.transaction([STORE_NAME], 'readwrite');
                  const store = tx.objectStore(STORE_NAME);
                  for (const item of oldData) {
                    await new Promise<void>((resolve, reject) => {
                      const request = store.add(item);
                      request.onsuccess = () => resolve();
                      request.onerror = () => reject(request.error);
                    });
                  }
                  resolve(newDb);
                };
                newRequest.onerror = () => reject(newRequest.error);
              };
              deleteRequest.onerror = () => reject(deleteRequest.error);
            };
            getDataRequest.onerror = () => reject(getDataRequest.error);
          };
          oldRequest.onerror = () => reject(oldRequest.error);
        } else {
          console.error('Error opening database:', error);
          reject(error);
        }
      };
      
      request.onsuccess = () => {
        console.log('Successfully opened database');
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        console.log('Upgrading database to version:', DB_VERSION);
        const db = request.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
        }
        
        // Add any new indexes or modify existing ones here
        const store = request.transaction?.objectStore(STORE_NAME);
        if (store && !store.indexNames.contains('userID')) {
          store.createIndex('userID', 'userID', { unique: false });
        }
      };
    });
  }, [authContext]);

  // Clear current vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(null);
  }, []);

  // Create new vostcard
  const createNewVostcard = useCallback(() => {
      const user = auth.currentUser;
      if (!user) {
      console.error('No user authenticated');
        return;
      }

    const newVostcard: Vostcard = {
      id: crypto.randomUUID(),
        title: '',
        description: '',
        photos: [],
        categories: [],
      username: user.displayName || user.email?.split('@')[0] || 'Unknown',
      userID: user.uid,
      userRole: authContext.userRole || 'user',
      state: 'private',
      visibility: 'private',
      video: null,
      type: 'vostcard',
      hasVideo: false,
      hasPhotos: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      geo: null
    };

    console.log('🆕 Creating new vostcard:', {
      id: newVostcard.id,
      username: newVostcard.username,
      userID: newVostcard.userID
    });

    setCurrentVostcard(newVostcard);
  }, [authContext.userRole]);

  // Save vostcard to Firebase (primary) and cache locally
  const saveVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.error('No vostcard to save');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('💾 Saving vostcard to Firebase:', {
      id: currentVostcard.id,
      title: currentVostcard.title,
      state: currentVostcard.state,
      visibility: currentVostcard.visibility,
      hasPhotos: currentVostcard.photos?.length > 0,
      hasVideo: !!currentVostcard.video,
      hasGeo: !!currentVostcard.geo
    });

    try {
      // Upload media files first if they exist
      let photoURLs: string[] = [];
      let videoURL: string | null = null;

      // Upload photos
      if (currentVostcard.photos && currentVostcard.photos.length > 0) {
        console.log('📸 Uploading photos...');
        photoURLs = await Promise.all(
          currentVostcard.photos.map(async (photo, index) => {
            const photoRef = ref(storage, `vostcards/${user.uid}/photos/${currentVostcard.id}_${index}`);
            await uploadBytes(photoRef, photo);
            return getDownloadURL(photoRef);
          })
        );
      } else if (currentVostcard._firebasePhotoURLs && currentVostcard._firebasePhotoURLs.length > 0) {
        // Preserve existing photo URLs if no new photos to upload
        console.log('📸 Preserving existing photos...');
        photoURLs = currentVostcard._firebasePhotoURLs;
      }

      // Upload video
      if (currentVostcard.video) {
        console.log('🎥 Uploading video...');
        const videoRef = ref(storage, `vostcards/${user.uid}/videos/${currentVostcard.id}`);
        await uploadBytes(videoRef, currentVostcard.video);
        videoURL = await getDownloadURL(videoRef);
      }

      // Save to Firestore
      const docData = {
        id: currentVostcard.id,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: currentVostcard.username,
        userID: user.uid,
        userRole: currentVostcard.userRole || authContext.userRole || 'user',
        photoURLs: photoURLs,
        videoURL: videoURL,
        latitude: currentVostcard.geo?.latitude,
        longitude: currentVostcard.geo?.longitude,
        geo: currentVostcard.geo || null,
        avatarURL: user.photoURL || '',
        createdAt: currentVostcard.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        state: currentVostcard.state,
        visibility: currentVostcard.visibility || 'private',
        type: 'vostcard' as const,
        hasVideo: !!currentVostcard.video,
        hasPhotos: photoURLs.length > 0,
        mediaUploadStatus: 'complete',
        isOffer: currentVostcard.isOffer || false,
        offerDetails: currentVostcard.offerDetails || null
      };

      console.log('📝 Saving vostcard to Firebase:', docData);
      
      try {
        await setDoc(doc(db, 'vostcards', currentVostcard.id), docData);
        console.log('✅ Successfully saved vostcard to Firebase:', currentVostcard.id);
      } catch (firebaseError) {
        console.error('❌ Firebase save failed:', firebaseError);
        throw new Error(`Firebase save failed: ${firebaseError}`);
      }

      // Cache locally for performance
      try {
        const localDB = await openUserDB();
        const transaction = localDB.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const updatedVostcard = {
          ...currentVostcard,
          _firebasePhotoURLs: photoURLs,
          _firebaseVideoURL: videoURL,
          updatedAt: new Date().toISOString()
        };
        
        await store.put(updatedVostcard);
        console.log('💾 Cached vostcard locally');
      } catch (localError) {
        console.warn('⚠️ Failed to cache locally, but Firebase save succeeded:', localError);
      }

      // Update context state based on visibility
      if (currentVostcard.visibility === 'private') {
        setSavedVostcards(prev => {
          const filtered = prev.filter(v => v.id !== currentVostcard.id);
          return [...filtered, currentVostcard];
        });
      } else {
        setPostedVostcards(prev => {
          const filtered = prev.filter(v => v.id !== currentVostcard.id);
          return [...filtered, currentVostcard];
        });
      }

      console.log('✅ Vostcard saved successfully to Firebase');
    } catch (error) {
      console.error('❌ Error saving vostcard:', error);
      throw error;
    }
  }, [currentVostcard, openUserDB]);

  // Save a specific vostcard directly (used by postVostcard to avoid timing issues)
  const saveVostcardDirect = useCallback(async (vostcardToSave: any) => {
    if (!vostcardToSave) {
      console.error('No vostcard to save');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('💾 Saving vostcard directly to Firebase:', {
      id: vostcardToSave.id,
      title: vostcardToSave.title,
      state: vostcardToSave.state,
      visibility: vostcardToSave.visibility,
      hasPhotos: vostcardToSave.photos?.length > 0,
      hasVideo: !!vostcardToSave.video,
      hasGeo: !!vostcardToSave.geo
    });

    try {
      // Upload media files first if they exist
      let photoURLs: string[] = [];
      let videoURL: string | null = null;

      // Upload photos
      if (vostcardToSave.photos && vostcardToSave.photos.length > 0) {
        console.log('📸 Uploading photos...');
        photoURLs = await Promise.all(
          vostcardToSave.photos.map(async (photo: Blob, index: number) => {
            const photoRef = ref(storage, `vostcards/${user.uid}/photos/${vostcardToSave.id}_${index}`);
            await uploadBytes(photoRef, photo);
            return getDownloadURL(photoRef);
          })
        );
      } else if (vostcardToSave._firebasePhotoURLs && vostcardToSave._firebasePhotoURLs.length > 0) {
        // Preserve existing photo URLs if no new photos to upload
        console.log('📸 Preserving existing photos...');
        photoURLs = vostcardToSave._firebasePhotoURLs;
      }

      // Upload video
      if (vostcardToSave.video) {
        console.log('🎥 Uploading video...');
        const videoRef = ref(storage, `vostcards/${user.uid}/videos/${vostcardToSave.id}`);
        await uploadBytes(videoRef, vostcardToSave.video);
        videoURL = await getDownloadURL(videoRef);
      }

      // Save to Firestore
      const docData = {
        id: vostcardToSave.id,
        title: vostcardToSave.title,
        description: vostcardToSave.description,
        categories: vostcardToSave.categories,
        username: vostcardToSave.username,
        userID: user.uid,
        userRole: vostcardToSave.userRole || authContext.userRole || 'user',
        photoURLs: photoURLs,
        videoURL: videoURL,
        latitude: vostcardToSave.geo?.latitude,
        longitude: vostcardToSave.geo?.longitude,
        geo: vostcardToSave.geo || null,
        avatarURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        state: vostcardToSave.state,
        visibility: vostcardToSave.visibility || 'private',
        type: 'vostcard' as const,
        hasVideo: !!vostcardToSave.video,
        hasPhotos: photoURLs.length > 0,
        mediaUploadStatus: 'complete',
        isOffer: vostcardToSave.isOffer || false,
        offerDetails: vostcardToSave.offerDetails || null
      };

      console.log('📝 Saving vostcard directly to Firebase:', docData);
      await setDoc(doc(db, 'vostcards', vostcardToSave.id), docData);

      console.log('✅ Vostcard saved directly to Firebase successfully');
    } catch (error) {
      console.error('❌ Error saving vostcard directly:', error);
      throw error;
    }
  }, [authContext.userRole]);

  // Helper function to extract file path from Firebase Storage URL
  const extractFilePathFromURL = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
      return null;
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return null;
    }
  };

  // Helper function to convert Firebase Storage URL to public URL (no token needed)
  const convertToPublicURL = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Remove token and alt parameters to make it a public URL
      urlObj.searchParams.delete('token');
      urlObj.searchParams.set('alt', 'media');
      
      // Fix quickcard references in the path
      let pathname = urlObj.pathname;
      pathname = pathname.replace(/quickcard_(\d+)/g, 'vostcard_$1');
      urlObj.pathname = pathname;
      
      return urlObj.toString();
    } catch (error) {
      console.error('Error converting to public URL:', error);
      return url; // Return original URL if conversion fails
    }
  };

  // Refresh expired Firebase Storage URLs
  const refreshFirebaseStorageURLs = useCallback(async (vostcardId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user authenticated, cannot refresh URLs');
        return null;
      }

      console.log('🔄 Refreshing Firebase Storage URLs for vostcard:', vostcardId);
      
      // First, try to get the existing vostcard data to extract current file paths
      const vostcard = savedVostcards.find(v => v.id === vostcardId);
      if (!vostcard) {
        console.log('❌ Vostcard not found in context, cannot refresh URLs');
        return null;
      }

      console.log('🔍 Found vostcard data:', {
        hasFirebasePhotoURLs: !!vostcard._firebasePhotoURLs,
        hasFirebaseVideoURL: !!vostcard._firebaseVideoURL,
        photoCount: vostcard._firebasePhotoURLs?.length || 0,
        // Check if vostcard has additional properties from Firestore
        hasPhotoURLs: !!(vostcard as any).photoURLs,
        hasVideoURL: !!(vostcard as any).videoURL,
        hasAudioURL: !!(vostcard as any).audioURL
      });

      // Get fresh download URLs from Firebase Storage
      const freshPhotoURLs: string[] = [];
      let freshVideoURL: string | null = null;
      let freshAudioURL: string | null = null;

      // Refresh photo URLs using existing file paths
      const photoURLs = vostcard._firebasePhotoURLs || (vostcard as any).photoURLs;
      if (photoURLs && Array.isArray(photoURLs)) {
        console.log('🔄 Refreshing photo URLs from existing paths...');
        for (let i = 0; i < photoURLs.length; i++) {
          const existingURL = photoURLs[i];
          if (typeof existingURL === 'string') {
            const filePath = extractFilePathFromURL(existingURL);
            if (filePath) {
              try {
                const photoRef = ref(storage, filePath);
                const freshURL = await getDownloadURL(photoRef);
                freshPhotoURLs.push(freshURL);
                console.log(`✅ Refreshed photo ${i} URL:`, freshURL);
              } catch (error: any) {
                console.log(`❌ Failed to refresh photo ${i}:`, error.code);
              }
            } else {
              console.log(`❌ Could not extract file path from photo ${i} URL:`, existingURL);
            }
          }
        }
      }

      // Refresh video URL using existing file path
      const videoURL = vostcard._firebaseVideoURL || (vostcard as any).videoURL;
      if (videoURL && typeof videoURL === 'string') {
        console.log('🔄 Refreshing video URL from existing path...');
        const filePath = extractFilePathFromURL(videoURL);
        if (filePath) {
          try {
            const videoRef = ref(storage, filePath);
            freshVideoURL = await getDownloadURL(videoRef);
            console.log('✅ Refreshed video URL:', freshVideoURL);
          } catch (error: any) {
            console.log('❌ Failed to refresh video URL:', error.code);
          }
        } else {
          console.log('❌ Could not extract file path from video URL:', videoURL);
        }
      }

      // Refresh audio URL using existing file path
      const audioURL = (vostcard as any).audioURL;
      if (audioURL && typeof audioURL === 'string') {
        console.log('🔄 Refreshing audio URL from existing path...');
        const filePath = extractFilePathFromURL(audioURL);
        if (filePath) {
          try {
            const audioRef = ref(storage, filePath);
            freshAudioURL = await getDownloadURL(audioRef);
            console.log('✅ Refreshed audio URL:', freshAudioURL);
          } catch (error: any) {
            console.log('❌ Failed to refresh audio URL:', error.code);
          }
        } else {
          console.log('❌ Could not extract file path from audio URL:', audioURL);
        }
      }

      // Update the vostcard in Firebase with fresh URLs
      if (freshPhotoURLs.length > 0 || freshVideoURL || freshAudioURL) {
        const vostcardRef = doc(db, 'vostcards', vostcardId);
        const updateData: any = {
          updatedAt: serverTimestamp()
        };
        
        if (freshPhotoURLs.length > 0) {
          updateData.photoURLs = freshPhotoURLs;
        }
        if (freshVideoURL) {
          updateData.videoURL = freshVideoURL;
        }
        if (freshAudioURL) {
          updateData.audioURL = freshAudioURL;
        }

        await setDoc(vostcardRef, updateData, { merge: true });
        console.log('✅ Updated vostcard with fresh URLs:', updateData);

        return {
          photoURLs: freshPhotoURLs,
          videoURL: freshVideoURL,
          audioURL: freshAudioURL
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error refreshing Firebase Storage URLs:', error);
      return null;
    }
  }, [savedVostcards]);

  // Simple function to fix expired URLs by converting them to public URLs
  const fixExpiredURLs = useCallback((vostcardData: any) => {
    const fixedPhotoURLs: string[] = [];
    let fixedVideoURL: string | null = null;
    let fixedAudioURL: string | null = null;

    // Fix photo URLs
    const photoURLs = vostcardData._firebasePhotoURLs || vostcardData.photoURLs;
    if (photoURLs && Array.isArray(photoURLs)) {
      for (const url of photoURLs) {
        if (typeof url === 'string') {
          const publicURL = convertToPublicURL(url);
          fixedPhotoURLs.push(publicURL);
          console.log('🔧 Fixed photo URL:', publicURL);
        }
      }
    }

    // Fix video URL
    const videoURL = vostcardData._firebaseVideoURL || vostcardData.videoURL;
    if (videoURL && typeof videoURL === 'string') {
      fixedVideoURL = convertToPublicURL(videoURL);
      console.log('🔧 Fixed video URL:', fixedVideoURL);
    }

    // Fix audio URL
    const audioURL = vostcardData.audioURL;
    if (audioURL && typeof audioURL === 'string') {
      fixedAudioURL = convertToPublicURL(audioURL);
      console.log('🔧 Fixed audio URL:', fixedAudioURL);
    }

    return {
      photoURLs: fixedPhotoURLs,
      videoURL: fixedVideoURL,
      audioURL: fixedAudioURL
    };
  }, []);

  // Function to clean up broken file references from the database
  const cleanupBrokenFileReferences = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user for cleanup');
      return;
    }

    console.log('🧹 Starting cleanup of broken file references...');
    let cleanedCount = 0;

    try {
      // Get all vostcards for the current user
      const vostcardsToClean = [...savedVostcards, ...postedVostcards];
      
      for (const vostcard of vostcardsToClean) {
        let needsUpdate = false;
        const updateData: any = {};

        // Check and clean photo URLs
        const photoURLs = (vostcard as any).photoURLs || vostcard._firebasePhotoURLs;
        if (photoURLs && Array.isArray(photoURLs) && photoURLs.length > 0) {
          console.log(`🔍 Cleaning photo URLs for vostcard: ${vostcard.id}`);
          updateData.photoURLs = [];
          updateData._firebasePhotoURLs = [];
          needsUpdate = true;
        }

        // Check and clean video URL
        const videoURL = (vostcard as any).videoURL || vostcard._firebaseVideoURL;
        if (videoURL) {
          console.log(`🔍 Cleaning video URL for vostcard: ${vostcard.id}`);
          updateData.videoURL = null;
          updateData._firebaseVideoURL = null;
          updateData.hasVideo = false;
          needsUpdate = true;
        }

        // Check and clean audio URL
        const audioURL = (vostcard as any).audioURL;
        if (audioURL) {
          console.log(`🔍 Cleaning audio URL for vostcard: ${vostcard.id}`);
          updateData.audioURL = null;
          needsUpdate = true;
        }

        // Update the document if needed
        if (needsUpdate) {
          try {
            const vostcardRef = doc(db, 'vostcards', vostcard.id);
            await setDoc(vostcardRef, {
              ...updateData,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            console.log(`✅ Cleaned up vostcard: ${vostcard.id}`);
            cleanedCount++;
          } catch (error) {
            console.error(`❌ Failed to clean up vostcard ${vostcard.id}:`, error);
          }
        }
      }

      console.log(`🧹 Cleanup completed! Cleaned ${cleanedCount} vostcards`);
      
      // Reload data to reflect changes
      // Note: Reload will be handled by the parent component
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }, [savedVostcards, postedVostcards]);

  // Debug function to check if files actually exist in Firebase Storage
  const debugFirebaseStorage = useCallback(async (vostcardId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user authenticated');
        return;
      }

      console.log('🔍 Checking Firebase Storage for vostcard:', vostcardId);
      console.log('🔍 User ID:', user.uid);
      
      // Check for photos (multiple naming patterns)
      for (let i = 0; i < 5; i++) {
        let foundPhoto = false;
        
        // Pattern 1: vostcardId_index
        try {
          const photoRef = ref(storage, `vostcards/${user.uid}/photos/${vostcardId}_${i}`);
          const url = await getDownloadURL(photoRef);
          console.log(`✅ Photo ${i} exists (new format):`, url);
          foundPhoto = true;
        } catch (error: any) {
          // Try quickcard path with vostcard ID
          try {
            const photoRef = ref(storage, `quickcards/${user.uid}/photos/${vostcardId}_${i}`);
            const url = await getDownloadURL(photoRef);
            console.log(`✅ Photo ${i} exists (quickcard format):`, url);
            foundPhoto = true;
          } catch (error: any) {
            // Try original quickcard ID format (quickcard_timestamp)
            const originalQuickcardId = vostcardId.replace('vostcard_', 'quickcard_');
            try {
              const photoRef = ref(storage, `quickcards/${user.uid}/photos/${originalQuickcardId}_${i}`);
              const url = await getDownloadURL(photoRef);
              console.log(`✅ Photo ${i} exists (original quickcard format):`, url);
              foundPhoto = true;
            } catch (error: any) {
              // Try next pattern
            }
          }
        }
        
        // Pattern 2: photo{i+1}.jpg
        if (!foundPhoto) {
          try {
            const photoRef = ref(storage, `vostcards/${user.uid}/photos/photo${i + 1}.jpg`);
            const url = await getDownloadURL(photoRef);
            console.log(`✅ Photo ${i} exists (old format):`, url);
            foundPhoto = true;
          } catch (error: any) {
            // Try next pattern
          }
        }
        
        // Pattern 3: {i}.jpg
        if (!foundPhoto) {
          try {
            const photoRef = ref(storage, `vostcards/${user.uid}/photos/${i}.jpg`);
            const url = await getDownloadURL(photoRef);
            console.log(`✅ Photo ${i} exists (index format):`, url);
            foundPhoto = true;
          } catch (error: any) {
            // Photo doesn't exist
          }
        }
        
        if (!foundPhoto) {
          console.log(`❌ Photo ${i} not found in any format`);
          break;
        }
      }

      // Check for video
      try {
        const videoRef = ref(storage, `vostcards/${user.uid}/videos/${vostcardId}`);
        const url = await getDownloadURL(videoRef);
        console.log('✅ Video exists:', url);
      } catch (error: any) {
        // Try quickcard path
        try {
          const videoRef = ref(storage, `quickcards/${user.uid}/videos/${vostcardId}`);
          const url = await getDownloadURL(videoRef);
          console.log('✅ Video exists (quickcard format):', url);
        } catch (error: any) {
          console.log('❌ Video not found in either location:', error.code);
        }
      }

      // Check for audio
      try {
        const audioRef = ref(storage, `vostcards/${user.uid}/audio/${vostcardId}`);
        const url = await getDownloadURL(audioRef);
        console.log('✅ Audio exists:', url);
      } catch (error: any) {
        // Try quickcard path
        try {
          const audioRef = ref(storage, `quickcards/${user.uid}/audio/${vostcardId}`);
          const url = await getDownloadURL(audioRef);
          console.log('✅ Audio exists (quickcard format):', url);
        } catch (error: any) {
          console.log('❌ Audio not found in either location:', error.code);
        }
      }

    } catch (error) {
      console.error('❌ Error checking Firebase Storage:', error);
    }
  }, []);

  // Load private vostcards from Firebase
  const loadPrivateVostcards = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user authenticated, skipping loadPrivateVostcards');
        setSavedVostcards([]);
        return;
      }

      console.log('🔄 Loading private vostcards from Firebase for user:', user.uid);
      
      // Query Firebase for private vostcards
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const querySnapshot = await getDocs(q);
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Debug logging for image/audio data
        console.log('🔍 Private vostcard Firebase data for', doc.id, ':', {
          photoURLs: data.photoURLs,
          photoURLsType: typeof data.photoURLs,
          photoURLsLength: Array.isArray(data.photoURLs) ? data.photoURLs.length : 'not array',
          firstPhotoURL: Array.isArray(data.photoURLs) && data.photoURLs.length > 0 ? data.photoURLs[0] : 'none',
          videoURL: data.videoURL,
          audioURL: data.audioURL,
          hasPhotos: data.hasPhotos,
          hasVideo: data.hasVideo,
          allFields: Object.keys(data)
        });
        
        // Test if first photo URL is accessible and try to refresh if needed
        if (Array.isArray(data.photoURLs) && data.photoURLs.length > 0) {
          const testUrl = data.photoURLs[0];
          console.log('🧪 Testing photo URL accessibility:', testUrl);
          
          fetch(testUrl, { method: 'HEAD' })
            .then(response => {
              console.log('✅ Photo URL accessible:', response.status, response.statusText);
              if (response.status === 412 || response.status === 403) {
                console.warn('⚠️ HTTP', response.status, ': URL may be expired or have permission issues');
                // TODO: Implement URL refresh logic here if needed
              }
            })
            .catch(error => {
              console.error('❌ Photo URL failed:', error.message);
              // TODO: Implement fallback logic here if needed
            });
        }
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          categories: Array.isArray(data.categories) ? data.categories : [],
          username: data.username || '',
          userID: data.userID || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          state: data.state || 'private',
          visibility: data.visibility || 'private',
          type: 'vostcard' as const,
          video: null,
          photos: [],
          geo: data.geo || { latitude: data.latitude, longitude: data.longitude } || null,
          hasVideo: data.hasVideo || false,
          hasPhotos: data.hasPhotos || false,
          _firebaseVideoURL: data.videoURL || null,
          _firebasePhotoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [],
          photoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [], // Use original Firebase URLs with tokens
          _isMetadataOnly: true
        };
      });

      // Sort by creation date (newest first)
      const sortedVostcards = vostcards.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('✅ Loaded', sortedVostcards.length, 'private vostcards from Firebase');
      console.log('📅 First 3 vostcards:', sortedVostcards.slice(0, 3).map(v => ({
        id: v.id,
        title: v.title,
        createdAt: v.createdAt,
        state: v.state,
        visibility: v.visibility
      })));
      
      setSavedVostcards(sortedVostcards);
      
      // Cache locally for performance
      try {
        const localDB = await openUserDB();
        const transaction = localDB.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Clear existing cache and add new data
        await store.clear();
        for (const vostcard of sortedVostcards) {
          await store.put(vostcard);
        }
        console.log('💾 Cached', sortedVostcards.length, 'private vostcards locally');
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache locally:', cacheError);
      }
      
    } catch (error) {
      console.error('❌ Error loading private vostcards:', error);
      // Don't throw, just log the error and return empty array
      setSavedVostcards([]);
    }
  }, [openUserDB]);

  // Legacy function for compatibility - now redirects to loadPrivateVostcards
  const loadAllLocalVostcards = useCallback(async () => {
    return loadPrivateVostcards();
  }, [loadPrivateVostcards]);

  // Load posted vostcards from Firebase  
  const loadPostedVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user authenticated, skipping loadPostedVostcards');
      return;
    }

    try {
      console.log('🔄 Loading posted vostcards from Firebase for user:', user.uid);
      
      // Query Firebase for posted vostcards
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'public')
      );
      console.log('🔍 Query built:', q);
      
      const querySnapshot = await getDocs(q);
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Debug logging for image/audio data
        console.log('🔍 Posted vostcard Firebase data for', doc.id, ':', {
          photoURLs: data.photoURLs,
          photoURLsType: typeof data.photoURLs,
          photoURLsLength: Array.isArray(data.photoURLs) ? data.photoURLs.length : 'not array',
          firstPhotoURL: Array.isArray(data.photoURLs) && data.photoURLs.length > 0 ? data.photoURLs[0] : 'none',
          videoURL: data.videoURL,
          audioURL: data.audioURL,
          hasPhotos: data.hasPhotos,
          hasVideo: data.hasVideo,
          allFields: Object.keys(data)
        });
        
        // Test if first photo URL is accessible and try to refresh if needed
        if (Array.isArray(data.photoURLs) && data.photoURLs.length > 0) {
          const testUrl = data.photoURLs[0];
          console.log('🧪 Testing posted photo URL accessibility:', testUrl);
          
          fetch(testUrl, { method: 'HEAD' })
            .then(response => {
              console.log('✅ Posted photo URL accessible:', response.status, response.statusText);
              if (response.status === 412 || response.status === 403) {
                console.warn('⚠️ Posted HTTP', response.status, ': URL may be expired or have permission issues');
                // TODO: Implement URL refresh logic here if needed
              }
            })
            .catch(error => {
              console.error('❌ Posted photo URL failed:', error.message);
              // TODO: Implement fallback logic here if needed
            });
        }
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          categories: Array.isArray(data.categories) ? data.categories : [],
          username: data.username || '',
          userID: data.userID || '',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          state: data.state || 'posted',
          visibility: data.visibility || 'public',
          type: 'vostcard' as const,
          video: null,
          photos: [],
          geo: data.geo || { latitude: data.latitude, longitude: data.longitude } || null,
          hasVideo: data.hasVideo || false,
          hasPhotos: data.hasPhotos || false,
          isOffer: !!data.isOffer,
          offerDetails: data.offerDetails || undefined,
          userRole: data.userRole,
          _firebaseVideoURL: data.videoURL || null,
          _firebasePhotoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [],
          photoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [], // Use original Firebase URLs with tokens
          _isMetadataOnly: true
        };
      });

      // Sort posted vostcards by most recent
      const sortedPosted = vostcards.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('✅ Successfully loaded posted vostcards:', {
        total: vostcards.length,
        posted: sortedPosted.length
      });
      
      console.log('📊 First 3 posted vostcards:', sortedPosted.slice(0, 3).map(v => ({
        id: v.id,
        title: v.title,
        state: v.state,
        visibility: v.visibility,
        createdAt: v.createdAt
      })));
          
      setPostedVostcards(sortedPosted);
    } catch (error) {
      console.error('❌ Error loading posted vostcards:', error);
      // Don't throw, just log the error and return empty array
      setPostedVostcards([]);
    }
  }, []);



  // Post vostcard (change visibility to public and save)
  const postVostcard = useCallback(async () => {
    console.log('🚀 Starting postVostcard...');
    if (!currentVostcard) {
      console.error('No vostcard to post');
      throw new Error('No vostcard to post');
    }

    if (!currentVostcard.geo?.latitude || !currentVostcard.geo?.longitude) {
      throw new Error('Vostcard must have geo location to be posted');
    }

    console.log('📍 Posting vostcard:', {
      id: currentVostcard.id,
      title: currentVostcard.title,
      state: currentVostcard.state,
      visibility: currentVostcard.visibility,
      hasPhotos: currentVostcard.photos?.length > 0,
      hasVideo: !!currentVostcard.video,
      geo: currentVostcard.geo
    });

    try {
      // Update vostcard to posted and public
      const updatedVostcard = {
        ...currentVostcard,
        state: 'posted' as const,
        visibility: 'public' as const,
        updatedAt: new Date().toISOString()
      };
      
      setCurrentVostcard(updatedVostcard);
      
      // Save to Firebase with new visibility - pass the updated vostcard directly
      await saveVostcardDirect(updatedVostcard);
      
      // Move from savedVostcards to postedVostcards
      console.log('🔄 Moving vostcard between lists:', {
        vostcardId: currentVostcard.id,
        savedCount: savedVostcards.length,
        postedCount: postedVostcards.length,
        wasInSaved: savedVostcards.some(v => v.id === currentVostcard.id),
        wasInPosted: postedVostcards.some(v => v.id === currentVostcard.id)
      });
      
      setSavedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        console.log('📝 Removed from savedVostcards:', prev.length, '→', filtered.length);
        return filtered;
      });
      
      setPostedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        const updated = [...filtered, updatedVostcard];
        console.log('📝 Added to postedVostcards:', prev.length, '→', updated.length);
        return updated;
      });

      console.log('✅ Vostcard posted successfully');
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      throw error;
    }
  }, [currentVostcard, saveVostcardDirect, savedVostcards, postedVostcards]);

  // Unpost vostcard (change back to private and move to saved)
  const unpostVostcard = useCallback(async () => {
    console.log('📤 Starting unpostVostcard...');
    if (!currentVostcard) {
      console.error('No vostcard to unpost');
      throw new Error('No vostcard to unpost');
    }

    console.log('📍 Unposting vostcard:', {
      id: currentVostcard.id,
      title: currentVostcard.title,
      state: currentVostcard.state,
      visibility: currentVostcard.visibility
    });

    try {
      // Update vostcard to private
      const updatedVostcard = {
        ...currentVostcard,
        state: 'private' as const,
        visibility: 'private' as const,
        updatedAt: new Date().toISOString()
      };
      
      setCurrentVostcard(updatedVostcard);
      
      // Save to Firebase with new visibility
      await saveVostcardDirect(updatedVostcard);
      
      // Move from postedVostcards to savedVostcards
      console.log('🔄 Moving vostcard from posted to saved:', {
        vostcardId: currentVostcard.id,
        savedCount: savedVostcards.length,
        postedCount: postedVostcards.length,
        wasInSaved: savedVostcards.some(v => v.id === currentVostcard.id),
        wasInPosted: postedVostcards.some(v => v.id === currentVostcard.id)
      });
      
      setPostedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        console.log('📝 Removed from postedVostcards:', prev.length, '→', filtered.length);
        return filtered;
      });
      
      setSavedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        const updated = [...filtered, updatedVostcard];
        console.log('📝 Added to savedVostcards:', prev.length, '→', updated.length);
        return updated;
      });

      console.log('✅ Vostcard unposted successfully');
    } catch (error) {
      console.error('❌ Error unposting vostcard:', error);
      throw error;
    }
  }, [currentVostcard, saveVostcardDirect, savedVostcards, postedVostcards]);

  // Delete private vostcard
  const deletePrivateVostcard = useCallback(async (vostcardId: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Delete from IndexedDB
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.delete(vostcardId);

      // Delete from Firebase
      const docRef = doc(db, 'vostcards', vostcardId);
      try {
        await deleteDoc(docRef);
        console.log('✅ Deleted from Firebase:', vostcardId);
      } catch (e) {
        console.warn('⚠️ Could not delete from Firebase:', e);
        // Continue with local deletion even if Firebase fails
      }

      // Update state
      setSavedVostcards(prev => prev.filter(v => v.id !== vostcardId));
      setPostedVostcards(prev => prev.filter(v => v.id !== vostcardId));
      
    } catch (error) {
      console.error('Error deleting vostcard:', error);
      throw error;
    }
  }, [openUserDB]);

  // Intelligent sync: prioritize IndexedDB URLs if they're fresher than Firebase
  const syncVostcardMetadata = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user authenticated, skipping metadata sync');
      return;
    }
    
    console.log('🔄 Starting intelligent IndexedDB-Firebase sync for user:', user.uid);
    
    try {
      // Step 1: Load from IndexedDB first
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const localVostcards = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      console.log('📱 Loaded', localVostcards.length, 'vostcards from IndexedDB');
      
      // Step 2: Load from Firebase
      await loadPrivateVostcards();
      await loadPostedVostcards();
      
      // Step 2.5 & 3: Get current saved vostcards and perform intelligent merge
      setSavedVostcards(currentSaved => {
        // Step 2.5: If IndexedDB is empty, populate it with Firebase data (initial sync)
        if (localVostcards.length === 0 && currentSaved.length > 0) {
          console.log('🔄 IndexedDB is empty, performing initial population from Firebase...');
          (async () => {
            try {
              const localDB = await openUserDB();
              const transaction = localDB.transaction([STORE_NAME], 'readwrite');
              const store = transaction.objectStore(STORE_NAME);
              
              for (const vostcard of currentSaved) {
                await store.put(vostcard);
              }
              
              console.log('✅ Initial IndexedDB population completed with', currentSaved.length, 'vostcards');
            } catch (error) {
              console.error('❌ Failed to populate IndexedDB:', error);
            }
          })();
        }
        
        // Step 3: Intelligent merge - prioritize IndexedDB URLs if they exist
        let indexedDBUsedCount = 0;
        let firebaseUsedCount = 0;
        
        const mergedVostcards = currentSaved.map(firebaseVostcard => {
          const localVostcard = localVostcards.find(local => local.id === firebaseVostcard.id);
          
          if (localVostcard && (localVostcard._firebasePhotoURLs || localVostcard.photos)) {
            console.log('🔄 Using IndexedDB URLs for', firebaseVostcard.id, {
              hasIndexedDBPhotos: !!localVostcard._firebasePhotoURLs,
              indexedDBPhotoCount: localVostcard._firebasePhotoURLs?.length || 0,
              hasFirebasePhotos: !!firebaseVostcard._firebasePhotoURLs,
              firebasePhotoCount: firebaseVostcard._firebasePhotoURLs?.length || 0
            });
            indexedDBUsedCount++;
            
            return {
              ...firebaseVostcard,
              _firebasePhotoURLs: localVostcard._firebasePhotoURLs || firebaseVostcard._firebasePhotoURLs,
              _firebaseVideoURL: localVostcard._firebaseVideoURL || firebaseVostcard._firebaseVideoURL,
              photos: localVostcard.photos || firebaseVostcard.photos,
              video: localVostcard.video || firebaseVostcard.video
            };
          } else {
            console.log('🔥 Using Firebase URLs for', firebaseVostcard.id, {
              reason: !localVostcard ? 'not in IndexedDB' : 'no IndexedDB URLs',
              hasFirebasePhotos: !!firebaseVostcard._firebasePhotoURLs,
              firebasePhotoCount: firebaseVostcard._firebasePhotoURLs?.length || 0
            });
            firebaseUsedCount++;
          }
          
          return firebaseVostcard;
        });
        
        console.log('📊 Sync summary:', {
          totalVostcards: mergedVostcards.length,
          usedIndexedDB: indexedDBUsedCount,
          usedFirebase: firebaseUsedCount
        });
        
        console.log('✅ Intelligent sync completed - merged IndexedDB and Firebase data');
        
        return mergedVostcards;
      });
      setLastSyncTimestamp(new Date());
      console.log('✅ Metadata sync completed at:', new Date().toISOString());
      
    } catch (error) {
      console.error('❌ Error during intelligent sync, falling back to Firebase-only:', error);
      
      // Fallback to original sync
      let localSuccess = false;
      let postedSuccess = false;

      try {
        await loadAllLocalVostcards();
        localSuccess = true;
        console.log('✅ Local vostcards synced');
      } catch (error) {
        console.error('❌ Failed to sync local vostcards:', error);
      }

      try {
        await loadPostedVostcards();
        postedSuccess = true;
        console.log('✅ Posted vostcards synced');
      } catch (error) {
        console.error('❌ Failed to sync posted vostcards:', error);
      }

      if (!localSuccess && !postedSuccess) {
        throw new Error('Failed to sync both local and posted vostcards');
      }

      setLastSyncTimestamp(new Date());
      console.log('✅ Fallback sync completed at:', new Date().toISOString());
    }
  }, [openUserDB]);

  // Download vostcard content
  const downloadVostcardContent = useCallback(async (vostcardId: string) => {
    const vostcard = savedVostcards.find(v => v.id === vostcardId);
    if (!vostcard) {
      throw new Error('Vostcard not found');
    }

    // If we already have full content, return
    if (!vostcard._isMetadataOnly) {
          return;
        }

    try {
      // Download media from Firebase Storage
      const photoBlobs = await Promise.all(
        (vostcard._firebasePhotoURLs || []).map(async url => {
          const response = await fetch(url);
          return response.blob();
        })
      );

      let videoBlob = null;
      if (vostcard._firebaseVideoURL) {
        const response = await fetch(vostcard._firebaseVideoURL);
        videoBlob = await response.blob();
      }

      // Update local copy
      const updatedVostcard = {
        ...vostcard,
        photos: photoBlobs,
        video: videoBlob,
        _isMetadataOnly: false
      };

      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.put(updatedVostcard);

      setSavedVostcards(prev =>
        prev.map(v => v.id === vostcardId ? updatedVostcard : v)
      );
      
    } catch (error) {
      console.error('Error downloading vostcard content:', error);
      throw error;
    }
  }, [savedVostcards, openUserDB]);

  // Clean up old deletion markers
  const cleanupDeletionMarkers = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const markersQuery = query(
        collection(db, 'deletionMarkers'),
        where('userID', '==', user.uid)
      );
      
      const snapshot = await getDocs(markersQuery);
      const toDelete = snapshot.docs.filter(doc => {
        const data = doc.data();
        return new Date(data.deletedAt) < thirtyDaysAgo;
      });
        
        for (const doc of toDelete) {
          await deleteDoc(doc.ref);
      }
    } catch (error) {
      console.error('Error cleaning up deletion markers:', error);
    }
  }, []);

  // Clear all deletion markers
  const clearDeletionMarkers = useCallback(() => {
    localStorage.removeItem('deleted_vostcards');
    localStorage.removeItem('deletion_timestamps');
  }, []);

  // Load local vostcard
  const loadLocalVostcard = useCallback(async (vostcardId: string, options?: { restoreVideo?: boolean; restorePhotos?: boolean }) => {
    try {
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const vostcard = await new Promise<Vostcard | null>((resolve, reject) => {
        const request = store.get(vostcardId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!vostcard) {
        throw new Error('Vostcard not found in local storage');
      }

      // If we have URLs but no files, try to restore them
      if (vostcard._firebasePhotoURLs && vostcard._firebasePhotoURLs.length > 0 && (!vostcard.photos || vostcard.photos.length === 0)) {
        if (options?.restorePhotos !== false) {
          console.log('🔄 Restoring photos from URLs...');
          const photoBlobs = await Promise.all(
            vostcard._firebasePhotoURLs.map(async url => {
              const response = await fetch(url);
              return response.blob();
            })
          );
          vostcard.photos = photoBlobs;
        }
      }

      if (vostcard._firebaseVideoURL && !vostcard.video) {
        if (options?.restoreVideo !== false) {
          console.log('🔄 Restoring video from URL...');
          const response = await fetch(vostcard._firebaseVideoURL);
          vostcard.video = await response.blob();
        }
      }

      setCurrentVostcard(vostcard);
      console.log('✅ Local vostcard loaded:', vostcard.id);
      
    } catch (error) {
      console.error('Error loading local vostcard:', error);
      throw error;
    }
  }, [openUserDB]);

  // Manual cleanup of Firebase
  const manualCleanupFirebase = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, 'vostcards'), where('userID', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const toDelete = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.title !== 'I did it';
      });
      
      for (const docSnapshot of toDelete) {
          await deleteDoc(docSnapshot.ref);
      }

      // Clear local data
      const localDB = await openUserDB();
        const transaction = localDB.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
      await store.clear();

      setSavedVostcards([]);
      setPostedVostcards([]);
      // Note: Data reload will be handled by parent component
      
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      throw error;
    }
  }, [openUserDB]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      if (!authContext.loading && authContext.user) {
        console.log('🔄 Initial data load for user:', authContext.user.uid);
        try {
          // First try to load local data
          await loadPrivateVostcards();
          console.log('✅ Private vostcards loaded');

          // Then try to load posted data
          await loadPostedVostcards();
          console.log('✅ Posted vostcards loaded');

          // Finally sync metadata
          await syncVostcardMetadata();
          console.log('✅ Metadata synced');
        } catch (error) {
          console.error('❌ Error during initial data load:', error);
          // Try each operation individually to ensure at least some data loads
          try {
            await loadPrivateVostcards();
          } catch (e) {
            console.error('❌ Failed to load private vostcards:', e);
          }
          try {
            await loadPostedVostcards();
          } catch (e) {
            console.error('❌ Failed to load posted vostcards:', e);
          }
          try {
            await syncVostcardMetadata();
          } catch (e) {
            console.error('❌ Failed to sync metadata:', e);
          }
        }
      }
    };

    loadInitialData();
  }, [authContext.loading, authContext.user]);

  const setVideo = useCallback((video: Blob, location?: { latitude: number; longitude: number }) => {
    if (!currentVostcard) {
      console.error('❌ No current vostcard to set video on');
      return;
    }
    
    console.log('📹 Setting video on vostcard:', {
      vostcardId: currentVostcard.id,
      videoSize: video.size,
      videoType: video.type,
      hasLocation: !!location,
      location: location
    });
    
    const updates: any = { video };
    
    // Update location if provided and not already set
    if (location && (!currentVostcard.geo || !currentVostcard.geo.latitude)) {
      updates.geo = location;
      console.log('📍 Updated vostcard location from video recording');
    }
    
    setCurrentVostcard({
      ...currentVostcard,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Video set on vostcard successfully');
  }, [currentVostcard]);

  const updateVostcard = useCallback((updates: Partial<Vostcard>) => {
    if (!currentVostcard) {
      console.error('No vostcard to update');
      return;
    }

    setCurrentVostcard({
      ...currentVostcard,
      ...updates,
          updatedAt: new Date().toISOString()
    });
  }, [currentVostcard]);

  // Debug function to inspect IndexedDB contents
  const debugIndexedDB = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user authenticated for IndexedDB debug');
      return;
    }

    try {
      console.log('🔍 === IndexedDB Debug Report ===');
      const localDB = await openUserDB();
      console.log('📂 Database:', localDB.name, 'version:', localDB.version);
      
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      // Get all records
      const allRecords = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      console.log('📊 Total records in IndexedDB:', allRecords.length);
      console.log('📋 All vostcard IDs:', allRecords.map(v => v.id));
      console.log('📋 All vostcard titles:', allRecords.map(v => `${v.id}: "${v.title}"`));
      console.log('📋 All vostcard states:', allRecords.map(v => `${v.id}: ${v.state}`));
      
      // Show first 3 records in detail
      console.log('📄 First 3 records in detail:');
      allRecords.slice(0, 3).forEach((record, index) => {
        console.log(`📄 Record ${index + 1}:`, {
          id: record.id,
          title: record.title,
          state: record.state,
          createdAt: record.createdAt,
          hasPhotos: record.photos?.length > 0,
          hasVideo: !!record.video
        });
      });
      
      console.log('🔍 === End IndexedDB Debug Report ===');
    } catch (error) {
      console.error('❌ Error debugging IndexedDB:', error);
    }
  }, [openUserDB]);

  const value = {
    savedVostcards,
    setSavedVostcards,
    postedVostcards,
        currentVostcard,
        setCurrentVostcard,
        clearVostcard,
    createNewVostcard,
    saveVostcard,
        postVostcard,
        unpostVostcard,
        deletePrivateVostcard,
    loadAllLocalVostcards,
    loadPrivateVostcards,
        loadPostedVostcards,
        syncVostcardMetadata,
        downloadVostcardContent,
        cleanupDeletionMarkers,
        clearDeletionMarkers,
        manualCleanupFirebase,
    loadLocalVostcard,
    refreshFirebaseStorageURLs,
    fixExpiredURLs,
    cleanupBrokenFileReferences,
    debugFirebaseStorage,
    setVideo,
    updateVostcard,
    debugIndexedDB
  };

  return (
    <VostcardContext.Provider value={value}>
      {children}
    </VostcardContext.Provider>
  );
};

// Hook
export const useVostcard = () => {
  const context = useContext(VostcardContext);
  if (!context) {
    throw new Error('useVostcard must be used within a VostcardProvider');
  }
  return context;
};
