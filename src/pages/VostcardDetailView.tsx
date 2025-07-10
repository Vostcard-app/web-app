              <img
                key={idx}
                src={url}
                alt={`photo${idx+1}`}
                style={{ width: 120, height: 110, borderRadius: 16, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setSelectedPhoto(url)}
                onContextMenu={e => e.preventDefault()}
              />
            ))
          ) : (
            <>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
              <div style={{ width: 120, height: 110, borderRadius: 16, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Photo</div>
            </>
          )}
        </div>
      </div>

      {/* Action Icons */}
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
            size={32} 
            color={isLikedStatus ? "#ff4444" : "#222"} 
            style={{ 
              marginBottom: 4,
              transition: 'color 0.2s'
            }} 
          />
          <div style={{ fontSize: 18 }}>{likeCount}</div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <FaStar size={32} color="#ffc107" style={{ marginBottom: 4 }} />
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
          <FaRegComment size={32} color="#222" style={{ marginBottom: 4 }} />
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
          <FaShare size={32} color="#222" style={{ marginBottom: 4 }} />
        </div>
      </div>

      {/* Worth Seeing? Rating System */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0', fontSize: 18 }}>Worth Seeing?</div>
      <div style={{ margin: '8px 0 0 0' }}>
        <RatingStars
          currentRating={currentUserRating}
          averageRating={ratingStats.averageRating}
          ratingCount={ratingStats.ratingCount}
          onRate={handleRatingSubmit}
        />
      </div>

      {/* Description Link */}
      <div style={{ textAlign: 'center', margin: '16px 0 0 0' }}>
        <button 
          onClick={() => setShowDescriptionModal(true)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#007aff', 
            fontWeight: 700, 
            fontSize: 24, 
            textDecoration: 'underline', 
            cursor: 'pointer' 
          }}
        >
          Description
        </button>
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>Posted: {createdAt}</div>

      {/* Pin Placer Button - Only visible to creator */}
      {user && user.uid === vostcard?.userID && (
        <div style={{
          textAlign: 'center',
          margin: '24px 0 16px 0'
        }}>
          <button
            onClick={() => {
              // Navigate to Pin Placer tool with vostcard data
              navigate('/pin-placer', {
                state: {
                  pinData: {
                    id: vostcard.id || id,
                    title: vostcard.title || 'Untitled Vostcard',
                    description: vostcard.description || 'No description',
                    latitude: vostcard.latitude || vostcard.geo?.latitude || 0,
                    longitude: vostcard.longitude || vostcard.geo?.longitude || 0,
                    isOffer: false,
                    userID: vostcard.userID
                  }
                }
              });
            }}
            style={{
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e55a2b';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff6b35';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
            }}
          >
            <FaMapPin size={16} />
            Pin Placer
          </button>
        </div>
      )}

      {/* Bottom Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 24px 0 24px' }}>
        <FaFlag 
          size={36} 
          color="#e53935" 
          style={{ 
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }} 
          onClick={handleFlagClick}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        <FaSyncAlt size={36} color="#007aff" style={{ cursor: 'pointer' }} />
      </div>

      {/* Comments Modal */}
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
              {description || 'No description available.'}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Video Modal */}
      {showVideoModal && videoUrl && (
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
              src={videoUrl}
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

      {/* Private Share Modal */}
      {showPrivateShareModal && createShareableVostcard() && (
        <PrivateShareModal
          isOpen={showPrivateShareModal}
          onClose={() => setShowPrivateShareModal(false)}
          vostcard={createShareableVostcard()!}
        />
      )}
    </div>
  );
};

export default VostcardDetailView;
