import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Vostcard } from '../types/VostcardTypes';
import { db } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp, increment } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  avatarURL?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface Like {
  userId: string;
  username: string;
  avatarURL?: string;
  createdAt: Date;
}

interface Share {
  id: string;
  sharedBy: string;
  sharedTo: string;
  sharedAt: Date;
  message?: string;
}

interface VostcardSocialContextProps {
  // Social state
  likedVostcards: Set<string>;
  comments: Record<string, Comment[]>;
  shares: Record<string, Share[]>;
  isLoading: boolean;
  error: string | null;
  
  // Like operations
  likeVostcard: (vostcardId: string) => Promise<void>;
  unlikeVostcard: (vostcardId: string) => Promise<void>;
  isLiked: (vostcardId: string) => boolean;
  getLikeCount: (vostcardId: string) => Promise<number>;
  
  // Comment operations
  addComment: (vostcardId: string, text: string) => Promise<void>;
  editComment: (vostcardId: string, commentId: string, newText: string) => Promise<void>;
  deleteComment: (vostcardId: string, commentId: string) => Promise<void>;
  loadComments: (vostcardId: string) => Promise<void>;
  getCommentCount: (vostcardId: string) => number;
  
  // Share operations
  shareVostcard: (vostcardId: string, shareTo: string, message?: string) => Promise<void>;
  loadShares: (vostcardId: string) => Promise<void>;
  getShareCount: (vostcardId: string) => number;
  
  // Social data loading
  loadUserSocialData: () => Promise<void>;
  loadVostcardSocialData: (vostcardId: string) => Promise<void>;
  
  // Utility functions
  clearSocialData: () => void;
}

const VostcardSocialContext = createContext<VostcardSocialContextProps | undefined>(undefined);

export const VostcardSocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Social state
  const [likedVostcards, setLikedVostcards] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [shares, setShares] = useState<Record<string, Share[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's social data on mount
  useEffect(() => {
    if (user) {
      loadUserSocialData();
    }
  }, [user]);

  // Like operations
  const likeVostcard = useCallback(async (vostcardId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Add to local state immediately for optimistic UI
      setLikedVostcards(prev => new Set([...prev, vostcardId]));
      
      // Save to Firebase
      const likeRef = doc(db, 'vostcards', vostcardId, 'likes', user.uid);
      await setDoc(likeRef, {
        userId: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        avatarURL: user.photoURL || '',
        createdAt: Timestamp.now()
      });
      
      // Update like count on the vostcard
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await setDoc(vostcardRef, {
        likeCount: increment(1)
      }, { merge: true });
      
      console.log('✅ Liked vostcard:', vostcardId);
      
    } catch (err) {
      // Revert optimistic update on error
      setLikedVostcards(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
      console.error('❌ Failed to like vostcard:', err);
      setError(err instanceof Error ? err.message : 'Failed to like');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const unlikeVostcard = useCallback(async (vostcardId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Remove from local state immediately for optimistic UI
      setLikedVostcards(prev => {
        const newSet = new Set(prev);
        newSet.delete(vostcardId);
        return newSet;
      });
      
      // Remove from Firebase
      const likeRef = doc(db, 'vostcards', vostcardId, 'likes', user.uid);
      await deleteDoc(likeRef);
      
      // Update like count on the vostcard
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await setDoc(vostcardRef, {
        likeCount: increment(-1)
      }, { merge: true });
      
      console.log('✅ Unliked vostcard:', vostcardId);
      
    } catch (err) {
      // Revert optimistic update on error
      setLikedVostcards(prev => new Set([...prev, vostcardId]));
      
      console.error('❌ Failed to unlike vostcard:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlike');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const isLiked = useCallback((vostcardId: string): boolean => {
    return likedVostcards.has(vostcardId);
  }, [likedVostcards]);

  const getLikeCount = useCallback(async (vostcardId: string): Promise<number> => {
    try {
      const likesQuery = query(
        collection(db, 'vostcards', vostcardId, 'likes')
      );
      const snapshot = await getDocs(likesQuery);
      return snapshot.size;
    } catch (err) {
      console.error('Failed to get like count:', err);
      return 0;
    }
  }, []);

  // Comment operations
  const addComment = useCallback(async (vostcardId: string, text: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!text.trim()) throw new Error('Comment cannot be empty');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const commentId = `${user.uid}_${Date.now()}`;
      const newComment: Comment = {
        id: commentId,
        text: text.trim(),
        userId: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        avatarURL: user.photoURL || '',
        createdAt: new Date()
      };
      
      // Add to local state immediately for optimistic UI
      setComments(prev => ({
        ...prev,
        [vostcardId]: [...(prev[vostcardId] || []), newComment]
      }));
      
      // Save to Firebase
      const commentRef = doc(db, 'vostcards', vostcardId, 'comments', commentId);
      await setDoc(commentRef, {
        ...newComment,
        createdAt: Timestamp.fromDate(newComment.createdAt)
      });
      
      // Update comment count on the vostcard
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await setDoc(vostcardRef, {
        commentCount: increment(1)
      }, { merge: true });
      
      console.log('✅ Comment added:', commentId);
      
    } catch (err) {
      // Revert optimistic update on error
      setComments(prev => ({
        ...prev,
        [vostcardId]: (prev[vostcardId] || []).filter(c => c.id !== `${user.uid}_${Date.now()}`)
      }));
      
      console.error('❌ Failed to add comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const editComment = useCallback(async (vostcardId: string, commentId: string, newText: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!newText.trim()) throw new Error('Comment cannot be empty');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update local state immediately for optimistic UI
      setComments(prev => ({
        ...prev,
        [vostcardId]: (prev[vostcardId] || []).map(c => 
          c.id === commentId ? { ...c, text: newText.trim(), updatedAt: new Date() } : c
        )
      }));
      
      // Update in Firebase
      const commentRef = doc(db, 'vostcards', vostcardId, 'comments', commentId);
      await setDoc(commentRef, {
        text: newText.trim(),
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('✅ Comment edited:', commentId);
      
    } catch (err) {
      console.error('❌ Failed to edit comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteComment = useCallback(async (vostcardId: string, commentId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Remove from local state immediately for optimistic UI
      setComments(prev => ({
        ...prev,
        [vostcardId]: (prev[vostcardId] || []).filter(c => c.id !== commentId)
      }));
      
      // Remove from Firebase
      const commentRef = doc(db, 'vostcards', vostcardId, 'comments', commentId);
      await deleteDoc(commentRef);
      
      // Update comment count on the vostcard
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await setDoc(vostcardRef, {
        commentCount: increment(-1)
      }, { merge: true });
      
      console.log('✅ Comment deleted:', commentId);
      
    } catch (err) {
      console.error('❌ Failed to delete comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadComments = useCallback(async (vostcardId: string) => {
    try {
      const commentsQuery = query(
        collection(db, 'vostcards', vostcardId, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(commentsQuery);
      
      const loadedComments: Comment[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Comment[];
      
      setComments(prev => ({
        ...prev,
        [vostcardId]: loadedComments
      }));
      
      console.log(`✅ Loaded ${loadedComments.length} comments for vostcard:`, vostcardId);
      
    } catch (err) {
      console.error('❌ Failed to load comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    }
  }, []);

  const getCommentCount = useCallback((vostcardId: string): number => {
    return (comments[vostcardId] || []).length;
  }, [comments]);

  // Share operations
  const shareVostcard = useCallback(async (vostcardId: string, shareTo: string, message?: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const shareId = `${user.uid}_${Date.now()}`;
      const newShare: Share = {
        id: shareId,
        sharedBy: user.uid,
        sharedTo: shareTo,
        sharedAt: new Date(),
        message: message?.trim()
      };
      
      // Add to local state immediately for optimistic UI
      setShares(prev => ({
        ...prev,
        [vostcardId]: [...(prev[vostcardId] || []), newShare]
      }));
      
      // Save to Firebase
      const shareRef = doc(db, 'vostcards', vostcardId, 'shares', shareId);
      await setDoc(shareRef, {
        ...newShare,
        sharedAt: Timestamp.fromDate(newShare.sharedAt)
      });
      
      // Update share count on the vostcard
      const vostcardRef = doc(db, 'vostcards', vostcardId);
      await setDoc(vostcardRef, {
        shareCount: increment(1)
      }, { merge: true });
      
      console.log('✅ Vostcard shared:', vostcardId, 'to:', shareTo);
      
    } catch (err) {
      // Revert optimistic update on error
      setShares(prev => ({
        ...prev,
        [vostcardId]: (prev[vostcardId] || []).filter(s => s.id !== `${user.uid}_${Date.now()}`)
      }));
      
      console.error('❌ Failed to share vostcard:', err);
      setError(err instanceof Error ? err.message : 'Failed to share');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadShares = useCallback(async (vostcardId: string) => {
    try {
      const sharesQuery = query(
        collection(db, 'vostcards', vostcardId, 'shares'),
        orderBy('sharedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(sharesQuery);
      
      const loadedShares: Share[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sharedAt: doc.data().sharedAt?.toDate() || new Date()
      })) as Share[];
      
      setShares(prev => ({
        ...prev,
        [vostcardId]: loadedShares
      }));
      
      console.log(`✅ Loaded ${loadedShares.length} shares for vostcard:`, vostcardId);
      
    } catch (err) {
      console.error('❌ Failed to load shares:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shares');
    }
  }, []);

  const getShareCount = useCallback((vostcardId: string): number => {
    return (shares[vostcardId] || []).length;
  }, [shares]);

  // Social data loading
  const loadUserSocialData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load user's likes
      const likesQuery = query(
        collection(db, 'userLikes', user.uid, 'vostcards')
      );
      const likesSnapshot = await getDocs(likesQuery);
      const userLikes = new Set(likesSnapshot.docs.map(doc => doc.id));
      setLikedVostcards(userLikes);
      
      console.log(`✅ Loaded ${userLikes.size} liked vostcards for user`);
      
    } catch (err) {
      console.error('❌ Failed to load user social data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load social data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadVostcardSocialData = useCallback(async (vostcardId: string) => {
    try {
      // Load comments and shares in parallel
      await Promise.all([
        loadComments(vostcardId),
        loadShares(vostcardId)
      ]);
    } catch (err) {
      console.error('❌ Failed to load vostcard social data:', err);
    }
  }, [loadComments, loadShares]);

  // Utility functions
  const clearSocialData = useCallback(() => {
    setLikedVostcards(new Set());
    setComments({});
    setShares({});
    setError(null);
    console.log('✅ Social data cleared');
  }, []);

  const value: VostcardSocialContextProps = {
    // Social state
    likedVostcards,
    comments,
    shares,
    isLoading,
    error,
    
    // Like operations
    likeVostcard,
    unlikeVostcard,
    isLiked,
    getLikeCount,
    
    // Comment operations
    addComment,
    editComment,
    deleteComment,
    loadComments,
    getCommentCount,
    
    // Share operations
    shareVostcard,
    loadShares,
    getShareCount,
    
    // Social data loading
    loadUserSocialData,
    loadVostcardSocialData,
    
    // Utility functions
    clearSocialData,
  };

  return (
    <VostcardSocialContext.Provider value={value}>
      {children}
    </VostcardSocialContext.Provider>
  );
};

export const useVostcardSocial = () => {
  const context = useContext(VostcardSocialContext);
  if (context === undefined) {
    throw new Error('useVostcardSocial must be used within a VostcardSocialProvider');
  }
  return context;
};
