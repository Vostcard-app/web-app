import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaShare, FaUserCircle, FaMap, FaCalendar, FaEye, FaPlay, FaPhotoVideo } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { Trip, TripItem } from '../types/TripTypes';
import MultiPhotoModal from '../components/MultiPhotoModal';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

interface VostcardData {
  id: string;
  title: string;
  description: string;
  photoURLs: string[];
  videoURL?: string;
  username: string;
  createdAt: any;
  isQuickcard?: boolean;
  latitude?: number;
  longitude?: number;
}

const PublicTripView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tripPosts, setTripPosts] = useState<VostcardData[]>([]);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  
  // Slideshow states
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [loadingSlideshowImages, setLoadingSlideshowImages] = useState(false);

  // Load trip data
  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) {
        setError('No trip ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }, 15000); // 15 second timeout

      try {
        console.log('📱 Loading trip for sharing:', id);
        const docRef = doc(db, 'trips', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Trip;
          console.log('📱 Trip found:', {
            id: data.id,
            name: data.name,
            isShared: data.isShared
          });
          
          // Check if trip is shared or public
          // Allow access if: explicitly shared, public visibility, or not private (legacy)
          if (data.isShared || data.visibility === 'public' || data.isPrivate === false) {
            // Load trip items from subcollection
            console.log('🔍 Loading trip items from subcollection...');
            try {
              const itemsQuery = query(
                collection(db, 'trips', id, 'items'),
                orderBy('order', 'asc')
              );
              const itemsSnapshot = await getDocs(itemsQuery);
              const items: TripItem[] = [];
              
              itemsSnapshot.forEach((itemDoc) => {
                const itemData = itemDoc.data() as TripItem;
                items.push({
                  id: itemData.id,
                  vostcardID: itemData.vostcardID,
                  type: itemData.type,
                  order: itemData.order,
                  addedAt: itemData.addedAt,
                  title: itemData.title,
                  description: itemData.description,
                  photoURL: itemData.photoURL,
                  latitude: itemData.latitude,
                  longitude: itemData.longitude
                });
              });
              
              console.log('✅ Loaded trip items:', items.length);
              
              // Add items to trip data
              const tripWithItems = { ...data, items };
              clearTimeout(timeoutId);
              setTrip(tripWithItems);
              setLoading(false);
            } catch (itemsError) {
              console.error('❌ Error loading trip items:', itemsError);
              // Still show the trip even if items fail to load
              clearTimeout(timeoutId);
              setTrip({ ...data, items: [] });
              setLoading(false);
            }
          } else {
            clearTimeout(timeoutId);
            setError('This trip is not available for public viewing.');
            setLoading(false);
          }
        } else {
          clearTimeout(timeoutId);
          setError('Trip not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Error loading trip:', err);
        setError('Failed to load trip. Please try again.');
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  // Load user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!trip?.userID) return;
      
      try {
        const userRef = doc(db, 'users', trip.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (trip?.userID) {
      fetchUserProfile();
    }
  }, [trip?.userID]);

  // Load trip posts data
  useEffect(() => {
    const fetchTripPosts = async () => {
      console.log('🔄 Fetching trip posts for:', trip?.name);
      console.log('📋 Trip items:', trip?.items);
      
      if (!trip?.items) {
        console.log('❌ No trip items found');
        return;
      }

      if (trip.items.length === 0) {
        console.log('❌ Trip items array is empty');
        return;
      }

      try {
        const postsData: VostcardData[] = [];
        
        // Sort items by order to maintain trip sequence
        const sortedItems = [...trip.items].sort((a, b) => a.order - b.order);
        console.log('📊 Sorted items:', sortedItems.length);

        // Fetch full vostcard data for each item
        for (const item of sortedItems) {
          console.log('🔍 Loading vostcard:', item.vostcardID);
          try {
            const vostcardRef = doc(db, 'vostcards', item.vostcardID);
            const vostcardSnap = await getDoc(vostcardRef);
            
            if (vostcardSnap.exists()) {
              const vostcardData = vostcardSnap.data() as VostcardData;
              console.log('✅ Loaded vostcard:', vostcardData.title);
              postsData.push({
                id: vostcardData.id,
                title: vostcardData.title || 'Untitled',
                description: vostcardData.description || '',
                photoURLs: vostcardData.photoURLs || [],
                videoURL: vostcardData.videoURL,
                username: vostcardData.username || 'Unknown User',
                createdAt: vostcardData.createdAt,
                isQuickcard: vostcardData.isQuickcard,
                // ✅ Preserve location data from trip item (this is the key fix!)
                latitude: item.latitude,
                longitude: item.longitude
              });
            } else {
              console.log('❌ Vostcard not found:', item.vostcardID);
            }
          } catch (error) {
            console.error(`❌ Error loading post ${item.vostcardID}:`, error);
          }
        }

        console.log('📱 Final posts data:', postsData.length, postsData);
        setTripPosts(postsData);
      } catch (error) {
        console.error('❌ Error loading trip posts:', error);
      }
    };

    fetchTripPosts();
  }, [trip]);

  const handlePostClick = (postId: string, isQuickcard?: boolean) => {
    // Navigate to the appropriate public post view
    if (isQuickcard) {
      navigate(`/share-quickcard/${postId}`);
    } else {
      navigate(`/share/${postId}`);
    }
  };

  // Slideshow functionality - collect all images from trip posts
  const collectTripImages = async (): Promise<string[]> => {
    if (!tripPosts || tripPosts.length === 0) return [];
    
    setLoadingSlideshowImages(true);
    const allImages: string[] = [];
    
    try {
      console.log(`🎬 Collecting images from ${tripPosts.length} trip posts for slideshow`);
      
      // Get all images from all posts in order
      for (const post of tripPosts) {
        if (post.photoURLs && Array.isArray(post.photoURLs)) {
          console.log(`📷 Adding ${post.photoURLs.length} images from post: ${post.title}`);
          allImages.push(...post.photoURLs);
        }
      }

      console.log(`✅ Collected ${allImages.length} images total for slideshow`);
      return allImages;
    } catch (error) {
      console.error('❌ Error collecting trip images:', error);
      return [];
    } finally {
      setLoadingSlideshowImages(false);
    }
  };

  // Handle slideshow button click
  const handleSlideshowClick = async () => {
    console.log('🎬 Slideshow button clicked!');
    
    if (slideshowImages.length === 0) {
      console.log('🔄 Collecting images for slideshow...');
      const images = await collectTripImages();
      setSlideshowImages(images);
      
      if (images.length > 0) {
        console.log(`✅ Starting slideshow with ${images.length} images`);
        setShowSlideshow(true);
      } else {
        console.log('❌ No images found for slideshow');
        alert('No images found in this trip to display in slideshow.');
      }
    } else {
      console.log(`✅ Starting slideshow with ${slideshowImages.length} cached images`);
      setShowSlideshow(true);
    }
  };

  const handleShareTrip = async () => {
    console.log('🔗 Share button clicked for trip:', trip?.name);
    
    try {
      const shareUrl = `${window.location.origin}/share-trip/${id}`;
      const shareText = `Check out this trip I created with Vōstcard

"${trip?.name || 'My Trip'}"

${trip?.description || 'A collection of my favorite places'}

${shareUrl}`;
      
      console.log('📱 Checking navigator.share availability:', !!navigator.share);
      
      if (navigator.share) {
        console.log('📱 Using native share API');
        await navigator.share({
          title: trip?.name || 'Check out this trip!',
          text: shareText,
          url: shareUrl
        });
        console.log('✅ Native share completed');
      } else {
        console.log('📋 Falling back to clipboard');
        await navigator.clipboard.writeText(shareText);
        alert('✅ Trip link copied to clipboard!\n\nShare this with anyone to let them view your trip.');
      }
    } catch (error) {
      console.error('❌ Error sharing trip:', error);
      
      // If native share fails, try clipboard as fallback
      if (navigator.share && error.name === 'AbortError') {
        console.log('ℹ️ User cancelled share dialog');
        return; // User cancelled, don't show error
      }
      
      // Final fallback - try clipboard
      try {
        const shareUrl = `${window.location.origin}/share-trip/${id}`;
        const shareText = `Check out this trip: ${trip?.name || 'My Trip'}\n\n${shareUrl}`;
        await navigator.clipboard.writeText(shareText);
        alert('✅ Trip link copied to clipboard!\n\nShare this with anyone to let them view your trip.');
      } catch (clipboardError) {
        console.error('❌ Clipboard also failed:', clipboardError);
        // Manual fallback
        const shareUrl = `${window.location.origin}/share-trip/${id}`;
        prompt('Copy this link to share the trip:', shareUrl);
      }
    }
  };

  // Format creation date
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString();
      } else if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString();
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        return new Date(dateValue).toLocaleDateString();
      }
      return String(dateValue);
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🧳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading trip...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#fff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧳</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px' 
        }}>
          {error?.includes('not found') ? 'Trip Not Found' : 'Unable to Load Trip'}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '24px',
          maxWidth: '400px',
          lineHeight: 1.5
        }}>
          {error?.includes('not found') 
            ? 'This trip may have been deleted or the link is invalid. Please check the link and try again.'
            : error?.includes('not available') 
            ? 'This trip is private and not available for public viewing.'
            : error?.includes('timed out')
            ? 'The trip is taking too long to load.'
            : error || 'There was an error loading the trip.'
          }
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Join Vōstcard
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = userProfile?.avatarURL;

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Banner */}
      <div style={{
        background: '#07345c',
        padding: '15px 16px 15px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 1000,
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '30px', cursor: 'pointer' }}>
          Vōstcard
        </span>
        
        <div 
          onClick={() => setShowTutorialModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={RoundInfoButton} 
            alt="Round Info Button" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            What's Vōstcard
          </span>
        </div>
      </div>

      {/* User Info Section */}
      <div style={{
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 20px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div 
            style={{ 
              width: 50, 
              height: 50, 
              borderRadius: '50%', 
              overflow: 'hidden',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (trip?.userID) {
                navigate(`/user-profile/${trip.userID}`);
              }
            }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={userProfile?.username || 'User'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
              />
            ) : (
              <FaUserCircle size={50} color="#ccc" />
            )}
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <div 
              style={{ 
                fontWeight: 600, 
                fontSize: 16,
                color: '#333',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (trip?.userID) {
                  navigate(`/user-profile/${trip.userID}`);
                }
              }}
            >
              {userProfile?.username || 'Anonymous'}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Creator
            </div>
          </div>
        </div>

        {/* Login/Register Button */}
        <button
          type="button"
          style={{
            cursor: 'pointer',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#007bff',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: 'none',
            whiteSpace: 'nowrap'
          }}
          onClick={() => navigate('/register')}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Login / Register
        </button>
      </div>

      {/* Scrollable Main Content */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* Trip Title */}
        <div style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px',
          textAlign: 'center',
          lineHeight: 1.3
        }}>
          {trip.name || 'Untitled Trip'}
        </div>

        {/* Trip Description */}
        {trip.description && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <p style={{ 
              margin: '0',
              fontSize: '14px', 
              color: '#555',
              lineHeight: '1.4',
              textAlign: 'center'
            }}>
              {trip.description}
            </p>
          </div>
        )}

        {/* View Mode Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          justifyContent: 'center'
        }}>
          <button
            style={{
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <FaEye size={12} />
            List View
          </button>
          
          <button
            onClick={() => {
              console.log('🗺️ Map button clicked!');
              console.log('📊 Trip data:', trip);
              console.log('📊 Trip posts count:', tripPosts.length);
              console.log('📊 Trip posts data:', tripPosts);
              
              if (trip && tripPosts.length > 0) {
                // Filter posts that have location data
                const postsWithLocation = tripPosts.filter(post => {
                  console.log('🔍 Checking post for location:', {
                    id: post.id,
                    title: post.title,
                    latitude: post.latitude,
                    longitude: post.longitude,
                    hasLatitude: !!post.latitude,
                    hasLongitude: !!post.longitude,
                    latitudeType: typeof post.latitude,
                    longitudeType: typeof post.longitude
                  });
                  return post.latitude && post.longitude;
                });
                
                console.log('📍 Posts with location:', postsWithLocation.length, postsWithLocation);
                
                if (postsWithLocation.length > 0) {
                  console.log('📍 Opening trip map view with', postsWithLocation.length, 'posts');
                  navigate('/public-trip-map', {
                    replace: false,
                    state: {
                      trip: {
                        id: trip.id,
                        name: trip.name,
                        description: trip.description,
                        username: userProfile?.username || 'Anonymous'
                      },
                      tripPosts: postsWithLocation.map(post => ({
                        id: post.id,
                        title: post.title,
                        description: post.description,
                        latitude: post.latitude,
                        longitude: post.longitude,
                        photoURLs: post.photoURLs,
                        videoURL: post.videoURL,
                        username: post.username,
                        userRole: post.userRole,
                        isOffer: post.isOffer || false,
                        isQuickcard: post.isQuickcard || false,
                        offerDetails: post.offerDetails,
                        categories: post.categories,
                        createdAt: post.createdAt,
                        type: post.type,
                        order: post.order
                      }))
                    }
                  });
                } else {
                  console.log('❌ No posts with location data found');
                  alert('No posts in this trip have location data for the map view.');
                }
              } else {
                console.log('❌ No trip or posts available');
                alert('No posts available for map view.');
              }
            }}
            style={{
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <FaMap size={12} />
            Map View
          </button>
          
          <button
            onClick={handleSlideshowClick}
            disabled={loadingSlideshowImages}
            style={{
              backgroundColor: loadingSlideshowImages ? '#ccc' : '#f0f0f0',
              color: loadingSlideshowImages ? '#666' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loadingSlideshowImages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {loadingSlideshowImages ? (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #999',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Loading...
              </>
            ) : (
              <>
                <FaPhotoVideo size={12} />
                Slideshow
              </>
            )}
          </button>
        </div>

        {/* Debug Info - Remove after testing */}
        <div style={{
          background: '#f0f0f0',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '16px',
          color: '#666'
        }}>
          Debug: Trip has {trip?.items?.length || 0} items, loaded {tripPosts.length} posts
        </div>

        {/* List View of Posts */}
        {tripPosts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tripPosts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post.id, post.isQuickcard)}
                style={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007aff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                {/* Post Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {index + 1}. {post.title || 'Untitled'}
                    </span>
                    
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 6px',
                      backgroundColor: post.isQuickcard ? '#e3f2fd' : '#f3e5f5',
                      borderRadius: '8px',
                      color: post.isQuickcard ? '#1976d2' : '#7b1fa2'
                    }}>
                      {post.isQuickcard ? '📸 Quickcard' : '📹 Vostcard'}
                    </span>
                  </div>
                </div>

                {/* Post Content */}
                <div style={{
                  display: 'flex',
                  gap: '12px'
                }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f0f0f0',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {post.photoURLs && post.photoURLs.length > 0 ? (
                      <img
                        src={post.photoURLs[0]}
                        alt={post.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '24px'
                      }}>
                        {post.isQuickcard ? '📷' : '📱'}
                      </div>
                    )}
                    
                    {/* Video indicator */}
                    {post.videoURL && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        <FaPlay />
                      </div>
                    )}

                    {/* Multiple photos indicator */}
                    {post.photoURLs && post.photoURLs.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        +{post.photoURLs.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Post Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {post.description && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: '#555',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {post.description}
                      </p>
                    )}
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{formatDate(post.createdAt)}</span>
                      <span>•</span>
                      <span>Tap to view details</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧳</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Posts Yet</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              This trip doesn't contain any posts yet.
            </p>
          </div>
        )}

        {/* Icons and Map View Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Heart Icon */}
          <div 
            style={{ 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              minWidth: '80px'
            }}
            onClick={() => {
              // Show message for anonymous users
              alert('❤️ Like saved! Join Vōstcard to sync across devices');
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaHeart size={28} color="#333" />
            <span style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: "#333"
            }}>
              {tripPosts.length}
            </span>
          </div>

          {/* Share Icon */}
          <div 
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onClick={handleShareTrip}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            role="button"
            tabIndex={0}
            title="Share this trip"
          >
            <FaShare size={28} color="#333" />
          </div>

          {/* Join Free Button */}
          <button
            type="button"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#002B4D',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none',
              whiteSpace: 'nowrap'
            }}
            onClick={() => navigate('/user-guide')}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Join Free
          </button>
        </div>

        {/* Date and Made with Vostcard */}
        <div style={{
          textAlign: 'center',
          padding: '20px 0',
          borderTop: '1px solid #e0e0e0',
          marginTop: '20px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <FaCalendar size={14} />
            Posted: {formatDate(trip.createdAt)}
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#999',
            fontStyle: 'italic'
          }}>
            Made with Vōstcard
          </div>
        </div>
      </div>

      {/* Tutorial Modal - Similar to PublicVostcardView */}
      {showTutorialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '16px', color: '#333' }}>What's Vōstcard?</h2>
            <p style={{ marginBottom: '20px', color: '#666', lineHeight: 1.5 }}>
              Vōstcard lets you create and share interactive travel experiences. 
              Join free to create your own trips and explore amazing places!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowTutorialModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Join Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slideshow Modal */}
      {showSlideshow && (
        <MultiPhotoModal
          photos={slideshowImages}
          initialIndex={0}
          isOpen={showSlideshow}
          onClose={() => setShowSlideshow(false)}
          title={`${trip?.name} - Slideshow`}
          autoPlay={true}
          autoPlayInterval={5000}
        />
      )}

      {/* CSS Animation for loading spinner */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default PublicTripView;