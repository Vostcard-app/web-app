import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface FollowingContextType {
  following: string[];
  isFollowing: (targetUserId: string) => boolean;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  refreshFollowing: () => Promise<void>;
}

const FollowingContext = createContext<FollowingContextType | undefined>(undefined);

export const useFollowing = () => {
  const context = useContext(FollowingContext);
  if (!context) throw new Error('useFollowing must be used within a FollowingProvider');
  return context;
};

export const FollowingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);

  const refreshFollowing = useCallback(async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        setFollowing(snapshot.data().following || []);
        console.log('✅ Following list refreshed:', snapshot.data().following?.length || 0);
      } else {
        console.log('📝 User document does not exist, creating following fields...');
        // Create or merge following fields into user document
        await setDoc(userRef, { 
          following: [],
          followers: []
        }, { merge: true });
        setFollowing([]);
      }
    } catch (error) {
      console.error('❌ Error refreshing following list:', error);
    }
  }, [user]);

  const followUser = useCallback(async (targetUserId: string) => {
    if (!user) {
      console.error('❌ Cannot follow user: not authenticated');
      return;
    }
    
    if (user.uid === targetUserId) {
      console.error('❌ Cannot follow yourself');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUserId);
      
      // Update current user's following list
      await updateDoc(userRef, { following: arrayUnion(targetUserId) });
      
      // Update target user's followers list
      await updateDoc(targetRef, { followers: arrayUnion(user.uid) });
      
      // Update local state
      setFollowing((prev) => [...prev, targetUserId]);
      console.log('✅ Successfully followed user:', targetUserId);
    } catch (error) {
      console.error('❌ Error following user:', error);
      throw error;
    }
  }, [user]);

  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!user) {
      console.error('❌ Cannot unfollow user: not authenticated');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUserId);
      
      // Update current user's following list
      await updateDoc(userRef, { following: arrayRemove(targetUserId) });
      
      // Update target user's followers list
      await updateDoc(targetRef, { followers: arrayRemove(user.uid) });
      
      // Update local state
      setFollowing((prev) => prev.filter((id) => id !== targetUserId));
      console.log('✅ Successfully unfollowed user:', targetUserId);
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      throw error;
    }
  }, [user]);

  const isFollowing = useCallback((targetUserId: string) => {
    return following.includes(targetUserId);
  }, [following]);

  useEffect(() => {
    if (user) {
      refreshFollowing();
    } else {
      setFollowing([]);
    }
  }, [user, refreshFollowing]);

  return (
    <FollowingContext.Provider value={{ 
      following, 
      isFollowing, 
      followUser, 
      unfollowUser, 
      refreshFollowing 
    }}>
      {children}
    </FollowingContext.Provider>
  );
}; 