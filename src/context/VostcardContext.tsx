// VostcardContext.tsx - Unified Vostcard Context
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
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
  postedVostcards: Vostcard[];
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  clearVostcard: () => void;
  createNewVostcard: () => void;
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
  setVideo: (video: Blob) => void;
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
      // Try to open existing database first
      const request = indexedDB.open(dbName, DB_VERSION);
      
      request.onerror = (event) => {
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
                newRequest.onupgradeneeded = (event) => {
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
      video: null,
      type: 'vostcard',
      hasVideo: false,
      hasPhotos: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🆕 Creating new vostcard:', {
      id: newVostcard.id,
      username: newVostcard.username,
      userID: newVostcard.userID
    });

    setCurrentVostcard(newVostcard);
  }, [authContext.userRole]);

  // Save vostcard locally
  const saveLocalVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.error('No vostcard to save');
      return;
    }

    console.log('💾 Saving vostcard:', {
      id: currentVostcard.id,
      title: currentVostcard.title,
      state: currentVostcard.state,
      hasPhotos: currentVostcard.photos?.length > 0,
      hasVideo: !!currentVostcard.video,
      hasGeo: !!currentVostcard.geo
    });

    try {
      const localDB = await openUserDB();
      console.log('📂 Opened IndexedDB:', localDB.name, 'version:', localDB.version);
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
      console.log('🔄 Loading local vostcards...');
      const localDB = await openUserDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const vostcards = await new Promise<Vostcard[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Filter out any invalid vostcards
      const validVostcards = vostcards.filter(vostcard => {
        try {
          // Check required fields
          if (!vostcard.id || !vostcard.userID) {
            console.warn('⚠️ Vostcard missing required fields:', {
              id: vostcard.id,
              hasUserID: !!vostcard.userID
            });
            return false;
          }

          // Ensure arrays are actually arrays
          if (vostcard.photos && !Array.isArray(vostcard.photos)) {
            console.warn('⚠️ Vostcard photos is not an array:', vostcard.id);
            vostcard.photos = [];
          }
          if (vostcard.categories && !Array.isArray(vostcard.categories)) {
            console.warn('⚠️ Vostcard categories is not an array:', vostcard.id);
            vostcard.categories = [];
          }

          // Ensure timestamps are valid
          if (!vostcard.createdAt) {
            console.warn('⚠️ Vostcard missing createdAt:', vostcard.id);
            vostcard.createdAt = new Date().toISOString();
          }
          if (!vostcard.updatedAt) {
            console.warn('⚠️ Vostcard missing updatedAt:', vostcard.id);
            vostcard.updatedAt = new Date().toISOString();
          }

          // Ensure state is valid
          if (!vostcard.state || !['private', 'posted'].includes(vostcard.state)) {
            console.warn('⚠️ Vostcard has invalid state:', vostcard.id, vostcard.state);
            vostcard.state = 'private';
          }

          return true;
    } catch (error) {
          console.error('❌ Error validating vostcard:', vostcard.id, error);
      return false;
    }
      });

      console.log('✅ Loaded', validVostcards.length, 'valid local vostcards');
      setSavedVostcards(validVostcards);
    } catch (error) {
      console.error('❌ Error loading local vostcards:', error);
      // Don't throw, just log the error and return empty array
      setSavedVostcards([]);
    }
  }, [openUserDB]);

  // Load posted vostcards
  const loadPostedVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user authenticated, skipping loadPostedVostcards');
      return;
    }

    try {
      console.log('🔄 Loading posted vostcards for user:', user.uid);
      
      // First try to get all posted vostcards
      console.log('🔍 Building Firebase query for user:', user.uid);
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('state', '==', 'posted'),
        orderBy('createdAt', 'desc')
      );
      console.log('🔍 Query built:', q);

      // Also search for specific post
      const gregsQuery = query(
        collection(db, 'vostcards'),
        where('title', '==', 'Gregs')
      );
      const gregsSnapshot = await getDocs(gregsQuery);
      console.log('🔍 Found Gregs posts:', gregsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Query results:', querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
      console.log('📊 Found', querySnapshot.docs.length, 'posted vostcards in Firebase');
      
      console.log('🔄 Processing vostcard documents...');
      const vostcards = await Promise.all(querySnapshot.docs.map(async doc => {
        try {
          const data = doc.data() as FirebaseVostcard;
          console.log('📄 Processing vostcard:', doc.id, {
            title: data.title,
            username: data.username,
            userID: data.userID,
            state: data.state,
            createdAt: data.createdAt,
            hasGeo: !!(data.latitude && data.longitude)
          });
          
          // Handle missing or invalid timestamps
          let createdAt = new Date().toISOString();
          let updatedAt = new Date().toISOString();
          
          try {
            if (data.createdAt) {
              if (typeof data.createdAt === 'string') {
                createdAt = data.createdAt;
              } else if (data.createdAt.toDate) {
                createdAt = data.createdAt.toDate().toISOString();
              }
            }
            if (data.updatedAt) {
              if (typeof data.updatedAt === 'string') {
                updatedAt = data.updatedAt;
              } else if (data.updatedAt.toDate) {
                updatedAt = data.updatedAt.toDate().toISOString();
              }
            }
          } catch (timeError) {
            console.warn('⚠️ Error parsing timestamps for vostcard:', doc.id, timeError);
          }

          // Handle missing or invalid geo data
          let geo = null;
          if (data.latitude !== undefined && data.longitude !== undefined) {
            geo = {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude)
            };
          } else if (data.geo) {
            geo = {
              latitude: Number(data.geo.latitude),
              longitude: Number(data.geo.longitude)
            };
          }

          // Validate required fields
          if (!data.title || !data.userID || !geo) {
            console.warn('⚠️ Vostcard missing required fields:', doc.id, {
              hasTitle: !!data.title,
              hasUserID: !!data.userID,
              hasGeo: !!geo
            });
    }

    return {
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description || '',
            categories: Array.isArray(data.categories) ? data.categories : [],
            username: data.username || user.displayName || user.email?.split('@')[0] || 'Unknown',
            userID: data.userID || user.uid,
            createdAt,
            updatedAt,
            state: 'posted' as const,
            isOffer: !!data.isOffer,
            offerDetails: data.offerDetails || null,
            geo,
            video: null,
            photos: [],
            _firebaseVideoURL: data.videoURL || null,
            _firebasePhotoURLs: Array.isArray(data.photoURLs) ? data.photoURLs : [],
            _isMetadataOnly: true
          };
        } catch (docError) {
          console.error('❌ Error processing vostcard:', doc.id, docError);
          return null;
        }
      }));

      // Filter out any null entries from errors
      const validVostcards = vostcards.filter((v): v is NonNullable<typeof v> => {
        if (!v) {
          console.warn('⚠️ Found null vostcard entry');
          return false;
        }
        if (!v.id || !v.userID || !v.geo) {
          console.warn('⚠️ Invalid vostcard:', {
            id: v?.id,
            hasUserID: !!v?.userID,
            hasGeo: !!v?.geo
          });
          return false;
        }
        return true;
      });
      console.log('✅ Successfully loaded', validVostcards.length, 'valid vostcards');
      console.log('📊 Valid vostcards:', validVostcards.map(v => ({
        id: v.id,
        title: v.title,
        userID: v.userID,
        state: v.state,
        createdAt: v.createdAt
      })));
      
      setPostedVostcards(validVostcards);
    } catch (error) {
      console.error('❌ Error loading posted vostcards:', error);
      // Don't throw, just log the error and return empty array
      setPostedVostcards([]);
    }
  }, []);

  // Post vostcard to Firebase
  const postVostcard = useCallback(async () => {
    console.log('Starting postVostcard...');
    if (!currentVostcard) {
      console.error('No vostcard to post');
      throw new Error('No vostcard to post');
    }

    console.log('Current vostcard:', currentVostcard);
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    try {
      console.log('Uploading media to Firebase Storage...');
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
      console.log('📍 Posting vostcard:', {
        id: currentVostcard.id,
        title: currentVostcard.title,
        state: currentVostcard.state,
        username: username,
        userID: user.uid,
        hasPhotos: currentVostcard.photos?.length > 0,
        hasVideo: !!currentVostcard.video,
        geo: currentVostcard.geo,
        photoCount: currentVostcard.photos?.length
      });
      
      if (!currentVostcard.geo?.latitude || !currentVostcard.geo?.longitude) {
        throw new Error('Vostcard must have geo location to be posted');
      }

      if (currentVostcard.state !== 'posted') {
        console.warn('⚠️ Vostcard state is not "posted":', currentVostcard.state);
      }

      const docData = {
        id: currentVostcard.id,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: username,
        userID: user.uid,
        userRole: authContext.userRole,
        photoURLs: photoURLs,
        videoURL: videoURL,
        latitude: currentVostcard.geo.latitude,
        longitude: currentVostcard.geo.longitude,
        geo: {
          latitude: currentVostcard.geo.latitude,
          longitude: currentVostcard.geo.longitude
        },
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
      };

      console.log('📝 Saving vostcard to Firebase:', docData);
      await setDoc(doc(db, 'vostcards', currentVostcard.id), docData);

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
    const loadInitialData = async () => {
      if (!authContext.loading && authContext.user) {
        console.log('🔄 Initial data load for user:', authContext.user.uid);
        try {
          // First try to load local data
          await loadAllLocalVostcards();
          console.log('✅ Local vostcards loaded');

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
            await loadAllLocalVostcards();
          } catch (e) {
            console.error('❌ Failed to load local vostcards:', e);
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
  }, [authContext.loading, authContext.user, loadAllLocalVostcards, loadPostedVostcards, syncVostcardMetadata]);

  const setVideo = useCallback((video: Blob) => {
    if (!currentVostcard) return;
    setCurrentVostcard({
      ...currentVostcard,
      video
    });
  }, [currentVostcard]);

  const value = {
    savedVostcards,
    postedVostcards,
    currentVostcard,
    setCurrentVostcard,
    clearVostcard,
    createNewVostcard,
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
    loadLocalVostcard,
    setVideo
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
