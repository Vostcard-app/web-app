import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaTimes, FaSync, FaHeart, FaRegComment, FaShare, FaUserCircle, FaFlag, FaMap } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
import QuickcardPin from '../assets/quickcard_pin.png';

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
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

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
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (quickcard?.userID) {
      fetchUserProfile();
    }
  }, [quickcard?.userID]);

  const handleShareClick = async () => {
    try {
      if (quickcard?.id) {
        const quickcardRef = doc(db, 'vostcards', quickcard.id);
        await updateDoc(quickcardRef, {
          isPrivatelyShared: true,
          sharedAt: new Date()
        });
      }
      
      const privateUrl = `${window.location.origin}/share-quickcard/${id}`;
      
      const shareText = `Check it out I made this with Vōstcard


"${quickcard?.title || 'Untitled Quickcard'}"


"${quickcard?.description || 'No description'}"


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
      console.error('Error sharing Quickcard:', error);
      alert('Failed to share Quickcard. Please try again.');
    }
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
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
        padding: '15px 16px 24px 16px', 
        position: 'relative', 
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
            <FaHome color="#fff" size={48} />
          </button>
        </div>
      </div>

      {/* User Info */}
      <div style={{ 
        padding: '5px 20px', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
            {quickcard.username || 'Anonymous'}
          </div>
        </div>
        <button
          onClick={() => {
            if (quickcard?.latitude && quickcard?.longitude) {
              setShowMapModal(true);
            } else {
              alert('No location data available for this quickcard');
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}
        >
          <FaMap size={24} />
        </button>
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
          {quickcard.title || 'Untitled Quickcard'}
        </h1>
      </div>

      {/* Photo Section */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center',
        height: '300px'
      }}>
        {quickcard.photoURLs && quickcard.photoURLs.length > 0 ? (
          <div style={{ 
            width: '100%',
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
              onClick={() => setSelectedPhoto(quickcard.photoURLs[0])}
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
            {/* Map Header */}
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

            {/* Map Container */}
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
    </div>
  );
};

export default QuickcardDetailView; 