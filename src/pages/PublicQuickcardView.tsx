        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
          marginBottom: '16px',
          marginTop: '25px',
          flexWrap: 'wrap'
        }}>
          {/* Map Icon */}
          <div 
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}
            onClick={() => {
              // Navigate all users to public map view regardless of authentication status
              if (quickcard.latitude && quickcard.longitude) {
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
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaMap size={28} color="#333" />
          </div>

          {/* ✅ NEW: Audio Button - only show if quickcard has audio */}
          {((quickcard as any)?.audio || (quickcard as any)?._firebaseAudioURL) && (
            <div 
              style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '12px',
                background: isPlayingAudio ? '#e6f3ff' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${isPlayingAudio ? '#007aff' : '#e0e0e0'}`
              }}
              onClick={handleAudioClick}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <FaVolumeUp size={28} color={isPlayingAudio ? '#007aff' : '#333'} />
import React, { useState, useEffect } from 'react';
            </div>
          )}

          {/* Heart Icon */}
          <div 
            style={{ 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: isLiked ? '#ffe6e6' : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: isLiked ? '1px solid #ffb3b3' : '1px solid #e0e0e0',
              minWidth: '80px'
            }}
            onClick={handleLikeToggle}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaHeart 
              size={28} 
              color={isLiked ? "#ff4444" : "#333"} 
              style={{ 
                transition: 'color 0.2s ease',
                filter: isLiked ? 'drop-shadow(0 0 4px rgba(255,68,68,0.5))' : 'none'
              }} 
            />
            <span style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: isLiked ? "#ff4444" : "#333"
            }}>
              {likeCount}
            </span>
          </div>

          {/* Free Account Button */}
          <button
            type="button"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#002B4D',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none',
              whiteSpace: 'nowrap'
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Free Account button clicked!');
              navigate('/user-guide');
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Free Account button touched!');
              navigate('/user-guide');
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Join Free
          </button>
        </div>

        {/* Title */}
        <div style={{ 
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {title || 'Untitled'}
        </div>

        {/* Single Photo Display - Same structure as Vostcard but only one thumbnail */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: '16px' }}>
          {/* Single Photo Thumbnail */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            width: 180,
            height: 240
          }}>
            {photoURLs.length > 0 ? (
              <div 
                key={0}
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 16, 
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPhoto(photoURLs[0])}
              >
                <img 
                  src={photoURLs[0]} 
                  alt="Quickcard Photo" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              </div>
            ) : (
              <div 
                style={{ 
                  background: '#f0f0f0', 
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc',
                  width: '100%',
                  height: '100%'
                }}
              >
                <FaMap size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ 
          color: '#333',
          lineHeight: 1.5,
          fontSize: 16,
          marginBottom: '16px'
        }}>
          {description || 'No description available.'}
        </div>

        <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: '24px' }}>
          Posted: {createdAt}
        </div>

        {/* Bottom message and link */}
        <div style={{ 
          textAlign: 'center', 
          borderTop: '1px solid #eee',
          paddingTop: '24px',
          marginTop: '24px'
        }}>
          <div style={{ 
            color: '#666', 
            fontSize: 14, 
            lineHeight: 1.4, 
            marginBottom: '12px' 
          }}>
            This was made with Vōstcard, a free app that lets you create, share privately or post to the map and see Vōstcards anywhere they are posted
          </div>
          <button
            onClick={() => navigate('/user-guide')}
            style={{
              background: 'none',
              border: 'none',
              color: '#007aff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              display: 'block',
              margin: '0 auto',
              textAlign: 'center'
            }}
          >
            Learn more about Vōstcard
          </button>
        </div>
      </div>

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
            zIndex: 2000,
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

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        /* Prevent bounce scrolling on body when this page is active */
        body {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        
        /* Ensure smooth scrolling on iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default PublicQuickcardView; 