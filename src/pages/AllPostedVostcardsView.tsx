import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaGlobe, FaHeart, FaStar, FaInfoCircle, FaFilter, FaTimes, FaUser, FaLocationArrow, FaPlay, FaCameraRetro, FaVideo } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';
import FollowButton from '../components/FollowButton';
import { RatingService, type RatingStats } from '../services/ratingService';
import { LocationService, type LocationResult, type LocationError } from '../utils/locationService';

interface Vostcard {
  id: string;
  title: string;
  username?: string;
  createdAt?: any;  // you can adjust type to Timestamp if you use Firestore Timestamps
  [key: string]: any;
}

const AllPostedVostcardsView: React.FC = () => {
  const [vostcards, setVostcards] = useState<Vostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [likeCounts, setLikeCounts] = useState<{ [vostcardId: string]: number }>({});
  const [likedStatus, setLikedStatus] = useState<{ [vostcardId: string]: boolean }>({});
  const [ratingStats, setRatingStats] = useState<{ [vostcardId: string]: RatingStats }>({});
  const [userProfiles, setUserProfiles] = useState<{ [userId: string]: any }>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapAreaPreference, setMapAreaPreference] = useState<'nearby' | '1-mile' | '5-miles' | 'custom'>('nearby');
  const [customDistance, setCustomDistance] = useState(2);
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [showDistanceSlider, setShowDistanceSlider] = useState(false);
  
  // Type filtering state (Offers are never filtered out)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const availableTypes = ['Vostcard', 'Quickcard', 'Guide'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Friends filtering state
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [userFriends, setUserFriends] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleLike, getLikeCount, isLiked, setupLikeListeners } = useVostcard();

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Get distance to vostcard
  const getDistanceToVostcard = useCallback((vostcard: Vostcard): string => {
    if (!userLocation) return '-- km / -- mi away';
    
    const lat = vostcard.latitude || vostcard.geo?.latitude;
    const lng = vostcard.longitude || vostcard.geo?.longitude;
    
    if (!lat || !lng) return '-- km / -- mi away';
    
    const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
    
    if (distance < 1) {
      // Less than 1 km, show in meters and feet
      const meters = Math.round(distance * 1000);
      const feet = Math.round(meters * 3.28084);
      return `${meters}m / ${feet}ft away`;
    } else {
      // 1 km or more, show in km and miles
      const miles = (distance * 0.621371);
      return `${distance.toFixed(1)} km / ${miles.toFixed(1)} mi away`;
    }
  }, [userLocation, calculateDistance]);

  // Load like and rating data for each vostcard
  const loadData = useCallback(async (vostcardIds: string[], vostcardsList: Vostcard[]) => {
    const counts: { [key: string]: number } = {};
    const statuses: { [key: string]: boolean } = {};
    const ratings: { [key: string]: RatingStats } = {};
    const profiles: { [key: string]: any } = {};
    
    // Get unique userIDs from vostcards
    const userIds = [...new Set(vostcardsList.map(v => v.userID).filter(Boolean))];
    
    for (const id of vostcardIds) {
      try {
        const [count, liked, stats] = await Promise.all([
          getLikeCount(id),
          isLiked(id),
          RatingService.getRatingStats(id)
        ]);
        counts[id] = count;
        statuses[id] = liked;
        ratings[id] = stats;
      } catch (error) {
        console.error(`Error loading data for ${id}:`, error);
        counts[id] = 0;
        statuses[id] = false;
        ratings[id] = {
          vostcardID: id,
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: ''
        };
      }
    }
    
    // Fetch user profiles for avatars
    for (const userId of userIds) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          profiles[userId] = userSnap.data();
        }
      } catch (error) {
        console.error(`Error loading user profile for ${userId}:`, error);
      }
    }
    
    setLikeCounts(counts);
    setLikedStatus(statuses);
    setRatingStats(ratings);
    setUserProfiles(profiles);
  }, [getLikeCount, isLiked]);

  useEffect(() => {
    const fetchAllPostedVostcards = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching all posted vostcards and quickcards...');
        
        // Query 1: Regular posted vostcards
        const q1 = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
        const snapshot1 = await getDocs(q1);
        const postedVostcards = snapshot1.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        
        // Query 2: Posted quickcards (they have state: 'posted' AND isQuickcard: true)  
        // Since we already got all posted items in query 1, we just need to include quickcards from that result
        
        // Combine and filter: Include regular vostcards + posted quickcards, exclude offers
        const allContent = postedVostcards.filter(v => 
          !v.isOffer && // Exclude offers
          (
            !v.isQuickcard || // Include regular vostcards
            (v.isQuickcard && v.state === 'posted') // Include posted quickcards
          )
        );
        
        console.log('📋 Loaded vostcards and quickcards:', allContent.length, {
          regular: allContent.filter(v => !v.isQuickcard).length,
          quickcards: allContent.filter(v => v.isQuickcard).length
        });
        
        setVostcards(allContent);
        setLastUpdated(new Date());
        
        // Load like and rating data for all content
        if (allContent.length > 0) {
          await loadData(allContent.map(v => v.id), allContent);
        }
      } catch (error) {
        console.error('Error fetching posted content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPostedVostcards();
  }, [loadData]);

  // Add effect to handle page focus/visibility for refreshing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing vostcards...');
        // Refresh data when page becomes visible
        setLoading(true);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Set up real-time listeners for like and rating updates
  useEffect(() => {
    if (vostcards.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    vostcards.forEach(vostcard => {
      // Like listeners
      const unsubscribeLikes = setupLikeListeners(
        vostcard.id,
        (count) => {
          setLikeCounts(prev => ({ ...prev, [vostcard.id]: count }));
        },
        (liked) => {
          setLikedStatus(prev => ({ ...prev, [vostcard.id]: liked }));
        }
      );
      unsubscribers.push(unsubscribeLikes);

      // Rating listeners
      const unsubscribeRatings = RatingService.listenToRatingStats(vostcard.id, (stats) => {
        setRatingStats(prev => ({ ...prev, [vostcard.id]: stats }));
      });
      unsubscribers.push(unsubscribeRatings);
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [vostcards, setupLikeListeners]);

  // Fetch user friends list
  useEffect(() => {
    const fetchUserFriends = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserFriends(userData.friends || []);
          }
        } catch (error) {
          console.error('Error fetching user friends:', error);
        }
      } else {
        setUserFriends([]);
      }
    };

    fetchUserFriends();
  }, [user]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async (vostcardId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const newLikedStatus = await toggleLike(vostcardId);
      
      // Update local state immediately for better UX
      setLikedStatus(prev => ({
        ...prev,
        [vostcardId]: newLikedStatus
      }));
      
      // Update like count
      setLikeCounts(prev => ({
        ...prev,
        [vostcardId]: newLikedStatus ? (prev[vostcardId] || 0) + 1 : Math.max((prev[vostcardId] || 0) - 1, 0)
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [toggleLike]);

  // Get user location
  const getUserLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      console.log('📍 Getting user location for distance calculations...');
      const location = await LocationService.getCurrentLocation();
      
      const locationCoords: [number, number] = [location.latitude, location.longitude];
      console.log('📍 User location acquired:', locationCoords, `(${location.source})`);
      
      setUserLocation(locationCoords);
      setLocationError(null);
      
    } catch (error) {
      console.error('❌ Location error:', error);
      const locationError = error as LocationError;
      setLocationError(locationError.userFriendlyMessage);
      
      // Use fallback location
      const fallback = LocationService.getFallbackLocation();
      const fallbackCoords: [number, number] = [fallback.latitude, fallback.longitude];
      setUserLocation(fallbackCoords);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Get user location on component mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // Close area selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showAreaSelector && !target.closest('[data-area-selector]')) {
        setShowAreaSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAreaSelector]);

  // Handle area preference change
  const handleAreaPreferenceChange = (area: 'nearby' | '1-mile' | '5-miles' | 'custom') => {
    setMapAreaPreference(area);
    setShowAreaSelector(false);
    if (area === 'custom') {
      setShowDistanceSlider(true);
    } else {
      setShowDistanceSlider(false);
    }
  };

  // Handle custom distance change
  const handleCustomDistanceChange = (distance: number) => {
    setCustomDistance(distance);
  };

  // Filter vostcards based on area preference
  const filterVostcardsByArea = (vostcards: Vostcard[]): Vostcard[] => {
    if (!userLocation) return vostcards;

    switch (mapAreaPreference) {
      case 'nearby':
        // Show vostcards within 800m of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
          return distance <= 0.8; // 800m = 0.8km radius
        });
      
      case '1-mile':
        // Show vostcards within 1 mile (1.6km) of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
          return distance <= 1.6; // 1 mile = 1.6km radius
        });
      
      case '5-miles':
        // Show vostcards within 5 miles (8km) of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
          return distance <= 8; // 5 miles = 8km radius
        });
      
      case 'custom':
        // Show vostcards within the custom distance of user location
        return vostcards.filter(v => {
          const lat = v.latitude || v.geo?.latitude;
          const lng = v.longitude || v.geo?.longitude;
          if (!lat || !lng) return false;
          
          const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
          return distance <= customDistance;
        });
      
      default:
        return vostcards;
    }
  };

  // Type filtering function (Offers are never filtered out)
  const filterVostcardsByType = (vostcards: Vostcard[]): Vostcard[] => {
    // If no types are selected, show all
    if (selectedTypes.length === 0) return vostcards;
    
    return vostcards.filter(v => {
      // Always include offers regardless of type filter
      if (v.isOffer) return true;
      
      // Check if it matches selected types
      if (selectedTypes.includes('Vostcard') && !v.isQuickcard && !v.isOffer && v.userRole !== 'guide') return true;
      if (selectedTypes.includes('Quickcard') && v.isQuickcard) return true;
      if (selectedTypes.includes('Guide') && v.userRole === 'guide' && !v.isOffer) return true;
      
      return false;
    });
  };

  // Combined filtering function
  const filterVostcards = (vostcards: Vostcard[]): Vostcard[] => {
    let filtered = vostcards;
    
    // Apply area filtering first
    filtered = filterVostcardsByArea(filtered);
    
    // Then apply type filtering
    filtered = filterVostcardsByType(filtered);
    
    // Finally apply friends filtering
    if (showFriendsOnly) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of friends filter
        if (v.isOffer) return true;
        
        // Include posts by friends (check if author is in user's friends list)
        return userFriends.includes(v.userID || '');
      });
    }
    
    return filtered;
  };

  // Count by platform (mocked as all Web for now)
  const iosCount = 0;
  const webCount = vostcards.length;

  return (
    <div 
      key={`all-posted-${Date.now()}`}
      style={{ 
        background: '#f5f5f5', 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Add CSS animation for spinning icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Header */}
      <div style={{
        background: '#002B4D',
        color: 'white',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 1, cursor: 'pointer' }}>Vōstcard</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <button
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer' 
            }}
            onClick={() => navigate('/home')}
          >
            <FaHome size={48} />
          </button>
        </div>
      </div>

      {/* Area Selector Dropdown and Custom Distance Slider */}
      {(showAreaSelector || showDistanceSlider) && (
        <div
          style={{
            position: 'fixed',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100
          }}
          data-area-selector
        >
          {/* Custom Distance Slider */}
          {showDistanceSlider && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              padding: '16px',
              minWidth: '200px',
            }}>
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  Custom Distance
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {customDistance} mile{customDistance !== 1 ? 's' : ''}
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={customDistance}
                onChange={(e) => handleCustomDistanceChange(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e0e0e0',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '8px' }}>
                <span>0.5</span>
                <span>10</span>
              </div>
              <button
                onClick={() => setShowDistanceSlider(false)}
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  marginTop: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* Area Selector */}
          {showAreaSelector && !showDistanceSlider && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              padding: '8px 0',
              minWidth: '140px',
            }}>
              {[
                { key: 'nearby', label: '🚶 Near', description: 'Within 800m / .5 miles' },
                { key: '1-mile', label: '🏃 Medium', description: 'Within 1 mile /1.6k' },
                { key: '5-miles', label: '🏃 Far', description: 'Within 5 miles/ 8k' },
                { key: 'custom', label: '📍 Custom', description: 'Custom distance' }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleAreaPreferenceChange(option.key as any)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: mapAreaPreference === option.key ? '#002B4D' : '#333',
                    fontWeight: mapAreaPreference === option.key ? '600' : '400',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{option.label}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Bar */}
      <div style={{
        background: 'white',
        padding: '16px 20px 8px 20px',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        zIndex: 9
      }}>
        <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Nearby Vōstcards</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: '#444' }}>
          <span style={{ fontWeight: 600 }}>
            {(() => {
              const filtered = filterVostcards(vostcards);
              return filtered.length === vostcards.length 
                ? `Total: ${vostcards.length}`
                : `Showing: ${filtered.length} of ${vostcards.length}`;
            })()}
          </span>
          {/* Area Preference Button with Range Label */}
          <div style={{ 
            marginLeft: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <button
              style={{ 
                background: '#f0f0f0', 
                border: '1px solid #ddd',
                borderRadius: '8px',
                color: '#333', 
                fontSize: 14,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setShowAreaSelector(!showAreaSelector)}
            >
              {mapAreaPreference === 'nearby' && <><span>🚶</span>Near</>}
              {mapAreaPreference === '1-mile' && <><span>🏃</span>Medium</>}
              {mapAreaPreference === '5-miles' && <><span>🏃</span>Far</>}
              {mapAreaPreference === 'custom' && <><span>📍</span>Custom</>}
            </button>
            <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>Range</div>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 0 100px 0',
        WebkitOverflowScrolling: 'touch',
        // Prevent bounce scrolling
        overscrollBehavior: 'contain',
        touchAction: 'pan-y'
      } as React.CSSProperties}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>Loading posted Vostcards...</div>
        ) : vostcards.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>No posted Vostcards found.</div>
        ) : (
          filterVostcards(vostcards).map((v, idx) => (
            <React.Fragment key={v.id}>
              <div
                style={{
                  background: 'white',
                  borderRadius: 12,
                  margin: '0 16px',
                  marginTop: idx === 0 ? 16 : 0,
                  marginBottom: 0,
                  padding: '18px 16px 12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
                onClick={() => navigate(`/vostcard/${v.id}`, {
                  state: {
                    vostcardList: vostcards.map(vc => vc.id),
                    currentIndex: idx
                  }
                })}
                onMouseEnter={e => e.currentTarget.style.background = '#f5faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${v.title || 'Untitled'}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/vostcard/${v.id}`, {
                      state: {
                        vostcardList: vostcards.map(vc => vc.id),
                        currentIndex: idx
                      }
                    });
                  }
                }}
              >
                {/* Creator Avatar, Username, and Follow Button - Upper Left */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {userProfiles[v.userID]?.avatarURL ? (
                      <img 
                        src={userProfiles[v.userID].avatarURL} 
                        alt="Creator Avatar" 
                        style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '2px solid #e0e0e0'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: '#e0e0e0',
                        display: userProfiles[v.userID]?.avatarURL ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: 14,
                        fontWeight: 600,
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <FaUser />
                    </div>
                    <div style={{ 
                      color: '#444', 
                      fontSize: 14, 
                      fontWeight: 500 
                    }}>
                      {v.username || 'Unknown'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Play Button - Upper Right */}
                    <button
                      style={{
                        background: '#fff',
                        color: '#002B4D',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vostcard/${v.id}`, {
                          state: {
                            vostcardList: vostcards.map(vc => vc.id),
                            currentIndex: idx
                          }
                        });
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      <FaPlay />
                    </button>

                    {/* Follow Button */}
                    {v.userID && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton 
                          targetUserId={v.userID} 
                          targetUsername={v.username}
                          size="small"
                          variant="secondary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Title Section with Type Indicators */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, flex: 1 }}>
                    {v.title || 'Untitled'}
                  </div>
                  
                  {/* Type Badge with Icon */}
                  <div style={{
                    backgroundColor: v.isQuickcard ? '#FF6B6B' : '#4ECDC4',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}>
                    {v.isQuickcard ? <FaCameraRetro style={{ fontSize: '8px' }} /> : <FaVideo style={{ fontSize: '8px' }} />}
                    {v.isQuickcard ? 'Quick' : 'Vōst'}
                  </div>
                </div>
                
                <div style={{ color: '#888', fontSize: 15, marginBottom: 2 }}>{getDistanceToVostcard(v)}</div>
                

                
                {/* Bottom Row: Star Rating and Like */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 8
                }}>
                  {/* Star Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaStar style={{ color: '#FFD700', fontSize: 18 }} />
                    <span style={{ color: '#888', fontSize: 16, fontWeight: 500 }}>
                      {ratingStats[v.id]?.averageRating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  
                  {/* Heart Like */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: likedStatus[v.id] ? '#ff4444' : '#888', 
                        fontSize: 22, 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        transition: 'color 0.2s, transform 0.1s',
                      }} 
                      onClick={(e) => handleLikeToggle(v.id, e)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <FaHeart />
                    </button>
                    <span style={{ color: '#888', fontSize: 16, fontWeight: 500 }}>
                      {likeCounts[v.id] || 0}
                    </span>
                  </div>
                </div>
              </div>
              {/* Divider */}
              {idx < vostcards.length - 1 && (
                <div style={{ height: 1, background: '#e0e0e0', margin: '8px 0 0 0', marginLeft: 16, marginRight: 16 }} />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Filter/Clear Bar - Fixed for mobile visibility */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={() => {
            setSelectedTypes([]);
            setShowFriendsOnly(false);
          }}
          style={{ 
            background: '#e0e0e0', 
            color: '#333', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px', 
            fontSize: 16, 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            cursor: 'pointer'
          }}
        >
          <FaTimes /> Clear
        </button>
        
        <button 
          onClick={() => setShowFilterModal(true)}
          style={{ 
            background: (selectedTypes.length > 0 || showFriendsOnly) ? '#FF6B35' : '#002B4D', 
            color: 'white', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px', 
            fontSize: 16, 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            cursor: 'pointer'
          }}
        >
          <FaFilter /> Filter {(selectedTypes.length > 0 || showFriendsOnly) && `(${selectedTypes.length + (showFriendsOnly ? 1 : 0)})`}
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 2000
            }}
            onClick={() => setShowFilterModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '300px',
            width: '90%',
            height: '80vh',
            zIndex: 2001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column'
                      }}>
            {/* Scrollable Content Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 24px 0 24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Filter Content</h3>
              
              {/* Friends Filtering - Moved to top */}
              <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: showFriendsOnly ? '#e8f4fd' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    checked={showFriendsOnly}
                    onChange={(e) => setShowFriendsOnly(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  👥 Posts by friends only ({userFriends.length} friends)
                </label>
              </div>
              
              {/* Type Filtering */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#333' }}>Content Type</h4>
                {availableTypes.map((type) => (
                  <label key={type} style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    backgroundColor: selectedTypes.includes(type) ? '#e8f4fd' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes(prev => [...prev, type]);
                        } else {
                          setSelectedTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {type === 'Vostcard' && '📹'} 
                    {type === 'Quickcard' && '📸'} 
                    {type === 'Guide' && '📚'} 
                    {type}
                  </label>
                ))}
              </div>
            </div>
             
            {/* Fixed Button Area */}
            <div style={{
              borderTop: '1px solid #eee',
              padding: '16px 24px',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'white',
              borderRadius: '0 0 12px 12px'
            }}>
              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setShowFriendsOnly(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#002B4D',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AllPostedVostcardsView;