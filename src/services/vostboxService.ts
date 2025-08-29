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
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { type VostboxMessage } from '../types/FriendModels';

export interface VostboxSendOptions {
  senderUID: string;
  receiverUID: string;
  vostcardID: string;
  message?: string;
}

export interface VostboxReplyOptions {
  messageID: string;
  userUID: string;
  replyMessage: string;
}

// Removed QuickcardSendOptions - all content is now vostcards

export class VostboxService {
  
  /**
   * Send a vostcard to a friend's Vōstbox
   */
  static async sendVostcardToFriend(options: VostboxSendOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const { senderUID, receiverUID, vostcardID, message } = options;
      
      // Get sender information
      const senderDoc = await getDoc(doc(db, 'users', senderUID));
      if (!senderDoc.exists()) {
        return { success: false, error: 'Sender not found' };
      }
      const senderData = senderDoc.data();
      
      // Get receiver information
      const receiverDoc = await getDoc(doc(db, 'users', receiverUID));
      if (!receiverDoc.exists()) {
        return { success: false, error: 'Receiver not found' };
      }
      const receiverData = receiverDoc.data();
      
      // Check if users are friends
      if (!senderData.friends?.includes(receiverUID)) {
        return { success: false, error: 'Users are not friends' };
      }
      
      // Check if sender is blocked
      if (receiverData.blockedUsers?.includes(senderUID)) {
        return { success: false, error: 'Cannot send to this user' };
      }
      
      // Get vostcard information
      const vostcardDoc = await getDoc(doc(db, 'vostcards', vostcardID));
      if (!vostcardDoc.exists()) {
        return { success: false, error: 'Vostcard not found' };
      }
      const vostcardData = vostcardDoc.data();
      
      // Verify sender owns the vostcard or has permission to share
      if (vostcardData.userID !== senderUID && vostcardData.userId !== senderUID) {
        return { success: false, error: 'No permission to share this vostcard' };
      }
      
      // Create the vostbox message
      const vostboxMessage: Omit<VostboxMessage, 'id'> = {
        senderUID,
        senderUsername: senderData.username || 'Unknown',
        senderAvatarURL: senderData.avatarURL,
        receiverUID,
        vostcardID,
        vostcardTitle: vostcardData.title || 'Untitled',
        vostcardDescription: vostcardData.description,
        vostcardVideoURL: vostcardData.videoURL,
        vostcardPhotoURLs: vostcardData.photoURLs || [],
        message,
        sharedAt: new Date(),
        isRead: false
      };
      
      // Save to database
      const messageDoc = await addDoc(collection(db, 'vostbox'), {
        ...vostboxMessage,
        sharedAt: serverTimestamp()
      });
      
      // Update receiver's unread count
      await updateDoc(doc(db, 'users', receiverUID), {
        vostboxUnreadCount: increment(1)
      });
      
      // Mark vostcard as shared with friend
      await updateDoc(doc(db, 'vostcards', vostcardID), {
        sharedWith: arrayUnion(receiverUID),
        shareCount: increment(1)
      });
      
      return { success: true, messageId: messageDoc.id };
    } catch (error) {
      console.error('Error sending vostcard to friend:', error);
      return { success: false, error: 'Failed to send vostcard' };
    }
  }

  // Removed sendQuickcardToFriend method - all content is now vostcards
  
  /**
   * Get all vostbox messages for a user
   */
  static async getVostboxMessages(userUID: string): Promise<VostboxMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID),
        orderBy('sharedAt', 'desc'),
        limit(100)
      );
      
      const messageDocs = await getDocs(messagesQuery);
      
      return messageDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sharedAt: doc.data().sharedAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
        repliedAt: doc.data().repliedAt?.toDate()
      })) as VostboxMessage[];
    } catch (error) {
      console.error('Error getting vostbox messages:', error);
      return [];
    }
  }
  
  /**
   * Get unread vostbox messages for a user
   */
  static async getUnreadMessages(userUID: string): Promise<VostboxMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID),
        where('isRead', '==', false),
        orderBy('sharedAt', 'desc'),
        limit(50)
      );
      
      const messageDocs = await getDocs(messagesQuery);
      
      return messageDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sharedAt: doc.data().sharedAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
        repliedAt: doc.data().repliedAt?.toDate()
      })) as VostboxMessage[];
    } catch (error) {
      console.error('Error getting unread messages:', error);
      return [];
    }
  }
  
  /**
   * Mark a message as read
   */
  static async markMessageAsRead(messageId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const messageDoc = await getDoc(doc(db, 'vostbox', messageId));
      
      if (!messageDoc.exists()) {
        return { success: false, error: 'Message not found' };
      }
      
      const messageData = messageDoc.data();
      
      // Verify user is the receiver
      if (messageData.receiverUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      // Don't update if already read
      if (messageData.isRead) {
        return { success: true };
      }
      
      const batch = writeBatch(db);
      
      // Mark message as read
      batch.update(doc(db, 'vostbox', messageId), {
        isRead: true,
        readAt: serverTimestamp()
      });
      
      // Decrement unread count
      batch.update(doc(db, 'users', userUID), {
        vostboxUnreadCount: increment(-1)
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { success: false, error: 'Failed to mark message as read' };
    }
  }
  
  /**
   * Mark all messages as read for a user
   */
  static async markAllMessagesAsRead(userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const unreadQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID),
        where('isRead', '==', false)
      );
      
      const unreadDocs = await getDocs(unreadQuery);
      
      if (unreadDocs.empty) {
        return { success: true };
      }
      
      const batch = writeBatch(db);
      
      // Mark all messages as read
      unreadDocs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: serverTimestamp()
        });
      });
      
      // Reset unread count
      batch.update(doc(db, 'users', userUID), {
        vostboxUnreadCount: 0
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      return { success: false, error: 'Failed to mark all messages as read' };
    }
  }
  
  /**
   * Reply to a vostbox message
   */
  static async replyToMessage(options: VostboxReplyOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { messageID, userUID, replyMessage } = options;
      
      const messageDoc = await getDoc(doc(db, 'vostbox', messageID));
      
      if (!messageDoc.exists()) {
        return { success: false, error: 'Message not found' };
      }
      
      const messageData = messageDoc.data();
      
      // Verify user is the receiver
      if (messageData.receiverUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      // Update message with reply
      await updateDoc(doc(db, 'vostbox', messageID), {
        replyMessage,
        repliedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error replying to message:', error);
      return { success: false, error: 'Failed to reply to message' };
    }
  }
  
  /**
   * Delete a vostbox message
   */
  static async deleteMessage(messageId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const messageDoc = await getDoc(doc(db, 'vostbox', messageId));
      
      if (!messageDoc.exists()) {
        return { success: false, error: 'Message not found' };
      }
      
      const messageData = messageDoc.data();
      
      // Verify user is the receiver
      if (messageData.receiverUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }
      
      const batch = writeBatch(db);
      
      // Delete message
      batch.delete(doc(db, 'vostbox', messageId));
      
      // Decrement unread count if message was unread
      if (!messageData.isRead) {
        batch.update(doc(db, 'users', userUID), {
          vostboxUnreadCount: increment(-1)
        });
      }
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: 'Failed to delete message' };
    }
  }
  
  /**
   * Get vostbox statistics for a user
   */
  static async getVostboxStats(userUID: string): Promise<{
    totalMessages: number;
    unreadMessages: number;
    messagesThisWeek: number;
    messagesSent: number;
  }> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Get total received messages
      const totalQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID)
      );
      
      // Get unread messages
      const unreadQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID),
        where('isRead', '==', false)
      );
      
      // Get messages this week
      const thisWeekQuery = query(
        collection(db, 'vostbox'),
        where('receiverUID', '==', userUID),
        where('sharedAt', '>=', weekAgo)
      );
      
      // Get messages sent
      const sentQuery = query(
        collection(db, 'vostbox'),
        where('senderUID', '==', userUID)
      );
      
      const [totalDocs, unreadDocs, thisWeekDocs, sentDocs] = await Promise.all([
        getDocs(totalQuery),
        getDocs(unreadQuery),
        getDocs(thisWeekQuery),
        getDocs(sentQuery)
      ]);
      
      return {
        totalMessages: totalDocs.size,
        unreadMessages: unreadDocs.size,
        messagesThisWeek: thisWeekDocs.size,
        messagesSent: sentDocs.size
      };
    } catch (error) {
      console.error('Error getting vostbox stats:', error);
      return {
        totalMessages: 0,
        unreadMessages: 0,
        messagesThisWeek: 0,
        messagesSent: 0
      };
    }
  }
  
  /**
   * Get messages sent by a user
   */
  static async getSentMessages(userUID: string): Promise<VostboxMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'vostbox'),
        where('senderUID', '==', userUID),
        orderBy('sharedAt', 'desc'),
        limit(50)
      );
      
      const messageDocs = await getDocs(messagesQuery);
      
      return messageDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sharedAt: doc.data().sharedAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
        repliedAt: doc.data().repliedAt?.toDate()
      })) as VostboxMessage[];
    } catch (error) {
      console.error('Error getting sent messages:', error);
      return [];
    }
  }
  
  /**
   * Check if a vostcard has been shared with a specific friend
   */
  static async hasSharedVostcard(vostcardID: string, friendUID: string): Promise<boolean> {
    try {
      const shareQuery = query(
        collection(db, 'vostbox'),
        where('vostcardID', '==', vostcardID),
        where('receiverUID', '==', friendUID),
        limit(1)
      );
      
      const shareDocs = await getDocs(shareQuery);
      return !shareDocs.empty;
    } catch (error) {
      console.error('Error checking if vostcard shared:', error);
      return false;
    }
  }
  
  /**
   * Get friends who have received a specific vostcard
   */
  static async getVostcardRecipients(vostcardID: string): Promise<string[]> {
    try {
      const sharesQuery = query(
        collection(db, 'vostbox'),
        where('vostcardID', '==', vostcardID)
      );
      
      const shareDocs = await getDocs(sharesQuery);
      return shareDocs.docs.map(doc => doc.data().receiverUID);
    } catch (error) {
      console.error('Error getting vostcard recipients:', error);
      return [];
    }
  }
  
  /**
   * Clean up old messages (older than 30 days)
   */
  static async cleanupOldMessages(): Promise<{ success: boolean; deleted: number }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldMessagesQuery = query(
        collection(db, 'vostbox'),
        where('sharedAt', '<', thirtyDaysAgo),
        limit(100)
      );
      
      const oldDocs = await getDocs(oldMessagesQuery);
      
      if (oldDocs.empty) {
        return { success: true, deleted: 0 };
      }
      
      const batch = writeBatch(db);
      
      oldDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      return { success: true, deleted: oldDocs.size };
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
      return { success: false, deleted: 0 };
    }
  }
} 