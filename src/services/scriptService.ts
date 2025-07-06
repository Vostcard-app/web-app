import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Script } from '../types/ScriptModel';

export const ScriptService = {
  async getUserScripts(userID: string): Promise<Script[]> {
    try {
      const scriptsRef = collection(db, 'scripts');
      const q = query(scriptsRef, where('authorId', '==', userID));
      const querySnapshot = await getDocs(q);

      const scripts: Script[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        scripts.push({
          id: docSnap.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt?.toDate().toISOString() || '',
          updatedAt: data.updatedAt?.toDate().toISOString() || '',
          authorId: data.authorId || '',
          tags: data.tags || [],
        });
      });

      return scripts;
    } catch (error) {
      console.error('❌ Error fetching scripts:', error);
      throw error;
    }
  },

  async createScript(userID: string, title: string, content: string): Promise<Script> {
    try {
      const scriptsRef = collection(db, 'scripts');
      const docRef = await addDoc(scriptsRef, {
        title,
        content,
        authorId: userID,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: [],
      });
      console.log('✅ Script created with ID:', docRef.id);

      return {
        id: docRef.id,
        title,
        content,
        authorId: userID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      };
    } catch (error) {
      console.error('❌ Error creating script:', error);
      throw error;
    }
  },

  async updateScript(userID: string, scriptId: string, title: string, content: string): Promise<void> {
    try {
      const scriptRef = doc(db, 'scripts', scriptId);
      await updateDoc(scriptRef, {
        title,
        content,
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Script updated successfully');
    } catch (error) {
      console.error('❌ Error updating script:', error);
      throw error;
    }
  },

  async deleteScript(userID: string, scriptId: string): Promise<void> {
    try {
      const scriptRef = doc(db, 'scripts', scriptId);
      await deleteDoc(scriptRef);
      console.log('✅ Script deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting script:', error);
      throw error;
    }
  },

  async searchScripts(userID: string, searchTerm: string): Promise<Script[]> {
    try {
      const scriptsRef = collection(db, 'scripts');
      const q = query(scriptsRef, where('authorId', '==', userID));
      const querySnapshot = await getDocs(q);

      const scripts: Script[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.title.includes(searchTerm) || data.content.includes(searchTerm)) {
          scripts.push({
            id: docSnap.id,
            title: data.title,
            content: data.content,
            createdAt: data.createdAt?.toDate().toISOString() || '',
            updatedAt: data.updatedAt?.toDate().toISOString() || '',
            authorId: data.authorId || '',
            tags: data.tags || [],
          });
        }
      });

      return scripts;
    } catch (error) {
      console.error('❌ Error searching scripts:', error);
      throw error;
    }
  },
};