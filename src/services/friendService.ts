import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  type Friend, 
  type FriendRequest, 
  type UserFriendData, 
  type FriendSearchResult,
  type FriendActivity,
  FriendRequestStatus,
  FriendStatus,
  type FriendRequestStatusType,
  type FriendStatusType
} from '../types/FriendModels';

export class FriendService {
  
  /**
   * Send a friend request to another user
   */
  static async sendFriendRequest(
    senderUID: string, 
    receiverUID: string, 
    message?: string
  ): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      // Check if users are already friends
      const senderDoc = await getDoc(doc(db, 'users', senderUID));
      const receiverDoc = await getDoc(doc(db, 'users', receiverUID));
      
      if (!senderDoc.exists() || !receiverDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const senderData = senderDoc.data();
      const receiverData = receiverDoc.data();
      
      // Check if already friends
      if (senderData.friends?.includes(receiverUID)) {
        return { success: false, error: 'Users are already friends' };
      }
      
      // Check if request already exists
      const existingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderUID', '==', senderUID),
        where('receiverUID', '==', receiverUID),
        where('status', '==', FriendRequestStatus.PENDING)
      );
      
      const existingRequests = await getDocs(existingRequestQuery);
      if (!existingRequests.empty) {
        return { success: false, error: 'Friend request already sent' };
      }
      
      // Check if receiver has friend requests enabled
      if (receiverData.friendRequestsEnabled === false) {
        return { success: false, error: 'User is not accepting friend requests' };
      }
      
      // Create the friend request
      const friendRequest: Omit<FriendRequest, 'id'> = {
        senderUID,
        senderUsername: senderData.username || 'Unknown',
        senderEmail: senderData.email || '',
        senderAvatarURL: senderData.avatarURL,
        receiverUID,
        receiverUsername: receiverData.username || 'Unknown',
        receiverEmail: receiverData.email || '',
        status: FriendRequestStatus.PENDING,
        message,
        createdAt: new Date()
      };
      
      const requestDoc = await addDoc(collection(db, 'friendRequests'), {
        ...friendRequest,
        createdAt: serverTimestamp()
      });
      
      // Update both users' pending request arrays
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'users', senderUID), {
        sentFriendRequests: arrayUnion(requestDoc.id)
      });
      
      batch.update(doc(db, 'users', receiverUID), {
        pendingFriendRequests: arrayUnion(requestDoc.id)
      });
      
      await batch.commit();
      
      return { success: true, requestId: requestDoc.id };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }
  
  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(requestId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        return { success: false, error: 'Friend request not found' };
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      
      // Verify user is the receiver
      if (requestData.receiverUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      if (requestData.status !== FriendRequestStatus.PENDING) {
        return { success: false, error: 'Request already processed' };
      }
      
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'friendRequests', requestId), {
        status: FriendRequestStatus.ACCEPTED,
        respondedAt: serverTimestamp()
      });
      
      // Add to both users' friend arrays
      batch.update(doc(db, 'users', requestData.senderUID), {
        friends: arrayUnion(requestData.receiverUID),
        sentFriendRequests: arrayRemove(requestId)
      });
      
      batch.update(doc(db, 'users', requestData.receiverUID), {
        friends: arrayUnion(requestData.senderUID),
        pendingFriendRequests: arrayRemove(requestId)
      });
      
      // Create friendship document
      await addDoc(collection(db, 'friendships'), {
        user1UID: requestData.senderUID,
        user2UID: requestData.receiverUID,
        establishedAt: serverTimestamp(),
        lastInteraction: serverTimestamp()
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: 'Failed to accept friend request' };
    }
  }
  
  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        return { success: false, error: 'Friend request not found' };
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      
      // Verify user is the receiver
      if (requestData.receiverUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'friendRequests', requestId), {
        status: FriendRequestStatus.REJECTED,
        respondedAt: serverTimestamp()
      });
      
      // Remove from both users' request arrays
      batch.update(doc(db, 'users', requestData.senderUID), {
        sentFriendRequests: arrayRemove(requestId)
      });
      
      batch.update(doc(db, 'users', requestData.receiverUID), {
        pendingFriendRequests: arrayRemove(requestId)
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { success: false, error: 'Failed to reject friend request' };
    }
  }
  
  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(requestId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        return { success: false, error: 'Friend request not found' };
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      
      // Verify user is the sender
      if (requestData.senderUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'friendRequests', requestId), {
        status: FriendRequestStatus.CANCELLED,
        respondedAt: serverTimestamp()
      });
      
      // Remove from both users' request arrays
      batch.update(doc(db, 'users', requestData.senderUID), {
        sentFriendRequests: arrayRemove(requestId)
      });
      
      batch.update(doc(db, 'users', requestData.receiverUID), {
        pendingFriendRequests: arrayRemove(requestId)
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      return { success: false, error: 'Failed to cancel friend request' };
    }
  }
  
  /**
   * Remove a friend
   */
  static async removeFriend(userUID: string, friendUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = writeBatch(db);
      
      // Remove from both users' friend arrays
      batch.update(doc(db, 'users', userUID), {
        friends: arrayRemove(friendUID)
      });
      
      batch.update(doc(db, 'users', friendUID), {
        friends: arrayRemove(userUID)
      });
      
      // Find and delete the friendship document
      const friendshipQuery = query(
        collection(db, 'friendships'),
        where('user1UID', 'in', [userUID, friendUID])
      );
      
      const friendships = await getDocs(friendshipQuery);
      
      friendships.forEach(doc => {
        const data = doc.data();
        if ((data.user1UID === userUID && data.user2UID === friendUID) || 
            (data.user1UID === friendUID && data.user2UID === userUID)) {
          batch.delete(doc.ref);
        }
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend' };
    }
  }
  
  /**
   * Get user's friends list
   */
  static async getFriendsList(userUID: string): Promise<Friend[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        return [];
      }
      
      const friendUIDs = userDoc.data().friends || [];
      
      if (friendUIDs.length === 0) {
        return [];
      }
      
      const friends: Friend[] = [];
      
      // Get friend details in batches (Firestore 'in' query limit is 10)
      const batchSize = 10;
      for (let i = 0; i < friendUIDs.length; i += batchSize) {
        const batch = friendUIDs.slice(i, i + batchSize);
        const friendsQuery = query(
          collection(db, 'users'),
          where('uid', 'in', batch)
        );
        
        const friendDocs = await getDocs(friendsQuery);
        
        friendDocs.forEach(doc => {
          const data = doc.data();
          friends.push({
            uid: data.uid,
            username: data.username || 'Unknown',
            email: data.email || '',
            avatarURL: data.avatarURL,
            establishedAt: new Date(), // We'll get this from friendship doc if needed
            status: FriendStatus.ACTIVE
          });
        });
      }
      
      return friends;
    } catch (error) {
      console.error('Error getting friends list:', error);
      return [];
    }
  }
  
  /**
   * Get pending friend requests
   */
  static async getPendingRequests(userUID: string): Promise<FriendRequest[]> {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverUID', '==', userUID),
        where('status', '==', FriendRequestStatus.PENDING),
        orderBy('createdAt', 'desc')
      );
      
      const requestDocs = await getDocs(requestsQuery);
      
      return requestDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate()
      })) as FriendRequest[];
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }
  
  /**
   * Get sent friend requests
   */
  static async getSentRequests(userUID: string): Promise<FriendRequest[]> {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('senderUID', '==', userUID),
        where('status', '==', FriendRequestStatus.PENDING),
        orderBy('createdAt', 'desc')
      );
      
      const requestDocs = await getDocs(requestsQuery);
      
      return requestDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate()
      })) as FriendRequest[];
    } catch (error) {
      console.error('Error getting sent requests:', error);
      return [];
    }
  }
  
  /**
   * Search for users to add as friends
   */
  static async searchUsers(searchQuery: string, currentUserUID: string): Promise<FriendSearchResult[]> {
    try {
      if (!searchQuery || searchQuery.trim().length < 2) {
        return [];
      }
      
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      // Search by name (case-insensitive partial match)
      const nameQuery = query(
        collection(db, 'users'),
        where('name', '>=', normalizedQuery),
        where('name', '<=', normalizedQuery + '\uf8ff'),
        limit(15)
      );
      
      // Search by email (partial match from beginning)
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', normalizedQuery),
        where('email', '<=', normalizedQuery + '\uf8ff'),
        limit(10)
      );
      
      const [nameResults, emailResults] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery)
      ]);
      
      // Get current user's friend data
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUID));
      const currentUserData = currentUserDoc.data() || {};
      const friendUIDs = currentUserData.friends || [];
      const blockedUsers = currentUserData.blockedUsers || [];
      
      // Combine and deduplicate results
      const userMap = new Map<string, FriendSearchResult>();
      
      const processUser = (doc: any) => {
        const data = doc.data();
        if (data.uid !== currentUserUID && !userMap.has(data.uid)) {
          // Check if name or email contains the search query (case-insensitive)
          const nameMatch = data.name && data.name.toLowerCase().includes(normalizedQuery);
          const emailMatch = data.email && data.email.toLowerCase().includes(normalizedQuery);
          
          if (nameMatch || emailMatch) {
            userMap.set(data.uid, {
              uid: data.uid,
              username: data.username || 'Unknown',
              name: data.name || data.username || 'Unknown',
              email: data.email || '',
              avatarURL: data.avatarURL,
              isFriend: friendUIDs.includes(data.uid),
              hasPendingRequest: false, // Will be filled in below
              isBlocked: blockedUsers.includes(data.uid),
              mutualFriends: 0 // TODO: Calculate mutual friends
            });
          }
        }
      };
      
      nameResults.forEach(processUser);
      emailResults.forEach(processUser);
      
      const results = Array.from(userMap.values());
      
      // Sort results by relevance (exact name match first, then partial matches)
      results.sort((a, b) => {
        const aNameExact = a.name.toLowerCase() === normalizedQuery;
        const bNameExact = b.name.toLowerCase() === normalizedQuery;
        
        if (aNameExact && !bNameExact) return -1;
        if (!aNameExact && bNameExact) return 1;
        
        // Then sort by name alphabetically
        return a.name.localeCompare(b.name);
      });
      
      // Check for pending requests
      if (results.length > 0) {
        const userUIDs = results.map(r => r.uid);
        const pendingRequestsQuery = query(
          collection(db, 'friendRequests'),
          where('senderUID', '==', currentUserUID),
          where('receiverUID', 'in', userUIDs),
          where('status', '==', FriendRequestStatus.PENDING)
        );
        
        const pendingRequests = await getDocs(pendingRequestsQuery);
        const pendingUIDs = new Set(pendingRequests.docs.map(doc => doc.data().receiverUID));
        
        results.forEach(result => {
          result.hasPendingRequest = pendingUIDs.has(result.uid);
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  /**
   * Block a user
   */
  static async blockUser(userUID: string, targetUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = writeBatch(db);
      
      // Add to blocked users
      batch.update(doc(db, 'users', userUID), {
        blockedUsers: arrayUnion(targetUID),
        friends: arrayRemove(targetUID)
      });
      
      // Remove from target's friends if they were friends
      batch.update(doc(db, 'users', targetUID), {
        friends: arrayRemove(userUID)
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }
  
  /**
   * Unblock a user
   */
  static async unblockUser(userUID: string, targetUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userUID), {
        blockedUsers: arrayRemove(targetUID)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }
  }
  
  /**
   * Update friend privacy settings
   */
  static async updateFriendSettings(
    userUID: string, 
    settings: { friendRequestsEnabled: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userUID), settings);
      return { success: true };
    } catch (error) {
      console.error('Error updating friend settings:', error);
      return { success: false, error: 'Failed to update settings' };
    }
  }
} 