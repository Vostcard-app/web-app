          ) : (
            <>
              {/* Navigation buttons */}
              {!singleVostcard && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 1002,
                    padding: '0 20px'
                  }}
                >
                  <button 
                    type="button"
                    style={{ 
                      backgroundColor: '#002B4D',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0px 20px',
                      fontSize: '16px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      pointerEvents: 'auto',
                      transition: 'transform 0.1s ease',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      lineHeight: '1',
                      gap: '8px'
                    }} 
                    onClick={handleListViewClick}
                  >
                    <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
                    List View
                  </button>
                  
                  <button 
                    type="button"
                    style={{ 
                      backgroundColor: '#002B4D',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0px 20px',
                      fontSize: '16px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      pointerEvents: 'auto',
                      transition: 'transform 0.1s ease',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      lineHeight: '1',
                      gap: '8px'
                    }} 
                    onClick={handleOffersClick}
                  >
                    <span style={{ fontSize: '20px', lineHeight: '1' }}>⋮</span>
                    Offers
                  </button>
                  
                  {/* Info button */}
                  <button
                    onClick={() => setShowVideoModal(true)}
                    style={{
                      backgroundColor: '#002B4D',
                      color: 'white',
                      border: 'none',
                      padding: '8px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >
                    <img
                      src={InfoButton}
                      alt="Info"
                      style={{
                        width: '24px',
                        height: '24px',
                        filter: 'brightness(0) saturate(100%) invert(100%)'
                      }}
                    />
                  </button>
                </div>
              )}

              {/* Map Container */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
              }}>
                {mapError ? (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}>
                    <div style={{
                      background: 'white',
                      padding: '30px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      textAlign: 'center',
                      maxWidth: '300px'
                    }}>
                      <h3 style={{ color: '#d32f2f', margin: '0 0 16px 0' }}>Map Error</h3>
                      <p style={{ color: '#666', margin: '0 0 16px 0', fontSize: '14px' }}>
                        {mapError}
                      </p>
                      <button onClick={handleRetryLoad} style={{
                        background: '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}>
                        Retry ({retryCount})
                      </button>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={userLocation || [40.7128, -74.0060]}
                    zoom={16}
                    style={{
                      width: '100%',
                      height: '100%',
                      zIndex: 1,
                    }}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* User location marker */}
                    {actualUserLocation && (
                      <Marker position={actualUserLocation} icon={userIcon}>
                        <Popup>Your Location</Popup>
                      </Marker>
                    )}
                    
                    {/* Vostcard markers */}
                    {filteredVostcards.map((vostcard) => {
                      if (!vostcard.latitude || !vostcard.longitude) return null;
                      
                      const position: [number, number] = [vostcard.latitude, vostcard.longitude];
                      const icon = getVostcardIcon(vostcard.isOffer, vostcard.userRole, vostcard.isQuickcard);
                      
                      return (
                        <Marker
                          key={vostcard.id}
                          position={position}
                          icon={icon}
                          eventHandlers={{
                            click: () => {
                              console.log('📍 Vostcard pin clicked:', vostcard.title);
                              if (vostcard.isQuickcard) {
                                navigate(`/quickcard/${vostcard.id}`);
                              } else if (vostcard.isOffer) {
                                navigate(`/offer/${vostcard.id}`);
                              } else {
                                navigate(`/vostcard/${vostcard.id}`);
                              }
                            }
                          }}
                        >
                          <Popup>
                            <div style={{ minWidth: '200px' }}>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                                {vostcard.title || 'Untitled'}
                              </h4>
                              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                                By: {vostcard.username || 'Unknown'}
                              </p>
                              {vostcard.description && (
                                <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                                  {vostcard.description.substring(0, 100)}
                                  {vostcard.description.length > 100 && '...'}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  if (vostcard.isQuickcard) {
                                    navigate(`/quickcard/${vostcard.id}`);
                                  } else if (vostcard.isOffer) {
                                    navigate(`/offer/${vostcard.id}`);
                                  } else {
                                    navigate(`/vostcard/${vostcard.id}`);
                                  }
                                }}
                                style={{
                                  backgroundColor: '#002B4D',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    
                    <MapUpdater userLocation={userLocation} />
                  </MapContainer>
                )}
              </div>
            </>
          )}
        </div>

        {/* Menu */}
        {isMenuOpen && (
          <div style={menuStyle}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: 'bold', color: '#002B4D' }}>
              Menu
            </div>
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-vostcards');
              }}
              style={menuItemStyle}
            >
              📱 Private Posts
            </button>
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-posted-vostcards');
              }}
              style={menuItemStyle}
            >
              🌍 My Posts
            </button>
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/quickcards');
              }}
              style={menuItemStyle}
            >
              📸 Quickcards
            </button>
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/liked-vostcards');
              }}
              style={menuItemStyle}
            >
              ❤️ Liked
            </button>
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/following');
              }}
              style={menuItemStyle}
            >
              👥 Following
            </button>
            
            {(userRole === 'guide' || userRole === 'admin') && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/vostcard-studio');
                }}
                style={menuItemStyle}
              >
                🎬 Vostcard Studio
              </button>
            )}
            
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/settings');
              }}
              style={menuItemStyle}
            >
              ⚙️ Settings
            </button>
            
            <button
              onClick={handleLogout}
              style={{ ...menuItemStyle, color: '#d32f2f' }}
            >
              🚪 Logout
            </button>
          </div>
        )}

        {/* Create buttons */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 15,
          right: 15,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '4%'
        }}>
          <button
            onTouchStart={handleCreateTouchStart}
            onTouchEnd={handleCreateTouchEnd}
            onClick={handleCreateClick}
            style={{
              background: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '0px 20px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,43,77,0.2)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              width: '48%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isCreatePressed ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            Create Vostcard
          </button>
          <button
            onTouchStart={handleQuickcardTouchStart}
            onTouchEnd={handleQuickcardTouchEnd}
            onClick={handleCreateQuickcard}
            style={{
              background: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '0px 20px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,43,77,0.2)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              width: '48%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isQuickcardPressed ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            Create Quickcard
          </button>
        </div>

        {/* Zoom controls */}
        <div style={{
          position: 'absolute',
          top: '50%',
          right: 20,
          transform: 'translateY(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <button 
            onClick={() => {}}
            style={{
              background: '#fff',
              color: '#002B4D',
              border: '1px solid #ddd',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <FaPlus />
          </button>
          <button 
            onClick={() => {}}
            style={{
              background: '#fff',
              color: '#002B4D',
              border: '1px solid #ddd',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <FaMinus />
          </button>
        </div>

        {/* Recenter control */}
        <div style={{
          position: 'absolute',
          top: '33%',
          right: 20,
          transform: 'translateY(-50%)',
          zIndex: 1000
        }}>
          <button 
            onClick={handleRecenter} 
            style={{
              background: '#fff',
              color: '#002B4D',
              border: '1px solid #ddd',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <FaLocationArrow />
          </button>
        </div>

        {/* Filter button */}
        <div style={{
          position: 'absolute',
          bottom: '95px',
          left: '16px',
          zIndex: 1002
        }}>
          <button
            onClick={() => setShowFilterModal(!showFilterModal)}
            style={{
              background: (
                (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                selectedTypes.length > 0 ||
                showFriendsOnly
              ) ? '#002B4D' : '#fff',
              color: (
                (selectedCategories.length > 0 && !selectedCategories.includes('None')) || 
                selectedTypes.length > 0 ||
                showFriendsOnly
              ) ? 'white' : '#002B4D',
              border: '1px solid #ddd',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <FaFilter />
          </button>
        </div>

        {/* Loading overlay */}
        {loadingVostcards && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(0,43,77,0.9)',
              color: 'white',
              padding: '20px 30px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              Loading Vōstcards...
            </div>
          </div>
        )}

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

        {/* Drive Mode Player */}
        {userLocation && (
          <DriveModePlayer
            userLocation={userLocation}
            userSpeed={currentSpeed}
            isEnabled={isDriveModeEnabled}
          />
        )}
      </div>
    </div>
  );
};

export default HomeView;