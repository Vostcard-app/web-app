import { Vostcard } from '../context/VostcardContext';

// IndexedDB configuration (matching VostcardContext.tsx)
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

// Load all local vostcards from IndexedDB
export const loadLocalVostcards = async (): Promise<Vostcard[]> => {
  try {
    const localDB = await openDB();
    const transaction = localDB.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise<Vostcard[]>((resolve, reject) => {
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

          // Restore video from base64
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

          // Restore photos from base64
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

        // Filter out deleted vostcards
        const deletedVostcards = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
        const filteredVostcards = restoredVostcards.filter(v => 
          !deletedVostcards.includes(v.id)
        );
        
        resolve(filteredVostcards);
      };
    });
  } catch (error) {
    console.error('❌ Failed to load local vostcards:', error);
    return [];
  }
};

// Delete a local vostcard from IndexedDB
export const deleteLocalVostcard = async (id: string): Promise<void> => {
  try {
    const localDB = await openDB();
    const transaction = localDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onerror = () => {
        console.error('❌ Failed to delete Vostcard from IndexedDB:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('✅ Deleted Vostcard from IndexedDB:', id);
        
        // Also add to deleted list in localStorage for sync
        const deletedVostcards = JSON.parse(localStorage.getItem('deleted_vostcards') || '[]');
        if (!deletedVostcards.includes(id)) {
          deletedVostcards.push(id);
          localStorage.setItem('deleted_vostcards', JSON.stringify(deletedVostcards));
        }
        
        resolve();
      };
    });
  } catch (error) {
    console.error('❌ Error deleting local vostcard:', error);
    throw error;
  }
}; 