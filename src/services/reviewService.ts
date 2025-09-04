import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  GuideReview, 
  TourCompletion, 
  ReviewStats, 
  CreateReviewRequest, 
  GuideConfirmationRequest,
  BookingStatus
} from '../types/ReviewTypes';

export class ReviewService {
  
  // ==================== TOUR COMPLETION & GUIDE CONFIRMATION ====================
  
  /**
   * Mark a tour as completed by the system (after tour end time)
   */
  static async markTourCompleted(bookingId: string, guideId: string, travelerId: string, tourId: string): Promise<string> {
    try {
      const completionData: Omit<TourCompletion, 'id'> = {
        bookingId,
        guideId,
        travelerId,
        tourId,
        completedAt: new Date().toISOString(),
        status: 'completed',
        reviewRemindersSent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'tourCompletions'), completionData);
      
      // Update booking status
      await this.updateBookingStatus(bookingId, 'completed', 'system');
      
      console.log('✅ Tour marked as completed:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error marking tour as completed:', error);
      throw error;
    }
  }

  /**
   * Guide confirms tour was delivered
   */
  static async confirmTourDelivery(completionId: string, confirmationRequest: GuideConfirmationRequest): Promise<void> {
    try {
      const completionRef = doc(db, 'tourCompletions', completionId);
      const completionDoc = await getDoc(completionRef);
      
      if (!completionDoc.exists()) {
        throw new Error('Tour completion not found');
      }

      const completion = completionDoc.data() as TourCompletion;
      
      // Update completion with guide confirmation
      await updateDoc(completionRef, {
        guideConfirmedAt: new Date().toISOString(),
        guideConfirmationNotes: confirmationRequest.confirmationNotes || '',
        status: 'guide_confirmed',
        updatedAt: new Date().toISOString()
      });

      // Send review email to traveler
      await this.sendReviewEmail(completion.travelerId, completion.guideId, completion.tourId, completion.bookingId);
      
      console.log('✅ Tour delivery confirmed by guide');
    } catch (error) {
      console.error('❌ Error confirming tour delivery:', error);
      throw error;
    }
  }

  // ==================== EMAIL SYSTEM ====================

  /**
   * Send review prompt email to traveler
   */
  static async sendReviewEmail(travelerId: string, guideId: string, tourId: string, bookingId: string): Promise<void> {
    try {
      // Get traveler and guide info
      const [travelerDoc, guideDoc, tourDoc] = await Promise.all([
        getDoc(doc(db, 'users', travelerId)),
        getDoc(doc(db, 'users', guideId)),
        getDoc(doc(db, 'guidedTours', tourId))
      ]);

      if (!travelerDoc.exists() || !guideDoc.exists() || !tourDoc.exists()) {
        throw new Error('Required data not found for email');
      }

      const traveler = travelerDoc.data();
      const guide = guideDoc.data();
      const tour = tourDoc.data();

      const reviewLink = `${window.location.origin}/review-guide/${bookingId}`;
      
      const emailData = {
        to: traveler.email,
        subject: `How was your tour with ${guide.name || guide.displayName || guide.username}?`,
        html: this.generateReviewEmailHTML({
          travelerName: traveler.name || traveler.displayName || traveler.username,
          guideName: guide.name || guide.displayName || guide.username,
          tourName: tour.name,
          tourDate: new Date().toLocaleDateString(), // You might want to get actual tour date
          reviewLink
        }),
        text: this.generateReviewEmailText({
          travelerName: traveler.name || traveler.displayName || traveler.username,
          guideName: guide.name || guide.displayName || guide.username,
          tourName: tour.name,
          tourDate: new Date().toLocaleDateString(),
          reviewLink
        })
      };

      // Store email record
      await addDoc(collection(db, 'reviewEmails'), {
        travelerId,
        guideId,
        tourId,
        bookingId,
        emailData,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });

      // Update completion status
      const completionQuery = query(
        collection(db, 'tourCompletions'),
        where('bookingId', '==', bookingId)
      );
      const completionDocs = await getDocs(completionQuery);
      
      if (!completionDocs.empty) {
        const completionDoc = completionDocs.docs[0];
        await updateDoc(completionDoc.ref, {
          reviewEmailSentAt: new Date().toISOString(),
          status: 'review_sent',
          updatedAt: new Date().toISOString()
        });
      }

      console.log('✅ Review email sent to traveler');
      
      // TODO: Integrate with actual email service (SendGrid, etc.)
      console.log('📧 Email would be sent:', emailData);
      
    } catch (error) {
      console.error('❌ Error sending review email:', error);
      throw error;
    }
  }

  // ==================== REVIEW CREATION ====================

  /**
   * Create a new review (only after guide confirmation)
   */
  static async createReview(reviewRequest: CreateReviewRequest, travelerId: string): Promise<string> {
    try {
      // Verify guide has confirmed the tour
      const completionQuery = query(
        collection(db, 'tourCompletions'),
        where('bookingId', '==', reviewRequest.bookingId),
        where('status', 'in', ['guide_confirmed', 'review_sent'])
      );
      
      const completionDocs = await getDocs(completionQuery);
      
      if (completionDocs.empty) {
        throw new Error('Tour not confirmed by guide yet. Cannot submit review.');
      }

      const completion = completionDocs.docs[0].data() as TourCompletion;
      
      // Check if review already exists
      const existingReviewQuery = query(
        collection(db, 'guideReviews'),
        where('bookingId', '==', reviewRequest.bookingId)
      );
      
      const existingReviews = await getDocs(existingReviewQuery);
      if (!existingReviews.empty) {
        throw new Error('Review already exists for this booking');
      }

      // Create review
      const reviewData: Omit<GuideReview, 'id'> = {
        bookingId: reviewRequest.bookingId,
        guideId: completion.guideId,
        travelerId,
        tourId: completion.tourId,
        rating: reviewRequest.rating,
        title: reviewRequest.title,
        comment: reviewRequest.comment,
        ratings: reviewRequest.ratings,
        wouldRecommend: reviewRequest.wouldRecommend,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerified: true, // Verified because guide confirmed
        isPublic: true,
        moderationStatus: 'approved' // Auto-approve verified reviews
      };

      const reviewRef = await addDoc(collection(db, 'guideReviews'), reviewData);
      
      // Update completion status
      await updateDoc(completionDocs.docs[0].ref, {
        reviewId: reviewRef.id,
        status: 'review_completed',
        updatedAt: new Date().toISOString()
      });

      // Update guide's review stats
      await this.updateGuideReviewStats(completion.guideId);
      
      console.log('✅ Review created successfully:', reviewRef.id);
      return reviewRef.id;
      
    } catch (error) {
      console.error('❌ Error creating review:', error);
      throw error;
    }
  }

  // ==================== REVIEW STATS ====================

  /**
   * Update guide's aggregated review statistics
   */
  static async updateGuideReviewStats(guideId: string): Promise<void> {
    try {
      const reviewsQuery = query(
        collection(db, 'guideReviews'),
        where('guideId', '==', guideId),
        where('isPublic', '==', true),
        where('moderationStatus', '==', 'approved')
      );
      
      const reviewDocs = await getDocs(reviewsQuery);
      const reviews = reviewDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuideReview));
      
      if (reviews.length === 0) {
        return;
      }

      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(review => {
        ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++;
      });

      const categoryAverages = {
        communication: reviews.reduce((sum, r) => sum + r.ratings.communication, 0) / totalReviews,
        knowledge: reviews.reduce((sum, r) => sum + r.ratings.knowledge, 0) / totalReviews,
        punctuality: reviews.reduce((sum, r) => sum + r.ratings.punctuality, 0) / totalReviews,
        friendliness: reviews.reduce((sum, r) => sum + r.ratings.friendliness, 0) / totalReviews,
        overall: reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / totalReviews
      };

      const statsData: ReviewStats = {
        guideId,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingBreakdown,
        categoryAverages,
        lastUpdated: new Date().toISOString()
      };

      // Upsert stats document
      const statsRef = doc(db, 'guideReviewStats', guideId);
      await updateDoc(statsRef, statsData).catch(async () => {
        // Document doesn't exist, create it
        await addDoc(collection(db, 'guideReviewStats'), { id: guideId, ...statsData });
      });

      console.log('✅ Guide review stats updated');
      
    } catch (error) {
      console.error('❌ Error updating guide review stats:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Update booking status
   */
  static async updateBookingStatus(bookingId: string, status: BookingStatus['status'], updatedBy: string, notes?: string): Promise<void> {
    try {
      const statusData: Omit<BookingStatus, 'id'> = {
        bookingId,
        status,
        updatedAt: new Date().toISOString(),
        updatedBy,
        notes
      };

      await addDoc(collection(db, 'bookingStatuses'), statusData);
      
      // Also update the main booking document
      const bookingRef = doc(db, 'tourBookings', bookingId);
      await updateDoc(bookingRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Get guide's reviews
   */
  static async getGuideReviews(guideId: string, limitCount: number = 10): Promise<GuideReview[]> {
    try {
      const reviewsQuery = query(
        collection(db, 'guideReviews'),
        where('guideId', '==', guideId),
        where('isPublic', '==', true),
        where('moderationStatus', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const reviewDocs = await getDocs(reviewsQuery);
      return reviewDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuideReview));
      
    } catch (error) {
      console.error('❌ Error fetching guide reviews:', error);
      throw error;
    }
  }

  /**
   * Get guide's review stats
   */
  static async getGuideReviewStats(guideId: string): Promise<ReviewStats | null> {
    try {
      const statsRef = doc(db, 'guideReviewStats', guideId);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        return { id: statsDoc.id, ...statsDoc.data() } as ReviewStats;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching guide review stats:', error);
      throw error;
    }
  }

  /**
   * Check if traveler can review (guide has confirmed)
   */
  static async canTravelerReview(bookingId: string, travelerId: string): Promise<boolean> {
    try {
      const completionQuery = query(
        collection(db, 'tourCompletions'),
        where('bookingId', '==', bookingId),
        where('travelerId', '==', travelerId),
        where('status', 'in', ['guide_confirmed', 'review_sent'])
      );
      
      const completionDocs = await getDocs(completionQuery);
      return !completionDocs.empty;
      
    } catch (error) {
      console.error('❌ Error checking review eligibility:', error);
      return false;
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  private static generateReviewEmailHTML(variables: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>How was your tour experience?</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #134369; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Vostcard</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">How was your tour experience?</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${variables.travelerName},</p>
            
            <p>We hope you had an amazing time on your <strong>${variables.tourName}</strong> tour with ${variables.guideName} on ${variables.tourDate}!</p>
            
            <p>Your guide has confirmed that the tour was completed. We'd love to hear about your experience to help other travelers and support our guide community.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${variables.reviewLink}" style="background: #134369; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Leave Your Review
              </a>
            </div>
            
            <p>Your review helps:</p>
            <ul>
              <li>Other travelers make informed decisions</li>
              <li>Guides improve their services</li>
              <li>Build trust in our community</li>
            </ul>
            
            <p>Thank you for being part of the Vostcard community!</p>
            
            <p>Best regards,<br>The Vostcard Team</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              If you're unable to click the button above, copy and paste this link into your browser:<br>
              <a href="${variables.reviewLink}">${variables.reviewLink}</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateReviewEmailText(variables: any): string {
    return `
Hi ${variables.travelerName},

We hope you had an amazing time on your ${variables.tourName} tour with ${variables.guideName} on ${variables.tourDate}!

Your guide has confirmed that the tour was completed. We'd love to hear about your experience to help other travelers and support our guide community.

Leave your review here: ${variables.reviewLink}

Your review helps:
- Other travelers make informed decisions
- Guides improve their services  
- Build trust in our community

Thank you for being part of the Vostcard community!

Best regards,
The Vostcard Team

---
If you're having trouble with the link, copy and paste this URL into your browser:
${variables.reviewLink}
    `;
  }
}

export default ReviewService;