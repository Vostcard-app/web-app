import { db } from '../firebase/firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  onSnapshot, 
  writeBatch,
  Timestamp,
  limit
} from 'firebase/firestore';
import { auth } from '../firebase/firebaseConfig';
import type { 
  Itinerary, 
  ItineraryItem, 
  CreateItineraryData, 
  UpdateItineraryData, 
  AddItemToItineraryData,
  ItineraryFirebaseDoc,
  ItineraryItemFirebaseDoc,
  PublicItinerary
} from '../types/ItineraryTypes';

// Generate a unique shareable link ID
const generateShareableLink = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Convert Firebase document to Itinerary object
const convertFirebaseToItinerary = (doc: ItineraryFirebaseDoc, items: ItineraryItem[]): Itinerary => {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    userID: doc.userID,
    username: doc.username,
    items: items.sort((a, b) => a.order - b.order), // Sort by order
    isPublic: doc.isPublic,
    shareableLink: doc.shareableLink,
    createdAt: doc.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  };
};

// Convert Firebase document to ItineraryItem object
const convertFirebaseToItineraryItem = (doc: ItineraryItemFirebaseDoc): ItineraryItem => {
  return {
    id: doc.id,
    vostcardID: doc.vostcardID,
    type: doc.type,
    order: doc.order,
    addedAt: doc.addedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    title: doc.title,
    description: doc.description,
    photoURL: doc.photoURL,
    latitude: doc.latitude,
    longitude: doc.longitude,
    username: doc.username
  };
};

export const ItineraryService = {
  /**
   * Create a new itinerary
   */
  async createItinerary(data: CreateItineraryData): Promise<Itinerary> {
    const user = auth.currentUser; // Move user declaration outside try block
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const itineraryId = doc(collection(db, 'itineraries')).id;
      const now = Timestamp.now();
      const shareableLink = data.isPublic !== false ? generateShareableLink() : undefined;

      // Create itinerary document
      const itineraryDoc: ItineraryFirebaseDoc = {
        id: itineraryId,
        name: data.name,
        description: data.description,
        userID: user.uid,
        username: user.displayName || 'Anonymous',
        isPublic: data.isPublic !== false, // Default to public
        shareableLink,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'itineraries', itineraryId), itineraryDoc);

      let items: ItineraryItem[] = [];

      // Add first item if provided
      if (data.firstItem) {
        const itemData: AddItemToItineraryData = {
          vostcardID: data.firstItem.vostcardID,
          type: data.firstItem.type
        };
        const firstItem = await ItineraryService.addItemToItinerary(itineraryId, itemData);
        items = [firstItem];
      }

      console.log('✅ Created itinerary:', itineraryId);
      return convertFirebaseToItinerary(itineraryDoc, items);
    } catch (error) {
      console.error('❌ Error creating itinerary:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        userData: {
          userId: user?.uid,
          userDisplayName: user?.displayName,
          userEmail: user?.email
        },
        itineraryData: data
      });
      throw error;
    }
  },

  /**
   * Get all itineraries for current user
   */
  async getUserItineraries(): Promise<Itinerary[]> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('📋 Fetching itineraries for user:', user.uid);

      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'itineraries'),
        where('userID', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} itinerary documents`);
      
      const itineraries: Itinerary[] = [];

      for (const docSnap of snapshot.docs) {
        try {
          const itineraryData = docSnap.data() as ItineraryFirebaseDoc;
          console.log('📋 Processing itinerary:', itineraryData.name);
          
          const items = await ItineraryService.getItineraryItems(docSnap.id);
          itineraries.push(convertFirebaseToItinerary(itineraryData, items));
        } catch (itemError) {
          console.warn('⚠️ Error loading itinerary items for:', docSnap.id, itemError);
          // Continue loading other itineraries even if one fails
        }
      }

      // Sort by updatedAt on the client side
      itineraries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      console.log(`✅ Loaded ${itineraries.length} itineraries for user`);
      return itineraries;
    } catch (error) {
      console.error('❌ Error getting user itineraries:', error);
      
      // Check if it's a permissions error
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied. Please check your login status.');
        }
        if (error.message.includes('index') || error.message.includes('requires an index')) {
          throw new Error('Database configuration issue. Please try again.');
        }
      }
      
      throw error;
    }
  },

  /**
   * Get a specific itinerary by ID
   */
  async getItinerary(itineraryId: string): Promise<Itinerary | null> {
    try {
      const docSnap = await getDoc(doc(db, 'itineraries', itineraryId));
      
      if (!docSnap.exists()) {
        return null;
      }

      const itineraryData = docSnap.data() as ItineraryFirebaseDoc;
      const items = await ItineraryService.getItineraryItems(itineraryId);
      
      return convertFirebaseToItinerary(itineraryData, items);
    } catch (error) {
      console.error('❌ Error getting itinerary:', error);
      throw error;
    }
  },

  /**
   * Get a public itinerary by shareable link
   */
  async getPublicItinerary(shareableLink: string): Promise<PublicItinerary | null> {
    try {
      const q = query(
        collection(db, 'itineraries'),
        where('shareableLink', '==', shareableLink),
        where('isPublic', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const docSnap = snapshot.docs[0];
      const itineraryData = docSnap.data() as ItineraryFirebaseDoc;
      const items = await ItineraryService.getItineraryItems(docSnap.id);

      return {
        id: itineraryData.id,
        name: itineraryData.name,
        description: itineraryData.description,
        username: itineraryData.username,
        items: items.map(item => ({
          id: item.id,
          vostcardID: item.vostcardID,
          type: item.type,
          order: item.order,
          title: item.title,
          description: item.description,
          photoURL: item.photoURL,
          latitude: item.latitude,
          longitude: item.longitude,
          username: item.username
        })),
        createdAt: itineraryData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: itineraryData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting public itinerary:', error);
      throw error;
    }
  },

  /**
   * Update an itinerary
   */
  async updateItinerary(itineraryId: string, data: UpdateItineraryData): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: Partial<ItineraryFirebaseDoc> = {
        ...data,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'itineraries', itineraryId), updateData);
      console.log('✅ Updated itinerary:', itineraryId);
    } catch (error) {
      console.error('❌ Error updating itinerary:', error);
      throw error;
    }
  },

  /**
   * Delete an itinerary and all its items
   */
  async deleteItinerary(itineraryId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const batch = writeBatch(db);

      // Delete all items first
      const itemsSnapshot = await getDocs(collection(db, 'itineraries', itineraryId, 'items'));
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete the itinerary document
      batch.delete(doc(db, 'itineraries', itineraryId));

      await batch.commit();
      console.log('✅ Deleted itinerary and all items:', itineraryId);
    } catch (error) {
      console.error('❌ Error deleting itinerary:', error);
      throw error;
    }
  },

  /**
   * Get all items in an itinerary
   */
  async getItineraryItems(itineraryId: string): Promise<ItineraryItem[]> {
    try {
      const q = query(
        collection(db, 'itineraries', itineraryId, 'items'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => 
        convertFirebaseToItineraryItem(doc.data() as ItineraryItemFirebaseDoc)
      );

      return items;
    } catch (error) {
      console.error('❌ Error getting itinerary items:', error);
      throw error;
    }
  },

  /**
   * Add an item to an itinerary
   */
  async addItemToItinerary(itineraryId: string, data: AddItemToItineraryData): Promise<ItineraryItem> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current items to determine next order
      const currentItems = await ItineraryService.getItineraryItems(itineraryId);
      const nextOrder = currentItems.length;

      const itemId = doc(collection(db, 'itineraries', itineraryId, 'items')).id;
      const now = Timestamp.now();

      // If cached data is missing, fetch it from the vostcard
      let title = data.title;
      let description = data.description;
      let photoURL = data.photoURL;
      let latitude = data.latitude;
      let longitude = data.longitude;
      let username = data.username;

      if (!title || !photoURL) {
        try {
          const vostcardDoc = await getDoc(doc(db, 'vostcards', data.vostcardID));
          if (vostcardDoc.exists()) {
            const vostcardData = vostcardDoc.data();
            title = title || vostcardData.title || 'Untitled';
            description = description || vostcardData.description;
            photoURL = photoURL || vostcardData.photoURL;
            latitude = latitude || vostcardData.latitude;
            longitude = longitude || vostcardData.longitude;
            username = username || vostcardData.username;
          }
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch vostcard data for caching:', fetchError);
          title = title || 'Untitled';
        }
      }

      const itemDoc: ItineraryItemFirebaseDoc = {
        id: itemId,
        vostcardID: data.vostcardID,
        type: data.type,
        order: nextOrder,
        addedAt: now,
        title: title || 'Untitled',
        description,
        photoURL,
        latitude,
        longitude,
        username
      };

      await setDoc(doc(db, 'itineraries', itineraryId, 'items', itemId), itemDoc);

      // Update itinerary's updatedAt timestamp
      await updateDoc(doc(db, 'itineraries', itineraryId), {
        updatedAt: now
      });

      console.log('✅ Added item to itinerary:', itemId);
      return convertFirebaseToItineraryItem(itemDoc);
    } catch (error) {
      console.error('❌ Error adding item to itinerary:', error);
      throw error;
    }
  },

  /**
   * Remove an item from an itinerary
   */
  async removeItemFromItinerary(itineraryId: string, itemId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await deleteDoc(doc(db, 'itineraries', itineraryId, 'items', itemId));

      // Update itinerary's updatedAt timestamp
      await updateDoc(doc(db, 'itineraries', itineraryId), {
        updatedAt: Timestamp.now()
      });

      console.log('✅ Removed item from itinerary:', itemId);
    } catch (error) {
      console.error('❌ Error removing item from itinerary:', error);
      throw error;
    }
  },

  /**
   * Reorder items in an itinerary
   */
  async reorderItineraryItems(itineraryId: string, itemIds: string[]): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const batch = writeBatch(db);

      itemIds.forEach((itemId, index) => {
        const itemRef = doc(db, 'itineraries', itineraryId, 'items', itemId);
        batch.update(itemRef, { order: index });
      });

      // Update itinerary's updatedAt timestamp
      const itineraryRef = doc(db, 'itineraries', itineraryId);
      batch.update(itineraryRef, { updatedAt: Timestamp.now() });

      await batch.commit();
      console.log('✅ Reordered itinerary items');
    } catch (error) {
      console.error('❌ Error reordering itinerary items:', error);
      throw error;
    }
  },

  /**
   * Listen to itinerary changes in real-time
   */
  listenToUserItineraries(callback: (itineraries: Itinerary[]) => void): () => void {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'itineraries'),
      where('userID', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      try {
        const itineraries: Itinerary[] = [];

        for (const docSnap of snapshot.docs) {
          const itineraryData = docSnap.data() as ItineraryFirebaseDoc;
          const items = await ItineraryService.getItineraryItems(docSnap.id);
          itineraries.push(convertFirebaseToItinerary(itineraryData, items));
        }

        callback(itineraries);
      } catch (error) {
        console.error('❌ Error in itinerary listener:', error);
      }
    });
  },

  /**
   * Listen to specific itinerary changes in real-time
   */
  listenToItinerary(itineraryId: string, callback: (itinerary: Itinerary | null) => void): () => void {
    return onSnapshot(doc(db, 'itineraries', itineraryId), async (docSnap) => {
      try {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }

        const itineraryData = docSnap.data() as ItineraryFirebaseDoc;
        const items = await ItineraryService.getItineraryItems(itineraryId);
        callback(convertFirebaseToItinerary(itineraryData, items));
      } catch (error) {
        console.error('❌ Error in itinerary listener:', error);
        callback(null);
      }
    });
  }
};