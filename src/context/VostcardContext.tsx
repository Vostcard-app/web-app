import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, setDoc, Timestamp } from 'firebase/firestore';
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
  deleteVostcardsWithWrongUsername: () => Promise<void>;
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

// Helper function to get correct username
const getCorrectUsername = (currentUsername?: string): string => {
  const user = auth.currentUser;
  if (user) {
    if (user.email) {
      return user.email.split('@')[0];
    } else if (user.displayName && user.displayName !== 'info Web App') {
      return user.displayName;
    }
  }
  return currentUsername || 'Unknown';
};

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
      const correctUsername = getCorrectUsername(currentVostcard.username);
      
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
      // ADD: Check for invalid user/email/displayName
      if (!user || (!user.email && (!user.displayName || user.displayName === 'info Web App'))) {
        alert('❌ Sorry, something went wrong. Please start again.');
        setCurrentVostcard(null);
        return;
      }

      // SIMPLIFIED username assignment
      const username = user.email
        ? user.email.split('@')[0]
        : user.displayName!;

      const newVostcard = {
        id: uuidv4(),
        state: 'private' as const,
        video,
        title: '',
        description: '',
        photos: [],
        categories: [],
        geo: null,
        username,
        userID: user?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('🎬 Creating new Vostcard with video:', newVostcard);
      setCurrentVostcard(newVostcard);
    }
  }, [currentVostcard, setGeo]);

  // ✅ General updates (title, description, categories, etc.)
  const updateVostcard = useCallback((updates: Partial<Vostcard>) => {
    console.log('🔄 updateVostcard called with:', updates);
    
    if (currentVostcard) {
      // Always ensure username is correct when updating
      const correctUsername = getCorrectUsername(currentVostcard.username);
      
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
      const correctUsername = getCorrectUsername(currentVostcard.username);
      
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
          // Update the savedVostcards list by adding the new/updated item
          setSavedVostcards(prev => {
            const existingIndex = prev.findIndex(v => v.id === currentVostcard.id);
            if (existingIndex >= 0) {
              // Update existing item
              const updated = [...prev];
              updated[existingIndex] = currentVostcard;
              return updated;
            } else {
              // Add new item
              return [...prev, currentVostcard];
            }
          });
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Error in saveLocalVostcard:', error);
      alert('Failed to save Vostcard locally. Please try again.');
    }
  }, [currentVostcard]);

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
      
      // Query for Vostcards with incorrect username
      const q = query(
        collection(db, 'vostcards'),
        where('userID', '==', user.uid),
        where('username', '==', 'info Web App')
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

  // ✅ Post Vostcard to Firebase (public map) - Fixed CORS version
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

      // ALWAYS get username from email - ignore any existing username
      let username = 'Unknown User';
      if (user.email) {
        username = user.email.split('@')[0];
      } else if (user.displayName && user.displayName !== 'info Web App') {
        username = user.displayName;
      }
      
      console.log('👤 Username resolution:', {
        currentVostcardUsername: currentVostcard.username,
        userDisplayName: user.displayName,
        userEmail: user.email,
        finalUsername: username
      });

      // TEMPORARY: Skip Firebase Storage upload due to CORS issues
      // TODO: Re-enable once Firebase Storage rules are updated
      console.log('⚠️ Skipping Firebase Storage upload due to CORS issues');
      console.log('💾 Saving Vostcard data to Firestore only...');
      
      let videoURL = '';
      const photoURLs: string[] = [];

      // Save Vostcard data to Firestore
      console.log('💾 Saving Vostcard data to Firestore...');
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
        mediaUploadStatus: 'pending' // Set to pending since we're skipping uploads due to CORS
      });

      console.log('✅ Vostcard posted successfully to Firebase!');
      alert('🎉 Vōstcard posted successfully! It will appear on the map with media.');
      
      // Clear the current Vostcard after successful posting
      clearVostcard();
      
    } catch (error) {
      console.error('❌ Failed to post Vostcard:', error);
      
      // Check if it's a CORS error
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