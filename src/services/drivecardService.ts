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
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('userID', 'userID', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(base64);
    return response.blob();
  }

  // Save Drivecard to IndexedDB
  async saveToIndexedDB(drivecard: Drivecard): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Convert audio Blob to base64 for storage
      const storableDrivecard = {
        ...drivecard,
        _audioBase64: drivecard.audio ? await this.blobToBase64(drivecard.audio) : null,
        audio: null // Remove actual Blob for storage
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(storableDrivecard);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Saved Drivecard to IndexedDB:', drivecard.id);
    } catch (err) {
      console.error('❌ Failed to save to IndexedDB:', err);
      throw err;
    }
  }

  // Load Drivecard from IndexedDB
  async loadFromIndexedDB(id: string): Promise<Drivecard | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const drivecard = await new Promise<any>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!drivecard) return null;

      // Convert base64 back to Blob if it exists
      if (drivecard._audioBase64) {
        drivecard.audio = await this.base64ToBlob(drivecard._audioBase64);
      }

      return drivecard as Drivecard;
    } catch (err) {
      console.error('❌ Failed to load from IndexedDB:', err);
      throw err;
    }
  }

  // Load all Drivecards from IndexedDB
  async loadAllFromIndexedDB(): Promise<Drivecard[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const drivecards = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Convert base64 back to Blobs
      for (const drivecard of drivecards) {
        if (drivecard._audioBase64) {
          drivecard.audio = await this.base64ToBlob(drivecard._audioBase64);
        }
      }

      return drivecards as Drivecard[];
    } catch (err) {
      console.error('❌ Failed to load all from IndexedDB:', err);
      throw err;
    }
  }

  // Delete Drivecard from IndexedDB
  async deleteFromIndexedDB(id: string): Promise<void> {
    try {
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
      const docRef = doc(db, 'drivecards', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      return {
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
      } as Drivecard;
    } catch (err) {
      console.error('❌ Failed to load from Firebase:', err);
      throw err;
    }
  }

  // Load all user's Drivecards from Firebase
  async loadAllFromFirebase(userID: string): Promise<Drivecard[]> {
    try {
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

      return drivecards;
    } catch (err) {
      console.error('❌ Failed to load all from Firebase:', err);
      throw err;
    }
  }

  // Delete Drivecard from Firebase
  async deleteFromFirebase(id: string): Promise<void> {
    try {
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
      await this.saveToIndexedDB(drivecard);
      
      // Then sync to Firebase (cloud backup)
      await this.saveToFirebase(drivecard);
      
      console.log('✅ Drivecard saved successfully:', drivecard.id);
    } catch (err) {
      console.error('❌ Failed to save Drivecard:', err);
      throw err;
    }
  }

  // Combined delete from both IndexedDB and Firebase
  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting Drivecard:', id);
    
    try {
      await Promise.all([
        this.deleteFromIndexedDB(id),
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
      const localDrivecards = await this.loadAllFromIndexedDB();
      
      if (localDrivecards.length > 0) {
        console.log(`📂 Loaded ${localDrivecards.length} Drivecards from local storage`);
        return localDrivecards;
      }

      // Fallback to Firebase
      const user = auth.currentUser;
      if (!user) return [];

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