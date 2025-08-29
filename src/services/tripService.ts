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
  writeBatch,
  Timestamp,
  limit,
  deleteField
} from 'firebase/firestore';
import { auth } from '../firebase/firebaseConfig';
import type { 
  Trip, 
  TripItem, 
  CreateTripData, 
  UpdateTripData, 
  AddItemToTripData,
  TripFirebaseDoc,
  TripItemFirebaseDoc,
  PublicTrip,
  BackgroundMusic
} from '../types/TripTypes';

// Generate a unique shareable link ID
const generateShareableLink = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Convert Firebase document to Trip object
const convertFirebaseToTrip = (doc: TripFirebaseDoc, items: TripItem[]): Trip => {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    userID: doc.userID,
    username: doc.username,
    items: items, // Let views handle sorting by vostcard creation date
    isPrivate: doc.isPrivate,
    shareableLink: doc.shareableLink,
    createdAt: doc.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    backgroundMusic: doc.backgroundMusic
  };
};

// Convert Firebase document to TripItem object
const convertFirebaseToTripItem = (doc: TripItemFirebaseDoc): TripItem => {
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
    longitude: doc.longitude
  };
};

// Verify that a vostcard/quickcard belongs to the current user
const verifyUserOwnsContent = async (vostcardID: string, userID: string): Promise<boolean> => {
  try {
    const vostcardDoc = await getDoc(doc(db, 'vostcards', vostcardID));
    if (vostcardDoc.exists()) {
      const vostcardData = vostcardDoc.data();
      return vostcardData.userID === userID;
    }
    return false;
  } catch (error) {
    console.error('Error verifying content ownership:', error);
    return false;
  }
};

export const TripService = {
  /**
   * Create a new trip (personal collection)
   */
  async createTrip(data: CreateTripData): Promise<Trip> {
    const user = auth.currentUser;
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tripId = doc(collection(db, 'trips')).id;
      const now = Timestamp.now();
      const shareableLink = data.isPrivate === false ? generateShareableLink() : undefined;

      // Create trip document
      const tripDoc: TripFirebaseDoc = {
        id: tripId,
        name: data.name,
        description: data.description,
        userID: user.uid,
        username: user.displayName || 'Anonymous',
        isPrivate: data.isPrivate !== false, // Default to private
        createdAt: now,
        updatedAt: now,
        ...(shareableLink && { shareableLink }) // Only include if not undefined
      };

      await setDoc(doc(db, 'trips', tripId), tripDoc);

      let items: TripItem[] = [];

      // Add first item if provided (must be user's own content)
      if (data.firstItem) {
        const ownsContent = await verifyUserOwnsContent(data.firstItem.vostcardID, user.uid);
        if (!ownsContent) {
          throw new Error('Cannot add content that does not belong to you to a trip');
        }

        const itemData: AddItemToTripData = {
          vostcardID: data.firstItem.vostcardID,
          type: data.firstItem.type
        };
        const firstItem = await TripService.addItemToTrip(tripId, itemData);
        items = [firstItem];
      }

      console.log('✅ Created trip:', tripId);
      return convertFirebaseToTrip(tripDoc, items);
    } catch (error) {
      console.error('❌ Error creating trip:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        userData: {
          userId: user?.uid,
          userDisplayName: user?.displayName,
          userEmail: user?.email
        },
        tripData: data
      });
      throw error;
    }
  },

  /**
   * Get all trips for current user
   */
  async getUserTrips(): Promise<Trip[]> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('📋 Fetching trips for user:', user.uid);

      const q = query(
        collection(db, 'trips'),
        where('userID', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      console.log(`📋 Found ${snapshot.docs.length} trip documents`);
      
      const trips: Trip[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const tripData = docSnapshot.data() as TripFirebaseDoc;
        const items = await TripService.getTripItems(docSnapshot.id);
        trips.push(convertFirebaseToTrip(tripData, items));
      }

      // Sort by creation date (newest first)
      trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log(`✅ Loaded ${trips.length} trips for user`);
      return trips;
    } catch (error) {
      console.error('❌ Error fetching user trips:', error);
      throw error;
    }
  },

  /**
   * Get a specific trip by ID (only if user owns it)
   */
  async getTripById(tripId: string): Promise<Trip | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tripDoc = await getDoc(doc(db, 'trips', tripId));
      
      if (!tripDoc.exists()) {
        return null;
      }

      const tripData = tripDoc.data() as TripFirebaseDoc;
      
      // Verify user owns this trip OR trip is public/shared
      if (tripData.userID !== user.uid && tripData.isPrivate !== false) {
        throw new Error('Access denied: Trip does not belong to current user and is not shared');
      }

      const items = await TripService.getTripItems(tripId);
      return convertFirebaseToTrip(tripData, items);
    } catch (error) {
      console.error('❌ Error fetching trip:', error);
      throw error;
    }
  },

  /**
   * Get all items for a specific trip
   */
  async getTripItems(tripId: string): Promise<TripItem[]> {
    try {
      const q = query(
        collection(db, 'trips', tripId, 'items'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const items: TripItem[] = [];

      snapshot.forEach((doc) => {
        const itemData = doc.data() as TripItemFirebaseDoc;
        items.push(convertFirebaseToTripItem(itemData));
      });

      return items;
    } catch (error) {
      console.error('❌ Error fetching trip items:', error);
      throw error;
    }
  },

  /**
   * Add an item to a trip (must be user's own content)
   */
  async addItemToTrip(tripId: string, data: AddItemToTripData): Promise<TripItem> {
    try {
      console.log('🎯 addItemToTrip called with data:', {
        vostcardID: data.vostcardID,
        type: data.type,
        title: data.title,
        photoURL: data.photoURL,
        hasPhotoURL: !!data.photoURL,
        photoURLValue: data.photoURL
      });
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the trip
      const trip = await TripService.getTripById(tripId);
      if (!trip) {
        throw new Error('Trip not found or access denied');
      }

      // Note: Allow adding any accessible content (both owned and public posts)
      // Users can add both their own posts and other users' public posts to their trips

      // Get current items to determine next order
      const currentItems = await TripService.getTripItems(tripId);
      const nextOrder = currentItems.length;

      const itemId = doc(collection(db, 'trips', tripId, 'items')).id;
      const now = Timestamp.now();

      // If cached data is missing, fetch it from the vostcard
      let title = data.title;
      let description = data.description;
      let photoURL = data.photoURL;
      let latitude = data.latitude;
      let longitude = data.longitude;
      
      console.log('🔍 Initial values before fetch:', { title, photoURL, needsFetch: !title || !photoURL });

      if (!title || !photoURL) {
        try {
          console.log('🔍 Fetching vostcard data for item:', data.vostcardID);
          const vostcardDoc = await getDoc(doc(db, 'vostcards', data.vostcardID));
          if (vostcardDoc.exists()) {
            const vostcardData = vostcardDoc.data();
            console.log('📸 Vostcard data:', {
              title: vostcardData.title,
              photoURLs: vostcardData.photoURLs,
              photoURL: vostcardData.photoURL,
              hasPhotoURLs: !!vostcardData.photoURLs,
              photoURLsLength: vostcardData.photoURLs?.length
            });
            title = title || vostcardData.title || 'Untitled';
            description = description || vostcardData.description;
            // Get first photo from photoURLs array
            photoURL = photoURL || (vostcardData.photoURLs && vostcardData.photoURLs[0]) || vostcardData.photoURL;
            latitude = latitude || vostcardData.latitude;
            longitude = longitude || vostcardData.longitude;
            console.log('✅ Final photoURL for trip item:', photoURL);
          } else {
            console.warn('⚠️ Vostcard document does not exist:', data.vostcardID);
          }
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch vostcard data for caching:', fetchError);
          title = title || 'Untitled';
        }
      }

      const itemDoc: TripItemFirebaseDoc = {
        id: itemId,
        vostcardID: data.vostcardID,
        type: data.type,
        order: nextOrder,
        addedAt: now,
        title: title || 'Untitled',
        description,
        photoURL,
        latitude,
        longitude
      };

      console.log('💾 Saving trip item with data:', {
        id: itemId,
        title: itemDoc.title,
        photoURL: itemDoc.photoURL,
        photoURLType: typeof itemDoc.photoURL
      });

      await setDoc(doc(db, 'trips', tripId, 'items', itemId), itemDoc);

      // Update trip's updatedAt timestamp
      await updateDoc(doc(db, 'trips', tripId), {
        updatedAt: now
      });

      console.log('✅ Added item to trip:', itemId);
      return convertFirebaseToTripItem(itemDoc);
    } catch (error) {
      console.error('❌ Error adding item to trip:', error);
      throw error;
    }
  },

  /**
   * Remove an item from a trip
   */
  async removeItemFromTrip(tripId: string, itemId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the trip
      const trip = await TripService.getTripById(tripId);
      if (!trip) {
        throw new Error('Trip not found or access denied');
      }

      await deleteDoc(doc(db, 'trips', tripId, 'items', itemId));

      // Update trip's updatedAt timestamp
      await updateDoc(doc(db, 'trips', tripId), {
        updatedAt: Timestamp.now()
      });

      console.log('✅ Removed item from trip:', itemId);
    } catch (error) {
      console.error('❌ Error removing item from trip:', error);
      throw error;
    }
  },

  /**
   * Update trip details
   */
  async updateTrip(tripId: string, data: UpdateTripData): Promise<Trip> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the trip
      const existingTrip = await TripService.getTripById(tripId);
      if (!existingTrip) {
        throw new Error('Trip not found or access denied');
      }

      const updateData: Partial<TripFirebaseDoc> = {
        updatedAt: Timestamp.now()
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isPrivate !== undefined) {
        updateData.isPrivate = data.isPrivate;
        // Add or remove shareable link based on privacy setting
        if (data.isPrivate) {
          updateData.shareableLink = deleteField();
        } else if (!existingTrip.shareableLink) {
          updateData.shareableLink = generateShareableLink();
        }
      }

      // Background music updates
      if (data.backgroundMusic !== undefined) {
        if (data.backgroundMusic === null) {
          // remove field
          (updateData as any).backgroundMusic = deleteField();
        } else {
          (updateData as any).backgroundMusic = data.backgroundMusic as BackgroundMusic;
        }
      }

      await updateDoc(doc(db, 'trips', tripId), updateData);

      // Return updated trip
      const updatedTrip = await TripService.getTripById(tripId);
      console.log('✅ Updated trip:', tripId);
      return updatedTrip!;
    } catch (error) {
      console.error('❌ Error updating trip:', error);
      throw error;
    }
  },

  /**
   * Delete a trip and all its items
   */
  async deleteTrip(tripId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the trip
      const trip = await TripService.getTripById(tripId);
      if (!trip) {
        throw new Error('Trip not found or access denied');
      }

      const batch = writeBatch(db);

      // Delete all items in the trip
      const items = await TripService.getTripItems(tripId);
      items.forEach((item) => {
        batch.delete(doc(db, 'trips', tripId, 'items', item.id));
      });

      // Delete the trip document
      batch.delete(doc(db, 'trips', tripId));

      await batch.commit();

      console.log('✅ Deleted trip:', tripId);
    } catch (error) {
      console.error('❌ Error deleting trip:', error);
      throw error;
    }
  }
};