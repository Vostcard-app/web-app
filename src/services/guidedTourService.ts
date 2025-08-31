// ✅ Guided Tour Service
// 📁 src/services/guidedTourService.ts

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  GuidedTour,
  GuideProfile,
  GuideSchedule,
  TourBooking,
  TourReview,
  GuidedTourSearchFilters,
  GuidedTourSearchResult,
  CreateGuidedTourRequest,
  BookTourRequest,
  UpdateAvailabilityRequest,
  FIRESTORE_COLLECTIONS,
  DEFAULT_GUIDE_RATES,
  DEFAULT_GUIDE_SETTINGS,
  PLATFORM_FEE_PERCENTAGE
} from '../types/GuidedTourTypes';

export class GuidedTourService {
  
  // ==================== GUIDE PROFILE MANAGEMENT ====================
  
  /**
   * Create or update a guide profile
   */
  static async createGuideProfile(userId: string, guideData: Partial<GuideProfile>): Promise<void> {
    try {
      const guideProfile: GuideProfile = {
        userId,
        isGuideAccount: true,
        guideRates: guideData.guideRates || DEFAULT_GUIDE_RATES,
        guideAvailability: guideData.guideAvailability || [],
        guideSettings: guideData.guideSettings || DEFAULT_GUIDE_SETTINGS,
        guideStats: {
          totalBookings: 0,
          completedTours: 0,
          averageRating: 0,
          totalEarnings: 0,
          responseTime: 0,
          cancellationRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.GUIDE_PROFILES, userId), guideProfile);
      console.log('✅ Guide profile created/updated successfully');
    } catch (error) {
      console.error('❌ Error creating guide profile:', error);
      throw error;
    }
  }

  /**
   * Get guide profile by user ID
   */
  static async getGuideProfile(userId: string): Promise<GuideProfile | null> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDE_PROFILES, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...docSnap.data() as GuideProfile, userId };
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching guide profile:', error);
      throw error;
    }
  }

  /**
   * Update guide rates and settings
   */
  static async updateGuideProfile(userId: string, updates: Partial<GuideProfile>): Promise<void> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDE_PROFILES, userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ Guide profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating guide profile:', error);
      throw error;
    }
  }

  // ==================== GUIDED TOUR MANAGEMENT ====================

  /**
   * Create a new guided tour
   */
  static async createGuidedTour(tourData: CreateGuidedTourRequest): Promise<string> {
    try {
      const tour: Omit<GuidedTour, 'id'> = {
        ...tourData.tourData,
        type: 'guided',
        averageRating: 0,
        totalReviews: 0,
        platformFee: tourData.tourData.basePrice * PLATFORM_FEE_PERCENTAGE,
        totalPrice: tourData.tourData.basePrice * (1 + PLATFORM_FEE_PERCENTAGE),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS), tour);
      console.log('✅ Guided tour created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating guided tour:', error);
      throw error;
    }
  }

  /**
   * Get guided tours by guide ID
   */
  static async getGuidedToursByGuide(guideId: string): Promise<GuidedTour[]> {
    try {
      const q = query(
        collection(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS),
        where('guideId', '==', guideId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const tours: GuidedTour[] = [];
      
      querySnapshot.forEach((doc) => {
        tours.push({ id: doc.id, ...doc.data() } as GuidedTour);
      });
      
      return tours;
    } catch (error) {
      console.error('❌ Error fetching guided tours:', error);
      throw error;
    }
  }

  /**
   * Search for guided tours with filters
   */
  static async searchGuidedTours(
    filters: GuidedTourSearchFilters,
    limitResults: number = 20
  ): Promise<GuidedTourSearchResult[]> {
    try {
      let q = query(collection(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS));

      // Apply filters
      if (filters.categories && filters.categories.length > 0) {
        q = query(q, where('category', 'in', filters.categories));
      }

      if (filters.priceRange) {
        q = query(q, where('totalPrice', '>=', filters.priceRange.min));
        q = query(q, where('totalPrice', '<=', filters.priceRange.max));
      }

      if (filters.rating) {
        q = query(q, where('averageRating', '>=', filters.rating));
      }

      q = query(q, orderBy('averageRating', 'desc'), firestoreLimit(limitResults));

      const querySnapshot = await getDocs(q);
      const results: GuidedTourSearchResult[] = [];

      for (const docSnap of querySnapshot.docs) {
        const tour = { id: docSnap.id, ...docSnap.data() } as GuidedTour;
        
        // Get guide info
        const guideProfile = await this.getGuideProfile(tour.guideId);
        
        if (guideProfile) {
          results.push({
            tour,
            guide: {
              id: tour.guideId,
              name: tour.guideName,
              avatar: tour.guideAvatar,
              rating: guideProfile.guideStats.averageRating,
              reviewCount: guideProfile.guideStats.totalBookings,
              responseTime: guideProfile.guideStats.responseTime,
              languages: guideProfile.guideSettings.languages
            },
            availability: {
              availableSlots: 0, // TODO: Calculate from schedule
              instantBook: guideProfile.guideSettings.autoAcceptBookings
            }
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error searching guided tours:', error);
      throw error;
    }
  }

  // ==================== SCHEDULE MANAGEMENT ====================

  /**
   * Update guide availability schedule
   */
  static async updateGuideAvailability(request: UpdateAvailabilityRequest): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete existing schedules for the dates being updated
      const existingSchedulesQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.GUIDE_SCHEDULES),
        where('guideId', '==', request.guideId)
      );
      
      const existingSchedules = await getDocs(existingSchedulesQuery);
      existingSchedules.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new schedules
      request.schedules.forEach((schedule) => {
        const scheduleData = {
          ...schedule,
          id: `${request.guideId}_${schedule.date}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDE_SCHEDULES, scheduleData.id);
        batch.set(docRef, scheduleData);
      });

      await batch.commit();
      console.log('✅ Guide availability updated successfully');
    } catch (error) {
      console.error('❌ Error updating guide availability:', error);
      throw error;
    }
  }

  /**
   * Get guide schedule for a date range
   */
  static async getGuideSchedule(
    guideId: string, 
    startDate: string, 
    endDate: string
  ): Promise<GuideSchedule[]> {
    try {
      const q = query(
        collection(db, FIRESTORE_COLLECTIONS.GUIDE_SCHEDULES),
        where('guideId', '==', guideId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const schedules: GuideSchedule[] = [];

      querySnapshot.forEach((doc) => {
        schedules.push({ ...doc.data() } as GuideSchedule);
      });

      return schedules;
    } catch (error) {
      console.error('❌ Error fetching guide schedule:', error);
      throw error;
    }
  }

  // ==================== BOOKING MANAGEMENT ====================

  /**
   * Create a new tour booking
   */
  static async bookTour(request: BookTourRequest): Promise<string> {
    try {
      // Get tour details
      const tourDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS, request.tourId));
      if (!tourDoc.exists()) {
        throw new Error('Tour not found');
      }

      const tour = tourDoc.data() as GuidedTour;
      
      // Calculate pricing
      const subtotal = tour.basePrice;
      const platformFee = subtotal * PLATFORM_FEE_PERCENTAGE;
      const total = subtotal + platformFee;

      const booking: Omit<TourBooking, 'id'> = {
        tourId: request.tourId,
        guideId: tour.guideId,
        userId: '', // TODO: Get from auth context
        status: tour.guideSettings?.autoAcceptBookings ? 'confirmed' : 'pending',
        bookingDetails: {
          ...request.bookingDetails,
          meetingPoint: tour.meetingPoint
        },
        paymentInfo: {
          subtotal,
          platformFee,
          total,
          currency: 'USD', // TODO: Get from guide settings
          paymentMethod: {
            type: 'card' // TODO: Get from payment method
          }
        },
        participants: request.participants,
        communication: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.TOUR_BOOKINGS), booking);
      console.log('✅ Tour booking created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating tour booking:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a guide
   */
  static async getGuideBookings(guideId: string): Promise<TourBooking[]> {
    try {
      const q = query(
        collection(db, FIRESTORE_COLLECTIONS.TOUR_BOOKINGS),
        where('guideId', '==', guideId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const bookings: TourBooking[] = [];

      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() } as TourBooking);
      });

      return bookings;
    } catch (error) {
      console.error('❌ Error fetching guide bookings:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a user
   */
  static async getUserBookings(userId: string): Promise<TourBooking[]> {
    try {
      const q = query(
        collection(db, FIRESTORE_COLLECTIONS.TOUR_BOOKINGS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const bookings: TourBooking[] = [];

      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() } as TourBooking);
      });

      return bookings;
    } catch (error) {
      console.error('❌ Error fetching user bookings:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(bookingId: string, status: TourBooking['status']): Promise<void> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.TOUR_BOOKINGS, bookingId);
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      // Add timestamp for specific status changes
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status.includes('cancelled')) {
        updateData.cancelledAt = new Date();
      }

      await updateDoc(docRef, updateData);
      console.log('✅ Booking status updated successfully');
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  // ==================== REVIEW MANAGEMENT ====================

  /**
   * Add a review for a completed tour
   */
  static async addTourReview(review: Omit<TourReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reviewData: Omit<TourReview, 'id'> = {
        ...review,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.TOUR_REVIEWS), reviewData);
      
      // Update tour average rating
      await this.updateTourRating(review.tourId);
      
      console.log('✅ Tour review added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding tour review:', error);
      throw error;
    }
  }

  /**
   * Update tour average rating based on reviews
   */
  private static async updateTourRating(tourId: string): Promise<void> {
    try {
      const reviewsQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.TOUR_REVIEWS),
        where('tourId', '==', tourId)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => doc.data() as TourReview);

      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS, tourId), {
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          totalReviews: reviews.length,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error updating tour rating:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if a user is a guide
   */
  static async isUserGuide(userId: string): Promise<boolean> {
    try {
      const guideProfile = await this.getGuideProfile(userId);
      return guideProfile?.isGuideAccount || false;
    } catch (error) {
      console.error('❌ Error checking guide status:', error);
      return false;
    }
  }

  /**
   * Calculate platform fee
   */
  static calculatePlatformFee(basePrice: number): number {
    return basePrice * PLATFORM_FEE_PERCENTAGE;
  }

  /**
   * Calculate total price including platform fee
   */
  static calculateTotalPrice(basePrice: number): number {
    return basePrice + this.calculatePlatformFee(basePrice);
  }
}
