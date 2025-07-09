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

    // Add timeout for loading state to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ AuthProvider: Loading state timeout after 15 seconds, forcing loading to false');
      setLoading(false);
    }, 15000); // Increased to 15 seconds

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔐 AuthProvider: Auth state changed:', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAnonymous: currentUser?.isAnonymous
      });

      // Clear the main timeout since we got an auth state change
      clearTimeout(loadingTimeout);
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

          // Add timeout for Firestore queries specifically
          const firestoreTimeout = setTimeout(() => {
            console.warn('⏰ AuthProvider: Firestore query timeout after 8 seconds, proceeding with basic auth');
            setLoading(false);
          }, 8000);

          // Fetch user data from Firestore - check both collections simultaneously
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const advertiserDocRef = doc(db, "advertisers", currentUser.uid);
            
            // Check both collections simultaneously with timeout
            const [userDocSnap, advertiserDocSnap] = await Promise.race([
              Promise.all([getDoc(userDocRef), getDoc(advertiserDocRef)]),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Firestore query timeout')), 7000)
              )
            ]);

            // Clear the Firestore timeout since we got results
            clearTimeout(firestoreTimeout);

            console.log('🔍 AuthContext Debug:', {
              userExists: userDocSnap.exists(),
              advertiserExists: advertiserDocSnap.exists(),
              userUID: currentUser.uid,
              userEmail: currentUser.email
            });

            // Prioritize advertiser role
            if (advertiserDocSnap.exists()) {
              const data = advertiserDocSnap.data();
              console.log('📄 Firestore advertiser document found:', data);
              console.log('✅ Setting userRole to: advertiser');
              setUsername(data.businessName || data.name || null);
              setUserRole('advertiser'); // Set as advertiser
            } else if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              console.log('📄 Firestore user document found:', data);
              console.log('✅ Setting userRole to: user');
              setUsername(data.username || null);
              setUserRole(data.role || 'user'); // Set as regular user
            } else {
              console.warn("❌ No user or advertiser document found for:", currentUser.uid);
              setUsername(null);
              setUserRole(null);
            }
          } catch (error) {
            console.error("❌ Error fetching user data:", error);
            // Clear the Firestore timeout on error
            clearTimeout(firestoreTimeout);
            setUsername(null);
            setUserRole(null);
            
            // If it's a timeout error, we can still proceed with basic auth
            if (error instanceof Error && error.message === 'Firestore query timeout') {
              console.warn('⏰ Proceeding with basic authentication due to Firestore timeout');
            }
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
        console.log('🔐 AuthProvider: Setting loading to false');
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Firebase Auth state change error:', error);
      clearTimeout(loadingTimeout);
      setLoading(false);
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up Firebase Auth listener');
      clearTimeout(loadingTimeout);
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