import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Tour, CreateTourData, UpdateTourData, TourPost } from '../types/TourTypes';

export class TourService {
  private static toursCollection = collection(db, 'tours');

  // Create a new tour
  static async createTour(creatorId: string, tourData: CreateTourData): Promise<string> {
    try {
      const tourDoc = await addDoc(this.toursCollection, {
        creatorId,
        name: tourData.name,
        description: tourData.description || '',
        postIds: tourData.postIds,
        isPublic: tourData.isPublic ?? true,
        isShareable: tourData.isShareable ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update with shareable URL after creation
      if (tourData.isShareable) {
        const shareableUrl = `${window.location.origin}/shared-trip/${tourDoc.id}`;
        await updateDoc(doc(this.toursCollection, tourDoc.id), {
          shareableUrl,
        });
      }

  
      return tourDoc.id;
    } catch (error) {
      console.error('❌ Error creating tour:', error);
      throw error;
    }
  }

  // Get a single tour by ID
  static async getTour(tourId: string): Promise<Tour | null> {
    try {
      const tourDoc = await getDoc(doc(this.toursCollection, tourId));
      
      if (tourDoc.exists()) {
        const data = tourDoc.data();
        return {
          id: tourDoc.id,
          creatorId: data.creatorId,
          name: data.name,
          description: data.description,
          postIds: data.postIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublic: data.isPublic ?? true,
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting tour:', error);
      throw error;
    }
  }

  // Get all tours by a creator
  static async getToursByCreator(creatorId: string): Promise<Tour[]> {
    try {
      const toursQuery = query(
        this.toursCollection,
        where('creatorId', '==', creatorId),
        orderBy('createdAt', 'desc')
      );
      
      const toursSnapshot = await getDocs(toursQuery);
      const tours: Tour[] = [];
      
      toursSnapshot.forEach((doc) => {
        const data = doc.data();
        tours.push({
          id: doc.id,
          creatorId: data.creatorId,
          name: data.name,
          description: data.description,
          postIds: data.postIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublic: data.isPublic ?? true,
        });
      });
      
      return tours;
    } catch (error) {
      console.error('❌ Error getting tours by creator:', error);
      throw error;
    }
  }

  // Get public tours by a creator (for other users to view)
  static async getPublicToursByCreator(creatorId: string): Promise<Tour[]> {
    try {
      const toursQuery = query(
        this.toursCollection,
        where('creatorId', '==', creatorId),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const toursSnapshot = await getDocs(toursQuery);
      const tours: Tour[] = [];
      
      toursSnapshot.forEach((doc) => {
        const data = doc.data();
        tours.push({
          id: doc.id,
          creatorId: data.creatorId,
          name: data.name,
          description: data.description,
          postIds: data.postIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublic: data.isPublic ?? true,
        });
      });
      
      return tours;
    } catch (error) {
      console.error('❌ Error getting public tours by creator:', error);
      throw error;
    }
  }

  // Update a tour
  static async updateTour(tourId: string, tourData: UpdateTourData): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (tourData.name !== undefined) updateData.name = tourData.name;
      if (tourData.description !== undefined) updateData.description = tourData.description;
      if (tourData.postIds !== undefined) updateData.postIds = tourData.postIds;
      if (tourData.isPublic !== undefined) updateData.isPublic = tourData.isPublic;
      
      await updateDoc(doc(this.toursCollection, tourId), updateData);
  
    } catch (error) {
      console.error('❌ Error updating tour:', error);
      throw error;
    }
  }

  // Delete a tour
  static async deleteTour(tourId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.toursCollection, tourId));
  
    } catch (error) {
      console.error('❌ Error deleting tour:', error);
      throw error;
    }
  }

  // Generate shareable URL for a tour
  static async generateShareableUrl(tourId: string): Promise<string> {
    try {
      const shareableUrl = `${window.location.origin}/shared-trip/${tourId}`;
      await updateDoc(doc(this.toursCollection, tourId), {
        isShareable: true,
        shareableUrl,
        updatedAt: serverTimestamp(),
      });
  
      return shareableUrl;
    } catch (error) {
      console.error('❌ Error generating shareable URL:', error);
      throw error;
    }
  }

  // Disable sharing for a tour
  static async disableSharing(tourId: string): Promise<void> {
    try {
      await updateDoc(doc(this.toursCollection, tourId), {
        isShareable: false,
        shareableUrl: null,
        updatedAt: serverTimestamp(),
      });
  
    } catch (error) {
      console.error('❌ Error disabling sharing:', error);
      throw error;
    }
  }

  // Get posts for a tour
  static async getTourPosts(tour: Tour): Promise<TourPost[]> {
    try {
      if (tour.postIds.length === 0) return [];
      
      const posts: TourPost[] = [];
      
      // Get posts from vostcards collection
      const vostcardsQuery = query(
        collection(db, 'vostcards'),
        where('__name__', 'in', tour.postIds)
      );
      
      const vostcardsSnapshot = await getDocs(vostcardsQuery);
      vostcardsSnapshot.forEach((doc) => {
        const data = doc.data();
                 posts.push({
           id: doc.id,
           title: data.title || 'Untitled',
           description: data.description,
           photoURLs: data.photoURLs,
           videoURL: data.videoURL,
           latitude: data.latitude,
           longitude: data.longitude,
           createdAt: data.createdAt?.toDate(),
           isQuickcard: data.isQuickcard,
           isOffer: data.isOffer,
           userRole: data.userRole,
           username: data.username,
           state: data.state,
         });
      });
      
      return posts;
    } catch (error) {
      console.error('❌ Error getting tour posts:', error);
      throw error;
    }
  }
} 