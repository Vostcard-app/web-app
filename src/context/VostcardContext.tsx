import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Script } from '../types/ScriptModel';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, limit, setDoc, Timestamp } from 'firebase/firestore';
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
  userRole?: string; // Add userRole field to track user type
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
  hasVideo?: boolean; // Indicates if vostcard has video content
  hasPhotos?: boolean; // Indicates if vostcard has photo content
  _videoBase64?: string | null; // For IndexedDB serialization
  _photosBase64?: string[]; // For IndexedDB serialization
  _firebaseVideoURL?: string | null; // Firebase video URL for synced vostcards
  _firebasePhotoURLs?: string[]; // Firebase photo URLs for synced vostcards
  _isMetadataOnly?: boolean; // Flag to indicate this is metadata only
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
  postVostcard: (vostcard?: Vostcard) => Promise<void>;
  savedVostcards: Vostcard[];
  loadAllLocalVostcards: () => void;
  deletePrivateVostcard: (id: string) => Promise<void>;
  deleteVostcardsWithWrongUsername: () => Promise<void>;
  manualSync: () => Promise<void>;
  debugFirebaseVostcards: () => Promise<void>;
  debugLocalVostcards: () => Promise<void>;
  // Posted vostcards management
  postedVostcards: any[];
  loadPostedVostcards: () => Promise<void>;
  loadPrivateVostcards: () => Promise<void>;
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
  // Debug functions
  debugSpecificVostcard: (vostcardId: string) => Promise<void>;
  fixBrokenSharedVostcard: (vostcardId: string) => Promise<boolean>;
  loadAllLocalVostcardsImmediate: () => Promise<void>;
  syncInBackground: () => Promise<void>;
  clearAllPrivateVostcardsFromFirebase: () => Promise<void>;
  // Lightweight sync functions
  syncVostcardMetadata: () => Promise<void>;
  downloadVostcardContent: (vostcardId: string) => Promise<void>;
  getVostcardMetadata: () => Vostcard[];
  // Deletion marker management
  cleanupDeletionMarkers: () => void;
  clearDeletionMarkers: () => void;
  manualCleanupFirebase: () => Promise<void>;
}

// IndexedDB configuration
const DB_NAME = 'VostcardDB';
const DB_VERSION = 3;
const STORE_NAME = 'privateVostcards';
const METADATA_STORE_NAME = 'vostcardMetadata';

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
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
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

// Add interface for deletion markers
interface DeletionMarker {
  vostcardId: string;
  deletedAt: string;
  userID: string;
}

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useAuth();
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [likedVostcards, setLikedVostcards] = useState<Like[]>([]);
  const [postedVostcards, setPostedVostcards] = useState<any[]>([]);
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

  // Store deletion markers in Firebase instead of localStorage
  const addDeletionMarker = useCallback(async (vostcardId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const deletionMarker: DeletionMarker = {
        vostcardId,
        deletedAt: new Date().toISOString(),
        userID: user.uid
      };

      // Store in Firebase for cross-device sync
      const markerRef = doc(db, 'deletionMarkers', `${user.uid}_${vostcardId}`);
      await setDoc(markerRef, deletionMarker);
      
      // Also store locally for immediate filtering
      const localMarkers = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
      if (!localMarkers.includes(vostcardId)) {
        localMarkers.push(vostcardId);
        localStorage.setItem('deleted_vostcards', JSON.stringify(localMarkers));
      }
      
      console.log('✅ Added deletion marker to Firebase and localStorage:', vostcardId);
    } catch (error) {
      console.error('❌ Failed to add deletion marker:', error);
    }
  }, []);

  // Get deletion markers from Firebase
  const getDeletionMarkers = useCallback(async (): Promise<string[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const markersQuery = query(
        collection(db, 'deletionMarkers'),
        where('userID', '==', user.uid)
      );
      
      const snapshot = await getDocs(markersQuery);
      const deletedIds = snapshot.docs.map(doc => doc.data().vostcardId);
      
      // Update localStorage with Firebase markers
      localStorage.setItem('deleted_vostcards', JSON.stringify(deletedIds));
      
      return deletedIds;
    } catch (error) {
      console.warn('⚠️ Failed to get deletion markers from Firebase (using localStorage fallback):', error);
      // Fall back to localStorage - this is normal if permissions aren't set up
      const localDeleted = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
      console.log(`📱 Using ${localDeleted.length} deletion markers from localStorage`);
      return localDeleted;
    }
  }, []);

  // 🔄 TRUE BIDIRECTIONAL SYNC - Compare local IndexedDB with Firebase and sync differences
  const syncPrivateVostcardsFromFirebase = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('☁️ No user logged in, skipping bidirectional sync');
      return;
    }

    try {
      console.log('🔄 Starting bidirectional sync between IndexedDB and Firebase...');
      const syncStartTime = new Date();
      
      // Get deletion markers from Firebase first
      const deletedVostcards = await getDeletionMarkers();
      console.log(`🗑️ Found ${deletedVostcards.length} deletion markers from Firebase`);
      
      // 1. Get all local vostcards from IndexedDB
      const localDB = await openDB();
      const localTransaction = localDB.transaction([STORE_NAME], 'readonly');
      const localStore = localTransaction.objectStore(STORE_NAME);
      const localVostcards = await new Promise<any[]>((resolve, reject) => {
        const request = localStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      // Filter out posted vostcards and deleted vostcards
      const localPrivateVostcards = localVostcards.filter(v => 
        v.state === 'private' && !deletedVostcards.includes(v.id)
      );
      console.log(`📱 Found ${localPrivateVostcards.length} local private vostcards (excluding ${deletedVostcards.length} deleted)`);
      
      // 2. Get all Firebase vostcards
      const firebaseQuery = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const firebaseSnapshot = await getDocs(firebaseQuery);
      const allFirebaseVostcards = firebaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Filter out deleted vostcards from Firebase results
      const firebaseVostcards = allFirebaseVostcards.filter(v => !deletedVostcards.includes(v.id));
      console.log(`☁️ Found ${firebaseVostcards.length} Firebase private vostcards (excluding ${allFirebaseVostcards.length - firebaseVostcards.length} deleted)`);
      
      // 3. Delete any vostcards that exist in Firebase but are marked as deleted
      const firebaseVostcardsToDelete = allFirebaseVostcards.filter(v => deletedVostcards.includes(v.id));
      if (firebaseVostcardsToDelete.length > 0) {
        console.log(`🗑️ Cleaning up ${firebaseVostcardsToDelete.length} deleted vostcards from Firebase...`);
        
        for (const vostcard of firebaseVostcardsToDelete) {
          try {
            const vostcardRef = doc(db, 'vostcards', vostcard.id);
            await deleteDoc(vostcardRef);
            console.log(`✅ Cleaned up deleted vostcard from Firebase: ${vostcard.id}`);
          } catch (error) {
            console.error(`❌ Failed to clean up vostcard ${vostcard.id}:`, error);
          }
        }
      }
      
      // 4. Create maps for easier comparison
      const localMap = new Map(localPrivateVostcards.map(v => [v.id, v]));
      const firebaseMap = new Map(firebaseVostcards.map(v => [v.id, v]));
      
      // Get all unique IDs from both sources
      const allIds = new Set([...localMap.keys(), ...firebaseMap.keys()]);
      console.log(`🔍 Comparing ${allIds.size} unique vostcards...`);
      
      // 5. Process each vostcard
      const toUploadToFirebase = [];
      const toDownloadToLocal = [];
      const toUpdateLocal = [];
      const toUpdateFirebase = [];
      
      for (const id of allIds) {
        const localVostcard = localMap.get(id);
        const firebaseVostcard = firebaseMap.get(id);
        
        if (localVostcard && !firebaseVostcard) {
          // EXISTS LOCALLY ONLY → Upload to Firebase
          console.log(`⬆️ Local only: ${localVostcard.title} → uploading to Firebase`);
          toUploadToFirebase.push(localVostcard);
          
        } else if (!localVostcard && firebaseVostcard) {
          // EXISTS IN FIREBASE ONLY → Download to local
          console.log(`⬇️ Firebase only: ${firebaseVostcard.title} → downloading to local`);
          toDownloadToLocal.push(firebaseVostcard);
          
        } else if (localVostcard && firebaseVostcard) {
          // EXISTS IN BOTH → Compare timestamps
          const localUpdated = new Date(localVostcard.updatedAt);
          const firebaseUpdated = firebaseVostcard.updatedAt?.toDate?.() || new Date(firebaseVostcard.updatedAt);
          
          if (localUpdated > firebaseUpdated) {
            console.log(`⬆️ Local newer: ${localVostcard.title} → updating Firebase`);
            toUpdateFirebase.push(localVostcard);
          } else if (firebaseUpdated > localUpdated) {
            console.log(`⬇️ Firebase newer: ${firebaseVostcard.title} → updating local`);
            toUpdateLocal.push(firebaseVostcard);
          } else {
            console.log(`✅ In sync: ${localVostcard.title}`);
          }
        }
      }
      
      // 6. Execute sync operations
      console.log(`🔄 Sync summary:`, {
        toUploadToFirebase: toUploadToFirebase.length,
        toDownloadToLocal: toDownloadToLocal.length,
        toUpdateLocal: toUpdateLocal.length,
        toUpdateFirebase: toUpdateFirebase.length
      });
      
      // Upload local-only vostcards to Firebase
      for (const localVostcard of toUploadToFirebase) {
        try {
          await uploadVostcardToFirebase(localVostcard);
          console.log(`✅ Uploaded: ${localVostcard.title}`);
        } catch (error) {
          console.error(`❌ Failed to upload ${localVostcard.title}:`, error);
        }
      }
      
      // Update Firebase vostcards with newer local versions
      for (const localVostcard of toUpdateFirebase) {
        try {
          await uploadVostcardToFirebase(localVostcard);
          console.log(`✅ Updated Firebase: ${localVostcard.title}`);
        } catch (error) {
          console.error(`❌ Failed to update Firebase ${localVostcard.title}:`, error);
        }
      }
      
      // Download and save Firebase-only and updated vostcards to local
      // FIX: Download all vostcards first, then save them in separate transactions
      const toSaveLocal = [...toDownloadToLocal, ...toUpdateLocal];
      if (toSaveLocal.length > 0) {
        console.log(`📥 Downloading ${toSaveLocal.length} vostcards from Firebase...`);
        
        // Download all vostcards first (outside of any transaction)
        const downloadedVostcards = [];
        for (const firebaseVostcard of toSaveLocal) {
          try {
            console.log(`📥 Downloading: ${firebaseVostcard.title}`);
            const localVostcard = await downloadFirebaseVostcardToLocal(firebaseVostcard);
            downloadedVostcards.push(localVostcard);
            console.log(`✅ Downloaded: ${firebaseVostcard.title}`);
          } catch (error) {
            console.error(`❌ Failed to download ${firebaseVostcard.title}:`, error);
          }
        }
        
        // Now save all downloaded vostcards to IndexedDB in a fresh transaction
        if (downloadedVostcards.length > 0) {
          console.log(`💾 Saving ${downloadedVostcards.length} vostcards to IndexedDB...`);
          
          const writeDB = await openDB(); // Fresh database connection
          const writeTransaction = writeDB.transaction([STORE_NAME], 'readwrite');
          const writeStore = writeTransaction.objectStore(STORE_NAME);
          
          // Save all vostcards quickly while transaction is active
          for (const localVostcard of downloadedVostcards) {
            writeStore.put(localVostcard);
          }
          
          // Wait for transaction to complete
          await new Promise<void>((resolve, reject) => {
            writeTransaction.oncomplete = () => {
              console.log(`✅ Saved ${downloadedVostcards.length} vostcards to IndexedDB`);
              resolve();
            };
            writeTransaction.onerror = () => {
              console.error('❌ Transaction failed:', writeTransaction.error);
              reject(writeTransaction.error);
            };
          });
        }
      }
      
      // Update sync timestamp
      setLastSyncTimestamp(syncStartTime);
      
      const totalChanges = toUploadToFirebase.length + toDownloadToLocal.length + toUpdateLocal.length + toUpdateFirebase.length;
      console.log(`✅ Bidirectional sync completed: ${totalChanges} changes synced`);
      
    } catch (error: any) {
      console.error('❌ Error in bidirectional sync:', error);
      throw error;
    }
  }, [setLastSyncTimestamp, getDeletionMarkers]);

  // Helper function to upload local vostcard to Firebase
  const uploadVostcardToFirebase = async (localVostcard: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Upload media to Firebase Storage
    let videoURL = '';
    let photoURLs: string[] = [];

    // Upload video if exists
    if (localVostcard._videoBase64) {
      const videoBlob = await base64ToBlob(localVostcard._videoBase64, 'video/webm');
      videoURL = await uploadVideo(user.uid, localVostcard.id, videoBlob);
    }

    // Upload photos if exist
    if (localVostcard._photosBase64 && localVostcard._photosBase64.length > 0) {
      photoURLs = await Promise.all(
        localVostcard._photosBase64.map(async (photoBase64: string, idx: number) => {
          const photoBlob = await base64ToBlob(photoBase64, 'image/jpeg');
          return await uploadPhoto(user.uid, localVostcard.id, idx, photoBlob);
        })
      );
    }

    // Save to Firebase Firestore
    const docRef = doc(db, 'vostcards', localVostcard.id);
    await setDoc(docRef, {
      id: localVostcard.id,
      title: localVostcard.title || '',
      description: localVostcard.description || '',
      categories: localVostcard.categories || [],
      username: localVostcard.username,
      userID: user.uid,
      videoURL: videoURL,
      photoURLs: photoURLs,
      latitude: localVostcard.geo?.latitude || null,
      longitude: localVostcard.geo?.longitude || null,
      avatarURL: user.photoURL || '',
      createdAt: Timestamp.fromDate(new Date(localVostcard.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(localVostcard.updatedAt)),
      state: 'private',
      visibility: 'private',
      hasVideo: !!localVostcard._videoBase64,
      hasPhotos: (localVostcard._photosBase64?.length || 0) > 0,
      mediaUploadStatus: 'complete',
      isOffer: localVostcard.isOffer || false,
      offerDetails: localVostcard.offerDetails || null,
      script: localVostcard.script || null,
      scriptId: localVostcard.scriptId || null
    });
  };

  // Helper function to download Firebase vostcard to local format
  const downloadFirebaseVostcardToLocal = async (firebaseVostcard: any) => {
    let videoBase64 = null;
    let photosBase64: string[] = [];

    // Download video
    if (firebaseVostcard.videoURL) {
      try {
        const videoResponse = await fetch(firebaseVostcard.videoURL);
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          videoBase64 = await blobToBase64(videoBlob);
        }
      } catch (error) {
        console.error('Failed to download video:', error);
      }
    }

    // Download photos
    if (firebaseVostcard.photoURLs && firebaseVostcard.photoURLs.length > 0) {
      photosBase64 = await Promise.all(
        firebaseVostcard.photoURLs.map(async (photoURL: string) => {
          try {
            const photoResponse = await fetch(photoURL);
            if (photoResponse.ok) {
              const photoBlob = await photoResponse.blob();
              return await blobToBase64(photoBlob);
            }
          } catch (error) {
            console.error('Failed to download photo:', error);
          }
          return '';
        })
      );
      photosBase64 = photosBase64.filter(base64 => base64 !== '');
    }

    return {
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
      video: null,
      photos: [],
      _videoBase64: videoBase64,
      _photosBase64: photosBase64,
      _firebaseVideoURL: firebaseVostcard.videoURL || null,
      _firebasePhotoURLs: firebaseVostcard.photoURLs || []
    };
  };

  // Helper functions for base64 conversion
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const base64ToBlob = (base64: string, mimeType: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      resolve(new Blob([byteArray], { type: mimeType }));
    });
  };

  // Load all Vostcards using lightweight metadata sync
  const loadAllLocalVostcards = useCallback(async () => {
    console.log('📂 loadAllLocalVostcards called (using lightweight sync)');
    try {
      // Use lightweight metadata sync for fast initial load
      console.log('📂 Starting lightweight metadata sync...');
      
      const user = auth.currentUser;
      if (user) {
        // Get deletion markers from Firebase FIRST
        const deletedVostcards = await getDeletionMarkers();
        console.log(`🗑️ Found ${deletedVostcards.length} deletion markers from Firebase`);
        
        // Get Firebase vostcards metadata only
        const firebaseQuery = query(
          collection(db, 'vostcards'),
          where('userID', '==', user.uid),
          where('visibility', '==', 'private')
        );
        
        const firebaseSnapshot = await getDocs(firebaseQuery);
        const allFirebaseMetadata = firebaseSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id,
            title: data.title || '',
            description: data.description || '',
            categories: data.categories || [],
            username: data.username || '',
            userID: data.userID || '',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            state: 'private' as const,
            hasVideo: data.hasVideo || false,
            hasPhotos: data.hasPhotos || false,
            isOffer: data.isOffer || false,
            offerDetails: data.offerDetails || null,
            script: data.script || null,
            scriptId: data.scriptId || null,
            geo: data.latitude && data.longitude 
              ? { latitude: data.latitude, longitude: data.longitude }
              : null,
            // No actual media content, just metadata
            video: null,
            photos: [],
            _firebaseVideoURL: data.videoURL || null,
            _firebasePhotoURLs: data.photoURLs || [],
            _isMetadataOnly: true // Flag to indicate this is metadata only
          };
        });
        
        console.log(`⚡ Found ${allFirebaseMetadata.length} vostcards metadata from Firebase`);
        
        // Filter out deleted vostcards using Firebase deletion markers
        const filteredMetadata = allFirebaseMetadata.filter(v => !deletedVostcards.includes(v.id));
        console.log(`⚡ Filtered out ${allFirebaseMetadata.length - filteredMetadata.length} deleted vostcards`);
        
        // Clean up any vostcards that exist in Firebase but are marked as deleted
        const firebaseVostcardsToDelete = allFirebaseMetadata.filter(v => deletedVostcards.includes(v.id));
        if (firebaseVostcardsToDelete.length > 0) {
          console.log(`🗑️ Cleaning up ${firebaseVostcardsToDelete.length} deleted vostcards from Firebase...`);
          
          for (const vostcard of firebaseVostcardsToDelete) {
            try {
              const vostcardRef = doc(db, 'vostcards', vostcard.id);
              await deleteDoc(vostcardRef);
              console.log(`✅ Cleaned up deleted vostcard from Firebase: ${vostcard.id}`);
            } catch (error) {
              console.error(`❌ Failed to clean up vostcard ${vostcard.id}:`, error);
            }
          }
        }
        
        setSavedVostcards(filteredMetadata);
      }
      
      console.log('📂 Lightweight sync completed');
      
    } catch (error) {
      console.error('❌ Failed lightweight sync:', error);
      alert('Failed to load saved Vostcards. Please refresh the page and try again.');
    }
  }, [getDeletionMarkers]);

  // Load all Vostcards on component mount
  useEffect(() => {
    loadAllLocalVostcards();
  }, []);
  
  // Load posted vostcards on component mount
  useEffect(() => {
    loadPostedVostcards();
  }, []);

  // Clean up old deletion markers on mount
  useEffect(() => {
    const deletedVostcards = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
    const deletionTimestamps = JSON.parse(localStorage.getItem('deletion_timestamps') || '{}');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const cleanedVostcards = deletedVostcards.filter((id: string) => {
      const timestamp = deletionTimestamps[id];
      if (!timestamp) return true; // Keep if no timestamp (backward compatibility)
      return new Date(timestamp) > thirtyDaysAgo;
    });
    
    if (cleanedVostcards.length < deletedVostcards.length) {
      localStorage.setItem('deleted_vostcards', JSON.stringify(cleanedVostcards));
      console.log(`🧹 Cleaned up ${deletedVostcards.length - cleanedVostcards.length} old deletion markers`);
    }
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
      console.log('☁️ Step 2: Syncing to Firebase...', {
        userID: user.uid,
        vostcardId: currentVostcard.id,
        hasVideo: !!currentVostcard.video,
        photosCount: currentVostcard.photos?.length || 0
      });
      
      const vostcardId = currentVostcard.id;
      const userID = user.uid;
      const username = getCorrectUsername(authContext, currentVostcard.username);

      // Upload media to Firebase Storage if exists
      let videoURL = '';
      let photoURLs: string[] = [];

      try {
        if (currentVostcard.video && currentVostcard.video instanceof Blob) {
          console.log('☁️ Uploading video to Firebase Storage...', {
            videoSize: currentVostcard.video.size,
            videoType: currentVostcard.video.type
          });
          videoURL = await uploadVideo(userID, vostcardId, currentVostcard.video);
          console.log('✅ Video uploaded successfully:', videoURL);
        }

        if (currentVostcard.photos && currentVostcard.photos.length > 0) {
          console.log('☁️ Uploading photos to Firebase Storage...', {
            photoCount: currentVostcard.photos.length,
            photoSizes: currentVostcard.photos.map(p => p.size)
          });
          photoURLs = await Promise.all(
            currentVostcard.photos.map(async (photo, idx) => {
              if (photo instanceof Blob) {
                const url = await uploadPhoto(userID, vostcardId, idx, photo);
                console.log(`✅ Photo ${idx + 1} uploaded successfully:`, url);
                return url;
              }
              return '';
            })
          );
          console.log('✅ All photos uploaded successfully');
        }
      } catch (uploadError: any) {
        console.error('❌ Media upload failed:', uploadError);
        throw new Error(`Media upload failed: ${uploadError?.message || uploadError}`);
      }

      // Save to Firebase Firestore
      const docRef = doc(db, 'vostcards', vostcardId);
      const firebaseData = {
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
      };
      
      console.log('☁️ Saving private vostcard to Firebase:', {
        id: firebaseData.id,
        title: firebaseData.title,
        userID: firebaseData.userID,
        username: firebaseData.username,
        visibility: firebaseData.visibility,
        state: firebaseData.state,
        hasVideo: firebaseData.hasVideo,
        hasPhotos: firebaseData.hasPhotos
      });
      
      try {
        await setDoc(docRef, firebaseData);
        console.log('✅ Private Vostcard synced to Firebase successfully');
        console.log('✅ Firebase document saved at path:', `vostcards/${vostcardId}`);
        
        // Verify the document was saved by reading it back
        try {
          const verifyDoc = await getDoc(docRef);
          if (verifyDoc.exists()) {
            const savedData = verifyDoc.data();
            console.log('✅ Verification: Document exists in Firebase:', {
              id: savedData.id,
              visibility: savedData.visibility,
              state: savedData.state,
              userID: savedData.userID,
              title: savedData.title
            });
          } else {
            console.error('❌ Verification failed: Document does not exist after save');
          }
        } catch (verifyError) {
          console.error('❌ Verification check failed:', verifyError);
          // Don't throw here, the save might have worked
        }
      } catch (firestoreError: any) {
        console.error('❌ Firestore save failed:', firestoreError);
        console.error('❌ Firestore error details:', {
          code: firestoreError.code,
          message: firestoreError.message,
          docPath: `vostcards/${vostcardId}`,
          userAuthenticated: !!user,
          userUID: user.uid
        });
        throw new Error(`Failed to save to Firestore: ${firestoreError?.message || firestoreError}`);
      }
      
      // Update last sync timestamp since we just saved to Firebase
      setLastSyncTimestamp(new Date());
      
      // Refresh the savedVostcards list from IndexedDB
      loadAllLocalVostcards();
      
    } catch (error: any) {
      console.error('❌ Error in saveLocalVostcard (hybrid storage):', error);
      console.error('❌ Save error details:', {
        step: error.message?.includes('Media upload') ? 'Media Upload' : 
              error.message?.includes('Firestore') ? 'Firestore Save' : 
              'IndexedDB Save',
        userID: user?.uid,
        vostcardId: currentVostcard?.id,
        authenticated: !!user,
        error: error.message || error
      });
      
      // Show user-friendly error message
      if (error.message?.includes('Media upload')) {
        alert('Failed to upload media files. Please check your internet connection and try again.');
      } else if (error.message?.includes('Firestore')) {
        alert('Failed to sync to cloud. Your vostcard is saved locally but may not appear on other devices.');
      } else {
        alert('Failed to save Vostcard. Please try again.');
      }
      
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
      
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ No user authenticated, cannot delete from cloud');
        alert('User not authenticated. Please log in and try again.');
        return;
      }

      // 1. Add deletion marker to Firebase first (for cross-device sync)
      await addDeletionMarker(id);

      // 2. Delete from Firebase - FAIL HARD if this doesn't work
      console.log('🗑️ Attempting to delete from Firebase...');
      const vostcardRef = doc(db, 'vostcards', id);
      await deleteDoc(vostcardRef);
      console.log('✅ Deleted Vostcard from Firebase:', id);
      
      // Update last sync timestamp
      setLastSyncTimestamp(new Date());

      // 3. Delete from IndexedDB
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

      // 4. Update UI
      setSavedVostcards(prev => prev.filter(vostcard => vostcard.id !== id));
      console.log('✅ Hybrid delete completed for Vostcard:', id);
      
    } catch (error) {
      console.error('❌ Error in deletePrivateVostcard:', error);
      
      // Show specific error message based on what failed
      if (error.code === 'permission-denied') {
        alert('Permission denied. Check your Firebase rules or try logging in again.');
      } else if (error.code === 'unavailable') {
        alert('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'unauthenticated') {
        alert('Authentication error. Please log in again.');
      } else {
        alert(`Failed to delete Vostcard: ${error.message}`);
      }
      
      throw error;
    }
  }, [addDeletionMarker, setLastSyncTimestamp]);

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
  const postVostcard = useCallback(async (vostcardToPost?: Vostcard) => {
    // Use passed vostcard or current vostcard
    const vostcard = vostcardToPost || currentVostcard;
    
    if (!vostcard) {
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
    if (!vostcard.title || !vostcard.description || (vostcard.categories?.length || 0) === 0) {
      alert('Please fill in title, description, and select at least one category before posting.');
      return;
    }

    if (!vostcard.geo) {
      alert('Location is required to post a Vostcard to the map. Please try again.');
      return;
    }

    try {
      console.log('📥 Starting post to Firebase (public map)...');
      const vostcardId = vostcard.id;
      const userID = user.uid;
      const username = getCorrectUsername(authContext, vostcard.username);

      // --- Upload video to Firebase Storage ---
      let videoURL = '';
      if (vostcard.video && vostcard.video instanceof Blob) {
        videoURL = await uploadVideo(userID, vostcardId, vostcard.video);
      }

      // --- Upload photos to Firebase Storage ---
      let photoURLs: string[] = [];
      if (vostcard.photos && vostcard.photos.length > 0) {
        photoURLs = await Promise.all(
          vostcard.photos.map((photo, idx) =>
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
        title: vostcard.title || '',
        description: vostcard.description || '',
        categories: vostcard.categories || [],
        username: username,
        userID: userID,
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: vostcard.geo.latitude,
        longitude: vostcard.geo.longitude,
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        state: 'posted',
        hasVideo: !!vostcard.video,
        hasPhotos: (vostcard.photos?.length || 0) > 0,
        mediaUploadStatus: 'complete',
        isOffer: vostcard.isOffer || false,
        offerDetails: vostcard.offerDetails || null,
        visibility: 'public'
      });

      console.log('✅ Vostcard posted successfully to Firebase!');
      // Removing this alert since we show it in CreateVostcardStep3
      // alert('🎉 Vōstcard posted successfully! It will appear on the map with media.');

      // Update the IndexedDB entry to mark it as posted so it gets filtered out of My Vostcards
      try {
        const localDB = await openDB();
        const transaction = localDB.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Get the current vostcard from IndexedDB
        const getRequest = store.get(vostcardId);
        
        getRequest.onsuccess = () => {
          const existingVostcard = getRequest.result;
          if (existingVostcard) {
            // Update the state to 'posted'
            existingVostcard.state = 'posted';
            
            // Save back to IndexedDB
            const putRequest = store.put(existingVostcard);
            putRequest.onsuccess = () => {
              console.log('✅ Updated IndexedDB vostcard state to posted');
            };
            putRequest.onerror = () => {
              console.error('❌ Failed to update IndexedDB vostcard state:', putRequest.error);
            };
          }
        };
        
        getRequest.onerror = () => {
          console.error('❌ Failed to get vostcard from IndexedDB:', getRequest.error);
        };
      } catch (error) {
        console.error('❌ Failed to update IndexedDB after posting:', error);
      }

      // Update last sync timestamp since we just posted to Firebase
      setLastSyncTimestamp(new Date());

      // Refresh both lists to reflect the state change
      loadAllLocalVostcards(); // Remove from private list
      loadPostedVostcards();   // Add to posted list

      // Only clear vostcard if we used currentVostcard (not passed vostcard)
      if (!vostcardToPost) {
        clearVostcard();
      }

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

  // Debug function to check what's in Firebase for this user
  const debugFirebaseVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('🔍 No user logged in for debug');
      return;
    }

    try {
      console.log('🔍 DEBUG: Checking ALL vostcards in Firebase for user:', user.uid);
      
      // Query ALL vostcards for this user (not just private ones)
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`🔍 DEBUG: Found ${querySnapshot.docs.length} total vostcards in Firebase for this user`);
      
      if (querySnapshot.docs.length === 0) {
        console.log('🔍 DEBUG: No vostcards found in Firebase - iPhone might not be uploading');
        alert('No vostcards found in Firebase for your account. iPhone might not be uploading properly.');
        return;
      }
      
      // Log details of each vostcard
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔍 DEBUG Firebase Vostcard ${index + 1}:`, {
          id: data.id,
          title: data.title,
          description: data.description?.substring(0, 50) + '...',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || 'no createdAt',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 'no updatedAt',
          visibility: data.visibility,
          state: data.state,
          userID: data.userID,
          username: data.username,
          hasVideo: data.hasVideo,
          hasPhotos: data.hasPhotos,
          videoURL: data.videoURL ? 'HAS_VIDEO_URL' : 'NO_VIDEO_URL',
          photoURLs: data.photoURLs ? `HAS_${data.photoURLs.length}_PHOTO_URLS` : 'NO_PHOTO_URLS'
        });
      });
      
      // Count by visibility
      const visibilityCount = querySnapshot.docs.reduce((acc, doc) => {
        const visibility = doc.data().visibility || 'undefined';
        acc[visibility] = (acc[visibility] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('🔍 DEBUG: Vostcards by visibility:', visibilityCount);
      
      // Count by state
      const stateCount = querySnapshot.docs.reduce((acc, doc) => {
        const state = doc.data().state || 'undefined';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('🔍 DEBUG: Vostcards by state:', stateCount);
      
      alert(`Found ${querySnapshot.docs.length} vostcards in Firebase. Check console for details.`);
      
    } catch (error) {
      console.error('❌ DEBUG: Error checking Firebase:', error);
      alert('Error checking Firebase. Check console for details.');
    }
  }, []);

  // Debug function to check local IndexedDB
  const debugLocalVostcards = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Checking IndexedDB...');
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise<void>((resolve) => {
        request.onsuccess = () => {
          const localVostcards = request.result || [];
          console.log(`🔍 DEBUG: Found ${localVostcards.length} vostcards in IndexedDB`);
          
          localVostcards.forEach((vostcard, index) => {
            console.log(`🔍 DEBUG IndexedDB Vostcard ${index + 1}:`, {
              id: vostcard.id,
              title: vostcard.title,
              description: vostcard.description?.substring(0, 50) + '...',
              createdAt: vostcard.createdAt,
              updatedAt: vostcard.updatedAt,
              state: vostcard.state,
              userID: vostcard.userID,
              username: vostcard.username,
              hasVideoBase64: !!vostcard._videoBase64,
              hasPhotosBase64: vostcard._photosBase64?.length || 0,
              hasFirebaseVideoURL: !!vostcard._firebaseVideoURL,
              hasFirebasePhotoURLs: vostcard._firebasePhotoURLs?.length || 0
            });
          });
          
          alert(`Found ${localVostcards.length} vostcards in IndexedDB. Check console for details.`);
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ DEBUG: Error checking IndexedDB:', error);
      alert('Error checking IndexedDB. Check console for details.');
    }
  }, []);

  // Function to clear all private vostcards from Firebase
  const clearAllPrivateVostcardsFromFirebase = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('🔍 No user logged in');
      return;
    }

    try {
      console.log('🗑️ Clearing all private vostcards from Firebase...');
      
      // Query for all private vostcards by this user
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`🗑️ Found ${querySnapshot.docs.length} private vostcards to delete from Firebase`);
      
      if (querySnapshot.docs.length === 0) {
        console.log('✅ No private vostcards found in Firebase');
        return;
      }

      // Delete each private vostcard
      const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const vostcardRef = doc(db, 'vostcards', docSnapshot.id);
        await deleteDoc(vostcardRef);
        console.log(`🗑️ Deleted private vostcard ${docSnapshot.id} from Firebase`);
      });

      await Promise.all(deletePromises);
      console.log('✅ All private vostcards deleted from Firebase!');
      
      // Update sync timestamp
      setLastSyncTimestamp(new Date());
      
    } catch (error) {
      console.error('❌ Error clearing private vostcards from Firebase:', error);
      throw error;
    }
  }, [setLastSyncTimestamp]);

  // Load posted vostcards from Firebase
  const loadPostedVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('📋 No user logged in, clearing posted vostcards');
      setPostedVostcards([]);
      return;
    }

    try {
      console.log('📋 Loading posted Vostcards from Firebase...');
      
      // Query for posted Vostcards by this user
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('state', '==', 'posted')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📊 Found ${querySnapshot.docs.length} posted Vostcards in Firebase`);
      
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      
      setPostedVostcards(vostcards);
      console.log('✅ Posted Vostcards synced successfully:', vostcards.length);
      
    } catch (error) {
      console.error('❌ Error loading posted Vostcards:', error);
      setPostedVostcards([]);
    }
  }, []);

  // Load private vostcards from Firebase (similar to posted vostcards)
  const loadPrivateVostcards = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('📋 No user logged in, clearing private vostcards');
      setSavedVostcards([]);
      return;
    }

    try {
      console.log('📋 Loading private Vostcards from Firebase...');
      
      // Query for private Vostcards by this user
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📊 Found ${querySnapshot.docs.length} private Vostcards in Firebase`);
      
      const vostcards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as Vostcard;
      });
      
      setSavedVostcards(vostcards);
      console.log('✅ Private Vostcards synced successfully:', vostcards.length);
      
    } catch (error) {
      console.error('❌ Error loading private Vostcards:', error);
      setSavedVostcards([]);
    }
  }, []);

  // Debug function to help troubleshoot sharing issues
  const debugSpecificVostcard = useCallback(async (vostcardId: string) => {
    try {
      console.log(`🔍 DEBUG: Checking vostcard ${vostcardId}...`);
      
      // Check Firebase
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📄 Found in Firebase:', {
          id: data.id,
          title: data.title,
          state: data.state,
          visibility: data.visibility,
          isPrivatelyShared: data.isPrivatelyShared,
          userID: data.userID,
          hasVideo: data.hasVideo,
          hasPhotos: data.hasPhotos,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        });
        
        // Check if it meets sharing criteria
        const canView = data.state === 'posted' || data.isPrivatelyShared;
        console.log(`✅ Can be viewed via share URL: ${canView}`);
        
        if (!canView) {
          console.log('❌ Missing sharing flags. Needs either:');
          console.log('   - state: "posted" OR');
          console.log('   - isPrivatelyShared: true');
        }
      } else {
        console.log('❌ NOT FOUND in Firebase');
        
        // Check IndexedDB
        const localDB = await openDB();
        const transaction = localDB.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(vostcardId);
        
        request.onsuccess = () => {
          const localVostcard = request.result;
          if (localVostcard) {
            console.log('📱 Found in IndexedDB (local only):', {
              id: localVostcard.id,
              title: localVostcard.title,
              state: localVostcard.state,
              userID: localVostcard.userID,
              hasVideo: !!localVostcard._videoBase64,
              hasPhotos: localVostcard._photosBase64?.length || 0
            });
            console.log('💡 This vostcard needs to be uploaded to Firebase for sharing');
          } else {
            console.log('❌ NOT FOUND in IndexedDB either');
          }
        };
      }
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  }, []);

  // Function to fix broken shared vostcards
  const fixBrokenSharedVostcard = useCallback(async (vostcardId: string) => {
    try {
      console.log(`🔧 Attempting to fix shared vostcard: ${vostcardId}`);
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // First check if it exists in Firebase
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Vostcard exists in Firebase, just fix the sharing flag
        const data = docSnap.data();
        if (!data.isPrivatelyShared && data.state !== 'posted') {
          await updateDoc(docRef, {
            isPrivatelyShared: true,
            sharedAt: new Date()
          });
          console.log('✅ Fixed: Added isPrivatelyShared flag');
          return true;
        } else {
          console.log('✅ Vostcard is already properly configured for sharing');
          return true;
        }
      } else {
        // Vostcard doesn't exist in Firebase, try to find it locally and upload
        const localDB = await openDB();
        const transaction = localDB.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(vostcardId);
        
        return new Promise<boolean>((resolve, reject) => {
          request.onsuccess = async () => {
            const localVostcard = request.result;
            if (!localVostcard) {
              console.log('❌ Vostcard not found locally either');
              resolve(false);
              return;
            }
            
            try {
              console.log('📤 Uploading local vostcard to Firebase for sharing...');
              
              // Upload media if it exists
              let videoURL = '';
              let photoURLs: string[] = [];
              
              // Upload video
              if (localVostcard._videoBase64) {
                const videoBlob = await new Promise<Blob>((resolve) => {
                  const videoData = atob(localVostcard._videoBase64.split(',')[1]);
                  const videoArray = new Uint8Array(videoData.length);
                  for (let i = 0; i < videoData.length; i++) {
                    videoArray[i] = videoData.charCodeAt(i);
                  }
                  resolve(new Blob([videoArray], { type: 'video/webm' }));
                });
                
                videoURL = await uploadVideo(user.uid, vostcardId, videoBlob);
                console.log('✅ Video uploaded');
              }
              
              // Upload photos with improved error handling
              if (localVostcard._photosBase64 && localVostcard._photosBase64.length > 0) {
                console.log(`📸 Starting photo upload for ${localVostcard._photosBase64.length} photos...`);
                
                const photoUploadPromises = localVostcard._photosBase64.map(async (photoBase64: string, idx: number) => {
                  try {
                    console.log(`📸 Processing photo ${idx + 1}/${localVostcard._photosBase64.length}...`);
                    
                    // Validate base64 data
                    if (!photoBase64 || typeof photoBase64 !== 'string' || !photoBase64.includes(',')) {
                      console.error(`❌ Invalid base64 data for photo ${idx + 1}:`, photoBase64?.substring(0, 100));
                      return null;
                    }
                    
                    // Convert base64 to blob with error handling
                    const photoBlob = await new Promise<Blob>((resolve, reject) => {
                      try {
                        const [header, data] = photoBase64.split(',');
                        if (!data) {
                          throw new Error('No data part in base64 string');
                        }
                        
                        const photoData = atob(data);
                        const photoArray = new Uint8Array(photoData.length);
                        for (let i = 0; i < photoData.length; i++) {
                          photoArray[i] = photoData.charCodeAt(i);
                        }
                        
                        const blob = new Blob([photoArray], { type: 'image/jpeg' });
                        console.log(`📸 Photo ${idx + 1} converted to blob: ${blob.size} bytes`);
                        resolve(blob);
                      } catch (error) {
                        console.error(`❌ Error converting photo ${idx + 1} to blob:`, error);
                        reject(error);
                      }
                    });
                    
                    // Upload to Firebase Storage
                    const uploadedURL = await uploadPhoto(user.uid, vostcardId, idx, photoBlob);
                    console.log(`✅ Photo ${idx + 1} uploaded successfully:`, uploadedURL);
                    return uploadedURL;
                    
                  } catch (error) {
                    console.error(`❌ Error uploading photo ${idx + 1}:`, error);
                    return null; // Return null for failed uploads
                  }
                });
                
                // Wait for all photo uploads to complete
                const uploadResults = await Promise.all(photoUploadPromises);
                
                // Filter out failed uploads (null values)
                photoURLs = uploadResults.filter(url => url !== null) as string[];
                
                console.log(`📸 Photo upload completed: ${photoURLs.length}/${localVostcard._photosBase64.length} photos uploaded successfully`);
                
                if (photoURLs.length === 0) {
                  console.warn('⚠️ No photos were successfully uploaded - vostcard will be saved without photos');
                }
              } else {
                console.log('📸 No photos to upload');
              }
              
              // Save to Firebase with sharing enabled
              await setDoc(docRef, {
                id: vostcardId,
                title: localVostcard.title || '',
                description: localVostcard.description || '',
                categories: localVostcard.categories || [],
                username: getCorrectUsername(authContext, localVostcard.username),
                userID: user.uid,
                videoURL: videoURL,
                photoURLs: photoURLs,
                latitude: localVostcard.geo?.latitude || null,
                longitude: localVostcard.geo?.longitude || null,
                avatarURL: user.photoURL || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                state: 'private',
                visibility: 'private',
                isPrivatelyShared: true,
                sharedAt: new Date(),
                hasVideo: !!localVostcard._videoBase64,
                hasPhotos: (localVostcard._photosBase64?.length || 0) > 0,
                mediaUploadStatus: 'complete',
                isOffer: localVostcard.isOffer || false,
                offerDetails: localVostcard.offerDetails || null,
                script: localVostcard.script || null,
                scriptId: localVostcard.scriptId || null
              });
              
              console.log('✅ Local vostcard uploaded to Firebase with sharing enabled');
              resolve(true);
              
            } catch (error) {
              console.error('❌ Failed to upload local vostcard:', error);
              reject(error);
            }
          };
          
          request.onerror = () => {
            console.error('❌ IndexedDB error:', request.error);
            reject(request.error);
          };
        });
      }
      
    } catch (error) {
      console.error('❌ Error fixing shared vostcard:', error);
      throw error;
    }
  }, [authContext]);

  // 🚀 FAST: Load from IndexedDB immediately without sync
  const loadAllLocalVostcardsImmediate = useCallback(async () => {
    console.log('⚡ loadAllLocalVostcardsImmediate called');
    try {
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
          console.log('⚡ Found', existing.length, 'Vostcards in IndexedDB (immediate load)');

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

          // Filter out Vostcards with state === 'posted' and deleted vostcards
          const deletedVostcards = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
          const filteredVostcards = restoredVostcards.filter(v => 
            v.state !== 'posted' && !deletedVostcards.includes(v.id)
          );
          
          // Log details of loaded vostcards for debugging sync issues
          console.log('📂 Loaded vostcards from IndexedDB:', filteredVostcards.length);
          filteredVostcards.forEach((vostcard, index) => {
            console.log(`📂 IndexedDB Vostcard ${index + 1}:`, {
              id: vostcard.id,
              title: vostcard.title,
              description: vostcard.description?.substring(0, 50) + '...',
              createdAt: vostcard.createdAt,
              updatedAt: vostcard.updatedAt,
              state: vostcard.state,
              userID: vostcard.userID,
              username: vostcard.username,
              hasVideo: !!vostcard.video,
              hasPhotos: vostcard.photos?.length || 0,
              hasFirebaseVideoURL: !!vostcard._firebaseVideoURL,
              hasFirebasePhotoURLs: (vostcard._firebasePhotoURLs?.length || 0) > 0,
              // 🔧 ADD: Debug geo data
              geo: vostcard.geo,
              geoType: typeof vostcard.geo,
              hasGeoLatitude: vostcard.geo?.latitude,
              hasGeoLongitude: vostcard.geo?.longitude,
              // Check for alternative location fields
              latitude: (vostcard as any).latitude,
              longitude: (vostcard as any).longitude,
            });
          });
          
          setSavedVostcards(filteredVostcards);
          console.log('📂 Finished loading saved Vōstcards');
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Failed to open IndexedDB:', error);
      alert('Failed to load saved Vostcards. Please refresh the page and try again.');
    }
  }, []);

  const syncInBackground = useCallback(async () => {
    console.log('🔄 Sync in background requested');
    try {
      await syncPrivateVostcardsFromFirebase();
      await loadAllLocalVostcardsImmediate();
      console.log('✅ Sync in background completed successfully');
    } catch (error) {
      console.error('❌ Sync in background failed:', error);
      throw error;
    }
  }, [syncPrivateVostcardsFromFirebase, loadAllLocalVostcardsImmediate]);

  // 🆕 LIGHTWEIGHT SYNC FUNCTIONS
  
  // Sync only metadata (no media content) for fast list display
  const syncVostcardMetadata = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('☁️ No user logged in, skipping metadata sync');
      return;
    }

    try {
      console.log('⚡ Starting lightweight metadata sync...');
      
      // Get Firebase vostcards metadata only
      const firebaseQuery = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const firebaseSnapshot = await getDocs(firebaseQuery);
      const firebaseMetadata = firebaseSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          categories: data.categories || [],
          username: data.username || '',
          userID: data.userID || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          state: 'private' as const,
          hasVideo: data.hasVideo || false,
          hasPhotos: data.hasPhotos || false,
          isOffer: data.isOffer || false,
          offerDetails: data.offerDetails || null,
          script: data.script || null,
          scriptId: data.scriptId || null,
          geo: data.latitude && data.longitude 
            ? { latitude: data.latitude, longitude: data.longitude }
            : null,
          // No actual media content, just metadata
          video: null,
          photos: [],
          _firebaseVideoURL: data.videoURL || null,
          _firebasePhotoURLs: data.photoURLs || [],
          _isMetadataOnly: true // Flag to indicate this is metadata only
        };
      });

      console.log(`⚡ Found ${firebaseMetadata.length} vostcards metadata from Firebase`);

      // Save metadata to IndexedDB
      const localDB = await openDB();
      const transaction = localDB.transaction([METADATA_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      
      // Clear existing metadata
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // Add new metadata
      for (const metadata of firebaseMetadata) {
        await new Promise<void>((resolve, reject) => {
          const request = store.add(metadata);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      console.log(`✅ Metadata sync completed: ${firebaseMetadata.length} items`);
      
      // Update savedVostcards with metadata-only items
      setSavedVostcards(firebaseMetadata);
      
    } catch (error) {
      console.error('❌ Metadata sync failed:', error);
      throw error;
    }
  }, []);

  // Download full content for a specific vostcard when user taps on it
  const downloadVostcardContent = useCallback(async (vostcardId: string) => {
    const user = auth.currentUser;
    if (!user) {
      console.log('☁️ No user logged in, skipping content download');
      return;
    }

    try {
      console.log(`📥 Downloading content for vostcard: ${vostcardId}`);
      
      // Get the full vostcard from Firebase
      const docRef = doc(db, 'vostcards', vostcardId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Vostcard not found in Firebase');
      }

      const firebaseVostcard = docSnap.data();
      
      // Download the full content including media
      const fullVostcard = await downloadFirebaseVostcardToLocal(firebaseVostcard);
      
      // Save to full IndexedDB store
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(fullVostcard);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`✅ Content downloaded for vostcard: ${vostcardId}`);
      
      // Update savedVostcards to replace metadata with full content
      setSavedVostcards(prev => prev.map(v => 
        v.id === vostcardId ? fullVostcard : v
      ));
      
    } catch (error) {
      console.error(`❌ Failed to download content for ${vostcardId}:`, error);
      throw error;
    }
  }, []);

  // Get current metadata-only vostcards
  const getVostcardMetadata = useCallback(() => {
    return savedVostcards.filter(v => v._isMetadataOnly);
  }, [savedVostcards]);

  // Clean up old deletion markers from Firebase (older than 30 days)
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
      
      if (toDelete.length > 0) {
        console.log(`🧹 Cleaning up ${toDelete.length} old deletion markers from Firebase...`);
        
        for (const doc of toDelete) {
          await deleteDoc(doc.ref);
        }
        
        console.log('✅ Cleaned up old deletion markers from Firebase');
      }
    } catch (error) {
      console.error('❌ Failed to cleanup deletion markers:', error);
    }
  }, []);

  // Clear all deletion markers (for debugging)
  const clearDeletionMarkers = useCallback(() => {
    localStorage.removeItem('deleted_vostcards');
    localStorage.removeItem('deletion_timestamps');
    console.log('🧹 Cleared all deletion markers');
  }, []);

  // Function to manually clean up Firebase - keep only "I did it"
  const manualCleanupFirebase = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('🔍 No user logged in');
      return;
    }

    try {
      console.log('🗑️ Manual cleanup: Keeping only "I did it"...');
      
      // Query for all vostcards by this user
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`🔍 Found ${querySnapshot.docs.length} total vostcards in Firebase`);
      
      // Filter to keep only "I did it"
      const toDelete = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.title !== 'I did it';
      });
      
      console.log(`🗑️ Will delete ${toDelete.length} vostcards, keeping 1`);
      
      if (toDelete.length === 0) {
        console.log('✅ No vostcards to delete');
        return;
      }

      // Delete each unwanted vostcard
      for (const docSnapshot of toDelete) {
        const data = docSnapshot.data();
        console.log(`🗑️ Deleting: "${data.title}"`);
        await deleteDoc(docSnapshot.ref);
      }

      console.log('✅ Manual cleanup completed!');
      
      // Clear local IndexedDB to force fresh sync
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('🗑️ Cleared IndexedDB for fresh sync');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      
      // Refresh the UI
      setSavedVostcards([]);
      setPostedVostcards([]);
      
      // Trigger fresh sync
      await loadAllLocalVostcards();
      
      alert('✅ Cleanup completed! Only "I did it" remains.');
      
    } catch (error) {
      console.error('❌ Error in manual cleanup:', error);
      alert('❌ Cleanup failed. Check console for details.');
    }
  }, [setLastSyncTimestamp, loadAllLocalVostcards]);

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
        debugFirebaseVostcards,
        debugLocalVostcards,
        // Posted vostcards management
        postedVostcards,
        loadPostedVostcards,
        loadPrivateVostcards,
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
        // Debug functions
        debugSpecificVostcard,
        fixBrokenSharedVostcard,
        loadAllLocalVostcardsImmediate,
        syncInBackground,
        clearAllPrivateVostcardsFromFirebase,
        // Lightweight sync functions
        syncVostcardMetadata,
        downloadVostcardContent,
        getVostcardMetadata,
        // Deletion marker management
        cleanupDeletionMarkers,
        clearDeletionMarkers,
        manualCleanupFirebase,
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