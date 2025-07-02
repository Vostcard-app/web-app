import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  _videoBase64?: string | null; // For IndexedDB serialization
  _photosBase64?: string[]; // For IndexedDB serialization
}

interface VostcardContextProps {
  currentVostcard: Vostcard | null;
  setCurrentVostcard: (vostcard: Vostcard | null) => void;
  setVideo: (video: Blob) => void;
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

export const VostcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVostcard, setCurrentVostcard] = useState<Vostcard | null>(null);
  const [savedVostcards, setSavedVostcards] = useState<Vostcard[]>([]);

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

          setSavedVostcards(restoredVostcards);
          console.log('📂 Loaded all saved Vōstcards:', restoredVostcards);
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
  }, [loadAllLocalVostcards]);

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
  const setVideo = useCallback((video: Blob) => {
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
  }, [currentVostcard, setGeo]);

  // ✅ Update geolocation
  const setGeo = useCallback((geo: { latitude: number; longitude: number }) => {
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
  }, [currentVostcard, setCurrentVostcard]);

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = useCallback((updates: Partial<Vostcard>) => {
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
  }, [currentVostcard, setCurrentVostcard]);

  // ✅ Add a photo to the current Vostcard
  const addPhoto = useCallback((photo: Blob) => {
    if (currentVostcard) {
      const updatedPhotos = [...currentVostcard.photos, photo];
      const updatedVostcard = {
        ...currentVostcard,
        photos: updatedPhotos,
        updatedAt: new Date().toISOString(),
      };
      console.log('📸 Photo added. Total photos:', updatedPhotos.length);
      setCurrentVostcard(updatedVostcard);
    } else {
      console.warn('📸 Tried to add photo but no currentVostcard exists');
    }
  }, [currentVostcard, setCurrentVostcard]);

  // ✅ Save to IndexedDB
  const saveLocalVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.log('💾 saveLocalVostcard: No currentVostcard to save');
      return;
    }
    
    console.log('💾 saveLocalVostcard: Starting save process for Vostcard:', {
      id: currentVostcard.id,
      hasVideo: !!currentVostcard.video,
      videoSize: currentVostcard.video?.size,
      photosCount: currentVostcard.photos?.length || 0,
      photoSizes: currentVostcard.photos?.map(p => p.size) || []
    });
    
    try {
      // Convert Blob objects to base64 strings for IndexedDB serialization
      const serializableVostcard = {
        ...currentVostcard,
        video: currentVostcard.video ? null : null, // We'll handle video separately
        photos: [], // We'll handle photos separately
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
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(serializableVostcard);
      
      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          console.error('❌ Failed to save Vostcard to IndexedDB:', request.error);
          alert('Failed to save Vostcard locally. Please try again.');
          reject(request.error);
        };
        
        request.onsuccess = () => {
          console.log('💾 Saved Vostcard to IndexedDB successfully');
          // Update the savedVostcards list
          loadAllLocalVostcards();
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Error in saveLocalVostcard:', error);
      alert('Failed to save Vostcard locally. Please try again.');
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
  }, [setCurrentVostcard]);

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
          // Update the savedVostcards list
          loadAllLocalVostcards();
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Error in deletePrivateVostcard:', error);
      alert('Failed to delete Vostcard. Please try again.');
      throw error;
    }
  }, [loadAllLocalVostcards]);

  // ✅ Clear current Vostcard
  const clearVostcard = useCallback(() => {
    setCurrentVostcard(null);
  }, [setCurrentVostcard]);

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
  }, [setSavedVostcards]);

  // Save Vostcard to privateVostcards (draft/private save) - Keep Firebase for posted Vostcards
  const postVostcard = useCallback(async () => {
    if (!currentVostcard) {
      console.error('No current Vostcard to save');
      alert('No Vostcard to save. Please start with a video.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated. Please log in first.');
      return;
    }

    // For private Vostcards, save to IndexedDB
    if (currentVostcard.state === 'private') {
      try {
        await saveLocalVostcard();
        alert('Vōstcard saved locally!');
      } catch (error) {
        console.error('❌ Failed to save private Vostcard:', error);
        alert('Failed to save Vostcard locally.');
      }
      return;
    }

    // For posted Vostcards, continue using Firebase
    try {
      const vostcardId = currentVostcard.id;
      const userID = user.uid;

      console.log('📥 Starting save to Firebase (privateVostcards)...');

      // Upload video
      let videoURL = '';
      if (currentVostcard.video) {
        const videoRef = ref(storage, `privateVostcards/${userID}/${vostcardId}/video.mov`);
        const videoSnap = await uploadBytes(videoRef, currentVostcard.video);
        videoURL = await getDownloadURL(videoSnap.ref);
        console.log('🎥 Video uploaded');
      }

      // Upload photos
      const photoURLs = [];
      for (let i = 0; i < (currentVostcard.photos?.length || 0); i++) {
        const photoBlob = currentVostcard.photos[i];
        const photoRef = ref(storage, `privateVostcards/${userID}/${vostcardId}/photo_${i}.jpg`);
        const photoSnap = await uploadBytes(photoRef, photoBlob);
        const photoURL = await getDownloadURL(photoSnap.ref);
        photoURLs.push(photoURL);
      }
      console.log('📸 Photos uploaded:', photoURLs);

      const docRef = doc(db, 'privateVostcards', vostcardId);
      await setDoc(docRef, {
        id: vostcardId,
        title: currentVostcard.title,
        description: currentVostcard.description,
        categories: currentVostcard.categories,
        username: currentVostcard.username,
        userID: userID,
        videoURL: videoURL,
        photoURLs: photoURLs,
        latitude: currentVostcard.geo?.latitude || null,
        longitude: currentVostcard.geo?.longitude || null,
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        state: 'private'
      });

      console.log('✅ Vostcard saved to privateVostcards collection');
      alert('Vōstcard saved!');
    } catch (error) {
      console.error('❌ Failed to save Vostcard:', error);
      alert('Failed to save Vostcard.');
    }
  }, [currentVostcard, saveLocalVostcard]);

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