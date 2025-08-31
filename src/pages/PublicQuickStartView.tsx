import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaTimes, FaPlay } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const PublicQuickStartView: React.FC = () => {
  const navigate = useNavigate();
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // YouTube video ID for the new "What is Vostcard?" shorts video
  const youtubeVideoId = 'JyV2HbeCPYA';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      {/* Header */}
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
            onClick={() => navigate(-1)}
          />
          <span 
            onClick={() => navigate('/')}
            style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.02em'
            }}
          >
            Vōstcard
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: 'transparent',
              border: '2px solid white',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#07345c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'white';
            }}
          >
            Log In
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '20px 24px 40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: '800',
          color: '#07345c',
          marginBottom: '16px',
          lineHeight: '1.1'
        }}>
          ✨ Quick Start Guide
        </h1>
        
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: '#6c757d',
          marginBottom: '24px',
          lineHeight: '1.6',
          maxWidth: '600px'
        }}>
          Get started with Vōstcard in just a few minutes. Learn how to create, share, and discover location-based content.
        </p>

        {/* Video Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: 'clamp(16px, 4vw, 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          width: '100%',
          maxWidth: '600px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#07345c',
            marginBottom: '16px'
          }}>
            🎥 What is Vōstcard?
          </h2>
          
          <div 
            onClick={() => setShowVideoModal(true)}
            style={{
                          position: 'relative',
            width: '100%',
            height: 'clamp(200px, 40vw, 300px)',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid #e9ecef',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#07345c';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e9ecef';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{
              backgroundColor: '#07345c',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(7,52,92,0.3)'
            }}>
              <FaPlay size={32} color="white" style={{ marginLeft: '4px' }} />
            </div>
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Watch Introduction Video
            </div>
          </div>
        </div>

        {/* Quick Steps */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: 'clamp(16px, 4vw, 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          width: '100%',
          maxWidth: '600px',
          textAlign: 'left'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#07345c',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            🚀 Get Started in 3 Steps
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                backgroundColor: '#07345c',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#07345c', margin: '0 0 8px 0' }}>
                  📱 Create Your Account
                </h3>
                <p style={{ fontSize: '1rem', color: '#6c757d', margin: 0, lineHeight: '1.5' }}>
                  Sign up for free and set up your profile to start creating location-based content.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                backgroundColor: '#07345c',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#07345c', margin: '0 0 8px 0' }}>
                  📸 Create Your First Vōstcard
                </h3>
                <p style={{ fontSize: '1rem', color: '#6c757d', margin: 0, lineHeight: '1.5' }}>
                  Add photos, record a video, and share your experience at any location.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                backgroundColor: '#07345c',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#07345c', margin: '0 0 8px 0' }}>
                  🗺️ Explore & Discover
                </h3>
                <p style={{ fontSize: '1rem', color: '#6c757d', margin: 0, lineHeight: '1.5' }}>
                  Browse the map to discover amazing places and experiences shared by others.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 'auto',
          paddingTop: '20px'
        }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
              borderRadius: '12px',
              fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(7,52,92,0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(7,52,92,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(7,52,92,0.3)';
            }}
          >
            🚀 Get Started Free
          </button>
          
          <button
            onClick={() => navigate('/user-guide')}
            style={{
              backgroundColor: 'transparent',
              color: '#07345c',
              border: '2px solid #07345c',
              padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
              borderRadius: '12px',
              fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#07345c';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#07345c';
            }}
          >
            📖 Full User Guide
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
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '20px'
            }}
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  zIndex: 1
                }}
              >
                <FaTimes />
              </button>
              
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#07345c',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                What is Vōstcard?
              </h2>
              
              <div style={{
                width: '100%',
                height: '400px',
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
                    border: 'none',
                    borderRadius: '12px'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="What is Vōstcard?"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicQuickStartView;
