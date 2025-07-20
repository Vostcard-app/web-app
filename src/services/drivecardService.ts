// DriveCard Storage Service - Handles local and Firebase storage for Drivecards
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
import type { Drivecard } from '../types/VostcardTypes';

// IndexedDB configuration for Drivecards
const DB_NAME = 'DrivecardDB';
const DB_VERSION = 1;
const STORE_NAME = 'drivecards';

class DrivecardStorageService {
  // IndexedDB operations
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
          console.error('❌ IndexedDB open error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          console.log('✅ IndexedDB opened successfully');
          resolve(request.result);
        };
        
        request.onupgradeneeded = () => {
          console.log('🔄 IndexedDB upgrade needed');
          const db = request.result;
          try {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              store.createIndex('userID', 'userID', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
              console.log('✅ Created object store:', STORE_NAME);
            }
          } catch (upgradeError) {
            console.error('❌ IndexedDB upgrade error:', upgradeError);
            reject(upgradeError);
          }
        };
      } catch (error) {
        console.error('❌ Failed to initialize IndexedDB:', error);
        reject(error);
      }
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Converting blob to base64, size:', blob.size);
        const reader = new FileReader();
        
        reader.onload = () => {
          console.log('✅ Blob converted to base64');
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          console.error('❌ FileReader error:', reader.error);
          reject(reader.error);
        };
        
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('❌ Failed to start blob conversion:', error);
        reject(error);
      }
    });
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    try {
      const response = await fetch(base64);
      return response.blob();
    } catch (error) {
      console.error('❌ Failed to convert base64 to blob:', error);
      throw error;
    }
  }

  // Save Drivecard to IndexedDB
  async saveToIndexedDB(drivecard: Drivecard): Promise<void> {
    try {
      console.log('🔄 Opening IndexedDB for save...');
      const db = await this.openDB();
      
      console.log('🔄 Creating transaction...');
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Convert audio Blob to base64 for storage
      console.log('🔄 Processing audio for storage...');
      let audioBase64 = null;
      if (drivecard.audio && drivecard.audio instanceof Blob) {
        console.log('🎵 Converting audio blob, size:', drivecard.audio.size);
        
        // Check if audio is too large (>10MB)
        if (drivecard.audio.size > 10 * 1024 * 1024) {
          throw new Error('Audio file too large for local storage (>10MB)');
        }
        
        audioBase64 = await this.blobToBase64(drivecard.audio);
        console.log('✅ Audio converted to base64');
      }
      
      const storableDrivecard = {
        ...drivecard,
        _audioBase64: audioBase64,
        audio: null // Remove actual Blob for storage
      };

      console.log('🔄 Saving to IndexedDB store...');
      await new Promise<void>((resolve, reject) => {
        const request = store.put(storableDrivecard);
        
        request.onsuccess = () => {
          console.log('✅ IndexedDB put successful');
          resolve();
        };
        
        request.onerror = () => {
          console.error('❌ IndexedDB put error:', request.error);
          reject(request.error);
        };
        
        // Add transaction error handler
        transaction.onerror = () => {
          console.error('❌ IndexedDB transaction error:', transaction.error);
          reject(transaction.error);
        };
        
        transaction.onabort = () => {
          console.error('❌ IndexedDB transaction aborted:', transaction.error);
          reject(new Error('Transaction aborted'));
        };
      });

      console.log('✅ Saved Drivecard to IndexedDB:', drivecard.id);
    } catch (err) {
      console.error('❌ Failed to save to IndexedDB:', err);
      throw new Error(`IndexedDB save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Load Drivecard from IndexedDB
  async loadFromIndexedDB(id: string): Promise<Drivecard | null> {
    try {
      console.log('🔄 Loading from IndexedDB:', id);
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const drivecard = await new Promise<any>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!drivecard) {
        console.log('❌ Drivecard not found in IndexedDB:', id);
        return null;
      }

      // Convert base64 back to Blob if it exists
      if (drivecard._audioBase64) {
        console.log('🔄 Converting base64 back to blob...');
        drivecard.audio = await this.base64ToBlob(drivecard._audioBase64);
        console.log('✅ Audio restored from base64');
      }

      console.log('✅ Loaded Drivecard from IndexedDB:', id);
      return drivecard as Drivecard;
    } catch (err) {
      console.error('❌ Failed to load from IndexedDB:', err);
      throw err;
    }
  }

  // Load all Drivecards from IndexedDB
  async loadAllFromIndexedDB(): Promise<Drivecard[]> {
    try {
      console.log('🔄 Loading all Drivecards from IndexedDB...');
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const drivecards = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      console.log(`🔄 Processing ${drivecards.length} drivecards from IndexedDB...`);

      // Convert base64 back to Blobs
      for (const drivecard of drivecards) {
        if (drivecard._audioBase64) {
          try {
            drivecard.audio = await this.base64ToBlob(drivecard._audioBase64);
          } catch (audioError) {
            console.warn('⚠️ Failed to restore audio for drivecard:', drivecard.id, audioError);
            drivecard.audio = null;
          }
        }
      }

      console.log(`✅ Loaded ${drivecards.length} Drivecards from IndexedDB`);
      return drivecards as Drivecard[];
    } catch (err) {
      console.error('❌ Failed to load all from IndexedDB:', err);
      throw err;
    }
  }

  // Delete Drivecard from IndexedDB
  async deleteFromIndexedDB(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting from IndexedDB:', id);
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
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
  }

  // Firebase operations

  private async uploadAudio(userID: string, drivecardId: string, audio: Blob): Promise<string> {
    try {
      console.log('☁️ Uploading audio to Firebase Storage...');
      const audioRef = ref(storage, `drivecards/${userID}/${drivecardId}/audio.webm`);
      const snapshot = await uploadBytes(audioRef, audio);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Audio uploaded to Firebase Storage:', downloadURL);
      return downloadURL;
    } catch (err) {
      console.error('❌ Failed to upload audio:', err);
      throw err;
    }
  }

  // Save Drivecard to Firebase
  async saveToFirebase(drivecard: Drivecard): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('☁️ Saving to Firebase:', drivecard.id);
      const docRef = doc(db, 'drivecards', drivecard.id);
      
      // Upload audio if needed
      let audioURL = drivecard._firebaseAudioURL || '';
      
      if (drivecard.audio && drivecard.audio instanceof Blob) {
        audioURL = await this.uploadAudio(user.uid, drivecard.id, drivecard.audio);
      }

      await setDoc(docRef, {
        id: drivecard.id,
        title: drivecard.title,
        username: drivecard.username,
        userID: user.uid,
        audioURL,
        latitude: drivecard.geo.latitude,
        longitude: drivecard.geo.longitude,
        address: drivecard.geo.address || null,
        category: drivecard.category,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log('✅ Saved Drivecard to Firebase:', drivecard.id);
    } catch (err) {
      console.error('❌ Failed to save to Firebase:', err);
      throw err;
    }
  }

  // Load Drivecard from Firebase
  async loadFromFirebase(id: string): Promise<Drivecard | null> {
    try {
      console.log('☁️ Loading from Firebase:', id);
      const docRef = doc(db, 'drivecards', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('❌ Drivecard not found in Firebase:', id);
        return null;
      }

      const data = docSnap.data();
      const drivecard: Drivecard = {
        id: data.id,
        title: data.title,
        username: data.username,
        userID: data.userID,
        audio: null, // Will be loaded separately if needed
        _firebaseAudioURL: data.audioURL,
        geo: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address
        },
        category: data.category,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };

      console.log('✅ Loaded Drivecard from Firebase:', id);
      return drivecard;
    } catch (err) {
      console.error('❌ Failed to load from Firebase:', err);
      throw err;
    }
  }

  // Load all user's Drivecards from Firebase
  async loadAllFromFirebase(userID: string): Promise<Drivecard[]> {
    try {
      console.log('☁️ Loading all Drivecards from Firebase for user:', userID);
      const q = query(
        collection(db, 'drivecards'),
        where('userID', '==', userID)
      );
      
      const snapshot = await getDocs(q);
      const drivecards = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          title: data.title,
          username: data.username,
          userID: data.userID,
          audio: null,
          _firebaseAudioURL: data.audioURL,
          geo: {
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address
          },
          category: data.category,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as Drivecard;
      });

      console.log(`✅ Loaded ${drivecards.length} Drivecards from Firebase`);
      return drivecards;
    } catch (err) {
      console.error('❌ Failed to load all from Firebase:', err);
      throw err;
    }
  }

  // Delete Drivecard from Firebase
  async deleteFromFirebase(id: string): Promise<void> {
    try {
      console.log('☁️ Deleting from Firebase:', id);
      await deleteDoc(doc(db, 'drivecards', id));
      console.log('✅ Deleted from Firebase:', id);
    } catch (err) {
      console.error('❌ Failed to delete from Firebase:', err);
      throw err;
    }
  }

  // Combined save to both IndexedDB and Firebase
  async save(drivecard: Drivecard): Promise<void> {
    console.log('💾 Saving Drivecard:', drivecard.id);
    
    try {
      // Save to IndexedDB first (fast local access)
      try {
        await this.saveToIndexedDB(drivecard);
        console.log('✅ IndexedDB save successful');
      } catch (indexedError) {
        console.warn('⚠️ IndexedDB save failed, continuing with Firebase only:', indexedError);
        // Continue with Firebase save even if IndexedDB fails
      }
      
      // Then sync to Firebase (cloud backup)
      await this.saveToFirebase(drivecard);
      
      console.log('✅ Drivecard saved successfully:', drivecard.id);
    } catch (err) {
      console.error('❌ Failed to save Drivecard:', err);
      throw new Error(`Failed to save Drivecard: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Combined delete from both IndexedDB and Firebase
  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting Drivecard:', id);
    
    try {
      await Promise.all([
        this.deleteFromIndexedDB(id).catch(err => {
          console.warn('⚠️ Failed to delete from IndexedDB:', err);
        }),
        this.deleteFromFirebase(id)
      ]);
      
      console.log('✅ Drivecard deleted successfully:', id);
    } catch (err) {
      console.error('❌ Failed to delete Drivecard:', err);
      throw err;
    }
  }

  // Load all Drivecards (try IndexedDB first, fallback to Firebase)
  async loadAll(): Promise<Drivecard[]> {
    try {
      // Try IndexedDB first (faster)
      try {
        const localDrivecards = await this.loadAllFromIndexedDB();
        
        if (localDrivecards.length > 0) {
          console.log(`📂 Loaded ${localDrivecards.length} Drivecards from local storage`);
          return localDrivecards;
        }
      } catch (indexedError) {
        console.warn('⚠️ IndexedDB load failed, falling back to Firebase:', indexedError);
      }

      // Fallback to Firebase
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user for Firebase load');
        return [];
      }

      const remoteDrivecards = await this.loadAllFromFirebase(user.uid);
      console.log(`☁️ Loaded ${remoteDrivecards.length} Drivecards from Firebase`);
      
      return remoteDrivecards;
    } catch (err) {
      console.error('❌ Failed to load Drivecards:', err);
      return [];
    }
  }
}

export const drivecardService = new DrivecardStorageService(); 