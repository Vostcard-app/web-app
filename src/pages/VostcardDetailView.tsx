import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaTimes, FaFlag, FaSync } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fixBrokenSharedVostcard } = useVostcard();
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    setVideoOrientation(videoWidth > videoHeight ? 'landscape' : 'portrait');
  };

  const handleShareClick = async () => {
    try {
      if (vostcard?.id) {
        const vostcardRef = doc(db, 'vostcards', vostcard.id);
        await updateDoc(vostcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${vostcard?.title || 'Untitled Vostcard'}"


"${vostcard?.description || 'No description'}"


${privateUrl}`;
      
      if (navigator.share) {
        navigator.share({
          text: shareText
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Private share message copied to clipboard!');
        }).catch(() => {
          alert(`Share this message: ${shareText}`);
        });
      }
    } catch (error) {
      console.error('Error sharing Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
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
        height: '100vh',
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
        height: '100vh',
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
        minHeight: '100vh',
        maxHeight: '100vh',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 24px 16px', 
        position: 'relative', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
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
          onClick={() => navigate(-1)}
        >
          <FaHome color="#fff" size={48} />
        </button>
      </div>

      {/* User Info */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        alignItems: 'center'
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
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        gap: '10px',
        height: '300px'
      }}>
        {/* Video Section */}
        <div style={{ 
          flex: 1,
          backgroundColor: vostcard.videoURL ? 'transparent' : '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {vostcard.videoURL ? (
            <video
              ref={videoRef}
              src={vostcard.videoURL}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              controls
              playsInline
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              onClick={() => setShowVideoModal(true)}
            />
          ) : null}
        </div>

        {/* Photos Section */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {vostcard.photoURLs && vostcard.photoURLs.length > 0 ? (
            vostcard.photoURLs.slice(0, 2).map((photoURL: string, index: number) => (
              <div key={index} style={{ 
                flex: 1,
                borderRadius: '8px', 
                overflow: 'hidden'
              }}>
                <img
                  src={photoURL}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedPhoto(photoURL)}
                />
              </div>
            ))
          ) : (
            <div style={{ 
              flex: 1,
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}>
              No photos
            </div>
          )}
        </div>
      </div>

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
      </div>

      {/* Worth Seeing Rating */}
      <div style={{
        padding: '5px 20px 20px 20px',
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

      {/* Description Link, Flag Icon, and Refresh Icon - All on Same Line */}
      <div style={{ 
        padding: '10px 20px 20px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '10px'
      }}>
        {/* Flag Icon - 15px from left */}
        <div style={{ justifySelf: 'start', paddingLeft: '15px' }}>
          <button
            onClick={handleFlag}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ff3b30'
            }}
          >
            <FaFlag size={24} />
          </button>
        </div>
        
        {/* Description Link - Centered */}
        <div style={{ justifySelf: 'center' }}>
          <button
            onClick={() => setShowDescriptionModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#007aff',
              fontSize: '18px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Description
          </button>
        </div>

        {/* Refresh Icon - 20px from right */}
        <div style={{ justifySelf: 'end', paddingRight: '20px' }}>
          <button
            onClick={handleRefresh}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#007aff'
            }}
          >
            <FaSync size={24} />
          </button>
        </div>
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
              {vostcard.description || 'No description available.'}
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
              width: '100vw',
              height: '100vh',
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
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <video
              src={vostcard.videoURL}
              style={{
                maxWidth: videoOrientation === 'portrait' ? '100vh' : '100%',
                maxHeight: videoOrientation === 'portrait' ? '100vw' : '100%',
                objectFit: 'contain',
                transform: videoOrientation === 'portrait' ? 'rotate(90deg)' : 'none',
                transformOrigin: 'center center',
              }}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VostcardDetailView;