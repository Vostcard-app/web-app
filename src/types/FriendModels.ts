// Friend System Data Models

export interface Friend {
  uid: string;
  username: string;
  email: string;
  avatarURL?: string;
  establishedAt: Date;
  lastInteraction?: Date;
  status: 'active' | 'blocked';
}

export interface FriendRequest {
  id: string;
  senderUID: string;
  senderUsername: string;
  senderEmail: string;
  senderAvatarURL?: string;
  receiverUID: string;
  receiverUsername: string;
  receiverEmail: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
}

export interface VostboxMessage {
  id: string;
  senderUID: string;
  senderUsername: string;
  senderAvatarURL?: string;
  receiverUID: string;
  vostcardID: string;
  vostcardTitle: string;
  vostcardDescription?: string;
  vostcardVideoURL?: string;
  vostcardPhotoURLs?: string[];
  message?: string; // Personal message from sender
  sharedAt: Date;
  isRead: boolean;
  readAt?: Date;
  replyMessage?: string;
  repliedAt?: Date;
}

export interface UserFriendData {
  friends: string[]; // Array of friend UIDs
  pendingFriendRequests: string[]; // Array of pending request IDs
  sentFriendRequests: string[]; // Array of sent request IDs
  vostboxUnreadCount: number;
  blockedUsers: string[]; // Array of blocked user UIDs
  friendRequestsEnabled: boolean; // Privacy setting
}

export interface FriendSearchResult {
  uid: string;
  username: string;
  email: string;
  avatarURL?: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isBlocked: boolean;
  mutualFriends: number;
}

export interface FriendActivity {
  id: string;
  type: 'friend_request_sent' | 'friend_request_received' | 'friend_added' | 'vostbox_received' | 'vostbox_sent';
  fromUID: string;
  fromUsername: string;
  toUID: string;
  toUsername: string;
  timestamp: Date;
  data?: any; // Additional data specific to activity type
}

// Constants for better type safety
export const FriendRequestStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
} as const;

export const FriendStatus = {
  ACTIVE: 'active',
  BLOCKED: 'blocked'
} as const;

export type FriendRequestStatusType = typeof FriendRequestStatus[keyof typeof FriendRequestStatus];
export type FriendStatusType = typeof FriendStatus[keyof typeof FriendStatus]; 