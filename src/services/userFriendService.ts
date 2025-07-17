import { 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { type UserFriendData, FriendRequestStatus } from '../types/FriendModels';

/**
 * Service to manage user document updates for the friend system
 */
export class UserFriendService {
  
  /**
   * Initialize friend system fields for a user
   */
  static async initializeFriendFields(userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      
      // Check if friend fields are already initialized
      const hasRequiredFields = 
        userData.hasOwnProperty('friends') &&
        userData.hasOwnProperty('pendingFriendRequests') &&
        userData.hasOwnProperty('sentFriendRequests') &&
        userData.hasOwnProperty('vostboxUnreadCount') &&
        userData.hasOwnProperty('blockedUsers') &&
        userData.hasOwnProperty('friendRequestsEnabled');
      
      if (hasRequiredFields) {
        return { success: true }; // Already initialized
      }
      
      // Initialize friend system fields
      const friendFields: Partial<UserFriendData> = {
        friends: userData.friends || [],
        pendingFriendRequests: userData.pendingFriendRequests || [],
        sentFriendRequests: userData.sentFriendRequests || [],
        vostboxUnreadCount: userData.vostboxUnreadCount || 0,
        blockedUsers: userData.blockedUsers || [],
        friendRequestsEnabled: userData.friendRequestsEnabled ?? true // Default to enabled
      };
      
      await updateDoc(doc(db, 'users', userUID), friendFields);
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing friend fields:', error);
      return { success: false, error: 'Failed to initialize friend fields' };
    }
  }
  
  /**
   * Get user's friend data
   */
  static async getUserFriendData(userUID: string): Promise<UserFriendData | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      
      return {
        friends: userData.friends || [],
        pendingFriendRequests: userData.pendingFriendRequests || [],
        sentFriendRequests: userData.sentFriendRequests || [],
        vostboxUnreadCount: userData.vostboxUnreadCount || 0,
        blockedUsers: userData.blockedUsers || [],
        friendRequestsEnabled: userData.friendRequestsEnabled ?? true
      };
    } catch (error) {
      console.error('Error getting user friend data:', error);
      return null;
    }
  }
  
  /**
   * Update user's friend privacy settings
   */
  static async updateFriendPrivacySettings(
    userUID: string,
    settings: {
      friendRequestsEnabled?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userUID), settings);
      return { success: true };
    } catch (error) {
      console.error('Error updating friend privacy settings:', error);
      return { success: false, error: 'Failed to update privacy settings' };
    }
  }
  
  /**
   * Get user's unread vostbox count
   */
  static async getUnreadVostboxCount(userUID: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return 0;
      }
      
      return userDoc.data().vostboxUnreadCount || 0;
    } catch (error) {
      console.error('Error getting unread vostbox count:', error);
      return 0;
    }
  }
  
  /**
   * Reset user's vostbox unread count
   */
  static async resetVostboxUnreadCount(userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userUID), {
        vostboxUnreadCount: 0
      });
      return { success: true };
    } catch (error) {
      console.error('Error resetting vostbox unread count:', error);
      return { success: false, error: 'Failed to reset unread count' };
    }
  }
  
  /**
   * Check if user has friend system enabled
   */
  static async hasFriendSystemEnabled(userUID: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return false;
      }
      
      const userData = userDoc.data();
      return userData.friendRequestsEnabled ?? true;
    } catch (error) {
      console.error('Error checking friend system status:', error);
      return false;
    }
  }
  
  /**
   * Get user's friend count
   */
  static async getFriendCount(userUID: string): Promise<number> {
    try {
      console.log('🔍 Getting friend count for user:', userUID);
      
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        console.log('❌ User document does not exist');
        return 0;
      }
      
      const friends = userDoc.data().friends || [];
      console.log('📊 Friend count:', friends.length, 'friends:', friends);
      
      return friends.length;
    } catch (error) {
      console.error('Error getting friend count:', error);
      return 0;
    }
  }
  
  /**
   * Get user's pending friend request count
   */
  static async getPendingRequestCount(userUID: string): Promise<number> {
    try {
      console.log('🔍 Getting pending request count for user:', userUID);
      
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        console.log('❌ User document does not exist');
        return 0;
      }
      
      const userData = userDoc.data();
      
      // Debug: Show ALL user data to see what's there
      console.log('📊 Complete user document:', userData);
      
      const pendingRequests = userData.pendingFriendRequests || [];
      
      console.log('📊 Pending requests array:', pendingRequests);
      console.log('📊 Count:', pendingRequests.length);
      
      return pendingRequests.length;
    } catch (error) {
      console.error('❌ Error getting pending request count:', error);
      return 0;
    }
  }
  
  /**
   * Get user's pending friend request count directly from friendRequests collection
   */
  static async getPendingRequestCountDirect(userUID: string): Promise<number> {
    try {
      console.log('🔍 Getting DIRECT pending request count for user:', userUID);
      
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverUID', '==', userUID),
        where('status', '==', FriendRequestStatus.PENDING)
      );
      
      const snapshot = await getDocs(requestsQuery);
      const count = snapshot.size;
      
      console.log('📊 Direct count result:', count);
      return count;
    } catch (error) {
      console.error('❌ Error getting direct pending request count:', error);
      return 0;
    }
  }
}