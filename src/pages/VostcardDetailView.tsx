import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaHeart, FaStar, FaRegComment, FaShare, FaUserCircle, FaMap, FaTimes, FaLock, FaEnvelope } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser, username: authUsername } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  
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
      
      const getUserFirstName = () => {
        if (authUsername) {
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      const shareText = `Look what I made with Vōstcard

Check it out, "${vostcard?.title || 'Untitled Vostcard'}"

${privateUrl}

"${vostcard?.description || ''}"

Cheers,

${getUserFirstName()}`;
      
      // Only use clipboard - no navigator.share()
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Private share message copied to clipboard!');
      }).catch(() => {
        alert(`Share this private message: ${shareText}`);
      });
    } catch (error) {
      console.error('Error sharing Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  const handlePrivateShare = async () => {
    try {
      const vostcardRef = doc(db, 'vostcards', id!);
      await updateDoc(vostcardRef, {
        isShared: true
      });
      
      const privateUrl = `${window.location.origin}/share/${id}`;
      
      const getUserFirstName = () => {
        if (authUsername) {
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      const shareText = `Look what I made with Vōstcard

Check it out, "${vostcard?.title || 'Untitled Vostcard'}"

${privateUrl}

"${vostcard?.description || ''}"

Cheers,

${getUserFirstName()}`;
      
      // Only use clipboard - no navigator.share()
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Private share message copied to clipboard! This Vostcard remains private and won\'t appear on the map.');
      }).catch(() => {
        alert(`Share this private message: ${shareText}`);
      });
    } catch (error) {
      console.error('Error sharing private Vostcard:', error);
      alert('Failed to share Vostcard. Please try again.');
    }
  };

  const handleEmailShare = async () => {
    try {
      if (!vostcard?.id) {
        throw new Error('No vostcard to share');
      }

      await fixBrokenSharedVostcard(vostcard.id);

      const emailUrl = `${window.location.origin}/email/${vostcard.id}`;
      
      const getUserFirstName = () => {
        if (authUsername) {
          return authUsername.split(' ')[0];
        } else if (authUser?.displayName) {
          return authUser.displayName.split(' ')[0];
        } else if (authUser?.email) {
          return authUser.email.split('@')[0];
        }
        return 'Anonymous';
      };

      const subjectLine = `Check out my Vōstcard: "${vostcard?.title || 'Title'}"`;
      
      const emailBody = `Hi,

I made this with an app called Vōstcard

View it here: ${emailUrl}

${vostcard?.description || 'Description'}

Cheers!

${getUserFirstName()}`;

      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(emailBody)}`;
      
      window.open(mailtoUrl, '_blank');
      
      alert('✅ Vostcard shared! The recipient will be able to view it via the email link.');
      
    } catch (error) {
      console.error('Error sharing Vostcard via email:', error);
      alert('Failed to share Vostcard via email. Please try again.');
    }
  };

  const handleViewOnMap = () => {
    if (!vostcard?.latitude || !vostcard?.longitude) {
      alert('This Vostcard does not have location data.');
      return;
    }

    // Navigate to home view with the Vostcard's location
    const navigationState = {
      browseLocation: {
        coordinates: [vostcard.latitude, vostcard.longitude],
        name: vostcard.title || 'Vostcard Location',
        id: vostcard.id,
        type: 'vostcard',
        place: vostcard.title || 'Vostcard Location',
      },
    };

    console.log('️ Navigating to map with Vostcard location:', navigationState);
    navigate('/home', { state: navigationState });
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
        overflowY: 'scroll',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Banner */}
      <div style={{ background: '#07345c', padding: '15px 0 24px 0', position: 'relative', textAlign: 'left', paddingLeft: '16px' }}>
        <button style={{ position: 'absolute', right: 16, top: 26, background: 'rgba(0,0,0,0.10)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <FaHome color="#fff" size={36} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>Vōstcard</span>
      </div>

      {/* User Info */}
      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
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
          {vostcard.avatarURL ? (
            <img 
              src={vostcard.avatarURL} 
              alt="User Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <FaUserCircle size={50} color="#ccc" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
            {vostcard.username || 'Anonymous'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            🔒 Private Share
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ padding: '20px', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <button
          onClick={handleShareClick}
          style={{
            flex: 1,
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            padding: '12px 0',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FaShare size={16} />
          Share
        </button>
        <button
          onClick={handleEmailShare}
          style={{
            flex: 1,
            backgroundColor: '#34c759',
            color: 'white',
            border: 'none',
            padding: '12px 0',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FaEnvelope size={16} />
          Email
        </button>
        <button
          onClick={handleViewOnMap}
          style={{
            flex: 1,
            backgroundColor: '#ff9500',
            color: 'white',
            border: 'none',
            padding: '12px 0',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FaMap size={16} />
          Map
        </button>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
          {vostcard.title || 'Untitled Vostcard'}
        </h2>
      </div>

      {/* Video */}
      {vostcard.videoURL && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              src={vostcard.videoURL}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              controls
              playsInline
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              onClick={() => setShowVideoModal(true)}
            />
          </div>
        </div>
      )}

      {/* Photos */}
      {vostcard.photoURLs && vostcard.photoURLs.length > 0 && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {vostcard.photoURLs.map((photoURL: string, index: number) => (
              <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                <img
                  src={photoURL}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedPhoto(photoURL)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {vostcard.description && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#555' }}>
              {vostcard.description}
            </div>
          </div>
        </div>
      )}

      {/* Posted Date */}
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>
        Posted: {vostcard?.createdAt ? (
          typeof vostcard.createdAt.toDate === 'function' ? vostcard.createdAt.toDate().toLocaleString() :
          vostcard.createdAt instanceof Date ? vostcard.createdAt.toLocaleString() :
          typeof vostcard.createdAt === 'string' || typeof vostcard.createdAt === 'number' ? new Date(vostcard.createdAt).toLocaleString() :
          String(vostcard.createdAt)
        ) : 'Unknown'}
      </div>
      
      {/* Modals */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        vostcardID={id!}
        vostcardTitle={vostcard?.title}
      />

      {/* Modal for full-size photo */}
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
          onContextMenu={e => e.preventDefault()}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              borderRadius: 0,
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
              background: '#000',
              userSelect: 'none',
              pointerEvents: 'auto',
            }}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
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
              {vostcard.description}
            </div>
          </div>
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
          onContextMenu={e => e.preventDefault()}
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
                borderRadius: 0,
                boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                transform: videoOrientation === 'portrait' ? 'rotate(90deg)' : 'none',
                transformOrigin: 'center center',
              }}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              onContextMenu={e => e.preventDefault()}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VostcardDetailView;
