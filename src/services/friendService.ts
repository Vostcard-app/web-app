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
      console.log('🚀 Starting friend request process:', { senderUID, receiverUID, message });
      
      // Check if users are already friends
      const senderDoc = await getDoc(doc(db, 'users', senderUID));
      const receiverDoc = await getDoc(doc(db, 'users', receiverUID));
      
      if (!senderDoc.exists() || !receiverDoc.exists()) {
        console.log('❌ User not found:', { senderExists: senderDoc.exists(), receiverExists: receiverDoc.exists() });
        return { success: false, error: 'User not found' };
      }
      
      const senderData = senderDoc.data();
      const receiverData = receiverDoc.data();
      
      console.log('📋 User data:', { 
        senderUsername: senderData.username, 
        receiverUsername: receiverData.username,
        senderFriends: senderData.friends?.length || 0,
        receiverFriends: receiverData.friends?.length || 0
      });
      
      // Check if already friends
      if (senderData.friends?.includes(receiverUID)) {
        console.log('❌ Already friends');
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
        console.log('❌ Request already exists');
        return { success: false, error: 'Friend request already sent' };
      }
      
      // Check if receiver has friend requests enabled
      if (receiverData.friendRequestsEnabled === false) {
        console.log('❌ Friend requests disabled for receiver');
        return { success: false, error: 'User is not accepting friend requests' };
      }
      
      // Create the friend request - only include message if it's not undefined
      const friendRequest: any = {
        senderUID,
        senderUsername: senderData.username || 'Unknown',
        senderEmail: senderData.email || '',
        senderAvatarURL: senderData.avatarURL,
        receiverUID,
        receiverUsername: receiverData.username || 'Unknown',
        receiverEmail: receiverData.email || '',
        status: FriendRequestStatus.PENDING,
        createdAt: serverTimestamp()
      };
      
      // Only add message if it's not undefined and not empty
      if (message && message.trim()) {
        friendRequest.message = message.trim();
      }
      
      console.log('📝 Creating friend request:', friendRequest);
      
      const requestDoc = await addDoc(collection(db, 'friendRequests'), friendRequest);
      
      console.log('✅ Friend request created with ID:', requestDoc.id);
      
      // Update both users' pending request arrays
      const batch = writeBatch(db);
      
      console.log('📝 Updating user documents with request ID:', requestDoc.id);
      console.log('📝 Sender UID:', senderUID);
      console.log('📝 Receiver UID:', receiverUID);
      
      batch.update(doc(db, 'users', senderUID), {
        sentFriendRequests: arrayUnion(requestDoc.id)
      });
      
      batch.update(doc(db, 'users', receiverUID), {
        pendingFriendRequests: arrayUnion(requestDoc.id)
      });
      
      console.log('🔄 Committing batch update...');
      await batch.commit();
      
      console.log('✅ Batch update committed successfully');
      
      // Debug: Check if the update worked
      const updatedReceiverDoc = await getDoc(doc(db, 'users', receiverUID));
      if (updatedReceiverDoc.exists()) {
        console.log('📊 Receiver document after update:', {
          uid: receiverUID,
          pendingFriendRequests: updatedReceiverDoc.data().pendingFriendRequests,
          sentFriendRequests: updatedReceiverDoc.data().sentFriendRequests
        });
      }
      
      console.log('🎉 Friend request sent successfully!');
      return { success: true, requestId: requestDoc.id };
    } catch (error) {
      console.error('❌ Detailed error sending friend request:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error code:', (error as any)?.code || 'Unknown code');
      return { success: false, error: `Failed to send friend request: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
  
  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(requestId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Starting friend request acceptance:', { requestId, userUID });
      
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        console.log('❌ Friend request document not found:', requestId);
        return { success: false, error: 'Friend request not found' };
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      console.log('📋 Friend request data:', requestData);
      
      // Verify user is the receiver
      if (requestData.receiverUID !== userUID) {
        console.log('❌ Unauthorized access:', { expectedReceiver: requestData.receiverUID, actualUser: userUID });
        return { success: false, error: 'Unauthorized' };
      }
      
      if (requestData.status !== FriendRequestStatus.PENDING) {
        console.log('❌ Request already processed:', { currentStatus: requestData.status });
        return { success: false, error: 'Request already processed' };
      }
      
      console.log('✅ Validation passed, creating batch update...');
      
      const batch = writeBatch(db);
      
      // Update request status
      console.log('📝 Updating request status to ACCEPTED');
      batch.update(doc(db, 'friendRequests', requestId), {
        status: FriendRequestStatus.ACCEPTED,
        respondedAt: serverTimestamp()
      });
      
      // Add to both users' friend arrays
      console.log('📝 Adding friends to user documents');
      batch.update(doc(db, 'users', requestData.senderUID), {
        friends: arrayUnion(requestData.receiverUID),
        sentFriendRequests: arrayRemove(requestId)
      });
      
      batch.update(doc(db, 'users', requestData.receiverUID), {
        friends: arrayUnion(requestData.senderUID),
        pendingFriendRequests: arrayRemove(requestId)
      });
      
      console.log('🔄 Committing batch update...');
      await batch.commit();
      console.log('✅ Batch update committed successfully');
      
      // Create friendship document
      console.log('📝 Creating friendship document...');
      const friendshipDoc = await addDoc(collection(db, 'friendships'), {
        user1UID: requestData.senderUID,
        user2UID: requestData.receiverUID,
        establishedAt: serverTimestamp(),
        lastInteraction: serverTimestamp()
      });
      console.log('✅ Friendship document created:', friendshipDoc.id);
      
      console.log('🎉 Friend request accepted successfully!');
      return { success: true };
    } catch (error) {
      console.error('❌ Detailed error accepting friend request:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error code:', (error as any)?.code || 'Unknown code');
      return { success: false, error: `Failed to accept friend request: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      console.log('🔍 Getting friends list for user:', userUID);
      
      const userDoc = await getDoc(doc(db, 'users', userUID));
      
      if (!userDoc.exists()) {
        console.log('❌ User document does not exist');
        return [];
      }
      
      const friendUIDs = userDoc.data().friends || [];
      console.log('📊 Friend UIDs from user document:', friendUIDs);
      
      if (friendUIDs.length === 0) {
        console.log('📭 No friends found in user document');
        return [];
      }
      
      const friends: Friend[] = [];
      
      // Get friend details by document ID (not uid field)
      console.log('🔍 Fetching friend details...');
      
      for (const friendUID of friendUIDs) {
        try {
          const friendDoc = await getDoc(doc(db, 'users', friendUID));
          
          if (friendDoc.exists()) {
            const data = friendDoc.data();
            console.log(`✅ Found friend: ${friendUID}`, {
              username: data.username,
              email: data.email,
              name: data.name,
              firstName: data.firstName,
              lastName: data.lastName
            });
            
            friends.push({
              uid: friendUID, // Use document ID as UID
              username: data.username || data.name || `${data.firstName} ${data.lastName}`.trim() || 'Unknown',
              email: data.email || '',
              avatarURL: data.avatarURL,
              establishedAt: new Date(), // We'll get this from friendship doc if needed
              status: FriendStatus.ACTIVE
            });
          } else {
            console.log(`❌ Friend document not found: ${friendUID}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching friend ${friendUID}:`, error);
        }
      }
      
      console.log('✅ Final friends list:', friends);
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
      console.log('🔍 Getting pending requests for user:', userUID);
      
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverUID', '==', userUID),
        where('status', '==', FriendRequestStatus.PENDING)
        // Temporarily remove orderBy until index is created
        // orderBy('createdAt', 'desc')
      );
      
      const requestDocs = await getDocs(requestsQuery);
      
      console.log('📊 Found requests:', requestDocs.size);
      
      const requests = requestDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate()
      })) as FriendRequest[];
      
      // Sort manually in JavaScript for now
      requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return requests;
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
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
   * Search for users to add as friends - With detailed debugging
   */
  static async searchUsers(searchQuery: string, currentUserUID: string): Promise<FriendSearchResult[]> {
    try {
      if (!searchQuery || searchQuery.trim().length < 1) {
        return [];
      }
      
      const normalizedQuery = searchQuery.toLowerCase().trim();
      console.log('🔍 Searching for:', normalizedQuery);
      
      // Get ALL users from Firestore
      const usersCollection = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersCollection);
      
      console.log('📊 Total users in database:', allUsersSnapshot.size);
      
      // DEBUG: Let's see what the first few user documents actually look like
      let debugCount = 0;
      allUsersSnapshot.forEach((userDoc) => {
        if (debugCount < 5) { // Only show first 5 users for debugging
          const data = userDoc.data();
          console.log(`👤 User ${debugCount + 1} document:`, {
            uid: userDoc.id,
            allFields: data, // Show ALL fields in the document
            name: data.name,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            username: data.username
          });
          debugCount++;
        }
      });
      
      // Get current user's friend data
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUID));
      const currentUserData = currentUserDoc.data() || {};
      const friendUIDs = currentUserData.friends || [];
      const blockedUsers = currentUserData.blockedUsers || [];
      
      // Filter users in JavaScript with detailed debugging
      const matchingUsers: FriendSearchResult[] = [];
      
      allUsersSnapshot.forEach((userDoc) => {
        const data = userDoc.data();
        const userUID = userDoc.id;
        
        // Skip current user
        if (userUID === currentUserUID) return;
        
        // Create display name - prefer firstName/lastName, fallback to name
        const displayName = data.firstName && data.lastName 
          ? `${data.firstName} ${data.lastName}`
          : data.name || data.username || 'Unknown';
        
        // Check if any field matches the search query (case-insensitive)
        const searchableFields = [
          data.name || '',
          data.firstName || '',
          data.lastName || '',
          data.email || '',
          data.username || '',
          displayName
        ];
        
        // DEBUG: For users that might match, show what we're comparing
        const couldMatch = searchableFields.some(field => 
          field.toLowerCase().includes('b') // Check for 'b' specifically
        );
        
        if (couldMatch) {
          console.log(`🔍 Potential match found:`, {
            uid: userUID,
            displayName,
            searchableFields,
            query: normalizedQuery,
            matches: searchableFields.map(field => ({
              field,
              matchesQuery: field.toLowerCase().includes(normalizedQuery)
            }))
          });
        }
        
        const hasMatch = searchableFields.some(field => 
          field.toLowerCase().includes(normalizedQuery)
        );
        
        if (hasMatch) {
          matchingUsers.push({
            uid: userUID,
            username: data.username || 'Unknown',
            name: displayName,
            email: data.email || '',
            avatarURL: data.avatarURL,
            isFriend: friendUIDs.includes(userUID),
            hasPendingRequest: false,
            isBlocked: blockedUsers.includes(userUID),
            mutualFriends: 0
          });
        }
      });
      
      console.log('✅ Found matching users:', matchingUsers.length);
      console.log('📋 Matching users:', matchingUsers);
      
      // Sort results by relevance
      matchingUsers.sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(normalizedQuery);
        const bStartsWith = b.name.toLowerCase().startsWith(normalizedQuery);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return a.name.localeCompare(b.name);
      });
      
      // Check for pending requests
      if (matchingUsers.length > 0) {
        const pendingRequestsQuery = query(
          collection(db, 'friendRequests'),
          where('senderUID', '==', currentUserUID),
          where('status', '==', FriendRequestStatus.PENDING)
        );
        
        const pendingRequests = await getDocs(pendingRequestsQuery);
        const pendingUIDs = new Set(
          pendingRequests.docs.map(doc => doc.data().receiverUID)
        );
        
        matchingUsers.forEach(result => {
          result.hasPendingRequest = pendingUIDs.has(result.uid);
        });
      }
      
      return matchingUsers
        .filter(result => !result.isBlocked)
        .slice(0, 20);
        
    } catch (error) {
      console.error('❌ Error searching users:', error);
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
} 