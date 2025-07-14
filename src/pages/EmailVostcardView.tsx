import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHeart, FaStar, FaShare, FaUserCircle, FaMapPin, FaEnvelope, FaDownload } from 'react-icons/fa';
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
  const { user } = useAuth();
  const { fixBrokenSharedVostcard } = useVostcard();

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

  const handleShareVostcard = () => {
    const shareUrl = `${window.location.origin}/email/${id}`;
    
    if (navigator.share) {
      navigator.share({
        title: vostcard?.title || 'Check out this Vōstcard',
        text: `${vostcard?.description || ''}`,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  const handleViewOnMap = () => {
    if (vostcard?.latitude && vostcard?.longitude) {
      navigate('/home', {
        state: {
          singleVostcard: vostcard,
          centerLocation: {
            lat: vostcard.latitude,
            lng: vostcard.longitude
          }
        }
      });
    }
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

  const { title, description, photoURLs = [], videoURL, username: vostcardUsername } = vostcard;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white',
      color: '#333'
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
          <FaUserCircle size={50} color="#ccc" />
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

      {/* Main Content */}
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
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
                 maxWidth: videoOrientation === 'portrait' ? '300px' : '400px',
                 height: 'auto',
                 borderRadius: '16px',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
               }}
              onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              poster={photoURLs[0] || undefined}
            />
          </motion.div>
        )}

        {/* Photos */}
        {photoURLs.length > 0 && (
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
              <img
                key={idx}
                src={url}
                alt={`Photo ${idx + 1}`}
                                 style={{
                   width: '100px',
                   height: '100px',
                   borderRadius: '12px',
                   objectFit: 'cover',
                   boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                 }}
              />
            ))}
          </motion.div>
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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '24px'
          }}
        >
          <button
            onClick={handleShareVostcard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
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
            <FaShare /> Share
          </button>

          {vostcard?.latitude && vostcard?.longitude && (
            <button
              onClick={handleViewOnMap}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#28a745',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1e7e34';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#28a745';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FaMapPin /> View on Map
            </button>
          )}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
      </div>
    </div>
  );
};

export default EmailVostcardView;
