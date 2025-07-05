import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export interface Script {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export class ScriptService {
  static async getUserScripts(userId: string): Promise<Script[]> {
    try {
      console.log('📜 Fetching scripts for user:', userId);
      const scriptsRef = collection(db, "users", userId, "scripts");
      const q = query(scriptsRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const scripts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Script[];
      
      console.log(`✅ Found ${scripts.length} scripts`);
      return scripts;
    } catch (error) {
      console.error('❌ Error fetching scripts:', error);
      throw error;
    }
  }

  static async createScript(userId: string, title: string, content: string): Promise<Script> {
    try {
      console.log('📝 Creating new script:', { userId, title });
      const scriptsRef = collection(db, "users", userId, "scripts");
      const now = new Date();
      
      const scriptData = {
        title: title || "Untitled",
        content: content || "",
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        userId
      };
      
      const docRef = await addDoc(scriptsRef, scriptData);
      console.log('✅ Script created with ID:', docRef.id);
      
      return {
        id: docRef.id,
        title: scriptData.title,
        content: scriptData.content,
        createdAt: now,
        updatedAt: now,
        userId
      };
    } catch (error) {
      console.error('❌ Error creating script:', error);
      throw error;
    }
  }

  static async updateScript(userId: string, scriptId: string, title: string, content: string): Promise<void> {
    try {
      console.log('✏️ Updating script:', { userId, scriptId, title });
      const scriptRef = doc(db, "users", userId, "scripts", scriptId);
      const now = new Date();
      
      await updateDoc(scriptRef, {
        title: title || "Untitled",
        content: content || "",
        updatedAt: Timestamp.fromDate(now)
      });
      
      console.log('✅ Script updated successfully');
    } catch (error) {
      console.error('❌ Error updating script:', error);
      throw error;
    }
  }

  static async deleteScript(userId: string, scriptId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting script:', { userId, scriptId });
      const scriptRef = doc(db, "users", userId, "scripts", scriptId);
      await deleteDoc(scriptRef);
      console.log('✅ Script deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting script:', error);
      throw error;
    }
  }

  static async searchScripts(userId: string, searchTerm: string): Promise<Script[]> {
    try {
      console.log('🔍 Searching scripts:', { userId, searchTerm });
      const scripts = await this.getUserScripts(userId);
      
      const filteredScripts = scripts.filter(script => 
        script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log(`✅ Found ${filteredScripts.length} matching scripts`);
      return filteredScripts;
    } catch (error) {
      console.error('❌ Error searching scripts:', error);
      throw error;
    }
  }
}