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
  GuideAvailability,
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
      // Use the tour data as provided, since it already contains all required fields
      const tour: Omit<GuidedTour, 'id'> = {
        ...tourData.tourData
      };

      console.log('🔍 Creating guided tour with data:', tour);
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
   * Update an existing guided tour
   */
  static async updateGuidedTour(tourId: string, updates: Partial<GuidedTour>): Promise<void> {
    try {
      // Clean the updates object to remove any undefined values and ensure proper serialization
      const cleanUpdates = this.cleanUpdateData({
        ...updates,
        updatedAt: new Date()
      });
      
      console.log('🔍 Updating tour with data:', JSON.stringify(cleanUpdates, null, 2));
      
      const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS, tourId);
      await updateDoc(docRef, cleanUpdates);
      console.log('✅ Guided tour updated successfully');
    } catch (error) {
      console.error('❌ Error updating guided tour:', error);
      console.error('❌ Update data that failed:', JSON.stringify(updates, null, 2));
      throw error;
    }
  }

  /**
   * Clean update data to remove undefined values and ensure Firestore compatibility
   */
  private static cleanUpdateData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (data instanceof Date) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.filter(item => item !== undefined).map(item => this.cleanUpdateData(item));
    }
    
    if (typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUpdateData(value);
        }
      }
      return cleaned;
    }
    
    return data;
  }

  /**
   * Get a single guided tour by ID
   */
  static async getGuidedTour(tourId: string): Promise<GuidedTour | null> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS, tourId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as GuidedTour;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching guided tour:', error);
      throw error;
    }
  }

  /**
   * Delete a guided tour
   */
  static async deleteGuidedTour(tourId: string): Promise<void> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.GUIDED_TOURS, tourId);
      await deleteDoc(docRef);
      console.log('✅ Guided tour deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting guided tour:', error);
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
      
      // Calculate pricing based on number of participants
      const participantCount = request.participants.length;
      const pricePerPerson = tour.basePrice; // Already includes platform fee
      const subtotal = pricePerPerson * participantCount;
      
      // For accounting: calculate how much goes to guide vs platform
      const guideRatePerPerson = tour.guideRate || (tour.basePrice / 1.1); // Fallback for existing tours
      const guideTotal = guideRatePerPerson * participantCount;
      const platformFeeTotal = subtotal - guideTotal;
      
      const total = subtotal; // No additional fees, price is inclusive

      const booking: Omit<TourBooking, 'id'> = {
        tourId: request.tourId,
        guideId: tour.guideId,
        userId: request.userId,
        status: tour.guideSettings?.autoAcceptBookings ? 'confirmed' : 'pending',
        bookingDetails: {
          ...request.bookingDetails,
          meetingPoint: tour.meetingPoint
        },
        paymentInfo: {
          subtotal,
          platformFee: platformFeeTotal, // Total platform fee for all participants
          total,
          currency: 'USD', // TODO: Get from guide settings
          paymentMethod: {
            type: 'card' // TODO: Get from payment method
          },
          // Additional accounting info
          participantCount,
          pricePerPerson,
          guideTotal // How much the guide receives
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

  // ===== AVAILABILITY MANAGEMENT =====

  /**
   * Save guide availability
   */
  static async saveGuideAvailability(availability: GuideAvailability): Promise<string> {
    try {
      const availabilityData = {
        ...availability,
        updatedAt: new Date()
      };

      if (availability.id) {
        // Update existing availability
        const docRef = doc(db, 'guideAvailability', availability.id);
        await updateDoc(docRef, availabilityData);
        console.log('✅ Guide availability updated');
        return availability.id;
      } else {
        // Create new availability
        const docRef = await addDoc(collection(db, 'guideAvailability'), {
          ...availabilityData,
          createdAt: new Date()
        });
        console.log('✅ Guide availability created with ID:', docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error('❌ Error saving guide availability:', error);
      throw error;
    }
  }

  /**
   * Get guide availability
   */
  static async getGuideAvailability(guideId: string): Promise<GuideAvailability | null> {
    try {
      const q = query(
        collection(db, 'guideAvailability'),
        where('guideId', '==', guideId),
        orderBy('updatedAt', 'desc'),
        firestoreLimit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as GuideAvailability;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching guide availability:', error);
      throw error;
    }
  }

  /**
   * Check if guide is available on a specific date and time
   */
  static async isGuideAvailable(
    guideId: string, 
    date: Date, 
    startTime: string, 
    endTime: string
  ): Promise<boolean> {
    try {
      const availability = await this.getGuideAvailability(guideId);
      
      if (!availability) {
        return false; // No availability set = not available
      }

      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];

      // Check blackout dates
      if (availability.blackoutDates.includes(dateString)) {
        return false;
      }

      // Check weekly schedule
      const daySchedule = availability.weeklySchedule.find(day => day.dayOfWeek === dayOfWeek);
      
      if (!daySchedule || !daySchedule.isAvailable) {
        return false;
      }

      // Check time slots
      return daySchedule.timeSlots.some(slot => {
        if (!slot.isAvailable) return false;
        
        const slotStart = this.timeToMinutes(slot.startTime);
        const slotEnd = this.timeToMinutes(slot.endTime);
        const requestStart = this.timeToMinutes(startTime);
        const requestEnd = this.timeToMinutes(endTime);
        
        return requestStart >= slotStart && requestEnd <= slotEnd;
      });
    } catch (error) {
      console.error('❌ Error checking guide availability:', error);
      return false;
    }
  }

  /**
   * Get available time slots for a guide on a specific date
   */
  static async getAvailableTimeSlots(guideId: string, date: Date): Promise<string[]> {
    try {
      const availability = await this.getGuideAvailability(guideId);
      
      if (!availability) {
        return [];
      }

      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];

      // Check blackout dates
      if (availability.blackoutDates.includes(dateString)) {
        return [];
      }

      // Check weekly schedule
      const daySchedule = availability.weeklySchedule.find(day => day.dayOfWeek === dayOfWeek);
      
      if (!daySchedule || !daySchedule.isAvailable) {
        return [];
      }

      // Return available time slots
      return daySchedule.timeSlots
        .filter(slot => slot.isAvailable)
        .map(slot => `${slot.startTime} - ${slot.endTime}`);
    } catch (error) {
      console.error('❌ Error getting available time slots:', error);
      return [];
    }
  }

  /**
   * Helper method to convert time string to minutes
   */
  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
