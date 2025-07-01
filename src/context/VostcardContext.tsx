import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, storage } from '../firebaseConfig.ts';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, limit, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

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
  createdAt: string;
  updatedAt: string;
  _videoBase64?: string | null; // For localStorage serialization
  _photosBase64?: string[]; // For localStorage serialization
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob) => void;
  setGeo: (geo: { latitude: number; longitude: number }) => void;
  updateVostcard: (updates: Partial<Vostcard>) => void;
  saveLocalVostcard: () => void;
  loadLocalVostcard: (id: string) => void;
  clearVostcard: () => void;
  clearLocalStorage: () => void; // For testing
  postVostcard: () => Promise<void>;
  localVostcards: Vostcard[];
}

const VostcardContext = createContext<VostcardContextProps | undefined>(undefined);

// IndexedDB setup for large video storage
const DB_NAME = 'VostcardDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';
const PHOTO_STORE = 'photos';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // First, try to delete the existing database to ensure clean state
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log('🗑️ Existing database deleted, creating new one...');
      
      // Now create the new database
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✅ IndexedDB initialized successfully');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔄 Creating IndexedDB object stores...');
        
        // Create video store
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
          db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
          console.log('✅ Video store created');
        }
        
        // Create photo store
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          console.log('✅ Photo store created');
        }
      };
    };
    
    deleteRequest.onerror = () => {
      console.log('⚠️ Could not delete existing database, trying to open...');
      
      // Fallback: try to open existing database
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✅ IndexedDB opened successfully');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔄 Upgrading IndexedDB object stores...');
        
        // Create video store
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
          db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
          console.log('✅ Video store created');
        }
        
        // Create photo store
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          console.log('✅ Photo store created');
        }
      };
    };
  });
};

// Save blob to IndexedDB
const saveBlobToIndexedDB = async (storeName: string, id: string, blob: Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({ id, blob, timestamp: Date.now() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get blob from IndexedDB
const getBlobFromIndexedDB = async (storeName: string, id: string): Promise<Blob | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete blob from IndexedDB
const deleteBlobFromIndexedDB = async (storeName: string, id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);

  // Debug currentVostcard changes
  useEffect(() => {
    console.log('🔄 currentVostcard state changed:', {
      id: currentVostcard?.id,
      hasVideo: !!currentVostcard?.video,
      hasGeo: !!currentVostcard?.geo,
      geo: currentVostcard?.geo,
      title: currentVostcard?.title,
      photosCount: currentVostcard?.photos?.length,
      categoriesCount: currentVostcard?.categories?.length
    });
  }, [currentVostcard]);

  // ✅ Create or update video
  const setVideo = (video: Blob) => {
    console.log('🎬 setVideo called with blob:', video);
    console.log('📍 Current geo before setVideo:', currentVostcard?.geo);

    // Attempt to capture location when the user starts recording
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('📍 Location captured at setVideo:', geo);
        setGeo(geo);
      },
      (error) => {
        console.warn('❌ Failed to capture location at setVideo:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
    
    if (currentVostcard) {
      const updatedVostcard = { 
        ...currentVostcard, 
        video, 
        updatedAt: new Date().toISOString() 
      };
      console.log('📍 Updated Vostcard with video, preserving geo:', updatedVostcard.geo);
      setCurrentVostcard(updatedVostcard);
    } else {
      const user = auth.currentUser;
      const username = user?.displayName || user?.email?.split('@')[0] || 'Unknown';

      const newVostcard = {
        id: uuidv4(),
        state: 'private' as const,
        video,
        title: '',
        description: '',
        photos: [], // Changed to Blob[]
        categories: [],
        geo: null, // This will be set by setGeo if location was captured
        username,
        userID: user?.uid || '', // Changed from userId to userID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('🎬 Creating new Vostcard with video:', newVostcard);
      setCurrentVostcard(newVostcard);
    }
  };

  // ✅ Update geolocation
  const setGeo = (geo: { latitude: number; longitude: number }) => {
    console.log('📍 setGeo called with:', geo);
    console.log('📍 Current Vostcard before setGeo:', currentVostcard);
    
    if (currentVostcard) {
      const updatedVostcard = { 
        ...currentVostcard, 
        geo, 
        updatedAt: new Date().toISOString() 
      };
      console.log('📍 Updated Vostcard with geo:', updatedVostcard.geo);
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('📍 setGeo called but no currentVostcard exists - geo will be set when Vostcard is created');
    }
  };

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = (updates: Partial<Vostcard>) => {
    console.log('🔄 updateVostcard called with:', updates);
    console.log('📍 Current geo before updateVostcard:', currentVostcard?.geo);
    console.log('📸 Current photos before updateVostcard:', {
      photosCount: currentVostcard?.photos?.length || 0,
      photos: currentVostcard?.photos
    });
    
    if (currentVostcard) {
      const updatedVostcard = {
        ...currentVostcard,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      console.log('📍 Updated Vostcard, geo preserved:', updatedVostcard.geo);
      console.log('📸 Updated Vostcard, photos:', {
        photosCount: updatedVostcard.photos?.length || 0,
        photos: updatedVostcard.photos
      });
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('🔄 updateVostcard called but no currentVostcard exists');
    }
  };

  // ✅ Save to localStorage and IndexedDB
  const saveLocalVostcard = async () => {
    if (!currentVostcard) {
      console.log('💾 saveLocalVostcard: No currentVostcard to save');
      return;
    }
    
    // Ensure photos is always an array
    const safePhotos = currentVostcard.photos || [];
    
    console.log('💾 saveLocalVostcard: Starting save process for Vostcard:', {
      id: currentVostcard.id,
      hasVideo: !!currentVostcard.video,
      videoSize: currentVostcard.video?.size,
      photosCount: safePhotos.length,
      photoSizes: safePhotos.map(p => p.size)
    });
    
    // Create serializable Vostcard for localStorage (without large blobs)
    const serializableVostcard = {
      ...currentVostcard,
      video: null, // Don't store video blob in localStorage
      photos: [], // Don't store photo blobs in localStorage
      _hasVideo: !!currentVostcard.video,
      _hasPhotos: safePhotos.length > 0,
      _videoId: currentVostcard.video ? `${currentVostcard.id}_video` : null,
      _photoIds: safePhotos.map((_, index) => `${currentVostcard.id}_photo_${index}`)
    };

    try {
      // Save large files to IndexedDB
      if (currentVostcard.video) {
        console.log('💾 Saving video to IndexedDB...');
        await saveBlobToIndexedDB(VIDEO_STORE, `${currentVostcard.id}_video`, currentVostcard.video);
        console.log('💾 Video saved to IndexedDB');
      }

      if (safePhotos.length > 0) {
        console.log('💾 Saving photos to IndexedDB...');
        for (let i = 0; i < safePhotos.length; i++) {
          await saveBlobToIndexedDB(PHOTO_STORE, `${currentVostcard.id}_photo_${i}`, safePhotos[i]);
        }
        console.log('💾 Photos saved to IndexedDB');
      }

      // Save metadata to localStorage
      const existing = JSON.parse(localStorage.getItem('localVostcards') || '[]');
      const updated = [
        ...existing.filter((v: any) => v.id !== currentVostcard.id),
        serializableVostcard,
      ];
      localStorage.setItem('localVostcards', JSON.stringify(updated));
      console.log('💾 Vostcard metadata saved to localStorage');
      
    } catch (error) {
      console.error('💾 Error saving Vostcard:', error);
      alert('Failed to save Vostcard. Please try again.');
    }
  };

  // ✅ Load from localStorage and IndexedDB
  const loadLocalVostcard = async (id: string) => {
    console.log('📂 loadLocalVostcard: Attempting to load Vostcard with ID:', id);
    const existing: any[] = JSON.parse(localStorage.getItem('localVostcards') || '[]');
    console.log('📂 Found', existing.length, 'Vostcards in localStorage');
    
    const found = existing.find((v) => v.id === id);
    
    if (found) {
      console.log('📂 Found Vostcard in localStorage:', {
        id: found.id,
        hasVideo: found._hasVideo,
        hasPhotos: found._hasPhotos,
        videoId: found._videoId,
        photoIds: found._photoIds,
        title: found.title
      });
      
      // Create restored Vostcard object
      const restoredVostcard = {
        ...found,
        video: null as Blob | null,
        photos: [] as Blob[]
      };

      try {
        // Load video from IndexedDB if it exists
        if (found._hasVideo && found._videoId) {
          console.log('📂 Loading video from IndexedDB...');
          const videoBlob = await getBlobFromIndexedDB(VIDEO_STORE, found._videoId);
          if (videoBlob) {
            restoredVostcard.video = videoBlob;
            console.log('📂 Video loaded from IndexedDB, size:', videoBlob.size);
          } else {
            console.log('📂 Video not found in IndexedDB');
          }
        }

        // Load photos from IndexedDB if they exist
        if (found._hasPhotos && found._photoIds && found._photoIds.length > 0) {
          console.log('📂 Loading photos from IndexedDB...');
          const photoBlobs = [];
          for (const photoId of found._photoIds) {
            const photoBlob = await getBlobFromIndexedDB(PHOTO_STORE, photoId);
            if (photoBlob) {
              photoBlobs.push(photoBlob);
              console.log(`📂 Photo loaded from IndexedDB, size:`, photoBlob.size);
            }
          }
          restoredVostcard.photos = photoBlobs;
          console.log('📂 All photos loaded from IndexedDB, count:', photoBlobs.length);
        }

        // Remove the IndexedDB reference fields
        delete restoredVostcard._hasVideo;
        delete restoredVostcard._hasPhotos;
        delete restoredVostcard._videoId;
        delete restoredVostcard._photoIds;

        console.log('📂 Loaded Vostcard from storage:', {
          id: restoredVostcard.id,
          hasVideo: !!restoredVostcard.video,
          videoSize: restoredVostcard.video?.size,
          photosCount: restoredVostcard.photos.length,
          photoSizes: restoredVostcard.photos.map((p: Blob) => p.size),
          title: restoredVostcard.title
        });

        setCurrentVostcard(restoredVostcard);
      } catch (error) {
        console.error('📂 Error loading Vostcard from IndexedDB:', error);
        alert('Failed to load Vostcard. Please try again.');
      }
    } else {
      console.log('📂 Vostcard not found in localStorage with ID:', id);
    }
  };

  // ✅ Clear current Vostcard
  const clearVostcard = () => {
    setCurrentVostcard(null);
  };

  // ✅ Clear localStorage (for testing)
  const clearLocalStorage = () => {
    localStorage.removeItem('localVostcards');
    console.log('🗑️ Cleared all Vostcards from localStorage');
  };

  // Post Vostcard to Firestore and Storage - Updated to match iOS app structure
  const postVostcard = async () => {
    if (!currentVostcard) {
      console.error('No current Vostcard found');
      alert('No Vostcard data found. Please start over.');
      return;
    }

    // Debug all fields
    console.log('Posting Vostcard - Current data:', {
      video: !!currentVostcard.video,
      photosCount: currentVostcard.photos.length,
      title: currentVostcard.title,
      description: currentVostcard.description,
      categoriesCount: currentVostcard.categories.length,
      geo: currentVostcard.geo,
      latitude: currentVostcard.geo?.latitude,
      longitude: currentVostcard.geo?.longitude
    });

    // Check each field individually and provide specific feedback
    if (!currentVostcard.video) {
      console.error('Missing video');
      alert('Video is required. Please record a video first.');
      return;
    }

    if (currentVostcard.photos.length < 2) {
      console.error('Missing photos - need at least 2, have:', currentVostcard.photos.length);
      alert('At least 2 photos are required. Please add more photos.');
      return;
    }

    if (!currentVostcard.title || currentVostcard.title.trim() === '') {
      console.error('Missing title');
      alert('Title is required. Please enter a title.');
      return;
    }

    if (!currentVostcard.description || currentVostcard.description.trim() === '') {
      console.error('Missing description');
      alert('Description is required. Please enter a description.');
      return;
    }

    if (currentVostcard.categories.length === 0) {
      console.error('Missing categories');
      alert('At least one category is required. Please select categories.');
      return;
    }

    // Improved location capture block
    let finalGeo = currentVostcard.geo;

    if (!finalGeo || !finalGeo.latitude || !finalGeo.longitude) {
      console.log('📍 Location missing in state. Attempting fresh capture...');

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        finalGeo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        console.log('✅ Fresh location captured during post:', finalGeo);

        // Update it in state too for consistency
        setGeo(finalGeo);

      } catch (error) {
        console.error('❌ Failed to capture location during posting:', error);
        alert('Failed to capture location. Please ensure location services are enabled and try again.');
        return;
      }
    }

    console.log('All validation passed - proceeding with posting');

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated. Please log in first.');
      return;
    }

    // Force token refresh to ensure we have a valid token
    try {
      await user.getIdToken(true); // Force refresh
      console.log('🔐 Token refreshed successfully');
    } catch (tokenError) {
      console.error('❌ Failed to refresh auth token:', tokenError);
      alert('Authentication token expired. Please log in again.');
      return;
    }

    // Debug authentication state
    console.log('🔐 Authentication debug:', {
      userID: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified
    });

    // Get current auth token for debugging
    try {
      const token = await user.getIdToken();
      console.log('🔐 Auth token obtained, length:', token.length);
    } catch (tokenError) {
      console.error('❌ Failed to get auth token:', tokenError);
      alert('Authentication token error. Please try logging in again.');
      return;
    }

    try {
      const vostcardId = currentVostcard.id;
      const userID = user.uid;
      
      console.log('📤 Starting upload to Firebase Storage...');
      console.log('📁 Upload path:', `vostcards/${userID}/${vostcardId}/video.mov`);
      
      // Upload video to Firebase Storage with iOS app path structure
      const videoRef = ref(storage, `vostcards/${userID}/${vostcardId}/video.mov`);
      console.log('📤 Uploading video...');
      const videoSnap = await uploadBytes(videoRef, currentVostcard.video);
      console.log('✅ Video uploaded successfully');
      const videoURL = await getDownloadURL(videoSnap.ref);
      console.log('🔗 Video URL obtained:', videoURL);

      // Upload photos to Firebase Storage with iOS app path structure
      const photoURLs = [];
      for (let i = 0; i < currentVostcard.photos.length; i++) {
        const photoBlob = currentVostcard.photos[i];
        const photoRef = ref(storage, `vostcards/${userID}/${vostcardId}/photo_${i}.jpg`);
        console.log(`📤 Uploading photo ${i + 1}...`);
        const photoSnap = await uploadBytes(photoRef, photoBlob);
        console.log(`✅ Photo ${i + 1} uploaded successfully`);
        const photoURL = await getDownloadURL(photoSnap.ref);
        photoURLs.push(photoURL);
      }
      console.log('🔗 All photo URLs obtained:', photoURLs);

      const username = user.displayName || user.email?.split('@')[0] || 'Unknown';

      console.log('📝 Creating Firestore document...');
      // Create Firestore document matching iOS app structure exactly
      const docRef = doc(db, 'vostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: username,
        userID: userID, // Use userID to match iOS app
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: finalGeo.latitude, // Use the final geo coordinates
        longitude: finalGeo.longitude, // Use the final geo coordinates
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(), // Use Firestore Timestamp
        likeCount: 0,
        likedByUsers: [],
        ratings: {},
        averageRating: 0.0,
        state: "posted" // Critical for map display - matches iOS app
      });
      console.log('✅ Firestore document created successfully');

      alert('Vōstcard posted successfully!');
    } catch (error) {
      console.error('❌ Failed to post Vostcard:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          alert('CORS error: Please check Firebase Storage security rules or try logging in again.');
        } else if (error.message.includes('permission')) {
          alert('Permission denied: Please check Firebase Storage security rules.');
        } else if (error.message.includes('unauthorized')) {
          alert('Authentication error: Please log in again.');
        } else {
          alert(`Upload failed: ${error.message}`);
        }
      } else {
        alert('Failed to post Vostcard. Please try again.');
      }
    }
  };

  const getLocalVostcards = (): Vostcard[] => {
    try {
      const raw = localStorage.getItem('localVostcards');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      
      // Return Vostcards with metadata only (blobs will be loaded on demand)
      return arr.map((vostcard: any) => {
        // Remove IndexedDB reference fields for the list view
        const { _hasVideo, _hasPhotos, _videoId, _photoIds, ...cleanVostcard } = vostcard;
        return {
          ...cleanVostcard,
          video: null, // Blobs will be loaded when needed
          photos: []
        };
      });
    } catch (error) {
      console.error('Error getting local Vostcards:', error);
      return [];
    }
  };

  return (
    <VostcardContext.Provider
      value={{
        currentVostcard,
        setCurrentVostcard,
        setVideo,
        setGeo,
        updateVostcard,
        saveLocalVostcard,
        loadLocalVostcard,
        clearVostcard,
        clearLocalStorage,
        postVostcard,
        localVostcards: getLocalVostcards(),
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