import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, query, where, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase/firebaseConfig';

export interface Like {
  vostcardID: string;
  userID: string;
  createdAt: string;
}

export interface LikeCount {
  vostcardID: string;
  count: number;
  lastUpdated: string;
}

export const LikeService = {
  /**
   * Toggle like/unlike for a Vostcard
   * @param vostcardID - The ID of the Vostcard to like/unlike
   * @returns Promise<boolean> - true if liked, false if unliked
   */
  async toggleLike(vostcardID: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userID = user.uid;
      const likeDocRef = doc(db, 'users', userID, 'likes', vostcardID);
      const vostcardLikeCountRef = doc(db, 'vostcards', vostcardID, 'likeCount', 'count');

      // Check if already liked
      const likeDoc = await getDoc(likeDocRef);
      const isCurrentlyLiked = likeDoc.exists();

      if (isCurrentlyLiked) {
        // Unlike: Remove like document and decrement count
        await deleteDoc(likeDocRef);
        await updateDoc(vostcardLikeCountRef, {
          count: increment(-1),
          lastUpdated: new Date().toISOString()
        });
        console.log('✅ Unliked Vostcard:', vostcardID);
        return false;
      } else {
        // Like: Add like document and increment count
        await setDoc(likeDocRef, {
          vostcardID,
          userID,
          createdAt: new Date().toISOString()
        });
        
        // Initialize or update like count
        await setDoc(vostcardLikeCountRef, {
          count: increment(1),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Liked Vostcard:', vostcardID);
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      throw error;
    }
  },

  /**
   * Check if current user has liked a Vostcard
   * @param vostcardID - The ID of the Vostcard to check
   * @returns Promise<boolean> - true if liked, false if not
   */
  async isLiked(vostcardID: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return false;
      }

      const userID = user.uid;
      const likeDocRef = doc(db, 'users', userID, 'likes', vostcardID);
      const likeDoc = await getDoc(likeDocRef);
      
      return likeDoc.exists();
    } catch (error) {
      console.error('❌ Error checking like status:', error);
      return false;
    }
  },

  /**
   * Get all Vostcards liked by the current user
   * @returns Promise<Like[]> - Array of liked Vostcards
   */
  async fetchLikedVostcards(): Promise<Like[]> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userID = user.uid;
      const likesCollectionRef = collection(db, 'users', userID, 'likes');
      const querySnapshot = await getDocs(likesCollectionRef);

      const likedVostcards: Like[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        likedVostcards.push({
          vostcardID: doc.id,
          userID: data.userID,
          createdAt: data.createdAt
        });
      });

      console.log('✅ Fetched liked Vostcards:', likedVostcards.length);
      return likedVostcards;
    } catch (error) {
      console.error('❌ Error fetching liked Vostcards:', error);
      throw error;
    }
  },

  /**
   * Get like count for a specific Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<number> - The like count
   */
  async getLikeCount(vostcardID: string): Promise<number> {
    try {
      const likeCountDocRef = doc(db, 'vostcards', vostcardID, 'likeCount', 'count');
      const likeCountDoc = await getDoc(likeCountDocRef);
      
      if (likeCountDoc.exists()) {
        return likeCountDoc.data().count || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Error fetching like count:', error);
      return 0;
    }
  },

  /**
   * Set up real-time listener for like count changes
   * @param vostcardID - The ID of the Vostcard to monitor
   * @param callback - Function to call when like count changes
   * @returns Function to unsubscribe from the listener
   */
  listenToLikeCount(vostcardID: string, callback: (count: number) => void): () => void {
    try {
      const likeCountDocRef = doc(db, 'vostcards', vostcardID, 'likeCount', 'count');
      
      const unsubscribe = onSnapshot(likeCountDocRef, (doc) => {
        if (doc.exists()) {
          const count = doc.data().count || 0;
          callback(count);
        } else {
          callback(0);
        }
      }, (error) => {
        console.error('❌ Error in like count listener:', error);
        callback(0);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up like count listener:', error);
      return () => {}; // Return empty function if setup fails
    }
  },

  /**
   * Set up real-time listener for user's like status changes
   * @param vostcardID - The ID of the Vostcard to monitor
   * @param callback - Function to call when like status changes
   * @returns Function to unsubscribe from the listener
   */
  listenToLikeStatus(vostcardID: string, callback: (isLiked: boolean) => void): () => void {
    try {
      const user = auth.currentUser;
      if (!user) {
        callback(false);
        return () => {};
      }

      const userID = user.uid;
      const likeDocRef = doc(db, 'users', userID, 'likes', vostcardID);
      
      const unsubscribe = onSnapshot(likeDocRef, (doc) => {
        callback(doc.exists());
      }, (error) => {
        console.error('❌ Error in like status listener:', error);
        callback(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up like status listener:', error);
      return () => {}; // Return empty function if setup fails
    }
  }
}; 