import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { LikeService } from '../services/likeService';
import { RatingService } from '../services/ratingService';

export interface VostcardData {
  id: string;
  title?: string;
  description?: string;
  photoURLs?: string[];
  videoURL?: string;
  audioURLs?: string[];
  audioURL?: string;
  _firebaseAudioURL?: string;
  hasAudio?: boolean;
  username?: string;
  userID?: string;
  userRole?: string;
  createdAt?: any;
  updatedAt?: any;
  state?: string;
  visibility?: string;
  isPrivatelyShared?: boolean;
  likeCount?: number;
  averageRating?: number;
  ratingCount?: number;
  latitude?: number;
  longitude?: number;
  isQuickcard?: boolean;
  isOffer?: boolean;
  categories?: string[];
  offerDetails?: any;
  [key: string]: any;
}

export interface UserProfile {
  username?: string;
  userRole?: string;
  avatarURL?: string;
  buyMeACoffeeURL?: string;
  [key: string]: any;
}

export interface UseVostcardDataOptions {
  /** Whether to load user profile data */
  loadUserProfile?: boolean;
  /** Whether to load like/rating data (requires authentication) */
  loadInteractionData?: boolean;
  /** Whether to check local storage/IndexedDB first (for VostcardDetailView) */
  checkLocalFirst?: boolean;
  /** Custom timeout in milliseconds (default: 15000) */
  timeout?: number;
  /** Whether to allow private shared vostcards (for PublicVostcardView) */
  allowPrivateShared?: boolean;
}

export interface UseVostcardDataReturn {
  // Core data
  vostcard: VostcardData | null;
  userProfile: UserProfile | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Interaction data (when loadInteractionData is true)
  isLiked: boolean;
  userRating: number | null;
  likeCount: number;
  ratingStats: {
    averageRating: number;
    ratingCount: number;
  };
  
  // Computed properties
  hasAudio: boolean;
  
  // Actions
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refetch: () => Promise<void>;
}

export const useVostcardData = (
  vostcardId: string | undefined,
  options: UseVostcardDataOptions = {}
): UseVostcardDataReturn => {
  const {
    loadUserProfile = true,
    loadInteractionData = false,
    checkLocalFirst = false,
    timeout = 15000,
    allowPrivateShared = false
  } = options;

  const { user } = useAuth();
  const { savedVostcards, loadLocalVostcard } = useVostcard();

  // Core state
  const [vostcard, setVostcard] = useState<VostcardData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    ratingCount: 0
  });

  // Computed audio detection
  const hasAudio = useMemo(() => {
    const audioExists = vostcard?.hasAudio || !!(vostcard?.audioURLs?.length > 0);
    console.log('🔍 useVostcardData Audio detection:', {
      audioExists,
      hasAudioFlag: vostcard?.hasAudio,
      audioURLs: vostcard?.audioURLs,
      audioURLsLength: vostcard?.audioURLs?.length || 0,
      legacyAudioURL: vostcard?.audioURL,
      legacy_firebaseAudioURL: vostcard?._firebaseAudioURL
    });
    return audioExists;
  }, [vostcard?.hasAudio, vostcard?.audioURLs, vostcard?.audioURL, vostcard?._firebaseAudioURL]);

  // Main fetch function
  const fetchVostcard = async (): Promise<void> => {
    if (!vostcardId) {
      setError('No vostcard ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Setup timeout
    const timeoutId = setTimeout(() => {
      setError('Loading timed out. Please try again.');
      setLoading(false);
    }, timeout);

    try {
      console.log('📱 useVostcardData: Loading vostcard:', vostcardId);

      let vostcardData: VostcardData | null = null;

      // Step 1: Check local storage first (for VostcardDetailView)
      if (checkLocalFirst) {
        const savedVostcard = savedVostcards.find(v => v.id === vostcardId);
        if (savedVostcard) {
          console.log('📱 Found vostcard in context:', savedVostcard);
          vostcardData = savedVostcard;
        } else {
          console.log('📱 Not found in context, trying IndexedDB...');
          try {
            await loadLocalVostcard(vostcardId);
            const updatedSavedVostcard = savedVostcards.find(v => v.id === vostcardId);
            if (updatedSavedVostcard) {
              console.log('📱 Found vostcard after loading from IndexedDB:', updatedSavedVostcard);
              vostcardData = updatedSavedVostcard;
            }
          } catch (indexedDBError) {
            console.log('📱 Not found in IndexedDB, trying Firestore...');
          }
        }
      }

      // Step 2: Load from Firestore if not found locally
      if (!vostcardData) {
        const docRef = doc(db, 'vostcards', vostcardId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Vostcard found in Firestore:', {
            id: data.id,
            state: data.state,
            isPrivatelyShared: data.isPrivatelyShared,
            title: data.title
          });

          // Validate access permissions
          const isPosted = data.state === 'posted';
          const isPrivateShared = data.isPrivatelyShared;
          
          if (isPosted || (allowPrivateShared && isPrivateShared)) {
            vostcardData = {
              id: vostcardId,
              ...data
            } as VostcardData;
          } else {
            console.log('📱 Vostcard found but not accessible');
            clearTimeout(timeoutId);
            setError(allowPrivateShared 
              ? 'This Vostcard is private and not available for public viewing. The owner needs to share it publicly first.'
              : 'This Vostcard is not available.'
            );
            setLoading(false);
            return;
          }
        } else {
          console.log('📱 Vostcard not found in Firestore');
          clearTimeout(timeoutId);
          setError('Vostcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
          return;
        }
      }

      // Step 3: Set vostcard data and initialize stats
      if (vostcardData) {
        clearTimeout(timeoutId);
        setVostcard(vostcardData);
        setLikeCount(vostcardData.likeCount || 0);
        setRatingStats({
          averageRating: vostcardData.averageRating || 0,
          ratingCount: vostcardData.ratingCount || 0
        });
        setLoading(false);
      }

    } catch (err) {
      console.error('📱 Error loading vostcard:', err);
      clearTimeout(timeoutId);
      setError('Failed to load Vostcard. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!loadUserProfile || !vostcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', vostcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log('🔍 useVostcardData: User profile loaded:', {
            username: userData?.username,
            userRole: userData?.userRole,
            buyMeACoffeeURL: userData?.buyMeACoffeeURL
          });
          setUserProfile(userData);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (vostcard?.userID) {
      fetchUserProfile();
    }
  }, [vostcard?.userID, loadUserProfile]);

  // Load interaction data (likes/ratings)
  useEffect(() => {
    if (!loadInteractionData || !user || !vostcard?.id) return;

    const loadInteractionData = async () => {
      try {
        // Load like status
        const isLiked = await LikeService.isLiked(vostcard.id);
        setIsLiked(isLiked);

        // Load user rating
        const rating = await RatingService.getUserRating(vostcard.id);
        setUserRating(rating);
      } catch (error) {
        console.error('Failed to load interaction data:', error);
      }
    };

    loadInteractionData();
  }, [loadInteractionData, user, vostcard?.id]);

  // Initial fetch
  useEffect(() => {
    fetchVostcard();
  }, [vostcardId, checkLocalFirst, allowPrivateShared, timeout]);

  // Refetch function
  const refetch = async (): Promise<void> => {
    await fetchVostcard();
  };

  return {
    // Core data
    vostcard,
    userProfile,
    
    // Loading states
    loading,
    error,
    
    // Interaction data
    isLiked,
    userRating,
    likeCount,
    ratingStats,
    
    // Computed properties
    hasAudio,
    
    // Actions
    setUserProfile,
    refetch
  };
};
