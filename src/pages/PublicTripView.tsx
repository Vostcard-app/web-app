import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaUserCircle, FaMap, FaCalendar, FaEye, FaPlay, FaPhotoVideo } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { Trip, TripItem } from '../types/TripTypes';
import MultiPhotoModal from '../components/MultiPhotoModal';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

// Import pin assets
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import QuickcardPin from '../assets/quickcard_pin.png';

// Custom icons for the map
const vostcardIcon = new L.Icon({
  iconUrl: VostcardPin,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

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
  const [slideshowAutoPlay, setSlideshowAutoPlay] = useState(false);
  const [viewMode, setViewMode] = useState<'thumbnail' | 'map'>('thumbnail');
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    try {
      if (showSlideshow && trip?.backgroundMusic?.url) {
        audio.volume = typeof trip.backgroundMusic.volume === 'number' ? Math.min(Math.max(trip.backgroundMusic.volume, 0), 1) : 0.5;
        audio.currentTime = 0;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        audio.pause();
      }
    } catch {}
  }, [showSlideshow, trip?.backgroundMusic?.url]);
  const [slideshowImages, setSlideshowImages] = useState<Array<{url: string, postTitle: string}>>([]);
  const [loadingSlideshowImages, setLoadingSlideshowImages] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
      
      // Add timeout to prevent infinite loading (extended for mobile)
      const timeoutId = setTimeout(() => {
        console.log('⏰ PublicTripView: Loading timed out after 30 seconds');
        setError('Loading timed out. Please check your connection and try again.');
        setLoading(false);
      }, 30000); // 30 second timeout for mobile networks

      try {
        console.log('🔍 PublicTripView: Loading trip with ID:', id);

        const docRef = doc(db, 'trips', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Trip;
          
          console.log('✅ PublicTripView: Trip found:', {
            id: data.id,
            name: data.name,
            isShared: data.isShared,
            isPrivate: data.isPrivate,
            visibility: data.visibility,
            userID: data.userID
          });
          
          // Check if trip is shared or public
          // Allow access if: explicitly shared, public visibility, not private (legacy), or isPrivate is undefined (default allow)
          const canAccess = data.isShared || 
                           data.visibility === 'public' || 
                           data.isPrivate === false || 
                           data.isPrivate === undefined;
          console.log('🔐 PublicTripView: Access check:', {
            isShared: data.isShared,
            visibility: data.visibility,
            isPrivate: data.isPrivate,
            canAccess: canAccess,
            shareUrl: `${window.location.origin}/share-trip/${data.id}`
          });
          
          if (canAccess) {
            // Load trip items from subcollection

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
              

              
              // Add items to trip data
              const tripWithItems = { ...data, items };
              clearTimeout(timeoutId);
              setTrip(tripWithItems);
              setLoading(false);
            } catch (itemsError) {

              // Still show the trip even if items fail to load
              clearTimeout(timeoutId);
              setTrip({ ...data, items: [] });
              setLoading(false);
            }
          } else {
            console.log('❌ PublicTripView: Trip access denied - not shared/public');
            console.log('🔍 PublicTripView: Trip sharing debug:', {
              tripId: data.id,
              isShared: data.isShared,
              visibility: data.visibility,
              isPrivate: data.isPrivate,
              suggestion: 'Trip owner needs to click Share button to make this trip public'
            });
            clearTimeout(timeoutId);
            setError('This trip has not been shared publicly yet. The trip owner needs to share it first.');
            setLoading(false);
          }
        } else {
          console.log('❌ PublicTripView: Trip document not found');
          clearTimeout(timeoutId);
          setError('Trip not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('❌ PublicTripView: Error loading trip:', err);
        
        // More specific error messages for mobile debugging
        if (err.code === 'unavailable') {
          setError('Network connection issue. Please check your internet and try again.');
        } else if (err.code === 'permission-denied') {
          setError('Permission denied. This trip may not be shared publicly.');
        } else {
          setError('Failed to load trip. Please try again.');
        }
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id, retryCount]);

  // Manual retry function for mobile users
  const handleRetry = () => {
    console.log('🔄 PublicTripView: Manual retry requested');
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

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

      }
    };
    
    if (trip?.userID) {
      fetchUserProfile();
    }
  }, [trip?.userID]);

  // Load trip posts data
  useEffect(() => {
    const fetchTripPosts = async () => {

      
      if (!trip?.items) {

        return;
      }

      if (trip.items.length === 0) {

        return;
      }

      try {
        const postsData: VostcardData[] = [];
        
        // Sort items chronologically by when they were added to the trip
        const sortedItems = [...trip.items].sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());


        // Fetch full vostcard data for each item
        for (const item of sortedItems) {

          try {
            const vostcardRef = doc(db, 'vostcards', item.vostcardID);
            const vostcardSnap = await getDoc(vostcardRef);
            
            if (vostcardSnap.exists()) {
              const vostcardData = vostcardSnap.data() as VostcardData;

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

            }
          } catch (error) {

          }
        }


        setTripPosts(postsData);
      } catch (error) {

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

  // Slideshow functionality - collect all images from trip posts with metadata
  const collectTripImages = async (): Promise<Array<{url: string, postTitle: string}>> => {
    if (!tripPosts || tripPosts.length === 0) return [];
    
    setLoadingSlideshowImages(true);
    const allImages: Array<{url: string, postTitle: string}> = [];
    
    try {
      // Get all images from all posts in order
      for (const post of tripPosts) {
        if (post.photoURLs && Array.isArray(post.photoURLs)) {
          const postTitle = post.title || 'Untitled Post';
          // Add each photo with the post title
          post.photoURLs.forEach((photoUrl: string) => {
            allImages.push({
              url: photoUrl,
              postTitle: postTitle
            });
          });
        }
      }

      return allImages;
    } catch (error) {
      return [];
    } finally {
      setLoadingSlideshowImages(false);
    }
  };

  // Handle slideshow button click - just collect images, don't auto-open
  const handleSlideshowClick = async () => {
    if (slideshowImages.length === 0) {
      const images = await collectTripImages();
      setSlideshowImages(images);
      
      if (images.length === 0) {
        alert('No images found in this trip to display in slideshow.');
      }
      // Don't auto-open slideshow - let user tap thumbnail
    }
    // Don't auto-open slideshow - let user tap thumbnail
  };

  // Start slideshow with music (called from user interaction)
  const startSlideshowWithMusic = async () => {
    console.log('🎬 Starting public slideshow with music from user interaction');
    
    // Enable auto-play and start slideshow
    setSlideshowAutoPlay(true);
    setShowSlideshow(true);
    
    // Immediately try to start music with user interaction context
    const audioEl = bgAudioRef.current;
    if (audioEl && trip?.backgroundMusic?.url) {
      try {
        const volume = typeof trip.backgroundMusic.volume === 'number' ? 
          Math.min(Math.max(trip.backgroundMusic.volume, 0), 1) : 0.5;
        
        audioEl.volume = volume;
        audioEl.currentTime = 0;
        
        console.log('🎵 Starting public music with user interaction context');
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              console.log('✅ Public music started successfully with user interaction');
            })
            .catch((error) => {
              console.log('❌ Public music failed to start even with user interaction:', error);
            });
        }
      } catch (e) {
        console.error('❌ Public music start error:', e);
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
            onClick={handleRetry}
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
            Try Again {retryCount > 0 && `(${retryCount + 1})`}
          </button>
          <button
            onClick={() => {
              // Redirect to login with returnTo parameter pointing to private version
              const privateUrl = `/trip/${id}`;
              navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
            }}
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
            Join (it's free)
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

        {/* Join Button */}
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
          onClick={() => {
            // Redirect to login with returnTo parameter pointing to private version
            const privateUrl = `/trip/${id}`;
            navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Join (it's free)
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
          fontSize: '18px',
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

        {/* View Mode Toggle Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => {
              if (viewMode === 'thumbnail') {
                // Switch to map view
                if (trip && tripPosts.length > 0) {
                  const postsWithLocation = tripPosts.filter(post => post.latitude && post.longitude);
                  if (postsWithLocation.length > 0) {
                    setViewMode('map');
                  } else {
                    alert('No posts in this trip have location data for the map view.');
                  }
                } else {
                  alert('No posts available for map view.');
                }
              } else {
                // Switch back to thumbnail view
                setViewMode('thumbnail');
              }
            }}
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
            {viewMode === 'thumbnail' ? (
              <>
                <FaMap size={12} />
                Map View
              </>
            ) : (
              <>
                <FaPhotoVideo size={12} />
                Slideshow
              </>
            )}
          </button>
        </div>

        {/* Conditional View: Thumbnail or Map */}
        {viewMode === 'thumbnail' ? (
          /* Thumbnail View */
          tripPosts.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              {/* Large Thumbnail - Tappable to start slideshow */}
              <div
                onClick={async () => {
                  if (slideshowImages.length === 0) {
                    const images = await collectTripImages();
                    setSlideshowImages(images);
                  }
                  if (slideshowImages.length > 0 || tripPosts.some(p => p.photoURLs?.length > 0)) {
                    startSlideshowWithMusic();
                  } else {
                    alert('No images found in this trip to display in slideshow.');
                  }
                }}
                style={{
                  width: '300px',
                  height: '300px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
              >
                {tripPosts[0]?.photoURLs?.[0] ? (
                  <img
                    src={tripPosts[0].photoURLs[0]}
                    alt={trip.name}
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
                    fontSize: '48px'
                  }}>
                    🧳
                  </div>
                )}
                
                {/* Play overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  <FaPlay />
                </div>
                
                {/* Photo count indicator */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {tripPosts.reduce((total, post) => total + (post.photoURLs?.length || 0), 0)} photos
                </div>
              </div>
              
              {/* Trip info below thumbnail */}
              <div style={{
                textAlign: 'center',
                maxWidth: '300px'
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Tap to start slideshow
                </h3>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.4'
                }}>
                  {tripPosts.length} stop{tripPosts.length !== 1 ? 's' : ''} • {tripPosts.reduce((total, post) => total + (post.photoURLs?.length || 0), 0)} photos
                </p>
              </div>
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
          )
        ) : (
          /* Map View */
          tripPosts.filter(post => post.latitude && post.longitude).length > 0 ? (
            <div style={{
              height: '400px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}>
              <MapContainer
                center={[
                  tripPosts.find(p => p.latitude && p.longitude)?.latitude || 0,
                  tripPosts.find(p => p.latitude && p.longitude)?.longitude || 0
                ]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Path line connecting all posts */}
                {tripPosts.filter(post => post.latitude && post.longitude).length > 1 && (
                  <Polyline
                    positions={tripPosts
                      .filter(post => post.latitude && post.longitude)
                      .map(post => [post.latitude!, post.longitude!])
                    }
                    pathOptions={{
                      color: '#007aff',
                      weight: 2,
                      opacity: 0.7,
                      dashArray: '5, 10'
                    }}
                  />
                )}
                
                {tripPosts
                  .filter(post => post.latitude && post.longitude)
                  .map((post, index) => (
                    <Marker
                      key={post.id}
                      position={[post.latitude!, post.longitude!]}
                      icon={post.isQuickcard ? quickcardIcon : vostcardIcon}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                            {index + 1}. {post.title || 'Untitled'}
                          </h4>
                          {post.photoURLs?.[0] && (
                            <img
                              src={post.photoURLs[0]}
                              alt={post.title}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                marginBottom: '8px'
                              }}
                            />
                          )}
                          {post.description && (
                            <p style={{
                              margin: '0 0 8px 0',
                              fontSize: '12px',
                              color: '#666',
                              lineHeight: '1.3'
                            }}>
                              {post.description.length > 100 
                                ? post.description.substring(0, 100) + '...'
                                : post.description
                              }
                            </p>
                          )}
                          <button
                            onClick={() => handlePostClick(post.id, post.isQuickcard)}
                            style={{
                              background: '#007aff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                }
              </MapContainer>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Map Data</h3>
              <p style={{ margin: '0', fontSize: '14px' }}>
                No posts in this trip have location data for the map view.
              </p>
            </div>
          )
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
              alert('❤️ Like saved! Join (it\'s free) to sync across devices');
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



          {/* Join Button */}
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
            Join (it's free)
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
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaCalendar size={14} />
              Posted: {formatDate(trip.createdAt)}
            </div>
            
            {/* Join Button - Right Justified */}
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
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: 'none',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                // Redirect to login with returnTo parameter pointing to private version
                const privateUrl = `/trip/${id}`;
                navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Join (It's Free)
            </button>
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
                onClick={() => {
                  // Redirect to login with returnTo parameter pointing to private version
                  const privateUrl = `/trip/${id}`;
                  navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Join (it's free)
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
          onClose={() => {
            setShowSlideshow(false);
            setSlideshowAutoPlay(false); // Reset auto-play when closed
          }}
          title={`${trip?.name} - Slideshow`}
          autoPlay={slideshowAutoPlay}
          autoPlayInterval={4000}
          tripTitle={trip?.name}
          singleCycle={true}
          onSlideshowComplete={() => {
            console.log('🎬 PublicTripView: Slideshow completed, fading out music and switching to map');
            
            // Fade out background music
            const audioEl = bgAudioRef.current;
            if (audioEl && !audioEl.paused) {
              const fadeOutDuration = 2000; // 2 seconds fade out
              const startVolume = audioEl.volume;
              const fadeStep = startVolume / (fadeOutDuration / 100);
              
              const fadeInterval = setInterval(() => {
                if (audioEl.volume > fadeStep) {
                  audioEl.volume -= fadeStep;
                } else {
                  audioEl.volume = 0;
                  audioEl.pause();
                  clearInterval(fadeInterval);
                }
              }, 100);
            }
            
            // Close slideshow and switch to map view after fade
            setTimeout(() => {
              setShowSlideshow(false);
              setSlideshowAutoPlay(false);
              setViewMode('map');
            }, 2500); // Wait for fade out to complete
          }}
        />
      )}

      {/* Hidden background music for public slideshow */}
      {trip?.backgroundMusic?.url && (
        <audio ref={bgAudioRef} src={trip.backgroundMusic.url} loop preload="auto" />
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