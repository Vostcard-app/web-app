export interface Tour {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  postIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  shareableUrl?: string;
  isShareable?: boolean;
}

export interface TourPost {
  id: string;
  title: string;
  description?: string;
  photoURLs?: string[];
  videoURL?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: Date;
  isQuickcard?: boolean;
  isOffer?: boolean;
  userRole?: string;
  username?: string;
  state?: string;
}

export interface CreateTourData {
  name: string;
  description?: string;
  postIds: string[];
  isPublic?: boolean;
  isShareable?: boolean;
}

export interface UpdateTourData {
  name?: string;
  description?: string;
  postIds?: string[];
  isPublic?: boolean;
} 