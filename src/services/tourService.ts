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
  addDoc
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

  async createTour(data: {
    name: string;
    description?: string;
    creatorId: string;
    isPublic?: boolean;
  }): Promise<Tour> {
    try {
      console.log('📝 Creating new tour:', data);
      const toursRef = collection(db, 'tours');
      const tourData = {
        ...data,
        postIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isPublic: data.isPublic ?? false
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

  async getTourPosts(tour: Tour): Promise<TourPost[]> {
    try {
      const posts: TourPost[] = [];
      
      // Get each vostcard by its document ID
      const vostcardPromises = tour.postIds.map(id => 
        getDoc(doc(db, 'vostcards', id))
      );
      
      const vostcardDocs = await Promise.all(vostcardPromises);
      
      vostcardDocs.forEach(doc => {
        if (doc.exists()) {
          const data = doc.data();
          posts.push({
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description,
            photoURLs: data.photoURLs || [data.photoURL],
            videoURL: data.videoURL,
            latitude: data.latitude,
            longitude: data.longitude,
            createdAt: data.createdAt?.toDate(),
            username: data.username,
            state: data.state
          });
        } else {
          console.warn(`Vostcard ${doc.id} not found`);
        }
      });
      
      // Sort by the order in postIds array
      posts.sort((a, b) => {
        return tour.postIds.indexOf(a.id) - tour.postIds.indexOf(b.id);
      });
      
      return posts;
    } catch (error) {
      console.error('Error fetching tour posts:', error);
      throw error;
    }
  }
};