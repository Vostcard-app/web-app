import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  username: string | null;
  userID: string | null;
  userRole: string | null;
  accountStatus: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  convertUserToGuide: (userIdToConvert: string) => Promise<void>;
  convertUserToAdmin: (userIdToConvert: string) => Promise<void>;
  refreshUserRole: () => Promise<void>;
  isAdmin: boolean;
  isPendingAdvertiser: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if current user is admin
  const isAdmin = userRole === 'admin';
  
  // Check if current user is a pending advertiser
  const isPendingAdvertiser = userRole === 'advertiser' && accountStatus === 'pending';

  // Admin function to convert user to Guide
  const convertUserToGuide = async (userIdToConvert: string) => {
    if (!isAdmin) {
      throw new Error('Only administrators can convert users to Guide accounts');
    }

    try {
      // Update user document to have guide role
      const userDocRef = doc(db, 'users', userIdToConvert);
      await updateDoc(userDocRef, {
        userRole: 'guide',
        convertedToGuideAt: new Date(),
        convertedByAdmin: user?.uid
      });
      
      console.log(`✅ User ${userIdToConvert} converted to Guide account`);
    } catch (error) {
      console.error('❌ Error converting user to Guide:', error);
      throw error;
    }
  };

  // Admin function to convert user to Admin
  const convertUserToAdmin = async (userIdToConvert: string) => {
    if (!isAdmin) {
      throw new Error('Only administrators can convert users to Admin accounts');
    }

    try {
      // Update user document to have admin role
      const userDocRef = doc(db, 'users', userIdToConvert);
      await updateDoc(userDocRef, {
        userRole: 'admin',
        convertedToAdminAt: new Date(),
        convertedByAdmin: user?.uid
      });
      
      console.log(`✅ User ${userIdToConvert} converted to Admin account`);
    } catch (error) {
      console.error('❌ Error converting user to Admin:', error);
      throw error;
    }
  };

  // Force refresh user role from Firestore
  const refreshUserRole = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Manually refreshing user role from Firestore...');
      const userDocRef = doc(db, "users", user.uid);
      const advertiserDocRef = doc(db, "advertisers", user.uid);
      
      const [userDocSnap, advertiserDocSnap] = await Promise.all([
        getDoc(userDocRef), 
        getDoc(advertiserDocRef)
      ]);
      
      // Check advertiser first
      if (advertiserDocSnap.exists()) {
        const advertiserData = advertiserDocSnap.data();
        console.log('✅ Manual refresh - advertiser found:', advertiserData);
        setUsername(advertiserData.businessName || advertiserData.name || null);
        setUserRole('advertiser');
        setAccountStatus(advertiserData.accountStatus || 'approved');
      } else if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('✅ Manual refresh - user found:', userData);
        setUsername(userData.username || null);
        setUserRole(userData.userRole || 'user');
        setAccountStatus('approved');
      } else {
        console.warn('❌ Manual refresh: No user or advertiser document found');
      }
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    }
  };

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

    // Much shorter timeout for initial load to prevent slow experience
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ AuthProvider: Loading state timeout after 2 seconds, forcing loading to false');
      setLoading(false);
    }, 2000); // Reduced from 3 to 2 seconds

    // Quick check for immediate auth state
    const quickAuthCheck = setTimeout(() => {
      if (loading && !auth.currentUser) {
        console.log('⚡ AuthProvider: No user detected after 500ms, proceeding with no auth');
        setLoading(false);
        setUser(null);
        setUsername(null);
        setUserID(null);
        setUserRole(null);
        setAccountStatus(null);
      }
    }, 300); // Reduced from 500ms to 300ms for faster initial check

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔐 AuthProvider: Auth state changed:', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAnonymous: currentUser?.isAnonymous
      });

      // Clear both timeouts since we got an auth state change
      clearTimeout(loadingTimeout);
      clearTimeout(quickAuthCheck);
      
      // Don't set loading to true if we already have user data
      if (!currentUser) {
        setLoading(false);
        setUser(null);
        setUsername(null);
        setUserID(null);
        setUserRole(null);
        setAccountStatus(null);
        return;
      }
      
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

          // Set basic auth immediately for fastest user experience
          console.log('⚡ AuthProvider: Proceeding with basic auth for speed');
          setLoading(false);

          // Fetch user data from Firestore in background - don't block UI
          setTimeout(async () => {
            try {
              const userDocRef = doc(db, "users", currentUser.uid);
              const advertiserDocRef = doc(db, "advertisers", currentUser.uid);
              
              const [userDocSnap, advertiserDocSnap] = await Promise.all([
                getDoc(userDocRef), 
                getDoc(advertiserDocRef)
              ]);

            console.log('🔍 AuthContext Debug:', {
              userExists: userDocSnap?.exists() || false,
              advertiserExists: advertiserDocSnap?.exists() || false,
              userUID: currentUser.uid,
              userEmail: currentUser.email
            });

            // Prioritize advertiser role
            if (advertiserDocSnap?.exists()) {
              const data = advertiserDocSnap.data();
              console.log('📄 Firestore advertiser document found:', data);
              console.log('✅ Setting userRole to: advertiser');
              console.log('📋 Account status:', data.accountStatus || 'approved');
              setUsername(data.businessName || data.name || null);
              setUserRole('advertiser'); // Set as advertiser
              setAccountStatus(data.accountStatus || 'approved'); // Default to approved for existing accounts
            } else if (userDocSnap?.exists()) {
              const data = userDocSnap.data();
              console.log('📄 Firestore user document found:', data);
              console.log('✅ Setting userRole to: user');
              setUsername(data.username || null);
              setUserRole(data.userRole || 'user'); // Changed from data.role
              setAccountStatus('approved'); // Users are automatically approved
            } else {
              console.warn("❌ No user or advertiser document found for:", currentUser.uid);
              setUsername(null);
              setUserRole('user'); // Default to user role for faster experience
              setAccountStatus('approved'); // Default to approved
            }
            } catch (error) {
              console.error("❌ Error fetching user data:", error);
              setUsername(null);
              // Default to basic user role on error
              setUserRole('user');
              setAccountStatus('approved');
            }
          }, 50); // Run Firestore queries after 50ms to not block initial auth
        } else {
          console.log('🔐 No user authenticated - setting up guest state immediately');
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
      clearTimeout(quickAuthCheck);
      setLoading(false);
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up Firebase Auth listener');
      clearTimeout(loadingTimeout);
      clearTimeout(quickAuthCheck);
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
    accountStatus,
    loading,
    logout,
    convertUserToGuide,
    convertUserToAdmin,
    refreshUserRole,
    isAdmin,
    isPendingAdvertiser,
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