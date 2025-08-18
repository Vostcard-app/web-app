// VostcardStorageContext.tsx - Unified Vostcard Storage Context
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Vostcard } from '../types/VostcardTypes';
import { db, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, limit, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';

// IndexedDB configuration
const DB_NAME = 'VostcardDB';
const DB_VERSION = 3;
const STORE_NAME = 'privateVostcards';
const METADATA_STORE_NAME = 'vostcardMetadata';

interface VostcardStorageContextProps {
  // Storage state
  savedVostcards: Vostcard[];
  postedVostcards: Vostcard[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  
  // Core storage operations
  saveToIndexedDB: (vostcard: Vostcard) => Promise<void>;
  saveToFirebase: (vostcard: Vostcard) => Promise<void>;
  loadFromIndexedDB: (id: string) => Promise<Vostcard | null>;
  loadFromFirebase: (id: string) => Promise<Vostcard | null>;
  deleteFromIndexedDB: (id: string) => Promise<void>;
  deleteFromFirebase: (id: string) => Promise<void>;
  
  // Bulk operations
  loadAllFromIndexedDB: () => Promise<void>;
  loadAllFromFirebase: () => Promise<void>;
  syncFromFirebase: () => Promise<void>;
  
  // Utility functions
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
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
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (vostcard: Vostcard): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.put(vostcard);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadFromIndexedDB = async (id: string): Promise<Vostcard | null> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const deleteFromIndexedDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getAllFromIndexedDB = async (): Promise<Vostcard[]> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Firebase utility functions
const uploadVideo = async (userId: string, vostcardId: string, file: Blob): Promise<string> => {
  const videoRef = ref(storage, `vostcards/${userId}/${vostcardId}/video.mp4`);
  const snapshot = await uploadBytes(videoRef, file);
  return getDownloadURL(snapshot.ref);
};

const uploadPhoto = async (userId: string, vostcardId: string, idx: number, file: Blob): Promise<string> => {
  const photoRef = ref(storage, `vostcards/${userId}/${vostcardId}/photo_${idx}.jpg`);
  const snapshot = await uploadBytes(photoRef, file);
  return getDownloadURL(snapshot.ref);
};

const uploadAudio = async (userId: string, vostcardId: string, file: Blob, index?: number): Promise<string> => {
  const audioRef = ref(storage, `vostcards/${userId}/${vostcardId}/audio_${index || 0}.mp3`);
  const snapshot = await uploadBytes(audioRef, file);
  return getDownloadURL(snapshot.ref);
};

export const VostcardStorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Storage state
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);
  const [postedVostcards, setPostedVostcards] = useState<Vostcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load all vostcards from IndexedDB on mount
  useEffect(() => {
    if (user) {
      loadAllFromIndexedDB();
    }
  }, [user]);

  // Core storage operations
  const saveToIndexedDB = useCallback(async (vostcard: Vostcard) => {
    try {
      await saveToIndexedDB(vostcard);
      // Update local state
      setSavedVostcards(prev => {
        const existing = prev.find(v => v.id === vostcard.id);
        if (existing) {
          return prev.map(v => v.id === vostcard.id ? vostcard : v);
        } else {
          return [...prev, vostcard];
        }
      });
    } catch (err) {
      console.error('Failed to save to IndexedDB:', err);
      throw err;
    }
  }, []);

  const saveToFirebase = useCallback(async (vostcard: Vostcard) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Upload media files first
      let photoURLs: string[] = [];
      let videoURL: string | null = null;
      let audioURLs: string[] = [];
      
      // Upload photos
      if (vostcard.photos && vostcard.photos.length > 0) {
        for (let i = 0; i < vostcard.photos.length; i++) {
          const photo = vostcard.photos[i];
          if (photo instanceof Blob) {
            const url = await uploadPhoto(user.uid, vostcard.id, i, photo);
            photoURLs.push(url);
          }
        }
      }
      
      // Upload video
      if (vostcard.video instanceof Blob) {
        videoURL = await uploadVideo(user.uid, vostcard.id, vostcard.video);
      }
      
      // Upload audio files
      if (vostcard.audioFiles && vostcard.audioFiles.length > 0) {
        for (let i = 0; i < vostcard.audioFiles.length; i++) {
          const audio = vostcard.audioFiles[i];
          if (audio instanceof Blob) {
            const url = await uploadAudio(user.uid, vostcard.id, audio, i);
            audioURLs.push(url);
          }
        }
      }
      
      // Prepare data for Firebase (without large media files)
      const firebaseData = {
        ...vostcard,
        photoURLs,
        videoURL,
        audioURLs,
        photos: undefined, // Don't store large blobs in Firestore
        video: undefined,
        audioFiles: undefined,
        updatedAt: Timestamp.now()
      };
      
      // Save to Firestore
      if (vostcard.state === 'posted') {
        await setDoc(doc(db, 'vostcards', vostcard.id), firebaseData);
      } else {
        await setDoc(doc(db, 'privateVostcards', user.uid, 'vostcards', vostcard.id), firebaseData);
      }
      
      setLastSyncTime(new Date());
      console.log('✅ Vostcard saved to Firebase:', vostcard.id);
      
    } catch (err) {
      console.error('Failed to save to Firebase:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadFromIndexedDB = useCallback(async (id: string): Promise<Vostcard | null> => {
    try {
      return await loadFromIndexedDB(id);
    } catch (err) {
      console.error('Failed to load from IndexedDB:', err);
      return null;
    }
  }, []);

  const loadFromFirebase = useCallback(async (id: string): Promise<Vostcard | null> => {
    if (!user) return null;
    
    try {
      // Try posted vostcards first
      let doc = await getDoc(doc(db, 'vostcards', id));
      
      if (!doc.exists()) {
        // Try private vostcards
        doc = await getDoc(doc(db, 'privateVostcards', user.uid, 'vostcards', id));
      }
      
      if (doc.exists()) {
        return { id: doc.id, ...doc.data() } as Vostcard;
      }
      
      return null;
    } catch (err) {
      console.error('Failed to load from Firebase:', err);
      return null;
    }
  }, [user]);

  const deleteFromIndexedDB = useCallback(async (id: string) => {
    try {
      await deleteFromIndexedDB(id);
      // Update local state
      setSavedVostcards(prev => prev.filter(v => v.id !== id));
      setPostedVostcards(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to delete from IndexedDB:', err);
      throw err;
    }
  }, []);

  const deleteFromFirebase = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Try to delete from both collections
      await Promise.allSettled([
        deleteDoc(doc(db, 'vostcards', id)),
        deleteDoc(doc(db, 'privateVostcards', user.uid, 'vostcards', id))
      ]);
      
      console.log('✅ Vostcard deleted from Firebase:', id);
    } catch (err) {
      console.error('Failed to delete from Firebase:', err);
      throw err;
    }
  }, [user]);

  // Bulk operations
  const loadAllFromIndexedDB = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allVostcards = await getAllFromIndexedDB();
      
      // Separate by type
      const saved: Vostcard[] = [];
      const posted: Vostcard[] = [];
      
      allVostcards.forEach(vostcard => {
        if (vostcard.state === 'posted') {
          posted.push(vostcard);
        } else {
          saved.push(vostcard);
        }
      });
      
      setSavedVostcards(saved);
      setPostedVostcards(posted);
      
      console.log(`✅ Loaded ${allVostcards.length} vostcards from IndexedDB`);
      
    } catch (err) {
      console.error('Failed to load from IndexedDB:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllFromFirebase = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load posted vostcards
      const postedQuery = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const postedSnapshot = await getDocs(postedQuery);
      const posted = postedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vostcard));
      
      // Load private vostcards
      const privateQuery = query(
        collection(db, 'privateVostcards', user.uid, 'vostcards'),
        orderBy('createdAt', 'desc')
      );
      const privateSnapshot = await getDocs(privateQuery);
      const privateVostcards = privateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vostcard));
      
      setPostedVostcards(posted);
      setSavedVostcards(privateVostcards);
      
      setLastSyncTime(new Date());
      console.log(`✅ Loaded ${posted.length + privateVostcards.length} vostcards from Firebase`);
      
    } catch (err) {
      console.error('Failed to load from Firebase:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const syncFromFirebase = useCallback(async () => {
    await loadAllFromFirebase();
  }, [loadAllFromFirebase]);

  // Utility functions
  const clearAllData = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      
      await Promise.all([
        transaction.objectStore(STORE_NAME).clear(),
        transaction.objectStore(METADATA_STORE_NAME).clear()
      ]);
      
      setSavedVostcards([]);
      setPostedVostcards([]);
      
      console.log('✅ All data cleared');
    } catch (err) {
      console.error('Failed to clear data:', err);
      throw err;
    }
  }, []);

  const exportData = useCallback(async (): Promise<string> => {
    const allVostcards = [...savedVostcards, ...postedVostcards];
    return JSON.stringify(allVostcards, null, 2);
  }, [savedVostcards, postedVostcards]);

  const importData = useCallback(async (data: string) => {
    try {
      const vostcards: Vostcard[] = JSON.parse(data);
      
      // Save each vostcard to IndexedDB
      for (const vostcard of vostcards) {
        await saveToIndexedDB(vostcard);
      }
      
      // Reload from IndexedDB
      await loadAllFromIndexedDB();
      
      console.log(`✅ Imported ${vostcards.length} vostcards`);
    } catch (err) {
      console.error('Failed to import data:', err);
      throw err;
    }
  }, [saveToIndexedDB, loadAllFromIndexedDB]);

  const value: VostcardStorageContextProps = {
    // Storage state
    savedVostcards,
    postedVostcards,
    isLoading,
    error,
    lastSyncTime,
    
    // Core storage operations
    saveToIndexedDB,
    saveToFirebase,
    loadFromIndexedDB,
    loadFromFirebase,
    deleteFromIndexedDB,
    deleteFromFirebase,
    
    // Bulk operations
    loadAllFromIndexedDB,
    loadAllFromFirebase,
    syncFromFirebase,
    
    // Utility functions
    clearAllData,
    exportData,
    importData,
  };

  return (
    <VostcardStorageContext.Provider value={value}>
      {children}
    </VostcardStorageContext.Provider>
  );
};

export const useVostcardStorage = () => {
  const context = useContext(VostcardStorageContext);
  if (context === undefined) {
    throw new Error('useVostcardStorage must be used within a VostcardStorageProvider');
  }
  return context;
};
