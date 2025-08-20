import { db } from '../firebase/firebaseConfig';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  addDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import type { Tour, TourPost } from '../types/TourTypes';

export const TourService = {
  async getToursByCreator(creatorId: string): Promise<Tour[]> {
    try {
      console.log('🔍 Loading tours for creator:', creatorId);
      const toursRef = collection(db, 'tours');
      const q = query(
        toursRef,
        where('creatorId', '==', creatorId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const tours = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as Tour;
      });
      
      console.log('✅ Loaded tours:', tours);
      return tours;
    } catch (error) {
      console.error('❌ Error loading tours:', error);
      throw error;
    }
  },

  async createTour(creatorId: string, data: {
    name: string;
    description?: string;
    postIds: string[];
    isPublic?: boolean;
    isShareable?: boolean;
  }): Promise<Tour> {
    try {
      console.log('📝 Creating new tour:', creatorId, data);
      const toursRef = collection(db, 'tours');
      const tourData = {
        ...data,
        creatorId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isPublic: data.isPublic ?? false,
        isShareable: data.isShareable ?? false
      };
      
      const docRef = await addDoc(toursRef, tourData);
      console.log('✅ Tour created with ID:', docRef.id);
      
      return {
        id: docRef.id,
        ...tourData
      } as Tour;
    } catch (error) {
      console.error('❌ Error creating tour:', error);
      throw error;
    }
  },

  async updateTour(tourId: string, data: Partial<Tour>): Promise<Tour> {
    try {
      console.log('📝 Updating tour:', tourId, data);
      const tourRef = doc(db, 'tours', tourId);
      
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(tourRef, updateData);
      
      // Get the updated tour
      const updatedDoc = await getDoc(tourRef);
      if (!updatedDoc.exists()) {
        throw new Error('Tour not found after update');
      }
      
      const tourData = updatedDoc.data();
      console.log('✅ Tour updated successfully');
      
      return {
        id: updatedDoc.id,
        ...tourData,
        createdAt: tourData.createdAt?.toDate(),
        updatedAt: tourData.updatedAt?.toDate()
      } as Tour;
    } catch (error) {
      console.error('❌ Error updating tour:', error);
      throw error;
    }
  },

  async deleteTour(tourId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting tour:', tourId);
      const tourRef = doc(db, 'tours', tourId);
      await deleteDoc(tourRef);
      console.log('✅ Tour deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting tour:', error);
      throw error;
    }
  },

  async getPublicToursByCreator(creatorId: string): Promise<Tour[]> {
    try {
      console.log('🔍 Loading public tours for creator:', creatorId);
      const toursRef = collection(db, 'tours');
      const q = query(
        toursRef,
        where('creatorId', '==', creatorId),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const tours = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as Tour;
      });
      
      console.log('✅ Loaded public tours:', tours);
      return tours;
    } catch (error) {
      console.error('❌ Error loading public tours:', error);
      throw error;
    }
  },

  async getTour(tourId: string): Promise<Tour | null> {
    try {
      console.log('🔍 Loading tour:', tourId);
      const tourRef = doc(db, 'tours', tourId);
      const tourDoc = await getDoc(tourRef);
      
      if (!tourDoc.exists()) {
        console.warn('❌ Tour not found:', tourId);
        return null;
      }
      
      const data = tourDoc.data();
      const tour = {
        id: tourDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Tour;
      
      console.log('✅ Loaded tour:', tour);
      return tour;
    } catch (error) {
      console.error('❌ Error loading tour:', error);
      throw error;
    }
  },

  async getTourPosts(tour: Tour): Promise<TourPost[]> {
    try {
      console.log('🎬 Loading tour posts for tour:', tour.name, 'with postIds:', tour.postIds);
      const posts: TourPost[] = [];
      
      // Get each vostcard by its document ID
      const vostcardPromises = tour.postIds.map(id => 
        getDoc(doc(db, 'vostcards', id))
      );
      
      const vostcardDocs = await Promise.all(vostcardPromises);
      
      vostcardDocs.forEach(doc => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Handle location data - check both direct fields and geo object
          let latitude = data.latitude;
          let longitude = data.longitude;
          
          if (!latitude && !longitude && data.geo) {
            latitude = data.geo.latitude;
            longitude = data.geo.longitude;
          }
          
          posts.push({
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description,
            photoURLs: data.photoURLs || (data.photoURL ? [data.photoURL] : []),
            videoURL: data.videoURL,
            latitude: latitude,
            longitude: longitude,
            createdAt: data.createdAt?.toDate(),
            username: data.username,
            state: data.state,
            isOffer: data.isOffer || false,
            isQuickcard: data.isQuickcard || false,
            userRole: data.userRole
          });
        } else {
          console.warn(`Vostcard ${doc.id} not found`);
        }
      });
      
      // Sort by the order in postIds array
      posts.sort((a, b) => {
        return tour.postIds.indexOf(a.id) - tour.postIds.indexOf(b.id);
      });
      
      console.log('✅ Loaded tour posts:', posts.length, 'posts');
      console.log('📍 Posts with location data:', posts.filter(p => p.latitude && p.longitude).length);
      
      return posts;
    } catch (error) {
      console.error('Error fetching tour posts:', error);
      throw error;
    }
  }
};