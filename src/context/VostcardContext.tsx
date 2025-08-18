// VostcardContext.tsx - Unified Vostcard Context
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import type { Vostcard, FirebaseVostcard } from '../types/VostcardTypes';

// Constants
const STORE_NAME = 'vostcards';
const METADATA_STORE_NAME = 'vostcard_metadata';
const DB_VERSION = 2; // Increment this when schema changes

// Context interface
interface VostcardContextType {
  savedVostcards: Vostcard[];
  postedVostcards: Vostcard[];
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  clearVostcard: () => void;
  saveLocalVostcard: () => Promise<void>;
  postVostcard: () => Promise<void>;
  deletePrivateVostcard: (vostcardId: string) => Promise<void>;
  loadAllLocalVostcards: () => Promise<void>;
  loadPostedVostcards: () => Promise<void>;
  syncVostcardMetadata: () => Promise<void>;
  downloadVostcardContent: (vostcardId: string) => Promise<void>;
  cleanupDeletionMarkers: () => Promise<void>;
  clearDeletionMarkers: () => void;
  manualCleanupFirebase: () => Promise<void>;
  loadLocalVostcard: (vostcardId: string, options?: { restoreVideo?: boolean; restorePhotos?: boolean }) => Promise<void>;
}

// Create context
const VostcardContext = createContext<VostcardContextType | null>(null);

// Provider component
export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);
  const [postedVostcards, setPostedVostcards] = useState<Vostcard[]>([]);
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<Date | null>(null);
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
      // Delete old database if it exists
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onerror = () => {
        console.warn('Error deleting old database:', deleteRequest.error);
      };
      deleteRequest.onsuccess = () => {
        console.log('Successfully deleted old database');
        
        // Open new database with current version
        const request = indexedDB.open(dbName, DB_VERSION);
        
        request.onerror = () => {
          console.error('Error opening database:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          console.log('Successfully opened database');
          resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
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
      };
    });
  }, [authContext]);

  // Clear current vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(null);
  }, []);

  // Save vostcard locally
  const saveLocalVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.error('No vostcard to save');
      return;
    }

    try {
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Check if record exists
      const existingRecord = await new Promise<any>((resolve, reject) => {
        const request = store.get(currentVostcard.id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // If record exists, delete it first
      if (existingRecord) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(currentVostcard.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Add new record
      await new Promise<void>((resolve, reject) => {
        const request = store.add(currentVostcard);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Update savedVostcards state
      setSavedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        return [...filtered, currentVostcard];
      });

      console.log('✅ Vostcard saved successfully');
    } catch (error) {
      console.error('❌ Error saving vostcard:', error);
      throw error;
    }
  }, [currentVostcard, openUserDB]);

  // Load all local vostcards
  const loadAllLocalVostcards = useCallback(async () => {
    try {
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const vostcards = await new Promise<Vostcard[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      setSavedVostcards(vostcards);
    } catch (error) {
      console.error('Error loading local vostcards:', error);
      throw error;
    }
  }, [openUserDB]);

  // Load posted vostcards
  const loadPostedVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, 'vostcards'), where('userID', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseVostcard;
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          categories: data.categories,
          username: data.username,
          userID: data.userID,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          state: 'posted' as const,
          isOffer: data.isOffer || false,
          offerDetails: data.offerDetails || null,
          geo: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : null,
          video: null,
          photos: [],
          _firebaseVideoURL: data.videoURL,
          _firebasePhotoURLs: data.photoURLs,
          _isMetadataOnly: true
        };
      });

      setPostedVostcards(vostcards);
    } catch (error) {
      console.error('Error loading posted vostcards:', error);
      throw error;
    }
  }, []);

  // Post vostcard to Firebase
  const postVostcard = useCallback(async () => {
    if (!currentVostcard) {
      throw new Error('No vostcard to post');
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Upload media to Firebase Storage
      const photoURLs = await Promise.all(
        currentVostcard.photos.map(async (photo, idx) => {
          const photoRef = ref(storage, `users/${user.uid}/photos/${uuidv4()}`);
          await uploadBytes(photoRef, photo);
          return getDownloadURL(photoRef);
        })
      );

      let videoURL = null;
      if (currentVostcard.video) {
        const videoRef = ref(storage, `users/${user.uid}/videos/${uuidv4()}`);
        await uploadBytes(videoRef, currentVostcard.video);
        videoURL = await getDownloadURL(videoRef);
      }

      // Save to Firebase
      const username = getCorrectUsername(authContext);
      await setDoc(doc(db, 'vostcards', currentVostcard.id), {
        id: currentVostcard.id,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: username,
        userID: user.uid,
        userRole: authContext.userRole,
        photoURLs: photoURLs,
        videoURL: videoURL,
        latitude: currentVostcard.geo?.latitude,
        longitude: currentVostcard.geo?.longitude,
        avatarURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        state: 'posted',
        hasVideo: !!currentVostcard.video,
        hasPhotos: currentVostcard.photos.length > 0,
        mediaUploadStatus: 'complete',
        isOffer: currentVostcard.isOffer || false,
        offerDetails: currentVostcard.offerDetails || null,
        visibility: 'public'
      });

      // Update local copy
      try {
        const localDB = await openUserDB();
        const transaction = localDB.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const updatedVostcard = {
          ...currentVostcard,
          state: 'posted' as const,
          updatedAt: new Date().toISOString()
        };
        
        await store.put(updatedVostcard);
        
        setSavedVostcards(prev => 
          prev.map(v => v.id === currentVostcard.id ? updatedVostcard : v)
        );
      } catch (localError) {
        console.error('Error updating local vostcard state:', localError);
      }

      // Refresh lists
      setLastSyncTimestamp(new Date());
      await loadAllLocalVostcards();
      await loadPostedVostcards();
      clearVostcard();
      
    } catch (error) {
      console.error('Error posting vostcard:', error);
      throw error;
    }
  }, [currentVostcard, authContext, openUserDB, loadAllLocalVostcards, loadPostedVostcards, clearVostcard]);

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

      // Delete from Firebase if posted
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await deleteDoc(docRef);
      }

      // Update state
      setSavedVostcards(prev => prev.filter(v => v.id !== vostcardId));
      setPostedVostcards(prev => prev.filter(v => v.id !== vostcardId));

    } catch (error) {
      console.error('Error deleting vostcard:', error);
      throw error;
    }
  }, [openUserDB]);

  // Sync vostcard metadata
  const syncVostcardMetadata = useCallback(async () => {
    try {
      await loadAllLocalVostcards();
      await loadPostedVostcards();
      setLastSyncTimestamp(new Date());
    } catch (error) {
      console.error('Error syncing vostcard metadata:', error);
      throw error;
    }
  }, [loadAllLocalVostcards, loadPostedVostcards]);

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
      if (vostcard._firebasePhotoURLs?.length > 0 && (!vostcard.photos || vostcard.photos.length === 0)) {
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
      await loadAllLocalVostcards();
      
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      throw error;
    }
  }, [openUserDB, loadAllLocalVostcards]);

  // Initial load
  useEffect(() => {
    if (!authContext.loading && authContext.user) {
      syncVostcardMetadata();
    }
  }, [authContext.loading, authContext.user, syncVostcardMetadata]);

  const value = {
    savedVostcards,
    postedVostcards,
    currentVostcard,
    setCurrentVostcard,
    clearVostcard,
    saveLocalVostcard,
    postVostcard,
    deletePrivateVostcard,
    loadAllLocalVostcards,
    loadPostedVostcards,
    syncVostcardMetadata,
    downloadVostcardContent,
    cleanupDeletionMarkers,
    clearDeletionMarkers,
    manualCleanupFirebase,
    loadLocalVostcard
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
