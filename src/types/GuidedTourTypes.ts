// ✅ Guided Tour Booking System Data Models
// 📁 src/types/GuidedTourTypes.ts

import { Tour } from './TourTypes';

// ==================== GUIDE PROFILE & RATES ====================

export interface GuideProfile {
  userId: string;
  isGuideAccount: boolean;
  guideRates: GuideRates;
  guideAvailability: GuideSchedule[];
  guideSettings: GuideSettings;
  guideStats: GuideStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuideRates {
  hourlyRate: number;
  currency: string; // 'USD', 'EUR', etc.
  minimumDuration: number; // minimum tour duration in minutes
  maximumDuration: number; // maximum tour duration in minutes
  groupSizeLimit: number; // maximum number of people per tour
  cancellationPolicy: CancellationPolicy;
}

export interface GuideSettings {
  autoAcceptBookings: boolean; // if false, guide must manually approve
  advanceBookingDays: number; // how many days in advance bookings can be made
  bufferTime: number; // minutes between tours for travel/prep
  languages: string[]; // languages the guide speaks
  specialties: string[]; // guide's areas of expertise
  meetingInstructions?: string; // default meeting point instructions
}

export interface GuideStats {
  totalBookings: number;
  completedTours: number;
  averageRating: number;
  totalEarnings: number;
  responseTime: number; // average response time in minutes
  cancellationRate: number; // percentage of tours cancelled by guide
}

// ==================== SCHEDULE & AVAILABILITY ====================

export interface GuideSchedule {
  id: string;
  guideId: string;
  date: string; // YYYY-MM-DD format
  timeSlots: TimeSlot[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  isAvailable: boolean;
  maxBookings: number; // for group tours
  currentBookings: number;
  price?: number; // override default hourly rate if needed
  notes?: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // every X days/weeks/months
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly patterns
  endDate?: string; // when to stop recurring
  maxOccurrences?: number; // alternative to endDate
}

// ==================== GUIDED TOURS ====================

export interface GuidedTour extends Tour {
  type: 'guided'; // distinguish from self-guided tours
  guideId: string;
  guideName: string;
  guideAvatar?: string;
  duration: number; // tour duration in minutes
  maxGroupSize: number;
  meetingPoint: MeetingPoint;
  highlights: string[]; // key tour highlights
  included: string[]; // what's included in the tour
  requirements?: string[]; // fitness level, age restrictions, etc.
  languages: string[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  category: TourCategory;
  tags: string[];
  images: string[];
  averageRating: number;
  totalReviews: number;
  basePrice: number; // guide's rate
  platformFee: number; // 10% fee
  totalPrice: number; // basePrice + platformFee
}

export interface MeetingPoint {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  instructions?: string;
  landmarks?: string; // nearby landmarks for easy identification
}

export type TourCategory = 
  | 'historical'
  | 'cultural'
  | 'food'
  | 'nature'
  | 'architecture'
  | 'photography'
  | 'adventure'
  | 'nightlife'
  | 'shopping'
  | 'art'
  | 'local-experience'
  | 'family-friendly';

// ==================== BOOKING SYSTEM ====================

export interface TourBooking {
  id: string;
  tourId: string;
  guideId: string;
  userId: string; // customer who booked
  status: BookingStatus;
  bookingDetails: BookingDetails;
  paymentInfo: PaymentInfo;
  participants: Participant[];
  communication: BookingMessage[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export type BookingStatus = 
  | 'pending' // waiting for guide approval (if manual approval)
  | 'confirmed' // guide approved, payment processed
  | 'paid' // payment successful
  | 'in-progress' // tour is currently happening
  | 'completed' // tour finished successfully
  | 'cancelled-by-user' // cancelled by customer
  | 'cancelled-by-guide' // cancelled by guide
  | 'no-show' // customer didn't show up
  | 'refunded'; // payment refunded

export interface BookingDetails {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // minutes
  groupSize: number;
  meetingPoint: MeetingPoint;
  specialRequests?: string;
  customerNotes?: string;
  guideNotes?: string;
}

export interface Participant {
  name: string;
  age?: number;
  email?: string;
  phone?: string;
  emergencyContact?: EmergencyContact;
  specialNeeds?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ==================== PAYMENT SYSTEM ====================

export interface PaymentInfo {
  subtotal: number; // guide's rate
  platformFee: number; // 10% of subtotal
  taxes?: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  stripePaymentIntentId?: string;
  refundInfo?: RefundInfo;
}

export interface PaymentMethod {
  type: 'card' | 'paypal' | 'apple-pay' | 'google-pay';
  last4?: string; // for cards
  brand?: string; // visa, mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
}

export interface RefundInfo {
  amount: number;
  reason: string;
  processedAt: Date;
  refundId: string;
  status: 'pending' | 'completed' | 'failed';
}

// ==================== COMMUNICATION ====================

export interface BookingMessage {
  id: string;
  senderId: string;
  senderType: 'guide' | 'user' | 'system';
  message: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'system-notification' | 'booking-update';
}

// ==================== REVIEWS & RATINGS ====================

export interface TourReview {
  id: string;
  bookingId: string;
  tourId: string;
  guideId: string;
  userId: string;
  rating: number; // 1-5 stars
  review: string;
  aspects: ReviewAspects;
  images?: string[];
  isVerified: boolean; // verified booking
  isPublic: boolean;
  guideResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewAspects {
  knowledge: number; // guide's knowledge (1-5)
  communication: number; // guide's communication (1-5)
  punctuality: number; // on-time performance (1-5)
  value: number; // value for money (1-5)
  experience: number; // overall experience (1-5)
}

// ==================== CANCELLATION POLICIES ====================

export interface CancellationPolicy {
  type: 'flexible' | 'moderate' | 'strict';
  rules: CancellationRule[];
  description: string;
}

export interface CancellationRule {
  hoursBeforeTour: number; // how many hours before tour
  refundPercentage: number; // 0-100
  description: string;
}

// ==================== SEARCH & FILTERING ====================

export interface GuidedTourSearchFilters {
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  date?: string;
  timeRange?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  duration?: {
    min: number; // minutes
    max: number; // minutes
  };
  priceRange?: {
    min: number;
    max: number;
  };
  groupSize?: number;
  categories?: TourCategory[];
  languages?: string[];
  difficulty?: ('easy' | 'moderate' | 'challenging')[];
  rating?: number; // minimum rating
  availability?: 'instant-book' | 'request-to-book';
}

export interface GuidedTourSearchResult {
  tour: GuidedTour;
  guide: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    responseTime: number;
    languages: string[];
  };
  availability: {
    nextAvailableDate?: string;
    availableSlots: number;
    instantBook: boolean;
  };
  distance?: number; // from search location
}

// ==================== ANALYTICS & REPORTING ====================

export interface GuideAnalytics {
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  metrics: {
    totalBookings: number;
    completedTours: number;
    totalRevenue: number;
    averageRating: number;
    responseRate: number;
    cancellationRate: number;
    repeatCustomers: number;
    newCustomers: number;
  };
  bookingTrends: BookingTrend[];
  popularTours: PopularTourStat[];
  customerFeedback: ReviewSummary;
}

export interface BookingTrend {
  date: string;
  bookings: number;
  revenue: number;
  averageGroupSize: number;
}

export interface PopularTourStat {
  tourId: string;
  tourName: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [rating: number]: number };
  commonKeywords: string[];
  improvementAreas: string[];
}

// ==================== API INTERFACES ====================

export interface CreateGuidedTourRequest {
  tourData: Omit<GuidedTour, 'id' | 'createdAt' | 'updatedAt' | 'averageRating' | 'totalReviews'>;
}

export interface BookTourRequest {
  tourId: string;
  bookingDetails: Omit<BookingDetails, 'meetingPoint'>;
  participants: Participant[];
  paymentMethodId: string;
  specialRequests?: string;
}

export interface UpdateAvailabilityRequest {
  guideId: string;
  schedules: Omit<GuideSchedule, 'id' | 'createdAt' | 'updatedAt'>[];
}

// ==================== FIRESTORE COLLECTION NAMES ====================

export const FIRESTORE_COLLECTIONS = {
  GUIDED_TOURS: 'guidedTours',
  GUIDE_PROFILES: 'guideProfiles',
  GUIDE_SCHEDULES: 'guideSchedules',
  TOUR_BOOKINGS: 'tourBookings',
  TOUR_REVIEWS: 'tourReviews',
  BOOKING_MESSAGES: 'bookingMessages',
  PAYMENT_TRANSACTIONS: 'paymentTransactions',
} as const;

// ==================== DEFAULT VALUES ====================

export const DEFAULT_GUIDE_RATES: GuideRates = {
  hourlyRate: 50,
  currency: 'USD',
  minimumDuration: 60, // 1 hour
  maximumDuration: 480, // 8 hours
  groupSizeLimit: 8,
  cancellationPolicy: {
    type: 'moderate',
    rules: [
      { hoursBeforeTour: 24, refundPercentage: 100, description: 'Full refund if cancelled 24+ hours before' },
      { hoursBeforeTour: 12, refundPercentage: 50, description: '50% refund if cancelled 12-24 hours before' },
      { hoursBeforeTour: 0, refundPercentage: 0, description: 'No refund if cancelled less than 12 hours before' }
    ],
    description: 'Moderate cancellation policy with partial refunds'
  }
};

export const DEFAULT_GUIDE_SETTINGS: GuideSettings = {
  autoAcceptBookings: false,
  advanceBookingDays: 30,
  bufferTime: 30, // 30 minutes between tours
  languages: ['English'],
  specialties: [],
  meetingInstructions: 'I will meet you at the designated meeting point. Look for someone with a Vostcard guide badge.'
};

export const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%
