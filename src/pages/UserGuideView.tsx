import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import InfoPin from '../assets/Info_pin.png';

const UserGuideView: React.FC = () => {
  const navigate = useNavigate();
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // YouTube video ID extracted from the provided URL
  const youtubeVideoId = 'CCOErz2RxwI';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Vostcard Banner with Back Icon */}
      <div style={{
        background: '#07345c',
        color: 'white',
        width: '100%',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 1000,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FaArrowLeft 
            size={24} 
            color="white" 
            style={{ cursor: 'pointer', marginRight: '20px' }}
            onClick={() => navigate(-1)} // Go back to previous page
          />
          <span 
            onClick={() => navigate('/home')}
            style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            cursor: 'pointer',
          }}>
            Vōstcard
          </span>
        </div>
        
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
            src={InfoPin} 
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

      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {/* Vostcard Pin Section */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '25px',
          width: '100%',
          maxWidth: '600px'
        }}>
          {/* Vostcard Pin Image */}
          <div style={{
            marginRight: '30px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src={VostcardPin}
              alt="Vostcard Pin"
              style={{
                width: '80px',
                height: '80px',
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
              }}
              onError={(e) => {
                console.error('VostcardPin failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Vostcard Description */}
          <div style={{
            flex: 1,
            paddingTop: '10px'
          }}>
            <p style={{
              fontSize: '24px',
              color: '#333',
              lineHeight: '1.4',
              margin: 0,
              fontWeight: '400'
            }}>
              Tap these pins to see a Vōstcard. Vōstcards are 60 second videos about points of interest. You can watch them, send them, or make your own.
            </p>
          </div>
        </div>

        {/* Offer Pin Section */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '25px',
          width: '100%',
          maxWidth: '600px'
        }}>
          {/* Offer Pin Image */}
          <div style={{
            marginRight: '30px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src={OfferPin}
              alt="Offer Pin"
              style={{
                width: '80px',
                height: '80px',
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
              }}
              onError={(e) => {
                console.error('OfferPin failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Offer Description */}
          <div style={{
            flex: 1,
            paddingTop: '10px'
          }}>
            <p style={{
              fontSize: '24px',
              color: '#333',
              lineHeight: '1.4',
              margin: 0,
              fontWeight: '400'
            }}>
              Tap these pins to see offers or discounts near you.
            </p>
          </div>
        </div>

        {/* Login Button */}
        <div style={{
          marginTop: '25px',
          width: '100%',
          maxWidth: '600px',
          paddingBottom: '40px'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '50px !important',
              fontSize: '32px',
              fontWeight: 600,
              padding: '20px 0',
              width: '100%',
              boxShadow: '0 4px 12px rgba(7, 52, 92, 0.3)',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Register/Login
          </button>
        </div>
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

export default UserGuideView;
