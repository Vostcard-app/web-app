import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  username: string | null;
  userID: string | null;
  userRole: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Setting up Firebase Auth listener...');
    
    // Configure Firebase Auth persistence
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('✅ Firebase Auth persistence set to LOCAL');
      })
      .catch((error) => {
        console.error('❌ Failed to set Firebase Auth persistence:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔐 AuthProvider: Auth state changed:', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAnonymous: currentUser?.isAnonymous
      });

      setLoading(true);
      
      try {
        if (currentUser) {
          console.log('🔐 Firebase Auth user object:', {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            isAnonymous: currentUser.isAnonymous
          });

          setUser(currentUser);
          setUserID(currentUser.uid);

          // Fetch username from Firestore
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              console.log('📄 Firestore user document:', data);
              setUsername(data.username || null);
              setUserRole(data.userRole || null);
            } else {
              console.warn("No user document found for:", currentUser.uid);
              setUsername(null);
              setUserRole(null);
            }
          } catch (error) {
            console.error("Error fetching username:", error);
            setUsername(null);
            setUserRole(null);
          }
        } else {
          console.log('🔐 No user authenticated');
          setUser(null);
          setUsername(null);
          setUserID(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('❌ Error in auth state change handler:', error);
        setUser(null);
        setUsername(null);
        setUserID(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Firebase Auth state change error:', error);
      setLoading(false);
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up Firebase Auth listener');
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      console.log('🔐 Logging out user...');
      await signOut(auth);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    username,
    userID,
    userRole,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};