// VostcardStorageContext - Handles all IndexedDB and Firebase storage operations
import React, { createContext, useContext, useCallback, useState } from 'react';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import type { Vostcard } from '../types/VostcardTypes';

// IndexedDB configuration
const DB_NAME = 'VostcardDB';
const DB_VERSION = 3;
const STORE_NAME = 'privateVostcards';

interface VostcardStorageContextProps {
  // IndexedDB operations
  saveToIndexedDB: (vostcard: Vostcard) => Promise<void>;
  loadFromIndexedDB: (id: string) => Promise<Vostcard | null>;
  loadAllFromIndexedDB: () => Promise<Vostcard[]>;
  deleteFromIndexedDB: (id: string) => Promise<void>;
  clearIndexedDB: () => Promise<void>;
  
  // Firebase operations
  saveToFirebase: (vostcard: Vostcard) => Promise<void>;
  loadFromFirebase: (id: string) => Promise<Vostcard | null>;
  deleteFromFirebase: (id: string) => Promise<void>;
  
  // Upload operations
  uploadVideo: (userID: string, vostcardId: string, video: Blob) => Promise<string>;
  uploadPhoto: (userID: string, vostcardId: string, index: number, photo: Blob) => Promise<string>;
  
  // Sync operations
  syncFromFirebase: () => Promise<Vostcard[]>;
  
  // State
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

const VostcardStorageContext = createContext<VostcardStorageContextProps | undefined>(undefined);

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

export const VostcardStorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { username } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // ===== IndexedDB Operations =====
  
  const saveToIndexedDB = useCallback(async (vostcard: Vostcard): Promise<void> => {
    try {
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Convert Blobs to base64 for storage
      const storableVostcard = {
        ...vostcard,
        _videoBase64: vostcard.video ? await blobToBase64(vostcard.video) : null,
        _photosBase64: await Promise.all(
          vostcard.photos.map(photo => blobToBase64(photo))
        ),
        // Remove actual Blobs for storage
        video: null,
        photos: []
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(storableVostcard);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Saved to IndexedDB:', vostcard.id);
    } catch (err) {
      console.error('❌ Failed to save to IndexedDB:', err);
      throw err;
    }
  }, []);

  const loadFromIndexedDB = useCallback(async (id: string): Promise<Vostcard | null> => {
    try {
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!result) return null;

      // Convert base64 back to Blobs
      const vostcard: Vostcard = {
        ...result,
        video: result._videoBase64 ? base64ToBlob(result._videoBase64) : null,
        photos: await Promise.all(
          (result._photosBase64 || []).map((base64: string) => base64ToBlob(base64))
        )
      };

      return vostcard;
    } catch (err) {
      console.error('❌ Failed to load from IndexedDB:', err);
      throw err;
    }
  }, []);

  const loadAllFromIndexedDB = useCallback(async (): Promise<Vostcard[]> => {
    try {
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const results = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Convert base64 back to Blobs for all vostcards
      const vostcards = await Promise.all(
        results.map(async (result) => ({
          ...result,
          video: result._videoBase64 ? base64ToBlob(result._videoBase64) : null,
          photos: await Promise.all(
            (result._photosBase64 || []).map((base64: string) => base64ToBlob(base64))
          )
        }))
      );

      return vostcards;
    } catch (err) {
      console.error('❌ Failed to load all from IndexedDB:', err);
      throw err;
    }
  }, []);

  const deleteFromIndexedDB = useCallback(async (id: string): Promise<void> => {
    try {
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Deleted from IndexedDB:', id);
    } catch (err) {
      console.error('❌ Failed to delete from IndexedDB:', err);
      throw err;
    }
  }, []);

  const clearIndexedDB = useCallback(async (): Promise<void> => {
    try {
      const localDB = await openDB();
      const transaction = localDB.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Cleared IndexedDB');
    } catch (err) {
      console.error('❌ Failed to clear IndexedDB:', err);
      throw err;
    }
  }, []);

  // ===== Firebase Operations =====

  const saveToFirebase = useCallback(async (vostcard: Vostcard): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const docRef = doc(db, 'vostcards', vostcard.id);
      
      // Upload media if needed
      let videoURL = vostcard._firebaseVideoURL || '';
      let photoURLs = vostcard._firebasePhotoURLs || [];
      
      if (vostcard.video && vostcard.video instanceof Blob) {
        videoURL = await uploadVideo(user.uid, vostcard.id, vostcard.video);
      }
      
      if (vostcard.photos.length > 0) {
        photoURLs = await Promise.all(
          vostcard.photos.map((photo, idx) => 
            uploadPhoto(user.uid, vostcard.id, idx, photo)
          )
        );
      }

      await setDoc(docRef, {
        id: vostcard.id,
        title: vostcard.title,
        description: vostcard.description,
        categories: vostcard.categories,
        username: vostcard.username,
        userID: user.uid,
        userRole: vostcard.userRole || 'user', // 🔧 FIX: Include userRole for Guide_pin logic
        videoURL,
        photoURLs,
        latitude: vostcard.geo?.latitude || null,
        longitude: vostcard.geo?.longitude || null,
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        state: vostcard.state,
        visibility: vostcard.state === 'posted' ? 'public' : 'private',
        hasVideo: !!vostcard.video,
        hasPhotos: vostcard.photos.length > 0,
        isOffer: vostcard.isOffer || false,
        isQuickcard: vostcard.isQuickcard || false,
        offerDetails: vostcard.offerDetails || null
      });

      console.log('✅ Saved to Firebase:', vostcard.id);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('❌ Failed to save to Firebase:', err);
      throw err;
    }
  }, [username]);

  const loadFromFirebase = useCallback(async (id: string): Promise<Vostcard | null> => {
    try {
      const docRef = doc(db, 'vostcards', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      
      // Convert Firebase document to Vostcard (metadata only)
      const vostcard: Vostcard = {
        id: data.id,
        state: data.state,
        title: data.title || '',
        description: data.description || '',
        categories: data.categories || [],
        geo: data.latitude && data.longitude 
          ? { latitude: data.latitude, longitude: data.longitude }
          : null,
        username: data.username || '',
        userID: data.userID || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isOffer: data.isOffer || false,
        isQuickcard: data.isQuickcard || false,
        offerDetails: data.offerDetails || undefined,
        // Media placeholders (will be downloaded separately if needed)
        video: null,
        photos: [],
        _firebaseVideoURL: data.videoURL || null,
        _firebasePhotoURLs: data.photoURLs || [],
        _isMetadataOnly: true
      };

      return vostcard;
    } catch (err) {
      console.error('❌ Failed to load from Firebase:', err);
      throw err;
    }
  }, []);

  const deleteFromFirebase = useCallback(async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'vostcards', id);
      await deleteDoc(docRef);
      console.log('✅ Deleted from Firebase:', id);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('❌ Failed to delete from Firebase:', err);
      throw err;
    }
  }, []);

  // ===== Upload Operations =====

  const uploadVideo = useCallback(async (userID: string, vostcardId: string, video: Blob): Promise<string> => {
    try {
      const videoRef = ref(storage, `videos/${userID}/${vostcardId}.mp4`);
      await uploadBytes(videoRef, video);
      return await getDownloadURL(videoRef);
    } catch (err) {
      console.error('❌ Failed to upload video:', err);
      throw err;
    }
  }, []);

  const uploadPhoto = useCallback(async (userID: string, vostcardId: string, index: number, photo: Blob): Promise<string> => {
    try {
      const photoRef = ref(storage, `photos/${userID}/${vostcardId}_${index}.jpg`);
      await uploadBytes(photoRef, photo);
      return await getDownloadURL(photoRef);
    } catch (err) {
      console.error('❌ Failed to upload photo:', err);
      throw err;
    }
  }, []);

  // ===== Sync Operations =====

  const syncFromFirebase = useCallback(async (): Promise<Vostcard[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      setError(null);

      const firebaseQuery = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('visibility', '==', 'private')
      );
      
      const firebaseSnapshot = await getDocs(firebaseQuery);
      const vostcards = firebaseSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          state: data.state,
          title: data.title || '',
          description: data.description || '',
          categories: data.categories || [],
          geo: data.latitude && data.longitude 
            ? { latitude: data.latitude, longitude: data.longitude }
            : null,
          username: data.username || '',
          userID: data.userID || '',
          userRole: data.userRole || 'user', // 🔧 FIX: Include userRole when loading from Firebase
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isOffer: data.isOffer || false,
          isQuickcard: data.isQuickcard || false,
          offerDetails: data.offerDetails || undefined,
          video: null,
          photos: [],
          _firebaseVideoURL: data.videoURL || null,
          _firebasePhotoURLs: data.photoURLs || [],
          _isMetadataOnly: true
        } as Vostcard;
      });

      setLastSyncTime(new Date());
      console.log(`✅ Synced ${vostcards.length} vostcards from Firebase`);
      
      return vostcards;
    } catch (err) {
      console.error('❌ Failed to sync from Firebase:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    // IndexedDB operations
    saveToIndexedDB,
    loadFromIndexedDB,
    loadAllFromIndexedDB,
    deleteFromIndexedDB,
    clearIndexedDB,
    
    // Firebase operations
    saveToFirebase,
    loadFromFirebase,
    deleteFromFirebase,
    
    // Upload operations
    uploadVideo,
    uploadPhoto,
    
    // Sync operations
    syncFromFirebase,
    
    // State
    isLoading,
    error,
    lastSyncTime
  };

  return (
    <VostcardStorageContext.Provider value={value}>
      {children}
    </VostcardStorageContext.Provider>
  );
};

export const useVostcardStorage = () => {
  const context = useContext(VostcardStorageContext);
  if (!context) {
    throw new Error('useVostcardStorage must be used within a VostcardStorageProvider');
  }
  return context;
};

// ===== Utility Functions =====

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray]);
}; 