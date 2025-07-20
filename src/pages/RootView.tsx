import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';

const RootView: React.FC = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number] | null>([53.3498, -6.2603]); // Default location
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // YouTube video ID extracted from the provided URL
  const youtubeVideoId = 'CCOErz2RxwI';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          if (typeof console !== 'undefined' && console.error) {
            console.error('Error getting location:', error);
          }
          setLocationError(error.message);
          // Keep default location
        },
        { enableHighAccuracy: true, timeout: 5000 } // Reduced timeout
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'visible', // Changed from hidden
      backgroundColor: '#f5f5f5',
      // Force hardware acceleration and prevent layout issues
      transform: 'translateZ(0)',
      WebkitTransform: 'translateZ(0)'
    }}>
      {/* CSS Animation Styles */}
      <style>
        {`
          @keyframes bobbing {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0px);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-15px);
            }
          }
          
          .bobbing-pin {
            animation: bobbing 2s ease-in-out infinite;
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: '2.2rem',
        letterSpacing: '0.01em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 1000,
        position: 'relative',
      }}>
        <span>Vōstcard</span>
        <div 
          onClick={() => setShowVideoModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginRight: '35px'
          }}
        >
          <img 
            src="/Info_pin.png"
            alt="Info Pin" 
            style={{
              width: '50px',
              height: '50px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            What is Vōstcard?
          </span>
        </div>
      </div>

      {/* Simplified Background - No Map for Testing */}
      <div style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Simple gradient background instead of map */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.5)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          🗺️ Map Temporarily Disabled<br/>
          <small>Testing button visibility</small>
        </div>
      </div>

      {/* Semi-transparent overlay to make content more readable */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 5
      }} />

      {/* Debug Info */}
      {locationError && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '10px',
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 2000,
          fontSize: '12px'
        }}>
          Location Error: {locationError}
        </div>
      )}
      
      {/* SUPER SIMPLE TEST - No positioning */}
      <h1 style={{
        color: 'white',
        fontSize: '48px',
        textAlign: 'center',
        background: 'red',
        margin: 0,
        padding: '20px'
      }}>
        🚨 CAN YOU SEE THIS TEXT? 🚨
      </h1>
      
      {/* Debug: Component Status */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.9)',
        color: 'lime',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '14px',
        zIndex: 10000,
        pointerEvents: 'none',
        border: '2px solid lime'
      }}>
        🟢 RootView Loaded & Buttons Should Be Visible!
      </div>

      {/* Debug: Button Status */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(255,0,0,0.9)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10000,
        pointerEvents: 'none'
      }}>
        🔴 If you can see this but not buttons - CSS issue!
      </div>

      {/* Bobbing Vostcard Pin in Center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 2000
      }}>
        <img 
          src="/Vostcard_pin.png"
          alt="Vostcard Pin"
          className="bobbing-pin"
          style={{
            width: '80px',
            height: '80px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
          }}
          onError={(e) => {
            if (typeof console !== 'undefined' && console.error) {
              console.error('VostcardPin failed to load');
            }
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* User Guide Button */}
      <div style={{
        position: 'fixed', // Changed from absolute to fixed
        top: '50%',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 9999, // Higher z-index
        padding: '0 20px',
        boxSizing: 'border-box',
        marginTop: '80px',
        pointerEvents: 'auto',
        // Force visibility
        visibility: 'visible',
        opacity: 1
      }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof console !== 'undefined' && console.log) {
              console.log('User Guide button clicked!');
            }
            navigate('/user-guide');
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof console !== 'undefined' && console.log) {
              console.log('User Guide button touched!');
            }
            navigate('/user-guide');
          }}
          style={{
            background: '#FF0000', // Bright red for testing
            color: 'white',
            border: '4px solid yellow', // Bright border
            borderRadius: '12px',
            fontSize: '28px', // Larger
            fontWeight: 700,
            padding: '20px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(255, 0, 0, 0.8)', // Strong shadow
            cursor: 'pointer',
            letterSpacing: '0.01em',
            position: 'relative',
            zIndex: 10001,
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)' // Text shadow
          }}
        >
          User Guide
        </button>
      </div>

      {/* Log In Button at Bottom */}
      <div style={{
        position: 'fixed', // Changed from absolute to fixed
        bottom: '92px',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 9999, // Higher z-index
        padding: '0 20px',
        boxSizing: 'border-box',
        // Force visibility
        visibility: 'visible',
        opacity: 1
      }}>
        <button
          type="button"
          onClick={() => {
            if (typeof console !== 'undefined' && console.log) {
              console.log('Login/Register button clicked!');
            }
            navigate('/login');
          }}
          style={{
            background: '#0000FF', // Bright blue for testing
            color: 'white',
            border: '4px solid lime', // Bright border
            borderRadius: '12px',
            fontSize: '28px', // Larger
            fontWeight: 700,
            padding: '20px 0',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(0, 0, 255, 0.8)', // Strong shadow
            cursor: 'pointer',
            letterSpacing: '0.01em',
            position: 'relative',
            zIndex: 10001,
            pointerEvents: 'auto',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)' // Text shadow
          }}
        >
          Login/Register
        </button>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowVideoModal(false)}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10001,
                fontSize: '18px',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              <FaTimes />
            </button>

            <div style={{ 
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <iframe
                src={youtubeEmbedUrl}
                width="100%"
                height="100%"
                style={{
                  minHeight: '315px',
                  maxWidth: '560px',
                  aspectRatio: '16/9',
                  borderRadius: 8,
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              Tap outside video or ✕ to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RootView;