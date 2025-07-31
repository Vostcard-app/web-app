import { doc, collection, getDoc, getDocs, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';

export interface Review {
  id: string;
  tourId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  lastUpdated: string;
}

export const ReviewService = {
  /**
   * Submit a review for a tour
   * @param tourId - The ID of the tour
   * @param rating - The rating (1-5)
   * @param comment - The review text
   * @returns Promise<void>
   */
  async submitReview(tourId: string, rating: number, comment: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (!comment.trim()) {
        throw new Error('Review comment is required');
      }

      // Get user profile for username and avatar
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const reviewId = `${user.uid}_${Date.now()}`;
      const reviewData: Review = {
        id: reviewId,
        tourId,
        userId: user.uid,
        username: userData.username || 'Anonymous User',
        userAvatar: userData.avatarURL,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save the review
      await setDoc(doc(db, 'tours', tourId, 'reviews', reviewId), reviewData);

      console.log(`✅ Review submitted for tour ${tourId}`);
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      throw error;
    }
  },

  /**
   * Get all reviews for a tour
   * @param tourId - The ID of the tour
   * @param limitCount - Maximum number of reviews to fetch (default: 50)
   * @returns Promise<Review[]>
   */
  async getTourReviews(tourId: string, limitCount: number = 50): Promise<Review[]> {
    try {
      const reviewsQuery = query(
        collection(db, 'tours', tourId, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(reviewsQuery);
      
      return snapshot.docs.map(doc => doc.data() as Review);
    } catch (error) {
      console.error('❌ Error fetching tour reviews:', error);
      return [];
    }
  },

  /**
   * Get review summary statistics for a tour
   * @param tourId - The ID of the tour
   * @returns Promise<ReviewSummary>
   */
  async getReviewSummary(tourId: string): Promise<ReviewSummary> {
    try {
      const reviews = await this.getTourReviews(tourId);
      
      if (reviews.length === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      return {
        totalReviews: reviews.length,
        averageRating,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting review summary:', error);
      return {
        totalReviews: 0,
        averageRating: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  },

  /**
   * Check if user has already reviewed a tour
   * @param tourId - The ID of the tour
   * @returns Promise<boolean>
   */
  async hasUserReviewed(tourId: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const reviews = await this.getTourReviews(tourId);
      return reviews.some(review => review.userId === user.uid);
    } catch (error) {
      console.error('❌ Error checking if user has reviewed:', error);
      return false;
    }
  }
}; 