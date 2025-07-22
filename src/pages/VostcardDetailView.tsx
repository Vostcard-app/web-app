import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaTimes, FaFlag, FaSync, FaArrowLeft, FaArrowUp, FaArrowDown, FaUserPlus, FaVolumeUp, FaMap } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, increment, addDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
import { VostboxService } from '../services/vostboxService';
import { type Friend } from '../types/FriendModels';
import FriendPickerModal from '../components/FriendPickerModal';
import SharedOptionsModal from '../components/SharedOptionsModal';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fixBrokenSharedVostcard } = useVostcard();
  const { user } = useAuth();
  
  // Navigation state from previous view
  const navigationState = location.state as any;
  const vostcardList = navigationState?.vostcardList || [];
  const currentIndex = navigationState?.currentIndex || 0;
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [availableVostcards, setAvailableVostcards] = useState<string[]>([]);
  const [currentVostcardIndex, setCurrentVostcardIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showSharedOptions, setShowSharedOptions] = useState(false);
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch available vostcards for navigation
  const fetchAvailableVostcards = async () => {
    try {
      const vostcardsQuery = query(
        collection(db, 'vostcards'),
        orderBy('createdAt', 'desc')
      );
      const vostcardSnapshot = await getDocs(vostcardsQuery);
      const allVostcardIds = vostcardSnapshot.docs.map(doc => doc.id);
      
      setAvailableVostcards(allVostcardIds);
      
      // If no navigation state provided, find current vostcard index in fetched list
      if (!vostcardList.length && id) {
        const currentIndex = allVostcardIds.findIndex(vostcardId => vostcardId === id);
        setCurrentVostcardIndex(currentIndex !== -1 ? currentIndex : 0);
      }
    } catch (error) {
      console.error('Failed to fetch available vostcards:', error);
    }
  };

  useEffect(() => {
    fetchAvailableVostcards();
  }, [id]);

  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading vostcard:', id);
        
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Vostcard found:', data);
          setVostcard(data);
          setLoading(false);
        } else {
          console.log('📱 Vostcard not found, trying to fix...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Vostcard fixed, retrying load...');
              
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                setVostcard(retryData);
                setLoading(false);
                return;
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix vostcard:', fixError);
          }
          
          setError('Vostcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading vostcard:', err);
        setError('Failed to load Vostcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, fixBrokenSharedVostcard]);

  // Fetch user profile when vostcard is loaded
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!vostcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', vostcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (vostcard?.userID) {
      fetchUserProfile();
    }
  }, [vostcard?.userID]);

  // Detect and analyze audio when vostcard loads
  useEffect(() => {
    const detectAudio = async () => {
      const vostcardWithAudio = vostcard as any;
      if (vostcardWithAudio?.audio || vostcardWithAudio?._firebaseAudioURL) {
        try {
          // Create temporary audio element to get duration
          const audio = new Audio();
          
          if (vostcardWithAudio.audio instanceof Blob) {
            audio.src = URL.createObjectURL(vostcardWithAudio.audio);
          } else if (vostcardWithAudio._firebaseAudioURL) {
            audio.src = vostcardWithAudio._firebaseAudioURL;
          }
          
          audio.onloadedmetadata = () => {
            setAudioDuration(audio.duration);
            // Clean up
            if (vostcardWithAudio.audio instanceof Blob) {
              URL.revokeObjectURL(audio.src);
            }
          };
        } catch (error) {
          console.error('Error detecting audio:', error);
        }
      }
    };

    if (vostcard) {
      detectAudio();
    }
  }, [vostcard]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);



  const handleShareClick = () => {
    setShowSharedOptions(true);
  };

  const handleMapClick = () => {
    // Navigate all users to public map view regardless of authentication status
    if (vostcard?.latitude && vostcard?.longitude) {
      console.log('📍 Opening vostcard location on public map');
      navigate('/public-map', {
        state: {
          singleVostcard: {
            id: vostcard.id,
            title: vostcard.title,
            description: vostcard.description,
            latitude: vostcard.latitude,
            longitude: vostcard.longitude,
            videoURL: vostcard.videoURL,
            photoURLs: vostcard.photoURLs,
            username: vostcard.username,
            isOffer: vostcard.isOffer || false,
            isQuickcard: vostcard.isQuickcard || false,
            offerDetails: vostcard.offerDetails,
            categories: vostcard.categories,
            createdAt: vostcard.createdAt,
            visibility: 'public',
            state: 'posted'
          }
        }
      });
    } else {
      alert('No location data available for this vostcard');
    }
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  const handleAudioClick = () => {
    const vostcardWithAudio = vostcard as any;
    if (vostcardWithAudio?.audio || vostcardWithAudio?._firebaseAudioURL) {
      if (isPlayingAudio) {
        // Stop audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlayingAudio(false);
      } else {
        // Play audio
        playAudio();
      }
    }
  };

  const playAudio = async () => {
    const vostcardWithAudio = vostcard as any;
    if (!vostcardWithAudio?.audio && !vostcardWithAudio?._firebaseAudioURL) return;
    
    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set audio source
      if (vostcardWithAudio.audio instanceof Blob) {
        audio.src = URL.createObjectURL(vostcardWithAudio.audio);
      } else if (vostcardWithAudio._firebaseAudioURL) {
        audio.src = vostcardWithAudio._firebaseAudioURL;
      } else {
        console.error('No audio source available');
        return;
      }

      // Set up event listeners
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };

      audio.onplay = () => {
        setIsPlayingAudio(true);
      };

      audio.onpause = () => {
        setIsPlayingAudio(false);
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
    }
  };

  const formatAudioDuration = (duration: number) => {
    if (duration < 60) {
      return `${Math.round(duration)}s`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.round(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const handleRatingClick = (rating: number) => {
    setUserRating(rating);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    alert('Flag functionality not implemented yet');
  };



  // Navigation functions
  const handlePreviousVostcard = () => {
    if (vostcardList.length > 0) {
      // Use provided list navigation
      if (currentIndex > 0) {
        const previousId = vostcardList[currentIndex - 1];
        navigate(`/vostcard/${previousId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex - 1
          }
        });
      }
    } else {
      // Use fetched vostcards navigation
      if (currentVostcardIndex > 0 && availableVostcards.length > 0) {
        const previousId = availableVostcards[currentVostcardIndex - 1];
        navigate(`/vostcard/${previousId}`);
      }
    }
  };

  const handleNextVostcard = () => {
    if (vostcardList.length > 0) {
      // Use provided list navigation
      if (currentIndex < vostcardList.length - 1) {
        const nextId = vostcardList[currentIndex + 1];
        navigate(`/vostcard/${nextId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex + 1
          }
        });
      }
    } else {
      // Use fetched vostcards navigation
      if (currentVostcardIndex < availableVostcards.length - 1 && availableVostcards.length > 0) {
        const nextId = availableVostcards[currentVostcardIndex + 1];
        navigate(`/vostcard/${nextId}`);
      }
    }
  };

  // Check if navigation is available
  const canGoToPrevious = vostcardList.length > 0 
    ? currentIndex > 0 
    : currentVostcardIndex > 0 && availableVostcards.length > 0;
  
  const canGoToNext = vostcardList.length > 0 
    ? currentIndex < vostcardList.length - 1 
    : currentVostcardIndex < availableVostcards.length - 1 && availableVostcards.length > 0;

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
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Vostcard...</div>
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

  if (!vostcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Vostcard data</div>
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
        padding: '15px 16px 24px 16px', 
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem', cursor: 'pointer' }}>
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

      {/* Navigation arrows - upper right below banner */}
      <div style={{
        position: 'absolute',
        top: '88px', // Below the header
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={handlePreviousVostcard}
          disabled={!canGoToPrevious}
          style={{
            background: canGoToPrevious ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canGoToPrevious ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <FaArrowUp color="#fff" size={16} />
        </button>
        <button
          onClick={handleNextVostcard}
          disabled={!canGoToNext}
          style={{
            background: canGoToNext ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canGoToNext ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <FaArrowDown color="#fff" size={16} />
        </button>
      </div>

      {/* User Info */}
      <div style={{ 
        padding: '5px', 
        display: 'flex', 
        alignItems: 'center',
        marginTop: '78px', // Account for fixed header
      }}>
        <div style={{ 
          width: 50, 
          height: 50, 
          borderRadius: '50%', 
          overflow: 'hidden', 
          marginRight: 16,
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
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
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
          {vostcard.username || 'Anonymous'}
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {vostcard.title || 'Untitled Vostcard'}
        </h1>
      </div>

      {/* Media Section */}
      {vostcard.isQuickcard ? (
        // Quickcard layout - single centered photo
        <div style={{ 
          padding: '20px', 
          display: 'flex', 
          justifyContent: 'center',
          height: '300px'
        }}>
          {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
            <div style={{ 
              width: '100%',
              backgroundColor: 'transparent',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img
                src={vostcard.photoURLs[0]}
                alt="Quickcard"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPhoto(vostcard.photoURLs[0])}
              />
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
              No photo available
            </div>
          )}
        </div>
      ) : (
        // Regular vostcard layout - video thumbnail on left, 2 photos stacked on right
        <div style={{ 
          padding: '20px', 
          display: 'flex', 
          gap: '10px',
          height: '300px'
        }}>
          {/* Video Thumbnail Section */}
          <div style={{ 
            flex: 1,
            backgroundColor: vostcard.videoURL ? 'transparent' : '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {vostcard.videoURL ? (
              <>
              <video
                ref={videoRef}
                src={vostcard.videoURL}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                playsInline
                  muted
                onClick={() => setShowVideoModal(true)}
              />
                {/* Play Button Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  onClick={() => setShowVideoModal(true)}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '20px solid white',
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      marginLeft: '4px'
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ 
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                No video
              </div>
            )}
          </div>

          {/* Photos Section - 2 photos stacked vertically */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {/* First Photo */}
            {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
              <div style={{ 
                flex: 1,
                borderRadius: '8px', 
                overflow: 'hidden'
              }}>
                <img
                  src={vostcard.photoURLs[0]}
                  alt="Photo 1"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedPhoto(vostcard.photoURLs[0])}
                />
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px'
              }}>
                No photo
              </div>
            )}
            
            {/* Second Photo */}
            {vostcard.photoURLs && vostcard.photoURLs.length > 1 ? (
              <div style={{ 
                flex: 1,
                borderRadius: '8px', 
                overflow: 'hidden'
              }}>
                <img
                  src={vostcard.photoURLs[1]}
                  alt="Photo 2"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedPhoto(vostcard.photoURLs[1])}
                />
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px'
              }}>
                No photo
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Icons Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #eee'
      }}>
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
          onClick={() => {/* Handle star action */}}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffd700'
          }}
        >
          <FaStar size={30} />
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
        {/* Audio button - only show if vostcard has audio */}
        {((vostcard as any)?.audio || (vostcard as any)?._firebaseAudioURL) && (
          <button
            onClick={handleAudioClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPlayingAudio ? '#007aff' : '#666'
            }}
          >
            <FaVolumeUp size={30} />
          </button>
        )}
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
        <span>0</span>
        <span>0.0</span>
        <span>0</span>
        <span></span>
        {/* Audio duration - only show if vostcard has audio */}
        {((vostcard as any)?.audio || (vostcard as any)?._firebaseAudioURL) && (
          <span>{audioDuration ? formatAudioDuration(audioDuration) : '...'}</span>
        )}
      </div>

      {/* Worth Seeing Rating */}
      <div style={{
        padding: '0',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          color: '#333'
        }}>
          Worth Seeing?
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRatingClick(star)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: star <= userRating ? '#ffd700' : '#ddd'
              }}
            >
              <FaStar size={24} />
            </button>
          ))}
        </div>
      </div>

      {/* Description Link, Flag Icon, and Refresh Button */}
      <div style={{ 
        padding: '20px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Flag Icon - px from left */}
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
        
        {/* Description Link - Centered */}
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

        {/* Refresh Button - 20px from right */}
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
        vostcardTitle={vostcard?.title}
      />

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          style={{
            position: 'absolute',
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
              {vostcard.description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'absolute',
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

      {/* Video Modal */}
      {showVideoModal && vostcard.videoURL && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <video
              src={vostcard.videoURL}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                backgroundColor: '#000'
              }}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Share Options Modal */}
      <SharedOptionsModal
        isOpen={showSharedOptions}
        onClose={() => setShowSharedOptions(false)}
        item={{
          id: id || '',
          title: vostcard?.title,
          description: vostcard?.description,
          isQuickcard: vostcard?.isQuickcard
        }}
      />
    </div>
  );
};

export default VostcardDetailView;