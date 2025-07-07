import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, query, updateDoc, increment, onSnapshot, runTransaction } from 'firebase/firestore';
import { auth } from '../firebase/firebaseConfig';

export interface Rating {
  vostcardID: string;
  userID: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  vostcardID: string;
  averageRating: number;
  ratingCount: number;
  lastUpdated: string;
}

export const RatingService = {
  /**
   * Submit or update a rating for a Vostcard
   * @param vostcardID - The ID of the Vostcard to rate
   * @param rating - The rating value (1-5)
   * @returns Promise<void>
   */
  async submitRating(vostcardID: string, rating: number): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const userID = user.uid;
      
      // Use a transaction to ensure consistency
      await runTransaction(db, async (transaction) => {
        const ratingDocRef = doc(db, 'vostcards', vostcardID, 'ratings', userID);
        const statsDocRef = doc(db, 'vostcards', vostcardID, 'ratingStats', 'summary');
        
        // Get current rating and stats
        const currentRatingDoc = await transaction.get(ratingDocRef);
        const currentStatsDoc = await transaction.get(statsDocRef);
        
        const isUpdate = currentRatingDoc.exists();
        const oldRating = isUpdate ? currentRatingDoc.data()?.rating || 0 : 0;
        
        // Update or create rating document
        const ratingData = {
          vostcardID,
          userID,
          rating,
          createdAt: isUpdate ? currentRatingDoc.data()?.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        transaction.set(ratingDocRef, ratingData);
        
        // Update stats
        const currentStats = currentStatsDoc.exists() ? currentStatsDoc.data() : {
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: new Date().toISOString()
        };
        
        let newRatingCount = currentStats.ratingCount;
        let newTotalRating = currentStats.averageRating * currentStats.ratingCount;
        
        if (isUpdate) {
          // Update existing rating
          newTotalRating = newTotalRating - oldRating + rating;
        } else {
          // New rating
          newRatingCount += 1;
          newTotalRating += rating;
        }
        
        const newAverageRating = newRatingCount > 0 ? newTotalRating / newRatingCount : 0;
        
        const newStats = {
          averageRating: newAverageRating,
          ratingCount: newRatingCount,
          lastUpdated: new Date().toISOString()
        };
        
        transaction.set(statsDocRef, newStats);
      });
      
      console.log(`✅ Rating submitted: ${rating} stars for Vostcard ${vostcardID}`);
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      throw error;
    }
  },

  /**
   * Get current user's rating for a Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<number> - The user's rating (0 if no rating)
   */
  async getCurrentUserRating(vostcardID: string): Promise<number> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return 0;
      }

      const userID = user.uid;
      const ratingDocRef = doc(db, 'vostcards', vostcardID, 'ratings', userID);
      const ratingDoc = await getDoc(ratingDocRef);
      
      if (ratingDoc.exists()) {
        return ratingDoc.data().rating || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Error fetching current user rating:', error);
      return 0;
    }
  },

  /**
   * Get rating statistics for a Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<RatingStats> - The rating statistics
   */
  async getRatingStats(vostcardID: string): Promise<RatingStats> {
    try {
      const statsDocRef = doc(db, 'vostcards', vostcardID, 'ratingStats', 'summary');
      const statsDoc = await getDoc(statsDocRef);
      
      if (statsDoc.exists()) {
        const data = statsDoc.data();
        return {
          vostcardID,
          averageRating: data.averageRating || 0,
          ratingCount: data.ratingCount || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        };
      }
      
      return {
        vostcardID,
        averageRating: 0,
        ratingCount: 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching rating stats:', error);
      return {
        vostcardID,
        averageRating: 0,
        ratingCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  },

  /**
   * Get all ratings for a Vostcard (for admin purposes)
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<Rating[]> - Array of all ratings
   */
  async getAllRatings(vostcardID: string): Promise<Rating[]> {
    try {
      const ratingsCollectionRef = collection(db, 'vostcards', vostcardID, 'ratings');
      const querySnapshot = await getDocs(ratingsCollectionRef);

      const ratings: Rating[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ratings.push({
          vostcardID: data.vostcardID,
          userID: data.userID,
          rating: data.rating,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      return ratings;
    } catch (error) {
      console.error('❌ Error fetching all ratings:', error);
      return [];
    }
  },

  /**
   * Set up real-time listener for rating stats changes
   * @param vostcardID - The ID of the Vostcard to monitor
   * @param callback - Function to call when rating stats change
   * @returns Function to unsubscribe from the listener
   */
  listenToRatingStats(vostcardID: string, callback: (stats: RatingStats) => void): () => void {
    try {
      const statsDocRef = doc(db, 'vostcards', vostcardID, 'ratingStats', 'summary');
      
      const unsubscribe = onSnapshot(statsDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          callback({
            vostcardID,
            averageRating: data.averageRating || 0,
            ratingCount: data.ratingCount || 0,
            lastUpdated: data.lastUpdated || new Date().toISOString()
          });
        } else {
          callback({
            vostcardID,
            averageRating: 0,
            ratingCount: 0,
            lastUpdated: new Date().toISOString()
          });
        }
      }, (error) => {
        console.error('❌ Error in rating stats listener:', error);
        callback({
          vostcardID,
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: new Date().toISOString()
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up rating stats listener:', error);
      return () => {}; // Return empty function if setup fails
    }
  },

  /**
   * Set up real-time listener for user's rating changes
   * @param vostcardID - The ID of the Vostcard to monitor
   * @param callback - Function to call when user's rating changes
   * @returns Function to unsubscribe from the listener
   */
  listenToUserRating(vostcardID: string, callback: (rating: number) => void): () => void {
    try {
      const user = auth.currentUser;
      if (!user) {
        callback(0);
        return () => {};
      }

      const userID = user.uid;
      const ratingDocRef = doc(db, 'vostcards', vostcardID, 'ratings', userID);
      
      const unsubscribe = onSnapshot(ratingDocRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data().rating || 0);
        } else {
          callback(0);
        }
      }, (error) => {
        console.error('❌ Error in user rating listener:', error);
        callback(0);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up user rating listener:', error);
      return () => {}; // Return empty function if setup fails
    }
  }
}; 