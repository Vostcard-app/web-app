import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, Timestamp, setDoc } from 'firebase/firestore';
import type { Script } from '../types/ScriptModel';

export const ScriptService = {
  async getUserScripts(userID: string): Promise<Script[]> {
    try {
      const scriptsCol = collection(db, 'scripts', userID, 'userScripts');
      const querySnapshot = await getDocs(scriptsCol);

      const scripts: Script[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        scripts.push({
          id: docSnap.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt || '',
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
          authorId: userID,
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
      const scriptId = Date.now().toString();
      const scriptRef = doc(db, 'scripts', userID, 'userScripts', scriptId);
      const newScript = {
        title,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      };
      await setDoc(scriptRef, newScript);
      console.log('✅ Script created with ID:', scriptId);

      return {
        id: scriptId,
        title,
        content,
        authorId: userID,
        createdAt: newScript.createdAt,
        updatedAt: newScript.updatedAt,
        tags: [],
      };
    } catch (error) {
      console.error('❌ Error creating script:', error);
      throw error;
    }
  },

  async updateScript(userID: string, scriptId: string, title: string, content: string): Promise<void> {
    try {
      const scriptRef = doc(db, 'scripts', userID, 'userScripts', scriptId);
      await updateDoc(scriptRef, {
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Script updated successfully');
    } catch (error) {
      console.error('❌ Error updating script:', error);
      throw error;
    }
  },

  async deleteScript(userID: string, scriptId: string): Promise<void> {
    try {
      const scriptRef = doc(db, 'scripts', userID, 'userScripts', scriptId);
      await deleteDoc(scriptRef);
      console.log('✅ Script deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting script:', error);
      throw error;
    }
  },

  async searchScripts(userID: string, searchTerm: string): Promise<Script[]> {
    try {
      const scriptsCol = collection(db, 'scripts', userID, 'userScripts');
      const querySnapshot = await getDocs(scriptsCol);

      const scripts: Script[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.title.includes(searchTerm) || data.content.includes(searchTerm)) {
          scripts.push({
            id: docSnap.id,
            title: data.title,
            content: data.content,
            createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt || '',
            updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
            authorId: userID,
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