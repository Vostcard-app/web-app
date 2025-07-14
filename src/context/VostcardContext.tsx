import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Script } from '../types/ScriptModel';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { ScriptService } from '../services/scriptService';
import { LikeService, type Like } from '../services/likeService';
import { RatingService, type Rating, type RatingStats } from '../services/ratingService';

export interface Vostcard {
  id: string;
  state: 'private' | 'posted';
  video: Blob | null;
  title: string;
  description: string;
  photos: Blob[];
  categories: string[];
  geo: { latitude: number; longitude: number } | null;
  username: string;
  userID: string;
  recipientUserID?: string; // For private sharing - who receives this private Vostcard
  createdAt: string;
  updatedAt: string;
  isOffer?: boolean; // New field for offers
  offerDetails?: {
    discount?: string;
    validUntil?: string;
    terms?: string;
  };
  script?: string; // Add script field
  scriptId?: string; // Add script ID field to track associated script
  _videoBase64?: string | null; // For IndexedDB serialization
  _photosBase64?: string[]; // For IndexedDB serialization
  _firebaseVideoURL?: string | null; // Firebase video URL for synced vostcards
  _firebasePhotoURLs?: string[]; // Firebase photo URLs for synced vostcards
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob, geoOverride?: { latitude: number; longitude: number }) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  addPhoto: (photo: Blob) => void;
  saveLocalVostcard: () => void;
  loadLocalVostcard: (id: string) => Promise<void>;
  clearVostcard: () => void;
  clearLocalStorage: () => void; // For testing
  postVostcard: () => Promise<void>;
  savedVostcards: Vostcard[];
  loadAllLocalVostcards: () => void;
  deletePrivateVostcard: (id: string) => Promise<void>;
  deleteVostcardsWithWrongUsername: () => Promise<void>;
  manualSync: () => Promise<void>;
  resetSyncTimestamp: () => void; // For testing
  scripts: Script[];
  loadScripts: () => Promise<void>;
  saveScript: (script: Script) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  updateScriptTitle: (scriptId: string, newTitle: string) => Promise<void>;
  updateScript: (scriptId: string, title: string, content: string) => Promise<void>;
  // Like system
  likedVostcards: Like[];
  toggleLike: (vostcardID: string) => Promise<boolean>;
  isLiked: (vostcardID: string) => Promise<boolean>;
  getLikeCount: (vostcardID: string) => Promise<number>;
  loadLikedVostcards: () => Promise<void>;
  setupLikeListeners: (vostcardID: string, onLikeCountChange: (count: number) => void, onLikeStatusChange: (isLiked: boolean) => void) => () => void;
  // Rating system
  submitRating: (vostcardID: string, rating: number) => Promise<void>;
  getCurrentUserRating: (vostcardID: string) => Promise<number>;
  getRatingStats: (vostcardID: string) => Promise<RatingStats>;
  setupRatingListeners: (vostcardID: string, onStatsChange: (stats: RatingStats) => void, onUserRatingChange: (rating: number) => void) => () => void;
}

// IndexedDB configuration
const DB_NAME = 'VostcardDB';
const DB_VERSION = 2;
const STORE_NAME = 'privateVostcards';

// IndexedDB utility functions
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const VostcardContext = createContext<VostcardContextProps | undefined>(undefined);

// Helper function to get correct username from AuthContext
const getCorrectUsername = (authContext: any, currentUsername?: string): string => {
  console.log('🔍 getCorrectUsername called with:', {
    authContextUsername: authContext.username,
    authContextUserEmail: authContext.user?.email,
    authContextUserDisplayName: authContext.user?.displayName,
    currentUsername: currentUsername
  });
  
  // Use username from AuthContext (loaded from Firestore)
  if (authContext.username) {
    console.log('✅ Using username from AuthContext:', authContext.username);
    return authContext.username;
  }
  
  // Fallback to email username (preferred over displayName)
  if (authContext.user?.email) {
    const emailUsername = authContext.user.email.split('@')[0];
    console.log('📧 Using email username as fallback:', emailUsername);
    return emailUsername;
  }
  
  // Only use displayName if it's not "info Web App"
  if (authContext.user?.displayName && authContext.user.displayName !== 'info Web App') {
    console.log('👤 Using displayName as fallback:', authContext.user.displayName);
    return authContext.user.displayName;
  }
  
  // Final fallback
  console.log('⚠️ Using final fallback username:', currentUsername || 'Unknown');
  return currentUsername || 'Unknown';
};

// Helper for video upload
async function uploadVideo(userId: string, vostcardId: string, file: Blob): Promise<string> {
  const storageRef = ref(storage, `vostcards/${userId}/${vostcardId}/video.webm`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Video upload is ${progress}% done`);
      },
      (error) => {
        console.error('Video upload failed:', error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log('Video file available at', downloadURL);
        resolve(downloadURL);
      }
    );
  });
}

// Helper for photo upload
async function uploadPhoto(userId: string, vostcardId: string, idx: number, file: Blob): Promise<string> {
  const storageRef = ref(storage, `vostcards/${userId}/${vostcardId}/photo${idx + 1}.jpg`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Photo ${idx + 1} upload is ${progress}% done`);
      },
      (error) => {
        console.error(`Photo ${idx + 1} upload failed:`, error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log(`Photo ${idx + 1} file available at`, downloadURL);
        resolve(downloadURL);
      }
    );
  });
}

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useAuth();
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [likedVostcards, setLikedVostcards] = useState<Like[]>([]);
  // Scripts Firestore CRUD
  const loadScripts = useCallback(async () => {
    console.log('📜 Starting loadScripts...');
    try {
      const user = auth.currentUser;
      console.log('📜 Current user:', {
        uid: user?.uid,
        email: user?.email,
        isAnonymous: user?.isAnonymous,
        hasUser: !!user
      });
      
      if (!user) {
        console.log('📜 No user logged in, skipping script load');
        setScripts([]);
        return;
      }

      console.log('📜 Attempting to load scripts for user:', user.uid);
      const loadedScripts = await ScriptService.getUserScripts(user.uid);
      console.log('📜 ScriptService.getUserScripts returned:', loadedScripts);
      console.log('📜 Number of scripts loaded:', loadedScripts.length);
      
      setScripts(loadedScripts);
      console.log('📜 Scripts set in state. Total count:', loadedScripts.length);
      
      if (loadedScripts.length === 0) {
        console.log('📜 No scripts found for user. This could be normal if no scripts have been created yet.');
      }
    } catch (error: any) {
      console.error('❌ Failed to load scripts - Full error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Provide more specific error information
      if (error.code === 'permission-denied') {
        console.error('❌ Permission denied - Check Firestore rules');
      } else if (error.code === 'unauthenticated') {
        console.error('❌ User not authenticated - Check auth state');
      }
      
      // Show alert for debugging
      alert(`Failed to load scripts: ${error.message}. Check console for details.`);
      setScripts([]);
    }
  }, []);

  const saveScript = useCallback(async (script: Script) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      if (script.id) {
        // Update existing script
        await ScriptService.updateScript(user.uid, script.id, script.title, script.content);
      } else {
        // Create new script
        await ScriptService.createScript(user.uid, script.title, script.content);
      }
      
      console.log('✅ Script saved to Firestore:', script);
      loadScripts();
    } catch (error) {
      console.error('❌ Failed to save script:', error);
      alert('Failed to save script. Please try again.');
    }
  }, [loadScripts]);

  const deleteScript = useCallback(async (id: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await ScriptService.deleteScript(user.uid, id);
      console.log('🗑️ Script deleted from Firestore:', id);
      loadScripts();
    } catch (error) {
      console.error('❌ Failed to delete script:', error);
      alert('Failed to delete script. Please try again.');
    }
  }, [loadScripts]);

  const updateScriptTitle = useCallback(async (scriptId: string, newTitle: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Get current script to preserve content
      const currentScript = scripts.find(s => s.id === scriptId);
      if (!currentScript) {
        throw new Error('Script not found');
      }

      await ScriptService.updateScript(user.uid, scriptId, newTitle, currentScript.content);
      console.log('✅ Script title updated in Firestore:', scriptId, newTitle);
      // Don't reload scripts automatically to avoid permission errors
    } catch (error) {
      console.error('❌ Failed to update script title:', error);
      // Don't show alert for script title update failures, just log it
      console.log('Script title update failed, but continuing...');
    }
  }, [scripts]);

  const updateScript = useCallback(async (scriptId: string, title: string, content: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await ScriptService.updateScript(user.uid, scriptId, title, content);
      console.log('✅ Script updated in Firestore:', scriptId);
      // Update local scripts state
      setScripts(prev => prev.map(script => 
        script.id === scriptId 
          ? { ...script, title, content, updatedAt: new Date().toISOString() }
          : script
      ));
    } catch (error) {
      console.error('❌ Failed to update script:', error);
      throw error;
    }
  }, []);

  // Like system functions
  const toggleLike = useCallback(async (vostcardID: string): Promise<boolean> => {
    try {
      const isLiked = await LikeService.toggleLike(vostcardID);
      console.log('✅ Toggle like result:', isLiked);
      // Note: Real-time listeners will update the like status automatically
      return isLiked;
    } catch (error) {
      console.error('❌ Failed to toggle like:', error);
      throw error;
    }
  }, []);

  const isLiked = useCallback(async (vostcardID: string): Promise<boolean> => {
    try {
      return await LikeService.isLiked(vostcardID);
    } catch (error) {
      console.error('❌ Failed to check like status:', error);
      return false;
    }
  }, []);

  const getLikeCount = useCallback(async (vostcardID: string): Promise<number> => {
    try {
      return await LikeService.getLikeCount(vostcardID);
    } catch (error) {
      console.error('❌ Failed to get like count:', error);
      return 0;
    }
  }, []);

  const loadLikedVostcards = useCallback(async () => {
    try {
      const liked = await LikeService.fetchLikedVostcards();
      setLikedVostcards(liked);
      console.log('✅ Loaded liked vostcards:', liked.length);
    } catch (error) {
      console.error('❌ Failed to load liked vostcards:', error);
      setLikedVostcards([]);
    }
  }, []);

  const setupLikeListeners = useCallback((
    vostcardID: string,
    onLikeCountChange: (count: number) => void,
    onLikeStatusChange: (isLiked: boolean) => void
  ): (() => void) => {
    const unsubscribeLikeCount = LikeService.listenToLikeCount(vostcardID, onLikeCountChange);
    const unsubscribeLikeStatus = LikeService.listenToLikeStatus(vostcardID, onLikeStatusChange);
    
    // Return function to unsubscribe from both listeners
    return () => {
      unsubscribeLikeCount();
      unsubscribeLikeStatus();
    };
  }, []);

  // Get last sync timestamp from localStorage
  const getLastSyncTimestamp = useCallback((): Date | null => {
    const lastSync = localStorage.getItem('vostcard_last_sync');
    return lastSync ? new Date(lastSync) : null;
  }, []);

  // Set last sync timestamp to localStorage
  const setLastSyncTimestamp = useCallback((timestamp: Date) => {
    localStorage.setItem('vostcard_last_sync', timestamp.toISOString());
  }, []);

  // Reset sync timestamp (for testing)
  const resetSyncTimestamp = useCallback(() => {
    localStorage.removeItem('vostcard_last_sync');
    console.log('🔄 Sync timestamp reset - next sync will be full sync');
  }, []);

  // Incremental sync private vostcards from Firebase to IndexedDB
  const syncPrivateVostcardsFromFirebase = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('☁️ No user logged in, skipping Firebase sync');
      return;
    }

    try {
      const lastSync = getLastSyncTimestamp();
      const isFullSync = !lastSync;
      
      console.log('☁️ Starting incremental sync from Firebase...', {
        userID: user.uid,
        lastSync: lastSync?.toISOString() || 'never',
        isFullSync
      });
      
      // Query for user's private vostcards updated since last sync
      let q;
      if (isFullSync) {
        // Full sync - get all private vostcards
        console.log('☁️ Doing FULL sync - getting all private vostcards');
        q = query(
          collection(db, 'vostcards'),
          where('userID', '==', user.uid),
          where('visibility', '==', 'private')
        );
      } else {
        // Incremental sync - only get items updated since last sync
        console.log('☁️ Doing INCREMENTAL sync - getting vostcards updated since:', lastSync?.toISOString());
        q = query(
          collection(db, 'vostcards'),
          where('userID', '==', user.uid),
          where('visibility', '==', 'private'),
          where('updatedAt', '>', Timestamp.fromDate(lastSync))
        );
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`☁️ Found ${querySnapshot.docs.length} ${isFullSync ? 'total' : 'updated'} private vostcards in Firebase`);
      
      // Log the first few docs for debugging
      querySnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`☁️ Vostcard ${index + 1}:`, {
          id: data.id,
          title: data.title,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 'no updatedAt',
          visibility: data.visibility,
          userID: data.userID
        });
      });
      
      if (querySnapshot.docs.length === 0) {
        console.log('☁️ No changes to sync');
        return;
      }

      // Save each Firebase vostcard to IndexedDB
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let syncedCount = 0;
      const syncStartTime = new Date();
      
      for (const docSnapshot of querySnapshot.docs) {
        const firebaseVostcard = docSnapshot.data();
        
        // Convert Firebase vostcard to local format with Blob placeholders
        const localVostcard = {
          id: firebaseVostcard.id,
          state: 'private' as const,
          title: firebaseVostcard.title || '',
          description: firebaseVostcard.description || '',
          categories: firebaseVostcard.categories || [],
          geo: firebaseVostcard.latitude && firebaseVostcard.longitude 
            ? { latitude: firebaseVostcard.latitude, longitude: firebaseVostcard.longitude }
            : null,
          username: firebaseVostcard.username || '',
          userID: firebaseVostcard.userID || '',
          createdAt: firebaseVostcard.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: firebaseVostcard.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isOffer: firebaseVostcard.isOffer || false,
          offerDetails: firebaseVostcard.offerDetails || null,
          script: firebaseVostcard.script || null,
          scriptId: firebaseVostcard.scriptId || null,
          video: null, // Will be loaded on-demand
          photos: [], // Will be loaded on-demand
          _videoBase64: null,
          _photosBase64: [],
          // Store Firebase URLs for later retrieval
          _firebaseVideoURL: firebaseVostcard.videoURL || null,
          _firebasePhotoURLs: firebaseVostcard.photoURLs || []
        };
        
        store.put(localVostcard);
        syncedCount++;
      }
      
      // Update last sync timestamp
      setLastSyncTimestamp(syncStartTime);
      
      console.log(`✅ Incremental sync completed: ${syncedCount} vostcards synced to IndexedDB`);
    } catch (error) {
      console.error('❌ Error in incremental sync from Firebase:', error);
    }
  }, [getLastSyncTimestamp, setLastSyncTimestamp]);

  // Load all Vostcards from IndexedDB and restore their blobs (with Firebase sync)
  const loadAllLocalVostcards = useCallback(async () => {
    console.log('📂 loadAllLocalVostcards called');
    try {
      // First sync from Firebase if user is logged in
      console.log('📂 Starting Firebase sync...');
      await syncPrivateVostcardsFromFirebase();
      console.log('📂 Firebase sync completed, loading from IndexedDB...');
      
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to load Vostcards from IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const existing: any[] = request.result || [];
          console.log('📂 Found', existing.length, 'Vostcards in IndexedDB (after Firebase sync)');

          const restoredVostcards = existing.map((v) => {
            const restored: Vostcard = {
              ...v,
              video: null,
              photos: [],
            };

            if (v._videoBase64) {
              try {
                const videoData = atob(v._videoBase64.split(',')[1]);
                const videoArray = new Uint8Array(videoData.length);
                for (let i = 0; i < videoData.length; i++) {
                  videoArray[i] = videoData.charCodeAt(i);
                }
                restored.video = new Blob([videoArray], { type: 'video/webm' });
              } catch (error) {
                console.error('❌ Failed to restore video from base64:', error);
              }
            }

            if (v._photosBase64) {
              restored.photos = v._photosBase64.map((base64: string) => {
                try {
                  const photoData = atob(base64.split(',')[1]);
                  const photoArray = new Uint8Array(photoData.length);
                  for (let i = 0; i < photoData.length; i++) {
                    photoArray[i] = photoData.charCodeAt(i);
                  }
                  return new Blob([photoArray], { type: 'image/jpeg' });
                } catch (error) {
                  console.error('❌ Failed to restore photo from base64:', error);
                  return new Blob([], { type: 'image/jpeg' });
                }
              });
            }

            return restored;
          });

          // Filter out Vostcards with state === 'posted'
          const filteredVostcards = restoredVostcards.filter(v => v.state !== 'posted');
          setSavedVostcards(filteredVostcards);
          console.log('📂 Loaded all saved Vōstcards:', filteredVostcards);
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Failed to open IndexedDB:', error);
      alert('Failed to load saved Vostcards. Please refresh the page and try again.');
    }
  }, [syncPrivateVostcardsFromFirebase]);

  // Load all Vostcards on component mount
  useEffect(() => {
    loadAllLocalVostcards();
  }, []);

  // Debug currentVostcard changes
  useEffect(() => {
    console.log('🔄 currentVostcard state changed:', {
      id: currentVostcard?.id || 'null',
      hasVideo: !!currentVostcard?.video,
      hasGeo: !!currentVostcard?.geo,
      geo: currentVostcard?.geo || 'null',
      title: currentVostcard?.title || 'null',
      photosCount: currentVostcard?.photos?.length || 0,
      categoriesCount: currentVostcard?.categories?.length || 0
    });
  }, [currentVostcard]);

  // ✅ Update geolocation (define this first since setVideo depends on it)
  const setGeo = useCallback((geo: { latitude: number; longitude: number }) => {
    console.log('📍 setGeo called with:', geo);
    console.log('📍 Current Vostcard before setGeo:', currentVostcard);
    
    if (currentVostcard) {
      // Always ensure username is correct when setting geo
      const correctUsername = getCorrectUsername(authContext, currentVostcard.username);
      
      const updatedVostcard = { 
        ...currentVostcard, 
        geo,
        username: correctUsername, // Always set correct username
        updatedAt: new Date().toISOString() 
      };
      console.log('📍 Updated Vostcard with geo and correct username:', {
        geo: updatedVostcard.geo,
        oldUsername: currentVostcard.username,
        newUsername: correctUsername
      });
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('📍 setGeo called but no currentVostcard exists - geo will be set when Vostcard is created');
    }
  }, [currentVostcard]);

  // ✅ Create or update video
  const setVideo = useCallback((video: Blob, geoOverride?: { latitude: number; longitude: number }) => {
    console.log('🎬 setVideo called with blob:', video);
    console.log('📍 Current geo before setVideo:', currentVostcard?.geo, 'geoOverride:', geoOverride);

    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        video,
        updatedAt: new Date().toISOString(),
        geo: geoOverride || currentVostcard.geo,
      };
      console.log('📍 Updated Vostcard with video and geo:', updatedVostcard.geo);
      setCurrentVostcard(updatedVostcard);
    } else {
      const user = auth.currentUser;
      const username = getCorrectUsername(authContext);
      const newVostcard = {
        id: uuidv4(),
        state: 'private' as const,
        video,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: geoOverride || null,
        username,
        userID: user?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('🎬 Creating new Vostcard with video and geo:', newVostcard.geo);
      setCurrentVostcard(newVostcard);
    }
  }, [currentVostcard]);

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = useCallback((updates: Partial<Vostcard>) => {
    console.log('🔄 updateVostcard called with:', updates);
    
    if (currentVostcard) {
      // Always ensure username is correct when updating
      const correctUsername = getCorrectUsername(authContext, currentVostcard.username);
      
      const updatedVostcard = {
        ...currentVostcard,
        ...updates,
        username: correctUsername, // Always set correct username
        updatedAt: new Date().toISOString(),
      };
      
      console.log('📍 Updated Vostcard with correct username:', {
        oldUsername: currentVostcard.username,
        newUsername: correctUsername,
        geo: updatedVostcard.geo
      });
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('🔄 updateVostcard called but no currentVostcard exists');
    }
  }, [currentVostcard]);

  // ✅ Add a photo to the current Vostcard
  const addPhoto = useCallback((photo: Blob) => {
    if (currentVostcard) {
      // Always ensure username is correct when adding photos
      const correctUsername = getCorrectUsername(authContext, currentVostcard.username);
      
      const updatedPhotos = [...currentVostcard.photos, photo];
      const updatedVostcard = {
        ...currentVostcard,
        photos: updatedPhotos,
        username: correctUsername, // Always set correct username
        updatedAt: new Date().toISOString(),
      };
      console.log('📸 Photo added with correct username:', {
        totalPhotos: updatedPhotos.length,
        oldUsername: currentVostcard.username,
        newUsername: correctUsername
      });
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('📸 Tried to add photo but no currentVostcard exists');
    }
  }, [currentVostcard]);

  // ✅ Save to both IndexedDB (local) and Firebase (sync) - Hybrid Storage
  const saveLocalVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.log('💾 saveLocalVostcard: No currentVostcard to save');
      throw new Error('No currentVostcard to save');
    }
    
    console.log('💾 saveLocalVostcard: Starting hybrid save process for Vostcard:', {
      id: currentVostcard.id,
      hasVideo: !!currentVostcard.video,
      videoSize: currentVostcard.video?.size,
      photosCount: currentVostcard.photos?.length || 0,
      photoSizes: currentVostcard.photos?.map(p => p.size) || []
    });

    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user authenticated, cannot sync to Firebase');
      throw new Error('User not authenticated');
    }
    
    try {
      // 1. SAVE TO INDEXEDDB (for fast local access)
      console.log('💾 Step 1: Saving to IndexedDB...');
      
      // Convert Blob objects to base64 strings for IndexedDB serialization
      const serializableVostcard = {
        ...currentVostcard,
        video: currentVostcard.video ? null : null,
        photos: [],
        _videoBase64: null as string | null,
        _photosBase64: [] as string[]
      };

      // Convert video Blob to base64 if it exists
      if (currentVostcard.video) {
        console.log('💾 Converting video to base64...');
        const videoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(currentVostcard.video!);
        });
        serializableVostcard._videoBase64 = videoBase64;
        console.log('💾 Video converted to base64, length:', videoBase64.length);
      }

      // Convert photos Blobs to base64
      if (currentVostcard.photos && currentVostcard.photos.length > 0) {
        console.log('💾 Converting photos to base64...');
        const photoPromises = currentVostcard.photos.map((photo, index) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              console.log(`💾 Photo ${index + 1} converted to base64, length:`, (reader.result as string).length);
              resolve(reader.result as string);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(photo);
          });
        });

        const photoBase64s = await Promise.all(photoPromises);
        serializableVostcard._photosBase64 = photoBase64s;
        console.log('💾 All photos converted to base64');
      }

      // Save to IndexedDB
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(serializableVostcard);
        request.onerror = () => {
          console.error('❌ Failed to save Vostcard to IndexedDB:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log('✅ Saved Vostcard to IndexedDB successfully');
          resolve();
        };
      });

      // 2. SYNC TO FIREBASE (for device synchronization)
      console.log('☁️ Step 2: Syncing to Firebase...');
      
      const vostcardId = currentVostcard.id;
      const userID = user.uid;
      const username = getCorrectUsername(authContext, currentVostcard.username);

      // Upload media to Firebase Storage if exists
      let videoURL = '';
      let photoURLs: string[] = [];

      if (currentVostcard.video && currentVostcard.video instanceof Blob) {
        console.log('☁️ Uploading video to Firebase Storage...');
        videoURL = await uploadVideo(userID, vostcardId, currentVostcard.video);
      }

      if (currentVostcard.photos && currentVostcard.photos.length > 0) {
        console.log('☁️ Uploading photos to Firebase Storage...');
        photoURLs = await Promise.all(
          currentVostcard.photos.map((photo, idx) =>
            photo instanceof Blob ? uploadPhoto(userID, vostcardId, idx, photo) : Promise.resolve('')
          )
        );
      }

      // Save to Firebase Firestore
      const docRef = doc(db, 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        title: currentVostcard.title || '',
        description: currentVostcard.description || '',
        categories: currentVostcard.categories || [],
        username: username,
        userID: userID,
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: currentVostcard.geo?.latitude || null,
        longitude: currentVostcard.geo?.longitude || null,
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        state: 'private', // Private state
        visibility: 'private', // Private visibility
        hasVideo: !!currentVostcard.video,
        hasPhotos: (currentVostcard.photos?.length || 0) > 0,
        mediaUploadStatus: 'complete',
        isOffer: currentVostcard.isOffer || false,
        offerDetails: currentVostcard.offerDetails || null,
        script: currentVostcard.script || null,
        scriptId: currentVostcard.scriptId || null
      });

      console.log('✅ Private Vostcard synced to Firebase successfully');
      
      // Update last sync timestamp since we just saved to Firebase
      setLastSyncTimestamp(new Date());
      
      // Refresh the savedVostcards list from IndexedDB
      loadAllLocalVostcards();
      
    } catch (error) {
      console.error('❌ Error in saveLocalVostcard (hybrid storage):', error);
      alert('Failed to save Vostcard. Please try again.');
      throw error;
    }
  }, [currentVostcard, loadAllLocalVostcards, authContext]);

  // ✅ Load from IndexedDB
  const loadLocalVostcard = useCallback(async (id: string) => {
    console.log('📂 loadLocalVostcard: Attempting to load Vostcard with ID:', id);
    
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to load Vostcard from IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const found = request.result;
          
          if (found) {
            console.log('📂 Found Vostcard in IndexedDB:', {
              id: found.id,
              hasVideoBase64: !!found._videoBase64,
              videoBase64Length: found._videoBase64?.length,
              hasPhotosBase64: !!found._photosBase64,
              photosBase64Count: found._photosBase64?.length,
              title: found.title
            });
            
            // Convert base64 strings back to Blob objects
            const restoredVostcard = {
              ...found,
              video: null as Blob | null,
              photos: [] as Blob[]
            };

            // Convert video base64 back to Blob
            if (found._videoBase64) {
              try {
                console.log('📂 Converting video base64 back to Blob...');
                const videoBase64 = found._videoBase64;
                const videoBytes = atob(videoBase64.split(',')[1]);
                const videoArray = new Uint8Array(videoBytes.length);
                for (let i = 0; i < videoBytes.length; i++) {
                  videoArray[i] = videoBytes.charCodeAt(i);
                }
                restoredVostcard.video = new Blob([videoArray], { type: 'video/webm' });
                console.log('📂 Video restored, size:', restoredVostcard.video.size);
              } catch (error) {
                console.error('❌ Failed to restore video from base64:', error);
              }
            }

            // Convert photos base64 back to Blobs
            if (found._photosBase64 && found._photosBase64.length > 0) {
              try {
                console.log('📂 Converting photos base64 back to Blobs...');
                const photoBlobs = found._photosBase64.map((photoBase64: string, index: number) => {
                  const photoBytes = atob(photoBase64.split(',')[1]);
                  const photoArray = new Uint8Array(photoBytes.length);
                  for (let i = 0; i < photoBytes.length; i++) {
                    photoArray[i] = photoBytes.charCodeAt(i);
                  }
                  const blob = new Blob([photoArray], { type: 'image/jpeg' });
                  console.log(`📂 Photo ${index + 1} restored, size:`, blob.size);
                  return blob;
                });
                restoredVostcard.photos = photoBlobs;
                console.log('📂 All photos restored, count:', photoBlobs.length);
              } catch (error) {
                console.error('❌ Failed to restore photos from base64:', error);
              }
            }

            // Remove the base64 fields from the restored object
            delete restoredVostcard._videoBase64;
            delete restoredVostcard._photosBase64;

            console.log('📂 Loaded Vostcard from IndexedDB:', {
              id: restoredVostcard.id,
              hasVideo: !!restoredVostcard.video,
              videoSize: restoredVostcard.video?.size,
              photosCount: restoredVostcard.photos.length,
              photoSizes: restoredVostcard.photos.map((p: Blob) => p.size),
              title: restoredVostcard.title
            });

            setCurrentVostcard(restoredVostcard);
          } else {
            console.log('📂 Vostcard not found in IndexedDB with ID:', id);
          }
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Error in loadLocalVostcard:', error);
      alert('Failed to load Vostcard. Please try again.');
    }
  }, []);

  // ✅ Delete private Vostcard from both IndexedDB and Firebase (hybrid delete)
  const deletePrivateVostcard = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('🗑️ Starting hybrid delete for Vostcard:', id);
      
      // 1. Delete from IndexedDB
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onerror = () => {
          console.error('❌ Failed to delete Vostcard from IndexedDB:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log('✅ Deleted Vostcard from IndexedDB:', id);
          resolve();
        };
      });

      // 2. Delete from Firebase (if user is authenticated)
      const user = auth.currentUser;
      if (user) {
        try {
          const vostcardRef = doc(db, 'vostcards', id);
          await deleteDoc(vostcardRef);
          console.log('✅ Deleted Vostcard from Firebase:', id);
          
          // Update last sync timestamp since we just deleted from Firebase
          setLastSyncTimestamp(new Date());
        } catch (error) {
          console.error('❌ Failed to delete from Firebase (continuing anyway):', error);
          // Continue even if Firebase delete fails - local delete is more important
        }
      }

      // Update the savedVostcards list by filtering out the deleted item
      setSavedVostcards(prev => prev.filter(vostcard => vostcard.id !== id));
      console.log('✅ Hybrid delete completed for Vostcard:', id);
      
    } catch (error) {
      console.error('❌ Error in deletePrivateVostcard:', error);
      alert('Failed to delete Vostcard. Please try again.');
      throw error;
    }
  }, []);

  // ✅ Clear current Vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(null);
  }, []);

  // ✅ Clear IndexedDB (for testing)
  const clearLocalStorage = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to clear IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('🗑️ Cleared all Vostcards from IndexedDB');
          setSavedVostcards([]);
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Error in clearLocalStorage:', error);
      alert('Failed to clear local storage. Please try again.');
    }
  }, []);

  // ✅ Delete Vostcards with incorrect username
  const deleteVostcardsWithWrongUsername = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in, skipping delete');
        return;
      }

      console.log('🗑️ Deleting Vostcards with incorrect username...');
      
      // Query for Vostcards with incorrect username (any username that's not from AuthContext)
      const correctUsername = getCorrectUsername(authContext);
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('username', '!=', correctUsername)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.docs.length} Vostcards with incorrect username to delete`);

      if (querySnapshot.docs.length === 0) {
        console.log('No Vostcards with incorrect username found');
        return;
      }

      // Delete each Vostcard
      const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const vostcardRef = doc(db, 'vostcards', docSnapshot.id);
        await deleteDoc(vostcardRef);
        console.log(`🗑️ Deleted Vostcard ${docSnapshot.id}`);
      });

      await Promise.all(deletePromises);
      console.log('✅ All Vostcards with incorrect username deleted!');
      
    } catch (error) {
      console.error('❌ Error deleting Vostcards:', error);
    }
  }, []);

  // ✅ Post Vostcard to Firebase (public map) - Updated version
  const postVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.error('No current Vostcard to post');
      alert('No Vostcard to post. Please start with a video.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated. Please log in first.');
      return;
    }

    // Check if Vostcard has required data for posting
    if (!currentVostcard.title || !currentVostcard.description || (currentVostcard.categories?.length || 0) === 0) {
      alert('Please fill in title, description, and select at least one category before posting.');
      return;
    }

    if (!currentVostcard.geo) {
      alert('Location is required to post a Vostcard to the map. Please try again.');
      return;
    }

    try {
      console.log('📥 Starting post to Firebase (public map)...');
      const vostcardId = currentVostcard.id;
      const userID = user.uid;
      const username = getCorrectUsername(authContext, currentVostcard.username);

      // --- Upload video to Firebase Storage ---
      let videoURL = '';
      if (currentVostcard.video && currentVostcard.video instanceof Blob) {
        videoURL = await uploadVideo(userID, vostcardId, currentVostcard.video);
      }

      // --- Upload photos to Firebase Storage ---
      let photoURLs: string[] = [];
      if (currentVostcard.photos && currentVostcard.photos.length > 0) {
        photoURLs = await Promise.all(
          currentVostcard.photos.map((photo, idx) =>
            photo instanceof Blob ? uploadPhoto(userID, vostcardId, idx, photo) : Promise.resolve('')
          )
        );
      }

      // DEBUG: Log username before saving to Firestore
      console.log('🔍 DEBUG: Final username before Firestore save:', {
        username: username,
        authContextUsername: authContext.username,
        userEmail: authContext.user?.email,
        userID: userID,
        vostcardId: vostcardId
      });

      const docRef = doc(db, 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        title: currentVostcard.title || '',
        description: currentVostcard.description || '',
        categories: currentVostcard.categories || [],
        username: username,
        userID: userID,
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: currentVostcard.geo.latitude,
        longitude: currentVostcard.geo.longitude,
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        state: 'posted',
        hasVideo: !!currentVostcard.video,
        hasPhotos: (currentVostcard.photos?.length || 0) > 0,
        mediaUploadStatus: 'complete',
        isOffer: currentVostcard.isOffer || false,
        offerDetails: currentVostcard.offerDetails || null,
        visibility: 'public'
      });

      console.log('✅ Vostcard posted successfully to Firebase!');
      // Removing this alert since we show it in CreateVostcardStep3
      // alert('🎉 Vōstcard posted successfully! It will appear on the map with media.');

      // Update last sync timestamp since we just posted to Firebase
      setLastSyncTimestamp(new Date());

      clearVostcard();

    } catch (error) {
      console.error('❌ Failed to post Vostcard:', error);

      if (error instanceof Error && error.message.includes('CORS')) {
        alert('❌ Upload failed due to CORS policy. Please check your Firebase Storage rules.');
      } else {
        alert('❌ Failed to post Vostcard. Please try again.');
      }

      throw error;
    }
  }, [currentVostcard, clearVostcard]);

  // Manual sync function for UI
  const manualSync = useCallback(async () => {
    console.log('🔄 Manual sync requested');
    try {
      await syncPrivateVostcardsFromFirebase();
      await loadAllLocalVostcards();
      console.log('✅ Manual sync completed successfully');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      throw error;
    }
  }, [syncPrivateVostcardsFromFirebase, loadAllLocalVostcards]);

  return (
    <VostcardContext.Provider
      value={{
        currentVostcard,
        setCurrentVostcard,
        setVideo,
        setGeo,
        updateVostcard,
        addPhoto,
        saveLocalVostcard,
        loadLocalVostcard,
        clearVostcard,
        clearLocalStorage,
        postVostcard,
        savedVostcards,
        loadAllLocalVostcards,
        deletePrivateVostcard,
        deleteVostcardsWithWrongUsername,
        manualSync,
        resetSyncTimestamp,
        scripts,
        loadScripts,
        saveScript,
        deleteScript,
        updateScriptTitle,
        updateScript,
        // Like system
        likedVostcards,
        toggleLike,
        isLiked,
        getLikeCount,
        loadLikedVostcards,
        setupLikeListeners,
        // Rating system
        submitRating: RatingService.submitRating,
        getCurrentUserRating: RatingService.getCurrentUserRating,
        getRatingStats: RatingService.getRatingStats,
        setupRatingListeners: (vostcardID: string, onStatsChange: (stats: RatingStats) => void, onUserRatingChange: (rating: number) => void) => {
          const unsubscribeStats = RatingService.listenToRatingStats(vostcardID, onStatsChange);
          const unsubscribeUserRating = RatingService.listenToUserRating(vostcardID, onUserRatingChange);
          
          return () => {
            unsubscribeStats();
            unsubscribeUserRating();
          };
        },
      }}
    >
      {children}
    </VostcardContext.Provider>
  );
};

export const useVostcard = () => {
  const context = useContext(VostcardContext);
  if (!context) {
    throw new Error('useVostcard must be used within a VostcardProvider');
  }
  return context;
};