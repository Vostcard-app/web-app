import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  deleteDoc,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

export interface PrivateVostcard {
  id: string;
  senderUserID: string;
  senderUsername: string;
  recipientUserID: string;
  recipientUsername: string;
  title: string;
  description: string;
  videoURL: string;
  photoURLs: string[];
  categories: string[];
  geo?: { latitude: number; longitude: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isRead: boolean;
  script?: string;
  scriptId?: string;
}

export interface PrivateVostcardSummary {
  totalSent: number;
  totalReceived: number;
  unreadCount: number;
}

export class PrivateVostcardService {
  
  /**
   * Send a private Vostcard to a specific user
   */
  static async sendPrivateVostcard(
    vostcard: {
      video: Blob | null;
      photos: Blob[];
      title: string;
      description: string;
      categories: string[];
      geo?: { latitude: number; longitude: number };
      script?: string;
      scriptId?: string;
    },
    recipientUserID: string,
    recipientUsername: string,
    senderUserID: string,
    senderUsername: string
  ): Promise<string> {
    try {
      const privateVostcardId = uuidv4();
      
      // Upload video to Firebase Storage
      let videoURL = '';
      if (vostcard.video) {
        const videoRef = ref(storage, `private-vostcards/${privateVostcardId}/video.webm`);
        const videoSnapshot = await uploadBytes(videoRef, vostcard.video);
        videoURL = await getDownloadURL(videoSnapshot.ref);
      }
      
      // Upload photos to Firebase Storage
      const photoURLs: string[] = [];
      if (vostcard.photos && vostcard.photos.length > 0) {
        for (let i = 0; i < vostcard.photos.length; i++) {
          const photoRef = ref(storage, `private-vostcards/${privateVostcardId}/photo_${i}.jpg`);
          const photoSnapshot = await uploadBytes(photoRef, vostcard.photos[i]);
          const photoURL = await getDownloadURL(photoSnapshot.ref);
          photoURLs.push(photoURL);
        }
      }
      
      // Create private Vostcard document
      const privateVostcardData: PrivateVostcard = {
        id: privateVostcardId,
        senderUserID,
        senderUsername,
        recipientUserID,
        recipientUsername,
        title: vostcard.title,
        description: vostcard.description,
        videoURL,
        photoURLs,
        categories: vostcard.categories,
        geo: vostcard.geo,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        isRead: false,
        script: vostcard.script,
        scriptId: vostcard.scriptId
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'privateVostcards', privateVostcardId), privateVostcardData);
      
      console.log('✅ Private Vostcard sent successfully:', privateVostcardId);
      return privateVostcardId;
      
    } catch (error) {
      console.error('❌ Error sending private Vostcard:', error);
      throw error;
    }
  }
  
  /**
   * Get all private Vostcards sent to a specific user
   */
  static async getReceivedPrivateVostcards(userID: string): Promise<PrivateVostcard[]> {
    try {
      const q = query(
        collection(db, 'privateVostcards'),
        where('recipientUserID', '==', userID),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const privateVostcards: PrivateVostcard[] = [];
      
      querySnapshot.forEach((doc) => {
        privateVostcards.push({ ...doc.data() } as PrivateVostcard);
      });
      
      return privateVostcards;
      
    } catch (error) {
      console.error('❌ Error fetching received private Vostcards:', error);
      throw error;
    }
  }
  
  /**
   * Get all private Vostcards sent by a specific user
   */
  static async getSentPrivateVostcards(userID: string): Promise<PrivateVostcard[]> {
    try {
      const q = query(
        collection(db, 'privateVostcards'),
        where('senderUserID', '==', userID),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const privateVostcards: PrivateVostcard[] = [];
      
      querySnapshot.forEach((doc) => {
        privateVostcards.push({ ...doc.data() } as PrivateVostcard);
      });
      
      return privateVostcards;
      
    } catch (error) {
      console.error('❌ Error fetching sent private Vostcards:', error);
      throw error;
    }
  }
  
  /**
   * Mark a private Vostcard as read
   */
  static async markAsRead(privateVostcardId: string): Promise<void> {
    try {
      const docRef = doc(db, 'privateVostcards', privateVostcardId);
      await setDoc(docRef, {
        isRead: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Private Vostcard marked as read:', privateVostcardId);
      
    } catch (error) {
      console.error('❌ Error marking private Vostcard as read:', error);
      throw error;
    }
  }
  
  /**
   * Delete a private Vostcard
   */
  static async deletePrivateVostcard(privateVostcardId: string, userID: string): Promise<void> {
    try {
      const docRef = doc(db, 'privateVostcards', privateVostcardId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Private Vostcard not found');
      }
      
      const data = docSnap.data() as PrivateVostcard;
      
      // Only allow sender or recipient to delete
      if (data.senderUserID !== userID && data.recipientUserID !== userID) {
        throw new Error('Not authorized to delete this private Vostcard');
      }
      
      await deleteDoc(docRef);
      console.log('✅ Private Vostcard deleted:', privateVostcardId);
      
    } catch (error) {
      console.error('❌ Error deleting private Vostcard:', error);
      throw error;
    }
  }
  
  /**
   * Get private Vostcard summary for a user
   */
  static async getPrivateVostcardSummary(userID: string): Promise<PrivateVostcardSummary> {
    try {
      const [received, sent] = await Promise.all([
        this.getReceivedPrivateVostcards(userID),
        this.getSentPrivateVostcards(userID)
      ]);
      
      const unreadCount = received.filter(v => !v.isRead).length;
      
      return {
        totalSent: sent.length,
        totalReceived: received.length,
        unreadCount
      };
      
    } catch (error) {
      console.error('❌ Error getting private Vostcard summary:', error);
      throw error;
    }
  }
  
  /**
   * Listen to real-time updates for received private Vostcards
   */
  static listenToReceivedPrivateVostcards(
    userID: string,
    onUpdate: (privateVostcards: PrivateVostcard[]) => void
  ): () => void {
    const q = query(
      collection(db, 'privateVostcards'),
      where('recipientUserID', '==', userID),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const privateVostcards: PrivateVostcard[] = [];
      querySnapshot.forEach((doc) => {
        privateVostcards.push({ ...doc.data() } as PrivateVostcard);
      });
      onUpdate(privateVostcards);
    });
    
    return unsubscribe;
  }
  
  /**
   * Listen to real-time updates for sent private Vostcards
   */
  static listenToSentPrivateVostcards(
    userID: string,
    onUpdate: (privateVostcards: PrivateVostcard[]) => void
  ): () => void {
    const q = query(
      collection(db, 'privateVostcards'),
      where('senderUserID', '==', userID),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const privateVostcards: PrivateVostcard[] = [];
      querySnapshot.forEach((doc) => {
        privateVostcards.push({ ...doc.data() } as PrivateVostcard);
      });
      onUpdate(privateVostcards);
    });
    
    return unsubscribe;
  }
  
  /**
   * Get a single private Vostcard by ID
   */
  static async getPrivateVostcard(privateVostcardId: string): Promise<PrivateVostcard | null> {
    try {
      const docRef = doc(db, 'privateVostcards', privateVostcardId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...docSnap.data() } as PrivateVostcard;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching private Vostcard:', error);
      throw error;
    }
  }
  
  /**
   * Search for users to send private Vostcards to
   */
  static async searchUsers(searchTerm: string, currentUserID: string): Promise<Array<{id: string, username: string, avatarURL?: string}>> {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const users: Array<{id: string, username: string, avatarURL?: string}> = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Don't include current user
        if (userId === currentUserID) return;
        
        // Simple search - check if username contains search term
        if (userData.username && userData.username.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push({
            id: userId,
            username: userData.username,
            avatarURL: userData.avatarURL
          });
        }
      });
      
      return users.slice(0, 10); // Limit to 10 results
      
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw error;
    }
  }
} 