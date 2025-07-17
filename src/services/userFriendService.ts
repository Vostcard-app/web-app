import { 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { type UserFriendData } from '../types/FriendModels';

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
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return 0;
      }
      
      return userDoc.data().friends?.length || 0;
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
      const pendingRequests = userData.pendingFriendRequests || [];
      
      console.log('📊 User document data:', {
        pendingFriendRequests: pendingRequests,
        count: pendingRequests.length
      });
      
      return pendingRequests.length;
    } catch (error) {
      console.error('Error getting pending request count:', error);
      return 0;
    }
  }
  
  /**
   * Check if two users are friends
   */
  static async areFriends(userUID1: string, userUID2: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID1));
      
      if (!userDoc.exists()) {
        return false;
      }
      
      const friends = userDoc.data().friends || [];
      return friends.includes(userUID2);
    } catch (error) {
      console.error('Error checking if users are friends:', error);
      return false;
    }
  }
  
  /**
   * Check if user is blocked by another user
   */
  static async isBlocked(userUID: string, potentialBlockerUID: string): Promise<boolean> {
    try {
      const blockerDoc = await getDoc(doc(db, 'users', potentialBlockerUID));
      
      if (!blockerDoc.exists()) {
        return false;
      }
      
      const blockedUsers = blockerDoc.data().blockedUsers || [];
      return blockedUsers.includes(userUID);
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }
  
  /**
   * Batch initialize friend fields for multiple users
   */
  static async batchInitializeFriendFields(userUIDs: string[]): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
  }> {
    const results = await Promise.allSettled(
      userUIDs.map(uid => this.initializeFriendFields(uid))
    );
    
    let successCount = 0;
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error || 'Unknown error';
        errors.push(`User ${userUIDs[index]}: ${error}`);
      }
    });
    
    return {
      success: successCount === userUIDs.length,
      successCount,
      errors
    };
  }
  
  /**
   * Validate user document has required friend fields
   */
  static async validateUserFriendFields(userUID: string): Promise<{
    isValid: boolean;
    missingFields: string[];
  }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return {
          isValid: false,
          missingFields: ['User document does not exist']
        };
      }
      
      const userData = userDoc.data();
      const requiredFields = [
        'friends',
        'pendingFriendRequests',
        'sentFriendRequests',
        'vostboxUnreadCount',
        'blockedUsers',
        'friendRequestsEnabled'
      ];
      
      const missingFields = requiredFields.filter(field => !userData.hasOwnProperty(field));
      
      return {
        isValid: missingFields.length === 0,
        missingFields
      };
    } catch (error) {
      console.error('Error validating user friend fields:', error);
      return {
        isValid: false,
        missingFields: ['Error validating fields']
      };
    }
  }
} 