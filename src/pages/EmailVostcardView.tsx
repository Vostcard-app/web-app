import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHeart, FaStar, FaUserCircle, FaMapPin, FaEnvelope, FaDownload } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';

const EmailVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [imageLoadStates, setImageLoadStates] = useState<{ [key: number]: 'loading' | 'loaded' | 'error' }>({});
  const { user } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📧 Loading vostcard for email view:', id);
        
        // Try to fetch from Firebase first
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📧 Found vostcard:', data);
          console.log('📧 Photo URLs:', data.photoURLs);
          setVostcard({ id: docSnap.id, ...data });
        } else {
          console.log('📧 Vostcard not found, trying to fix...');
          // Try to fix broken shared vostcard
          await fixBrokenSharedVostcard(id);
          
          // Try fetching again
          const retryDocSnap = await getDoc(docRef);
          if (retryDocSnap.exists()) {
            const data = retryDocSnap.data();
            console.log('📧 Fixed and loaded vostcard:', data);
            console.log('📧 Photo URLs:', data.photoURLs);
            setVostcard({ id: retryDocSnap.id, ...data });
          } else {
            throw new Error('Vostcard not found');
          }
        }
      } catch (error) {
        console.error('❌ Error loading vostcard for email view:', error);
        setError('Failed to load vostcard');
      } finally {
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, fixBrokenSharedVostcard]);

  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    const { videoWidth, videoHeight } = videoElement;
    setVideoOrientation(videoWidth > videoHeight ? 'landscape' : 'portrait');
  };

  const handleJoinVostcard = () => {
    navigate('/register', { 
      state: { 
        fromEmailVostcard: true,
        vostcardId: id,
        vostcardTitle: vostcard?.title 
      } 
    });
  };

  const handleFreeAccount = () => {
    navigate('/user-guide');
  };

  const handleImageLoad = (index: number) => {
    setImageLoadStates(prev => ({ ...prev, [index]: 'loaded' }));
  };

  const handleImageError = (index: number, url: string) => {
    console.error(`❌ Failed to load image ${index + 1}:`, url);
    setImageLoadStates(prev => ({ ...prev, [index]: 'error' }));
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'white',
        color: '#333',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>📧</div>
          <div>Loading Vōstcard...</div>
        </div>
      </div>
    );
  }

  if (error || !vostcard) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'white',
        color: '#333',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>
          Vōstcard Not Found
        </div>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
          This vostcard may have been removed or the link is invalid.
        </div>
        <button
          onClick={() => navigate('/register')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Join Vōstcard
        </button>
      </div>
    );
  }

  const { title, description, photoURLs = [], videoURL, username: vostcardUsername, avatarURL } = vostcard;

  // Debug log the photoURLs
  console.log('📧 EmailVostcardView photoURLs:', photoURLs);
  console.log('📧 EmailVostcardView photoURLs length:', photoURLs?.length);
  console.log('📧 EmailVostcardView photoURLs type:', typeof photoURLs);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : 'white', // Light gray background for desktop
      color: '#333',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0' // Padding only on desktop
    }}>
      {/* Mobile-style container with 9:16 aspect ratio for consistent experience */}
      <div style={{
        width: isDesktop ? '390px' : '100%', // Fixed width on desktop, full width on mobile
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh', // Fixed height for proper scrolling
        backgroundColor: 'white',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none', // Shadow only on desktop
        borderRadius: isDesktop ? '16px' : '0', // Rounded corners only on desktop
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto', // Make the container scrollable
        overflowX: 'hidden', // Prevent horizontal scrolling
        transition: 'all 0.3s ease' // Smooth transition when resizing
      }}>
      {/* User Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          backgroundColor: 'white'
        }}
      >
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
          {avatarURL ? (
            <img 
              src={avatarURL} 
              alt="User Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <FaUserCircle size={50} color="#ccc" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
            {vostcardUsername || 'Anonymous'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            📧 Shared via Email
          </div>
        </div>
      </motion.div>

      {/* Icons and Free Account Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eee',
          backgroundColor: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <FaHeart size={20} color="#e74c3c" />
          <FaMapPin size={20} color="#28a745" />
        </div>
        <button
          onClick={handleFreeAccount}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Free Account
        </button>
      </motion.div>

      {/* Main Content */}
      <div style={{ 
        padding: '20px', 
        flex: 1, // Take up remaining space
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '16px',
            textAlign: 'center',
            color: '#333'
          }}
        >
          {title || 'Untitled Vōstcard'}
        </motion.h1>

        {/* Video */}
        {videoURL && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <video
              src={videoURL}
              controls
              style={{
                width: '100%',
                maxWidth: videoOrientation === 'portrait' ? '280px' : '320px', // Optimized for 9:16 container
                height: 'auto',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              poster={photoURLs[0] || undefined}
            />
          </motion.div>
        )}

        {/* Photos with improved error handling */}
        {photoURLs && photoURLs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            {photoURLs.slice(0, 3).map((url: string, idx: number) => (
              <div
                key={idx}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
              >
                {imageLoadStates[idx] === 'error' ? (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    📷<br/>Failed to load
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: imageLoadStates[idx] === 'loaded' ? 1 : 0.5
                    }}
                    onLoad={() => handleImageLoad(idx)}
                    onError={() => handleImageError(idx, url)}
                  />
                )}
                {imageLoadStates[idx] !== 'loaded' && imageLoadStates[idx] !== 'error' && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Loading...
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Debug info for photos */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '20px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}>
            Debug: {photoURLs?.length || 0} photos found
            {photoURLs?.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                {photoURLs.slice(0, 3).map((url: string, idx: number) => (
                  <div key={idx} style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                    {idx + 1}: {url?.substring(0, 60)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '1px solid #e9ecef'
            }}
          >
            <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#555' }}>
              {showFullDescription ? description : 
                (description.length > 150 ? description.substring(0, 150) + '...' : description)
              }
              {description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    textDecoration: 'underline'
                  }}
                >
                  {showFullDescription ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            padding: '24px',
            backgroundColor: '#f8f9fa',
            borderRadius: '16px',
            border: '1px solid #e9ecef'
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
            Want to create your own Vōstcards?
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Join Vōstcard to share your own videos and photos with location
          </div>
          <button
            onClick={handleJoinVostcard}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Join Vōstcard
          </button>
        </motion.div>

        {/* About Vōstcard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            textAlign: 'center',
            padding: '24px',
            marginTop: '20px',
            backgroundColor: 'white',
            borderTop: '1px solid #eee'
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            lineHeight: 1.6,
            maxWidth: '450px',
            margin: '0 auto'
          }}>
            This was made with Vōstcard. It allows you to make, share private Vōstcards or post them on the map. 
            You can also see Vōstcards that have been posted no matter where in the world they are. 
            It's free and always will be.
          </div>
        </motion.div>
      </div>
    </div>
  </div>
  );
};

export default EmailVostcardView;
