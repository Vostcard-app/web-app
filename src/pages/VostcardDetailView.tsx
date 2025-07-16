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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 24px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', marginRight: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
            {userProfile?.avatarURL && !imageLoadError ? (
              <img 
                src={userProfile.avatarURL} 
                alt="avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => {
                  setImageLoadError(true);
                }}
              />
            ) : (
              <FaUserCircle 
                size={64} 
                color="#ccc" 
              />
            )}
          </div>
          <span style={{ fontWeight: 500, fontSize: 24 }}>{vostcard?.username}</span>
        </div>
        {vostcard?.userID && (
          <FollowButton 
            targetUserId={vostcard.userID} 
            targetUsername={vostcard?.username}
            size="small"
            variant="secondary"
          />
        )}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 24, margin: '2px 0 8px 0' }}>{vostcard?.title}</div>

      {/* Media Thumbnails */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0 8px 0' }}>
        <div 
          style={{ 
            width: 180, 
            height: 240, 
            background: '#111', 
            borderRadius: 16, 
            overflow: 'hidden', 
            cursor: videoURL ? 'pointer' : 'default',
            position: 'relative'
          }}
          onClick={() => videoURL && setShowVideoModal(true)}
        >
          {videoURL ? (
            <>
              <video 
                src={videoURL} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  pointerEvents: 'none'
                }}
                muted
                onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget)}
              />
              {/* Play overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '20px solid white',
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  marginLeft: '4px'
                }} />
              </div>
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>No Video</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {photoURLs.length > 0 ? (
            photoURLs.slice(0, 2).map((url: string, idx: number) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img
                  src={url}
                  alt={`photo${idx+1}`}
                  style={{ 
                    width: 120, 
                    height: 110, 
                    borderRadius: 16, 
                    objectFit: 'cover', 
                    cursor: 'pointer',
                    border: photoLoadErrors.has(idx) ? '2px solid red' : 'none'
                  }}
                  onClick={() => setSelectedPhoto(url)}
                  onContextMenu={e => e.preventDefault()}
                  onError={(e) => {
                    console.error(`❌ Failed to load photo ${idx + 1}:`, {
                      url,
                      error: e,
                      vostcardTitle: vostcard?.title
                    });
                    setPhotoLoadErrors(prev => new Set([...prev, idx]));
                  }}
                  onLoad={() => {
                    console.log(`✅ Successfully loaded photo ${idx + 1} for vostcard:`, vostcard?.title);
                    setPhotoLoadErrors(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(idx);
                      return newSet;
                    });
                  }}
                />
                {photoLoadErrors.has(idx) && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 0, 0, 0.1)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'red',
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 4
                  }}>
                    Error Loading Photo
                  </div>
                )}
              </div>
            ))
          ) : (
            <>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12, textAlign: 'center' }}>
                No Photo
                {vostcard?.title && (
                  <div style={{ position: 'absolute', top: -20, fontSize: 10, color: '#666' }}>
                    Debug: Check console
                  </div>
                )}
              </div>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12 }}>No Photo</div>
            </>
          )}
        </div>
      </div>

      {/* Add a debug section (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: 10, 
          borderRadius: 8, 
          fontSize: 10, 
          maxWidth: 300, 
          maxHeight: 200, 
          overflow: 'auto' 
        }}>
          <div>Photo Debug Info:</div>
          <div>URLs: {photoURLs.length}</div>
          <div>Errors: {photoLoadErrors.size}</div>
          <div>Title: {vostcard?.title}</div>
          <div>Private: {isPrivate ? 'Yes' : 'No'}</div>
          <details>
            <summary>Full Debug</summary>
            <pre style={{ fontSize: 8 }}>{photoDebugInfo}</pre>
          </details>
        </div>
      )}

      {/* Action Icons - Add the email icon */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0 0 0' }}>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleLikeToggle}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaHeart 
            size={24} 
            color={isLikedStatus ? "#ff4444" : "#222"} 
            style={{ 
              marginBottom: 4,
              transition: 'color 0.2s'
            }} 
          />
          <div style={{ fontSize: 18 }}>{likeCount}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={24} color="#ffc107" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{ratingStats.averageRating.toFixed(1)}</div>
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={() => setShowCommentsModal(true)}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaRegComment size={24} color="#222" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18 }}>{commentCount}</div>
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleShareClick}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaShare size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
        {/* Add Email Share Icon */}
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleEmailShare}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaEnvelope size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onClick={handleViewOnMap}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaMap size={24} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? Rating System */}
      <div style={{ textAlign: 'center', margin: '5px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ margin: '8px 0 0 0' }}>
        <RatingStars
          currentRating={currentUserRating}
          averageRating={ratingStats.averageRating}
          ratingCount={ratingStats.ratingCount}
          onRate={handleRatingSubmit}
        />
      </div>

      {/* Description Link with FaFlag and FaSyncAlt icons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '16px 0 0 0',
          width: '100%',
          maxWidth: 420,
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
        }}
      >
        <FaFlag
          size={24}
          color="#e53935"
          style={{ 
            cursor: 'pointer', 
            padding: '5px',
            position: 'absolute',
            left: '20px'
          }}
          onClick={handleFlagClick}
        />
        <button
          onClick={() => setShowDescriptionModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontWeight: 700,
            fontSize: 24,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
            flex: '1 1 auto',
            textAlign: 'center',
          }}
        >
          Description
        </button>
        <FaSyncAlt
          size={24}
          color="#007aff"
          style={{ 
            padding: '5px',
            position: 'absolute',
            right: '20px'
          }}
        />
      </div>
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
            padding: '20px',
          }}
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '24px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowDescriptionModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#666',
                padding: 0,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            
            {/* Header */}
            <h2 style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 700, color: '#002B4D' }}>
              Description
            </h2>
            
            {/* Description content */}
            <div style={{ 
              color: '#444', 
              fontSize: 16, 
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {vostcard?.description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Video Modal */}
      {showVideoModal && videoURL && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            cursor: 'pointer',
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoModal(false);
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 1002,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            
            {/* Video */}
            <video
              src={videoURL}
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
