import { db } from '../firebase/firebaseConfig';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import type { Tour, TourPost } from '../types/TourTypes';

export const TourService = {
  async getTourPosts(tour: Tour): Promise<TourPost[]> {
    try {
      const posts: TourPost[] = [];
      
      // Query vostcards collection for all posts in the tour
      const q = query(
        collection(db, 'vostcards'),
        where('id', 'in', tour.postIds)
      );
      
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
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