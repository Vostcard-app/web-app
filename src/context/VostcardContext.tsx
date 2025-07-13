import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Script } from '../types/ScriptModel';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { ScriptService } from '../services/scriptService';
import { LikeService, type Like } from '../services/likeService';
import { RatingService, type Rating, type RatingStats } from '../services/ratingService';

export interface Vostcard {
  id: string;
  visibility: 'private' | 'public';  // Changed from 'state' to 'visibility'
  video: string;  // Changed from Blob to string (Firebase Storage URL)
  title: string;
  description: string;
  photos: string[];  // Changed from Blob[] to string[] (Firebase Storage URLs)
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
  // Removed IndexedDB serialization fields:
  // _videoBase64?: string | null;
  // _photosBase64?: string[];
  
  // Optional fields for Firebase metadata
  latitude?: number;  // For backward compatibility
  longitude?: number; // For backward compatibility
  videoURL?: string;  // For backward compatibility
  photoURLs?: string[]; // For backward compatibility
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob, geoOverride?: { latitude: number; longitude: number }) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  addPhoto: (photo: Blob) => void;
  
  // Updated Firebase-only methods
  saveVostcard: (visibility: 'private' | 'public') => Promise<void>; // Replaces saveLocalVostcard and postVostcard
  loadVostcard: (id: string) => Promise<void>; // Replaces loadLocalVostcard
  clearVostcard: () => void;
  
  // Updated Vostcard lists
  privateVostcards: Vostcard[]; // Replaces savedVostcards
  publicVostcards: Vostcard[];  // New for public Vostcards
  loadPrivateVostcards: () => Promise<void>; // Replaces loadAllLocalVostcards
  loadPublicVostcards: () => Promise<void>;  // New for public Vostcards
  deleteVostcard: (id: string) => Promise<void>; // Replaces deletePrivateVostcard
  
  // Script system (unchanged)
  scripts: Script[];
  loadScripts: () => Promise<void>;
  saveScript: (script: Script) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  updateScriptTitle: (scriptId: string, newTitle: string) => Promise<void>;
  updateScript: (scriptId: string, title: string, content: string) => Promise<void>;
  
  // Like system (unchanged)
  likedVostcards: Like[];
  toggleLike: (vostcardID: string) => Promise<boolean>;
  isLiked: (vostcardID: string) => Promise<boolean>;
  getLikeCount: (vostcardID: string) => Promise<number>;
  loadLikedVostcards: () => Promise<void>;
  setupLikeListeners: (vostcardID: string, onLikeCountChange: (count: number) => void, onLikeStatusChange: (isLiked: boolean) => void) => () => void;
  
  // Rating system (unchanged)
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
// const openDB = (): Promise<IDBDatabase> => {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open(DB_NAME, DB_VERSION);
    
//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve(request.result);
    
//     request.onupgradeneeded = (event) => {
//       const db = (event.target as IDBOpenDBRequest).result;
//       if (!db.objectStoreNames.contains(STORE_NAME)) {
//         db.createObjectStore(STORE_NAME, { keyPath: 'id' });
//       }
//     };
//   });
// };

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
  const [privateVostcards, setPrivateVostcards] = useState<Vostcard[]>([]);
  const [publicVostcards, setPublicVostcards] = useState<Vostcard[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [likedVostcards, setLikedVostcards] = useState<Like[]>([]);

  // Helper function to create a new Vostcard
  const createNewVostcard = useCallback((): Vostcard => {
    const user = authContext?.user;
    return {
      id: uuidv4(),
      visibility: 'private',
      video: '',
      title: '',
      description: '',
      photos: [],
      categories: [],
      geo: null,
      username: user?.displayName || user?.email || 'Anonymous',
      userID: user?.uid || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [authContext?.user]);

  // Initialize with a new Vostcard if none exists
  useEffect(() => {
    if (!currentVostcard) {
      setCurrentVostcard(createNewVostcard());
    }
  }, [currentVostcard, createNewVostcard]);

  // Set video (now handles Blob temporarily until save)
  const setVideo = useCallback((video: Blob, geoOverride?: { latitude: number; longitude: number }) => {
    setCurrentVostcard(prev => {
      if (!prev) return createNewVostcard();
      return {
        ...prev,
        video: URL.createObjectURL(video), // Temporary URL for preview
        _tempVideoBlob: video, // Store blob temporarily
        geo: geoOverride || prev.geo,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [createNewVostcard]);

  // Set geo location
  const setGeo = useCallback((geo: { latitude: number; longitude: number }) => {
    setCurrentVostcard(prev => {
      if (!prev) return createNewVostcard();
      return {
        ...prev,
        geo,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [createNewVostcard]);

  // Update Vostcard
  const updateVostcard = useCallback((updates: Partial<Vostcard>) => {
    setCurrentVostcard(prev => {
      if (!prev) return createNewVostcard();
      return {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [createNewVostcard]);

  // Add photo (now handles Blob temporarily until save)
  const addPhoto = useCallback((photo: Blob) => {
    setCurrentVostcard(prev => {
      if (!prev) return createNewVostcard();
      const tempPhotoURL = URL.createObjectURL(photo);
      return {
        ...prev,
        photos: [...prev.photos, tempPhotoURL],
        _tempPhotoBlobs: [...(prev._tempPhotoBlobs || []), photo], // Store blobs temporarily
        updatedAt: new Date().toISOString(),
      };
    });
  }, [createNewVostcard]);

  // Save Vostcard to Firebase (replaces saveLocalVostcard and postVostcard)
  const saveVostcard = useCallback(async (visibility: 'private' | 'public') => {
    if (!currentVostcard || !authContext?.user) {
      throw new Error('No Vostcard to save or user not authenticated');
    }

    try {
      console.log('💾 Saving Vostcard to Firebase with visibility:', visibility);
      
      const user = authContext.user;
      const vostcardId = currentVostcard.id;
      
      // Upload video to Firebase Storage
      let videoURL = '';
      if (currentVostcard._tempVideoBlob) {
        console.log('📹 Uploading video to Firebase Storage...');
        videoURL = await uploadVideo(user.uid, vostcardId, currentVostcard._tempVideoBlob);
      }

      // Upload photos to Firebase Storage
      let photoURLs: string[] = [];
      if (currentVostcard._tempPhotoBlobs && currentVostcard._tempPhotoBlobs.length > 0) {
        console.log('📸 Uploading photos to Firebase Storage...');
        photoURLs = await Promise.all(
          currentVostcard._tempPhotoBlobs.map((photo, idx) => 
            uploadPhoto(user.uid, vostcardId, idx, photo)
          )
        );
      }

      // Prepare Vostcard data for Firebase
      const vostcardData = {
        id: vostcardId,
        visibility,
        video: videoURL,
        title: currentVostcard.title,
        description: currentVostcard.description,
        photos: photoURLs,
        categories: currentVostcard.categories,
        geo: currentVostcard.geo,
        username: getCorrectUsername(authContext, currentVostcard.username),
        userID: user.uid,
        recipientUserID: currentVostcard.recipientUserID,
        createdAt: currentVostcard.createdAt,
        updatedAt: serverTimestamp(),
        isOffer: currentVostcard.isOffer,
        offerDetails: currentVostcard.offerDetails,
        script: currentVostcard.script,
        scriptId: currentVostcard.scriptId,
        // Add backward compatibility fields
        latitude: currentVostcard.geo?.latitude,
        longitude: currentVostcard.geo?.longitude,
        videoURL: videoURL,
        photoURLs: photoURLs,
      };

      // Save to Firestore
      const docRef = doc(db, 'vostcards', vostcardId);
      await updateDoc(docRef, vostcardData).catch(async () => {
        // If update fails, document doesn't exist, so create it
        await addDoc(collection(db, 'vostcards'), vostcardData);
      });

      console.log('✅ Vostcard saved to Firebase successfully');
      
      // Update local state
      const savedVostcard = { ...vostcardData, createdAt: currentVostcard.createdAt };
      setCurrentVostcard(savedVostcard);
      
      // Refresh the appropriate list
      if (visibility === 'private') {
        await loadPrivateVostcards();
      } else {
        await loadPublicVostcards();
      }

    } catch (error) {
      console.error('❌ Error saving Vostcard:', error);
      throw error;
    }
  }, [currentVostcard, authContext]);

  // Load specific Vostcard from Firebase
  const loadVostcard = useCallback(async (id: string) => {
    try {
      console.log('📂 Loading Vostcard from Firebase:', id);
      
      const docRef = doc(db, 'vostcards', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Vostcard;
        console.log('✅ Vostcard loaded from Firebase');
        setCurrentVostcard(data);
      } else {
        console.log('❌ Vostcard not found in Firebase');
        throw new Error('Vostcard not found');
      }
    } catch (error) {
      console.error('❌ Error loading Vostcard:', error);
      throw error;
    }
  }, []);

  // Load private Vostcards
  const loadPrivateVostcards = useCallback(async () => {
    if (!authContext?.user) return;
    
    try {
      console.log('📂 Loading private Vostcards...');
      
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', authContext.user.uid),
        where('visibility', '==', 'private'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const vostcards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vostcard[];
      
      console.log('✅ Loaded private Vostcards:', vostcards.length);
      setPrivateVostcards(vostcards);
    } catch (error) {
      console.error('❌ Error loading private Vostcards:', error);
    }
  }, [authContext?.user]);

  // Load public Vostcards
  const loadPublicVostcards = useCallback(async () => {
    try {
      console.log('📂 Loading public Vostcards...');
      
      const q = query(
        collection(db, 'vostcards'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const vostcards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vostcard[];
      
      console.log('✅ Loaded public Vostcards:', vostcards.length);
      setPublicVostcards(vostcards);
    } catch (error) {
      console.error('❌ Error loading public Vostcards:', error);
    }
  }, []);

  // Delete Vostcard
  const deleteVostcard = useCallback(async (id: string) => {
    try {
      console.log('🗑️ Deleting Vostcard:', id);
      
      // Get the Vostcard first to delete associated files
      const docRef = doc(db, 'vostcards', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const vostcard = docSnap.data() as Vostcard;
        
        // Delete video from Storage
        if (vostcard.video) {
          try {
            const videoRef = ref(storage, vostcard.video);
            await deleteObject(videoRef);
          } catch (error) {
            console.warn('Failed to delete video file:', error);
          }
        }
        
        // Delete photos from Storage
        if (vostcard.photos && vostcard.photos.length > 0) {
          for (const photoURL of vostcard.photos) {
            try {
              const photoRef = ref(storage, photoURL);
              await deleteObject(photoRef);
            } catch (error) {
              console.warn('Failed to delete photo file:', error);
            }
          }
        }
      }
      
      // Delete document from Firestore
      await deleteDoc(docRef);
      
      console.log('✅ Vostcard deleted successfully');
      
      // Refresh lists
      await loadPrivateVostcards();
      await loadPublicVostcards();
      
    } catch (error) {
      console.error('❌ Error deleting Vostcard:', error);
      throw error;
    }
  }, [loadPrivateVostcards, loadPublicVostcards]);

  // Clear current Vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(createNewVostcard());
  }, [createNewVostcard]);

  // Load data on user change
  useEffect(() => {
    if (authContext?.user) {
      loadPrivateVostcards();
      loadPublicVostcards();
    }
  }, [authContext?.user, loadPrivateVostcards, loadPublicVostcards]);

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

  const value: VostcardContextProps = {
    currentVostcard,
    setCurrentVostcard,
    setVideo,
    setGeo,
    updateVostcard,
    addPhoto,
    saveVostcard,
    loadVostcard,
    clearVostcard,
    privateVostcards,
    publicVostcards,
    loadPrivateVostcards,
    loadPublicVostcards,
    deleteVostcard,
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
  };

  return (
    <VostcardContext.Provider value={value}>
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