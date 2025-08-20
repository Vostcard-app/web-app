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
  setVideo: (video: Blob) => void;
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
        createdAt: serverTimestamp(),
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
      await setDoc(doc(db, 'vostcards', currentVostcard.id), docData);

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
      
      // Save to Firebase with new visibility
      await saveVostcard();
      
      // Move from savedVostcards to postedVostcards
      setSavedVostcards(prev => prev.filter(v => v.id !== currentVostcard.id));
      setPostedVostcards(prev => {
        const filtered = prev.filter(v => v.id !== currentVostcard.id);
        return [...filtered, updatedVostcard];
      });

      console.log('✅ Vostcard posted successfully');
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      throw error;
    }
  }, [currentVostcard, saveVostcard]);

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

  // Sync vostcard metadata
  const syncVostcardMetadata = useCallback(async () => {
    const user = auth.currentUser;
      if (!user) {
      console.log('No user authenticated, skipping metadata sync');
              return;
            }
            
    console.log('🔄 Starting metadata sync for user:', user.uid);
    let localSuccess = false;
    let postedSuccess = false;

    try {
      // Try to load local data first
      await loadAllLocalVostcards();
      localSuccess = true;
      console.log('✅ Local vostcards synced');
                      } catch (error) {
      console.error('❌ Failed to sync local vostcards:', error);
    }

    try {
      // Then try to load posted data
      await loadPostedVostcards();
      postedSuccess = true;
      console.log('✅ Posted vostcards synced');
              } catch (error) {
      console.error('❌ Failed to sync posted vostcards:', error);
    }

    // If both operations failed, throw an error
    if (!localSuccess && !postedSuccess) {
      throw new Error('Failed to sync both local and posted vostcards');
    }

    // Update sync timestamp even if only one operation succeeded
    setLastSyncTimestamp(new Date());
    console.log('✅ Metadata sync completed at:', new Date().toISOString());
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
      await loadAllLocalVostcards();
      
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      throw error;
    }
  }, [openUserDB, loadAllLocalVostcards]);

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
  }, [authContext.loading, authContext.user, loadPrivateVostcards, loadPostedVostcards, syncVostcardMetadata]);

  const setVideo = useCallback((video: Blob) => {
    if (!currentVostcard) return;
    setCurrentVostcard({
      ...currentVostcard,
      video
    });
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
