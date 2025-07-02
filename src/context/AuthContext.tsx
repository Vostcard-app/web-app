import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  username: string | null;
  userID: string | null;
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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
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
          } else {
            console.warn("No user document found for:", currentUser.uid);
            setUsername(null);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
          setUsername(null);
        }
      } else {
        setUser(null);
        setUsername(null);
        setUserID(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    username,
    userID,
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