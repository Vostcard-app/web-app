import React, { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaGlobe, FaHeart, FaStar, FaInfoCircle, FaFilter, FaTimes, FaUser, FaCameraRetro, FaVideo, FaMapPin } from 'react-icons/fa';
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
  
  // Type filtering state (Offers are never filtered out)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const availableTypes = ['Vostcard', 'Quickcard', 'Guide'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Category filtering state (same as HomeView)
  const availableCategories = [
    'None',
    'View',
    'Landmark',
    'Fun Fact',
    'Macabre',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Friends filtering state
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [userFriends, setUserFriends] = useState<string[]>([]);
  

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  // Add refs for search input and results
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleLike, getLikeCount, isLiked, setupLikeListeners } = useVostcard();

  // Real-time location search with debouncing - using same implementation as BrowseAreaView
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        console.log('🔍 Searching for location:', searchQuery);

        const response = await fetch('/.netlify/functions/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'search',
            searchQuery: searchQuery.trim()
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            console.log('🔍 No results found for:', searchQuery);
            setSearchResults([]);
            setShowDropdown(false);
          } else {
            console.error('🔍 Search error:', data.error);
            setSearchError(data.error || 'Search failed');
          }
          return;
        }

        const results = data.results || [];
        console.log('🔍 Found results:', results.length);
        
        // Format results to match expected structure
        const formattedResults = results.map((result: any) => ({
          name: result.name,
          coordinates: [Number(result.latitude), Number(result.longitude)],
          type: result.type,
          displayAddress: result.displayAddress,
          latitude: Number(result.latitude),
          longitude: Number(result.longitude)
        }));

        setSearchResults(formattedResults);
        setShowDropdown(formattedResults.length > 0);
        setHighlightedIndex(-1);

      } catch (error) {
        console.error('🔍 Search failed:', error);
        setSearchError('Search failed. Please try again.');
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Add keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        handleLocationSelect(searchResults[highlightedIndex]);
        setShowDropdown(false);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FIXED: Changed behavior to filter list instead of navigating
  const handleLocationSelect = (location: any) => {
    console.log('🗺️ Location selected for browse:', location);
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowDropdown(false);
  };

  // Handle browse area button click - using same implementation as BrowseAreaView
  const handleBrowseArea = () => {
    console.log('🗺️ Browse Area button clicked');
    console.log('📍 Selected location:', selectedLocation);
    
    if (selectedLocation) {
      console.log('📍 Coordinates being sent:', selectedLocation.coordinates);
      console.log('📍 Latitude:', selectedLocation.latitude, 'Longitude:', selectedLocation.longitude);
      
      navigate('/home', {
        state: {
          browseLocation: {
            coordinates: selectedLocation.coordinates,
            name: selectedLocation.name,
            id: selectedLocation.id,
            type: selectedLocation.type,
            place: selectedLocation.place,
          },
        },
      });
    }
  };

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

  // Get distance in km for sorting (returns large number if no location data)
  const getDistanceForSorting = useCallback((vostcard: Vostcard): number => {
    if (!userLocation) return 999999; // Put items without user location at end
    
    const lat = vostcard.latitude || vostcard.geo?.latitude;
    const lng = vostcard.longitude || vostcard.geo?.longitude;
    
    if (!lat || !lng) return 999999; // Put items without coordinates at end
    
    return calculateDistance(userLocation[0], userLocation[1], lat, lng);
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

  // Get user location for distance calculations
  const getUserLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      console.log('📍 Getting user location for distance sorting...');
      const location = await LocationService.getCurrentLocation();
      
      const locationCoords: [number, number] = [location.latitude, location.longitude];
      console.log('📍 User location acquired:', locationCoords, `(${location.source})`);
      
      setUserLocation(locationCoords);
      setLocationError(null);
      
    } catch (error) {
      console.error('❌ Location error:', error);
      const locationError = error as LocationError;
      setLocationError(locationError.userFriendlyMessage);
      
      // Use fallback location for sorting
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

  // Combined filtering and sorting function
  const filterVostcards = (vostcards: Vostcard[]): Vostcard[] => {
    let filtered = vostcards;
    
    // Apply type filtering
    filtered = filterVostcardsByType(filtered);
    
    // Apply category filtering (same logic as HomeView)
    if (selectedCategories.length > 0 && !selectedCategories.includes('None')) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of category filter
        if (v.isOffer) return true;
        
        if (!v.categories || !Array.isArray(v.categories)) return false;
        return v.categories.some((cat: string) => selectedCategories.includes(cat));
      });
    }
    
    // Apply friends filtering
    if (showFriendsOnly) {
      filtered = filtered.filter(v => {
        // Always include offers regardless of friends filter
        if (v.isOffer) return true;
        
        // Include posts by friends (check if author is in user's friends list)
        return userFriends.includes(v.userID || '');
      });
    }
    
    // Sort by distance (closest first)
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
        const distanceA = getDistanceForSorting(a);
        const distanceB = getDistanceForSorting(b);
        return distanceA - distanceB;
      });
    }
    
    // NEW: Apply location filtering when browse location is selected
    if (selectedLocation) {
      filtered = filtered.filter(vostcard => {
        if (!vostcard.latitude || !vostcard.longitude) return false;
        
        const distance = calculateDistance(
          selectedLocation.latitude,
          selectedLocation.longitude,
          vostcard.latitude,
          vostcard.longitude
        );
        
        return distance <= 50; // 50km radius
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'auto'
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
        zIndex: 1000,
        position: 'absolute', // <-- changed from 'fixed' to 'absolute'
        top: 0,
        left: 0,
        right: 0,
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
            <FaHome size={40} />
          </button>
        </div>
      </div>



      {/* Summary Bar */}
      <div style={{
        background: 'white',
        padding: '16px 20px 8px 20px',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        zIndex: 9,
        marginTop: '80px', // Account for fixed header
      }}>
        <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Local Vōstcards</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: '#444' }}>
          <span style={{ fontWeight: 600 }}>
            {(() => {
              const filtered = filterVostcards(vostcards);
              return filtered.length === vostcards.length 
                ? `Total: ${vostcards.length}`
                : `Showing: ${filtered.length} of ${vostcards.length}`;
            })()}
          </span>

        </div>
      </div>

      {/* Search Section - moved outside modal for better mobile keyboard handling */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        zIndex: 9,
      }}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <FaMapPin style={{ color: '#666', marginLeft: '12px', marginRight: '8px' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for any location worldwide..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                padding: '12px 8px',
                fontSize: '16px',
                background: 'transparent'
              }}
            />
            {isSearching && (
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid transparent',
                borderTop: '2px solid #666',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }} />
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '2px solid #002B4D',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 43, 77, 0.2)',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 9999,
              marginTop: '4px'
            }} ref={resultsRef}>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onMouseDown={() => handleLocationSelect(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: index < searchResults.length - 1 ? '1px solid #e9ecef' : 'none',
                    backgroundColor: index === highlightedIndex ? '#f0f8ff' : 'transparent',
                    borderLeft: index === highlightedIndex ? '4px solid #002B4D' : '4px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FaMapPin style={{ marginRight: '12px', color: '#002B4D', fontSize: '14px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '600' }}>
                      {result.name}
                    </span>
                    {result.displayAddress && result.displayAddress !== result.name ? (
                      <span style={{ color: '#666', fontWeight: '400', fontSize: 13, display: 'block' }}>
                        {result.displayAddress}
                      </span>
                    ) : null}
                  </div>
                  <span style={{ color: '#aaa', fontSize: 12, marginLeft: 8 }}>
                    Location
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {searchError && (
            <div style={{ color: '#d32f2f', fontSize: '14px', marginTop: '8px' }}>
              {searchError}
            </div>
          )}
        </div>

        {/* Browse Area Button - appears when location is selected */}
        {selectedLocation && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '12px'
            }}>
              <FaMapPin style={{ color: '#002B4D', marginRight: '8px' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                View vostcards near {selectedLocation.name}
              </span>
            </div>
            <button
              onClick={handleBrowseArea}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001a33'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
            >
              Browse Area
            </button>
          </div>
        )}
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
                    vostcardList: filterVostcards(vostcards).map(vc => vc.id),
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
                        vostcardList: filterVostcards(vostcards).map(vc => vc.id),
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
                          border: '2px solid #e0e0e0',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (v.userID) {
                            navigate(`/user-profile/${v.userID}`);
                          }
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
                        border: '2px solid #e0e0e0',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (v.userID) {
                          navigate(`/user-profile/${v.userID}`);
                        }
                      }}
                    >
                      <FaUser />
                    </div>
                    <div 
                      style={{ 
                        color: '#444', 
                        fontSize: 14, 
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (v.userID) {
                          navigate(`/user-profile/${v.userID}`);
                        }
                      }}
                    >
                      {v.username || 'Unknown'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* View Button - Upper Right */}
                    <button
                      style={{
                        background: '#002B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,43,77,0.15)',
                        transition: 'all 0.2s ease',
                        minWidth: '60px',
                        height: 36
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
                        e.currentTarget.style.backgroundColor = '#001f35';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,43,77,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#002B4D';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,43,77,0.15)';
                      }}
                    >
                      View
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
                  setSelectedCategories([]);
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
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
        
        <button 
          onClick={() => navigate('/browse-area')}
          style={{ 
            background: '#002B4D', 
            color: 'white', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px', 
            fontSize: 16, 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          Browse
        </button>
        
        <button 
          onClick={() => setShowFilterModal(true)}
          style={{ 
            background: (
              selectedTypes.length > 0 || 
              showFriendsOnly ||
              (selectedCategories.length > 0 && !selectedCategories.includes('None'))
            ) ? '#FF6B35' : '#002B4D', 
            color: 'white', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px', 
            fontSize: 16, 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          Filter {(
            selectedTypes.length > 0 || 
            showFriendsOnly ||
            (selectedCategories.length > 0 && !selectedCategories.includes('None'))
          ) && `(${
            selectedTypes.length + 
            (showFriendsOnly ? 1 : 0) + 
            (selectedCategories.length > 0 && !selectedCategories.includes('None') ? selectedCategories.length : 0)
          })`}
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
              
              {/* Category Filtering */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#333' }}>Category</h4>
                {availableCategories.map((category) => (
                  <label key={category} style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    backgroundColor: selectedCategories.includes(category) ? '#f0f8ff' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (category === 'None') {
                            setSelectedCategories(['None']);
                          } else {
                            setSelectedCategories(prev => prev.filter(c => c !== 'None').concat(category));
                          }
                        } else {
                          setSelectedCategories(prev => prev.filter(c => c !== category));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {category}
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