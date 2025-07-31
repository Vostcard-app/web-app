import { doc, collection, getDoc, getDocs, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';

export interface Rating {
  id: string;
  userID: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
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
    return this.submitItemRating('vostcards', vostcardID, rating);
  },

  /**
   * Submit or update a rating for a Tour
   * @param tourID - The ID of the Tour to rate
   * @param rating - The rating value (1-5)
   * @returns Promise<void>
   */
  async submitTourRating(tourID: string, rating: number): Promise<void> {
    return this.submitItemRating('tours', tourID, rating);
  },

  /**
   * Generic method to submit ratings for any item type
   * @param collection - The collection name ('vostcards' | 'tours')
   * @param itemID - The ID of the item to rate
   * @param rating - The rating value (1-5)
   * @returns Promise<void>
   */
  async submitItemRating(collectionName: string, itemID: string, rating: number): Promise<void> {
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
        const ratingDocRef = doc(db, collectionName, itemID, 'ratings', userID);
        const statsDocRef = doc(db, collectionName, itemID, 'ratingStats', 'summary');
        
        // Get current rating and stats
        const currentRatingDoc = await transaction.get(ratingDocRef);
        const currentStatsDoc = await transaction.get(statsDocRef);
        
        const isUpdate = currentRatingDoc.exists();
        const oldRating = isUpdate ? currentRatingDoc.data()?.rating || 0 : 0;
        
        // Update or create rating document
        const ratingData = {
          [collectionName.slice(0, -1) + 'ID']: itemID, // vostcardID or tourID
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
      
      console.log(`✅ Rating submitted: ${rating} stars for ${collectionName.slice(0, -1)} ${itemID}`);
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      throw error;
    }
  },

  /**
   * Remove a user's rating for a Vostcard
   * @param vostcardID - The ID of the Vostcard to remove rating from
   * @returns Promise<void>
   */
  async removeRating(vostcardID: string): Promise<void> {
    return this.removeItemRating('vostcards', vostcardID);
  },

  /**
   * Remove a user's rating for a Tour
   * @param tourID - The ID of the Tour to remove rating from
   * @returns Promise<void>
   */
  async removeTourRating(tourID: string): Promise<void> {
    return this.removeItemRating('tours', tourID);
  },

  /**
   * Generic method to remove ratings for any item type
   * @param collection - The collection name ('vostcards' | 'tours')
   * @param itemID - The ID of the item to remove rating from
   * @returns Promise<void>
   */
  async removeItemRating(collectionName: string, itemID: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userID = user.uid;
      
      await runTransaction(db, async (transaction) => {
        const ratingDocRef = doc(db, collectionName, itemID, 'ratings', userID);
        const statsDocRef = doc(db, collectionName, itemID, 'ratingStats', 'summary');
        
        // Get current rating and stats
        const currentRatingDoc = await transaction.get(ratingDocRef);
        const currentStatsDoc = await transaction.get(statsDocRef);
        
        if (!currentRatingDoc.exists()) {
          throw new Error('No rating found to remove');
        }
        
        const oldRating = currentRatingDoc.data()?.rating || 0;
        
        // Remove rating document
        transaction.delete(ratingDocRef);
        
        // Update stats
        const currentStats = currentStatsDoc.exists() ? currentStatsDoc.data() : {
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: new Date().toISOString()
        };
        
        const newRatingCount = Math.max(0, currentStats.ratingCount - 1);
        const newTotalRating = Math.max(0, (currentStats.averageRating * currentStats.ratingCount) - oldRating);
        const newAverageRating = newRatingCount > 0 ? newTotalRating / newRatingCount : 0;
        
        const newStats = {
          averageRating: newAverageRating,
          ratingCount: newRatingCount,
          lastUpdated: new Date().toISOString()
        };
        
        transaction.set(statsDocRef, newStats);
      });
      
      console.log(`✅ Rating removed for ${collectionName.slice(0, -1)} ${itemID}`);
    } catch (error) {
      console.error('❌ Error removing rating:', error);
      throw error;
    }
  },

  /**
   * Get rating statistics for a Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<RatingStats>
   */
  async getRatingStats(vostcardID: string): Promise<RatingStats> {
    return this.getItemRatingStats('vostcards', vostcardID);
  },

  /**
   * Get rating statistics for a Tour
   * @param tourID - The ID of the Tour
   * @returns Promise<RatingStats>
   */
  async getTourRatingStats(tourID: string): Promise<RatingStats> {
    return this.getItemRatingStats('tours', tourID);
  },

  /**
   * Generic method to get rating statistics for any item type
   * @param collection - The collection name ('vostcards' | 'tours')
   * @param itemID - The ID of the item
   * @returns Promise<RatingStats>
   */
  async getItemRatingStats(collectionName: string, itemID: string): Promise<RatingStats> {
    try {
      const statsDocRef = doc(db, collectionName, itemID, 'ratingStats', 'summary');
      const statsDoc = await getDoc(statsDocRef);
      
      if (statsDoc.exists()) {
        return statsDoc.data() as RatingStats;
      } else {
        return {
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('❌ Error fetching rating stats:', error);
      return {
        averageRating: 0,
        ratingCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  },

  /**
   * Get user's rating for a Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<number> - User's rating (0 if no rating)
   */
  async getUserRating(vostcardID: string): Promise<number> {
    return this.getUserItemRating('vostcards', vostcardID);
  },

  /**
   * Get user's rating for a Tour
   * @param tourID - The ID of the Tour
   * @returns Promise<number> - User's rating (0 if no rating)
   */
  async getUserTourRating(tourID: string): Promise<number> {
    return this.getUserItemRating('tours', tourID);
  },

  /**
   * Generic method to get user's rating for any item type
   * @param collection - The collection name ('vostcards' | 'tours')
   * @param itemID - The ID of the item
   * @returns Promise<number> - User's rating (0 if no rating)
   */
  async getUserItemRating(collectionName: string, itemID: string): Promise<number> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return 0;
      }

      const userID = user.uid;
      const ratingDocRef = doc(db, collectionName, itemID, 'ratings', userID);
      const ratingDoc = await getDoc(ratingDocRef);
      
      if (ratingDoc.exists()) {
        return ratingDoc.data()?.rating || 0;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('❌ Error fetching user rating:', error);
      return 0;
    }
  },

  /**
   * Get all ratings for a Vostcard
   * @param vostcardID - The ID of the Vostcard
   * @returns Promise<Rating[]>
   */
  async getAllRatings(vostcardID: string): Promise<Rating[]> {
    return this.getAllItemRatings('vostcards', vostcardID);
  },

  /**
   * Get all ratings for a Tour
   * @param tourID - The ID of the Tour
   * @returns Promise<Rating[]>
   */
  async getAllTourRatings(tourID: string): Promise<Rating[]> {
    return this.getAllItemRatings('tours', tourID);
  },

  /**
   * Generic method to get all ratings for any item type
   * @param collection - The collection name ('vostcards' | 'tours')
   * @param itemID - The ID of the item
   * @returns Promise<Rating[]>
   */
  async getAllItemRatings(collectionName: string, itemID: string): Promise<Rating[]> {
    try {
      const ratingsRef = collection(db, collectionName, itemID, 'ratings');
      const snapshot = await getDocs(ratingsRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Rating[];
    } catch (error) {
      console.error('❌ Error fetching all ratings:', error);
      return [];
    }
  }
}; 