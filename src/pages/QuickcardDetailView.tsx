import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaTimes, FaSync, FaHeart, FaRegComment, FaShare, FaUserCircle, FaFlag, FaMap, FaPlay, FaPause, FaCoffee, FaChevronDown } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
import QuickcardPin from '../assets/quickcard_pin.png';
import { useAuth } from '../context/AuthContext';
import { VostboxService } from '../services/vostboxService';
import FriendPickerModal from '../components/FriendPickerModal';
import SharedOptionsModal from '../components/SharedOptionsModal';
import MultiPhotoModal from '../components/MultiPhotoModal';
import { generateShareText } from '../utils/vostcardUtils';
import TipDropdownMenu from '../components/TipDropdownMenu';

// Custom quickcard icon for the map
const quickcardIcon = new L.Icon({
  iconUrl: QuickcardPin,
  iconSize: [75, 75],
  iconAnchor: [37.5, 75],
  popupAnchor: [0, -75],
});

const QuickcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fixBrokenSharedVostcard } = useVostcard();
  const { user } = useAuth();
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showSharedOptions, setShowSharedOptions] = useState(false);

  // Simplified audio player state - just play/pause
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tip dropdown state
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  const tipButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchQuickcard = async () => {
      if (!id) {
        setError('No quickcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading quickcard:', id);
        
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Quickcard found:', data);
          
          // Verify it's actually a quickcard
          if (data.isQuickcard) {
            setQuickcard(data);
            setLoading(false);
          } else {
            setError('This is not a quickcard.');
            setLoading(false);
          }
        } else {
          console.log('📱 Quickcard not found, trying to fix...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Quickcard fixed, retrying load...');
              
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                if (retryData.isQuickcard) {
                  setQuickcard(retryData);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix quickcard:', fixError);
          }
          
          setError('Quickcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading quickcard:', err);
        setError('Failed to load Quickcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchQuickcard();
  }, [id, fixBrokenSharedVostcard]);

  // Fetch user profile when quickcard is loaded
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!quickcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', quickcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log('🔍 QuickcardDetailView Debug - Creator userRole:', userData.userRole);
          console.log('🔍 QuickcardDetailView Debug - Creator buyMeACoffeeURL:', userData.buyMeACoffeeURL);
          setUserProfile(userData);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (quickcard?.userID) {
      fetchUserProfile();
    }
  }, [quickcard?.userID]);

  // Simplified audio player effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      console.error('Audio failed to load');
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [quickcard?.audioURL]);

  const handleShareClick = async () => {
    if (!quickcard) return;
    
    // Show public sharing warning
    const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      // Generate public share URL (always quickcard)
      const shareUrl = `${window.location.origin}/share-quickcard/${quickcard.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText({ ...quickcard, isQuickcard: true }, shareUrl);
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Public share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  const handleMapClick = () => {
    if (quickcard?.latitude && quickcard?.longitude) {
      console.log('📍 Opening quickcard location on public map for all users');
      navigate('/public-map', {
        state: {
          singleVostcard: {
            id: quickcard.id,
            title: quickcard.title,
            description: quickcard.description,
            latitude: quickcard.latitude,
            longitude: quickcard.longitude,
            photoURLs: quickcard.photoURLs,
            username: quickcard.username,
            isOffer: false,
            isQuickcard: true,
            categories: quickcard.categories,
            createdAt: quickcard.createdAt,
            visibility: 'public',
            state: 'posted'
          }
        }
      });
    } else {
      alert('No location data available for this quickcard');
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error('Audio play failed:', error);
          alert('Failed to play audio. Please try again.');
        });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    alert('Flag functionality not implemented yet');
  };

  const handleTipButtonClick = () => {
    if (tipButtonRef.current) {
      const rect = tipButtonRef.current.getBoundingClientRect();
      setTipDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
      setShowTipDropdown(!showTipDropdown);
    }
  };

  // Check if quickcard has audio
  const hasAudio = quickcard?.audioURL || quickcard?.audioURLs?.length > 0;

  // Debug logging for audio detection
  useEffect(() => {
    if (quickcard) {
      console.log('🎵 AUDIO DEBUG - Quickcard data:', {
        id: quickcard.id,
        title: quickcard.title,
        hasAudioURL: !!quickcard.audioURL,
        hasAudioURLs: !!quickcard.audioURLs,
        audioURL: quickcard.audioURL,
        audioURLs: quickcard.audioURLs,
        hasAudioCalculated: hasAudio,
        allKeys: Object.keys(quickcard)
      });
    }
  }, [quickcard, hasAudio]);

  // Enhanced photo click handler
  const handlePhotoClick = (photoUrl: string) => {
    if (quickcard.photoURLs && quickcard.photoURLs.length > 1) {
      const index = quickcard.photoURLs.indexOf(photoUrl);
      setSelectedPhotoIndex(index >= 0 ? index : 0);
      setShowMultiPhotoModal(true);
    } else {
      setSelectedPhoto(photoUrl);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Quickcard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: 'red', marginBottom: '16px' }}>{error}</div>
          <button 
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!quickcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Quickcard data</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100%',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 9px 16px',
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              marginRight: '15px'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={40} />
          </button>
        </div>
      </div>

      {/* User Info */}
      <div style={{ 
        padding: '25px 20px 5px 20px', // 10px extra padding on top
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: '63px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 50, 
              height: 50, 
              borderRadius: '50%', 
              overflow: 'hidden', 
              marginRight: 16,
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (quickcard?.userID) {
                navigate(`/user-profile/${quickcard.userID}`);
              }
            }}
          >
            {userProfile?.avatarURL ? (
              <img 
                src={userProfile.avatarURL} 
                alt="User Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
              />
            ) : (
              <FaUserCircle size={50} color="#ccc" />
            )}
          </div>
          <div 
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#333',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (quickcard?.userID) {
                navigate(`/user-profile/${quickcard.userID}`);
              }
            }}
          >
            {quickcard.username || 'Anonymous'}
          </div>
        </div>
      </div>

      {/* ☕ Tip Button for Guides - Under Avatar */}
      {userProfile?.userRole === 'guide' && 
       user?.uid !== quickcard.userID && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '10px',
          marginBottom: '10px'
        }}>
          <button
            ref={tipButtonRef}
            onClick={handleTipButtonClick}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0px 20px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
              transition: 'transform 0.1s ease',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: '1',
              gap: '8px'
            }}
          >
            Leave a Tip
            <FaChevronDown size={12} />
          </button>
        </div>
      )}

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {quickcard.title || 'Untitled Quickcard'}
        </h1>
      </div>

      {/* Enhanced Multi-Photo Section */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center',
        height: '300px'
      }}>
        {quickcard.photoURLs && quickcard.photoURLs.length > 0 ? (
          <div style={{ 
            width: '100%',
            display: 'flex',
            gap: '8px',
            overflow: 'hidden'
          }}>
            {/* Main Photo */}
            <div style={{ 
              flex: quickcard.photoURLs.length === 1 ? 1 : 0.7,
              backgroundColor: 'transparent',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img
                src={quickcard.photoURLs[0]}
                alt="Quickcard"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onClick={() => handlePhotoClick(quickcard.photoURLs[0])}
              />
              {quickcard.photoURLs.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  1/{quickcard.photoURLs.length}
                </div>
              )}
            </div>

            {/* Additional Photos Thumbnail Strip */}
            {quickcard.photoURLs.length > 1 && (
              <div style={{
                flex: 0.3,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflow: 'hidden'
              }}>
                {quickcard.photoURLs.slice(1, 4).map((photoUrl: string, index: number) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onClick={() => handlePhotoClick(photoUrl)}
                  >
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 2}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    {index === 2 && quickcard.photoURLs.length > 4 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        +{quickcard.photoURLs.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            width: '100%',
            backgroundColor: '#f0f0f0',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '18px'
          }}>
            No photos available
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={quickcard.audioURL || quickcard.audioURLs?.[0]}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}

      {/* Action Icons Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #eee'
      }}>
        {/* Play Button - Only show if audio exists */}
        {hasAudio && (
          <button
            onClick={handlePlayPause}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPlaying ? '#007aff' : '#666'
            }}
          >
            {isPlaying ? <FaPause size={30} /> : <FaPlay size={30} />}
          </button>
        )}

        <button
          onClick={handleLikeClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLiked ? '#ff3b30' : '#666'
          }}
        >
          <FaHeart size={30} />
        </button>

        <button
          onClick={() => setShowCommentsModal(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaRegComment size={30} />
        </button>

        <button
          onClick={handleShareClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaShare size={30} />
        </button>

        <button
          onClick={handleMapClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaMap size={30} />
        </button>
      </div>

      {/* Counts Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 40px',
        fontSize: '18px',
        color: '#666'
      }}>
        {hasAudio && <span></span>}
        <span>0</span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Description Link, Flag Icon, and Refresh Button */}
      <div style={{ 
        padding: '20px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <button
          onClick={handleFlag}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ff3b30',
            position: 'absolute',
            left: '15px'
          }}
        >
          <FaFlag size={24} />
        </button>
        
        <div
          onClick={() => setShowDescriptionModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontSize: '28px',
            fontWeight: 'bold',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            display: 'inline-block'
          }}
        >
          Description
        </div>

        <button
          onClick={handleRefresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#007aff',
            position: 'absolute',
            right: '20px'
          }}
        >
          <FaSync size={24} />
        </button>
      </div>

      {/* Modals */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        vostcardID={id!}
        vostcardTitle={quickcard?.title}
      />

      {/* Map Modal */}
      {showMapModal && quickcard?.latitude && quickcard?.longitude && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowMapModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              height: '70vh',
              maxHeight: '600px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: '#07345c',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Quickcard Location</h3>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ height: 'calc(100% - 68px)', width: '100%' }}>
              <MapContainer
                center={[quickcard.latitude, quickcard.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={22}
                />
                <Marker
                  position={[quickcard.latitude, quickcard.longitude]}
                  icon={quickcardIcon}
                />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Description</h3>
              <button
                onClick={() => setShowDescriptionModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#555' }}>
              {quickcard.description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </div>
      )}

      {/* Multi Photo Modal */}
      <MultiPhotoModal
        photos={quickcard.photoURLs || []}
        initialIndex={selectedPhotoIndex}
        isOpen={showMultiPhotoModal}
        onClose={() => setShowMultiPhotoModal(false)}
        title={quickcard.title}
      />

      {/* Share Options Modal */}
      <SharedOptionsModal
        isOpen={showSharedOptions}
        onClose={() => setShowSharedOptions(false)}
        item={{
          id: id || '',
          title: quickcard?.title,
          description: quickcard?.description,
          isQuickcard: true
        }}
      />

      {/* Tip Dropdown Menu */}
      <TipDropdownMenu
        userProfile={userProfile}
        isVisible={showTipDropdown}
        onClose={() => setShowTipDropdown(false)}
        position={tipDropdownPosition}
      />
    </div>
  );
};

export default QuickcardDetailView; 