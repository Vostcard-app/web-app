export interface GuideReview {
  id: string;
  bookingId: string;
  guideId: string;
  travelerId: string;
  tourId: string;
  
  // Review content
  rating: number; // 1-5 stars
  title: string;
  comment: string;
  
  // Review categories
  ratings: {
    communication: number;
    knowledge: number;
    punctuality: number;
    friendliness: number;
    overall: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isVerified: boolean; // Only verified after guide confirmation
  
  // Optional fields
  photos?: string[];
  wouldRecommend: boolean;
  
  // Moderation
  isPublic: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationNotes?: string;
}

export interface TourCompletion {
  id: string;
  bookingId: string;
  guideId: string;
  travelerId: string;
  tourId: string;
  
  // Completion details
  completedAt: string;
  guideConfirmedAt?: string;
  guideConfirmationNotes?: string;
  
  // Status tracking
  status: 'completed' | 'guide_confirmed' | 'review_sent' | 'review_completed';
  
  // Email tracking
  reviewEmailSentAt?: string;
  reviewEmailOpenedAt?: string;
  reviewRemindersSent: number;
  
  // Review reference
  reviewId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: {
    travelerName: string;
    guideName: string;
    tourName: string;
    tourDate: string;
    reviewLink: string;
  };
}

export interface BookingStatus {
  id: string;
  bookingId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface ReviewStats {
  guideId: string;
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: {
    communication: number;
    knowledge: number;
    punctuality: number;
    friendliness: number;
    overall: number;
  };
  lastUpdated: string;
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  title: string;
  comment: string;
  ratings: {
    communication: number;
    knowledge: number;
    punctuality: number;
    friendliness: number;
    overall: number;
  };
  wouldRecommend: boolean;
  photos?: File[];
}

export interface GuideConfirmationRequest {
  bookingId: string;
  confirmationNotes?: string;
}
