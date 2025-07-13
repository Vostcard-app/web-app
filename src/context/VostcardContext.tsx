import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Script } from '../types/ScriptModel';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { ScriptService } from '../services/scriptService';
import { LikeService, type Like } from '../services/likeService';
import { RatingService, type Rating, type RatingStats } from '../services/ratingService';

interface Vostcard {
  id: string;
  visibility: 'public' | 'private';
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
  // Firebase sync metadata
  lastSyncedAt?: string;
  needsSync?: boolean;
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob, geoOverride?: { latitude: number; longitude: number }) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  addPhoto: (photo: Blob) => void;
  saveLocalVostcard: () => void;
  loadLocalVostcard: (id: string) => void;
  clearVostcard: () => void;
  clearLocalStorage: () => void; // For testing
  postVostcard: () => Promise<void>;
  savedVostcards: Vostcard[];
  loadAllLocalVostcards: () => void;
  deletePrivateVostcard: (id: string) => Promise<void>;
  deleteVostcardsWithWrongUsername: () => Promise<void>;
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
  // Sync status
  syncStatus: 'idle' | 'syncing' | 'error';
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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const { user, userID } = authContext;

  // 🔄 REAL-TIME FIREBASE SYNC
  useEffect(() => {
    if (!user || !userID) {
      console.log('🔄 No user, skipping Firebase sync setup');
      return;
    }

    console.log('🔄 Setting up real-time Firebase sync for user:', userID);

    // Query for user's private Vostcards
    const privateVostcardsQuery = query(
      collection(db, 'vostcards'),
      where('userID', '==', userID),
      where('visibility', '==', 'private'),
      orderBy('updatedAt', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(privateVostcardsQuery, async (snapshot) => {
      try {
        console.log('🔄 Firebase snapshot received, changes:', snapshot.docChanges().length);
        
        const firebaseVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];

        console.log('🔄 Firebase Vostcards:', firebaseVostcards.length);

        // Merge with local IndexedDB
        await mergeFirebaseWithLocal(firebaseVostcards);

      } catch (error) {
        console.error('❌ Error in Firebase sync listener:', error);
        setSyncStatus('error');
      }
    });

    return () => {
      console.log('🔄 Cleaning up Firebase sync listener');
      unsubscribe();
    };
  }, [user, userID]);

  // 🔄 MERGE FIREBASE WITH LOCAL DATA
  const mergeFirebaseWithLocal = useCallback(async (firebaseVostcards: Vostcard[]) => {
    try {
      setSyncStatus('syncing');
      
      // Load current local Vostcards
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      const localVostcards = await new Promise<Vostcard[]>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const results = request.result as Vostcard[];
          resolve(results);
        };
      });

      console.log('🔄 Local Vostcards:', localVostcards.length);
      console.log('🔄 Firebase Vostcards:', firebaseVostcards.length);

      // Create a map for efficient lookups
      const localMap = new Map(localVostcards.map(v => [v.id, v]));
      const firebaseMap = new Map(firebaseVostcards.map(v => [v.id, v]));
      
      const updatedVostcards: Vostcard[] = [];
      const toSaveLocally: Vostcard[] = [];

      // Process Firebase Vostcards
      for (const firebaseVostcard of firebaseVostcards) {
        const localVostcard = localMap.get(firebaseVostcard.id);
        
        if (!localVostcard) {
          // New Vostcard from Firebase - download and save locally
          console.log('🔄 New Vostcard from Firebase:', firebaseVostcard.id);
          const downloadedVostcard = await downloadFirebaseVostcard(firebaseVostcard);
          toSaveLocally.push(downloadedVostcard);
          updatedVostcards.push(downloadedVostcard);
        } else {
          // Compare timestamps to see which is newer
          const firebaseTime = new Date(firebaseVostcard.updatedAt).getTime();
          const localTime = new Date(localVostcard.updatedAt).getTime();
          
          if (firebaseTime > localTime) {
            // Firebase version is newer - update local
            console.log('🔄 Updating local Vostcard from Firebase:', firebaseVostcard.id);
            const downloadedVostcard = await downloadFirebaseVostcard(firebaseVostcard);
            toSaveLocally.push(downloadedVostcard);
            updatedVostcards.push(downloadedVostcard);
          } else {
            // Local version is current
            updatedVostcards.push(localVostcard);
          }
        }
      }

      // Add local-only Vostcards (not in Firebase yet)
      for (const localVostcard of localVostcards) {
        if (!firebaseMap.has(localVostcard.id) && localVostcard.visibility === 'private') {
          updatedVostcards.push(localVostcard);
          
          // If it needs sync, sync it now
          if (localVostcard.needsSync) {
            console.log('🔄 Syncing local Vostcard to Firebase:', localVostcard.id);
            await syncVostcardToFirebase(localVostcard);
          }
        }
      }

      // Save updated Vostcards to IndexedDB
      if (toSaveLocally.length > 0) {
        const saveTransaction = db.transaction([STORE_NAME], 'readwrite');
        const saveStore = saveTransaction.objectStore(STORE_NAME);
        
        for (const vostcard of toSaveLocally) {
          saveStore.put(vostcard);
        }
      }

      // Update UI
      const filteredVostcards = updatedVostcards.filter(v => v.visibility !== 'public');
      setSavedVostcards(filteredVostcards);
      setSyncStatus('idle');

      console.log('🔄 Sync complete. Total Vostcards:', filteredVostcards.length);

    } catch (error) {
      console.error('❌ Error merging Firebase with local:', error);
      setSyncStatus('error');
    }
  }, []);

  // 🔄 DOWNLOAD FIREBASE VOSTCARD (convert URLs back to Blobs)
  const downloadFirebaseVostcard = useCallback(async (firebaseVostcard: any): Promise<Vostcard> => {
    try {
      console.log('📥 Downloading Firebase Vostcard:', firebaseVostcard.id);
      
      // Download video if exists
      let videoBlob: Blob | null = null;
      let videoBase64: string | null = null;
      
      if (firebaseVostcard.video) {
        try {
          const videoResponse = await fetch(firebaseVostcard.video);
          videoBlob = await videoResponse.blob();
          
          // Convert to base64 for IndexedDB storage
          videoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(videoBlob!);
          });
        } catch (error) {
          console.warn('⚠️ Failed to download video:', error);
        }
      }

      // Download photos if exist
      const photoBlobs: Blob[] = [];
      const photoBase64s: string[] = [];
      
      if (firebaseVostcard.photos && firebaseVostcard.photos.length > 0) {
        for (const photoURL of firebaseVostcard.photos) {
          try {
            const photoResponse = await fetch(photoURL);
            const photoBlob = await photoResponse.blob();
            photoBlobs.push(photoBlob);
            
            // Convert to base64 for IndexedDB storage
            const photoBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(photoBlob);
            });
            photoBase64s.push(photoBase64);
          } catch (error) {
            console.warn('⚠️ Failed to download photo:', error);
          }
        }
      }

      // Create local Vostcard with Blobs
      const localVostcard: Vostcard = {
        id: firebaseVostcard.id,
        visibility: firebaseVostcard.visibility,
        video: videoBlob,
        title: firebaseVostcard.title,
        description: firebaseVostcard.description,
        photos: photoBlobs,
        categories: firebaseVostcard.categories || [],
        geo: firebaseVostcard.geo,
        username: firebaseVostcard.username,
        userID: firebaseVostcard.userID,
        recipientUserID: firebaseVostcard.recipientUserID,
        createdAt: firebaseVostcard.createdAt,
        updatedAt: firebaseVostcard.updatedAt,
        isOffer: firebaseVostcard.isOffer,
        offerDetails: firebaseVostcard.offerDetails,
        script: firebaseVostcard.script,
        scriptId: firebaseVostcard.scriptId,
        _videoBase64: videoBase64,
        _photosBase64: photoBase64s,
        lastSyncedAt: firebaseVostcard.lastSyncedAt,
        needsSync: false // Just synced from Firebase
      };

      console.log('📥 Downloaded Vostcard successfully:', localVostcard.id);
      return localVostcard;

    } catch (error) {
      console.error('❌ Error downloading Firebase Vostcard:', error);
      throw error;
    }
  }, []);

  // 🔄 SYNC VOSTCARD TO FIREBASE
  const syncVostcardToFirebase = useCallback(async (vostcard: Vostcard) => {
    try {
      if (!userID) return;

      console.log('📤 Syncing Vostcard to Firebase:', vostcard.id);

      // Upload video if exists
      let videoURL = '';
      if (vostcard.video) {
        videoURL = await uploadVideo(userID, vostcard.id, vostcard.video);
      }

      // Upload photos if exist
      const photoURLs: string[] = [];
      if (vostcard.photos && vostcard.photos.length > 0) {
        const photoUploadPromises = vostcard.photos.map((photo, index) => 
          uploadPhoto(userID, vostcard.id, index, photo)
        );
        const uploadedPhotoURLs = await Promise.all(photoUploadPromises);
        photoURLs.push(...uploadedPhotoURLs);
      }

      // Save to Firebase
      const firebaseVostcard = {
        id: vostcard.id,
        visibility: vostcard.visibility,
        video: videoURL,
        title: vostcard.title,
        description: vostcard.description,
        photos: photoURLs,
        categories: vostcard.categories,
        geo: vostcard.geo,
        username: vostcard.username,
        userID: vostcard.userID,
        recipientUserID: vostcard.recipientUserID,
        createdAt: vostcard.createdAt,
        updatedAt: new Date().toISOString(),
        isOffer: vostcard.isOffer,
        offerDetails: vostcard.offerDetails,
        script: vostcard.script,
        scriptId: vostcard.scriptId,
        lastSyncedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'vostcards', vostcard.id), firebaseVostcard);
      console.log('📤 Synced to Firebase successfully:', vostcard.id);

    } catch (error) {
      console.error('❌ Error syncing to Firebase:', error);
      throw error;
    }
  }, [userID]);

  // 🔄 PERIODIC SYNC FOR UNSAVED CHANGES
  useEffect(() => {
    if (!user || !userID) return;

    const syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Running periodic sync...');
        
        // Find Vostcards that need sync
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        const localVostcards = await new Promise<Vostcard[]>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result as Vostcard[]);
        });

        const vostcardsNeedingSync = localVostcards.filter(v => 
          v.needsSync && v.visibility === 'private'
        );

        if (vostcardsNeedingSync.length > 0) {
          console.log('🔄 Found Vostcards needing sync:', vostcardsNeedingSync.length);
          
          for (const vostcard of vostcardsNeedingSync) {
            try {
              await syncVostcardToFirebase(vostcard);
              
              // Update local record to mark as synced
              const updateTransaction = db.transaction([STORE_NAME], 'readwrite');
              const updateStore = updateTransaction.objectStore(STORE_NAME);
              const updatedVostcard = {
                ...vostcard,
                lastSyncedAt: new Date().toISOString(),
                needsSync: false
              };
              updateStore.put(updatedVostcard);
              
            } catch (error) {
              console.warn('⚠️ Failed to sync Vostcard:', vostcard.id, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in periodic sync:', error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(syncInterval);
  }, [user, userID, syncVostcardToFirebase]);

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
      throw error;
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

  // Load all Vostcards from IndexedDB and restore their blobs
  const loadAllLocalVostcards = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to load Vostcards from IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const existing: any[] = request.result || [];
          console.log('📂 Found', existing.length, 'Vostcards in IndexedDB');

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

          // Filter out Vostcards with visibility === 'public'
          const filteredVostcards = restoredVostcards.filter(v => v.visibility !== 'public');
          setSavedVostcards(filteredVostcards);
          console.log('📂 Loaded all saved Vōstcards:', filteredVostcards);
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Failed to open IndexedDB:', error);
      alert('Failed to load saved Vostcards. Please refresh the page and try again.');
    }
  }, []);

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
        visibility: 'private' as const,
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

  // ✅ Save to IndexedDB with Firebase sync
  const saveLocalVostcard = useCallback(async () => {
    }
  }, [currentVostcard, loadAllLocalVostcards]);

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

  // ✅ Delete private Vostcard from IndexedDB
  const deletePrivateVostcard = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to delete Vostcard from IndexedDB:', request.error);
          alert('Failed to delete Vostcard. Please try again.');
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('🗑️ Deleted Vostcard from IndexedDB:', id);
          // Update the savedVostcards list by filtering out the deleted item
          setSavedVostcards(prev => prev.filter(vostcard => vostcard.id !== id));
          resolve();
        };
      });
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
        offerDetails: currentVostcard.offerDetails || null
      });

      console.log('✅ Vostcard posted successfully to Firebase!');
      // Removing this alert since we show it in CreateVostcardStep3
      // alert('🎉 Vōstcard posted successfully! It will appear on the map with media.');

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
        // Sync status
        syncStatus,
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
