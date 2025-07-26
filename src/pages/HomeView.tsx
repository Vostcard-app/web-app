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
  </div>

  // Menu style
  const menuStyle = {
    position: 'absolute' as const,
    top: '65px',
    right: '16px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 2000,
    minWidth: '180px',
    maxWidth: '200px',
    maxHeight: '70vh',
    overflow: 'auto'
  };

  const menuItemStyle = {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    textAlign: 'left' as const,
    color: '#333',
    transition: 'background-color 0.2s ease'
  };

  // Tutorial video handlers
  const handleTutorialVideo = (videoId: string, title: string) => {
    setCurrentTutorialVideo(videoId);
    setShowInfoMenu(false);
    setShowVideoModal(true);
  };

  // YouTube video URL using current tutorial video
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${currentTutorialVideo}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: shouldUseContainer ? '#f0f0f0' : 'white',
      display: shouldUseContainer ? 'flex' : 'block',
      justifyContent: shouldUseContainer ? 'center' : 'initial',
      alignItems: shouldUseContainer ? 'flex-start' : 'initial',
      padding: shouldUseContainer ? '20px' : '0'
    }}>
      <div style={{
        width: shouldUseContainer ? '390px' : '100%',
        maxWidth: shouldUseContainer ? '390px' : '100%',
        height: shouldUseContainer ? '844px' : '100vh',
        backgroundColor: 'white',
        boxShadow: shouldUseContainer ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: shouldUseContainer ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#002B4D',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'relative',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          touchAction: 'manipulation',
          flexShrink: 0,
          borderRadius: shouldUseContainer ? '16px' : '0'
        }}>
          <div 
            onClick={() => navigate('/home')}
            style={{ 
              color: 'white', 
              fontSize: 28, 
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {singleVostcard ? 'Vōstcard Location' : 'Vōstcard'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={() => {
                if (user?.uid) {
                  navigate(`/user-profile/${user.uid}`);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="User Avatar"
                  style={{
                    width: 55,
                    height: 55,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  onError={() => setUserAvatar(null)}
                />
              ) : (
                <FaUserCircle size={55} color="white" />
              )}
            </div>
            <FaBars
              size={48}
              color="white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Main content area */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden'
        }}>
          {loading && showAuthLoading ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
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
                Authenticating...
              </div>
            </div>
          ) : (
            <>
              {/* ListView and Offers buttons - moved up */}
              {/* List View and Offers buttons - always show */}
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: '20px',
                  zIndex: 1002,
                  display: 'flex',
                  gap: '8px'
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
              </div>

              {/* Video Guide button - stays in original position */}
              {!singleVostcard && (
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '20px',
                    zIndex: 1002
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <button
                      onClick={() => setShowInfoMenu(!showInfoMenu)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img 
                        src={RoundInfoButton} 
                        alt="Round Info Button" 
                        style={{
                          width: '60px',
                          height: '60px'
                        }}
                      />
                    </button>
                    <div style={{
                      backgroundColor: '#002B4D',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      Video Guides
                    </div>
                  </div>
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
                    key="map-container"
                  >
                    {(() => {
                      console.log('🗺️ MapContainer rendering with userLocation:', userLocation);
                      return null;
                    })()}
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* ✅ Add ZoomControls component inside MapContainer */}
                    <ZoomControls />
                    
                    {actualUserLocation && (
                      <Marker position={actualUserLocation} icon={userIcon}>
                        <Popup>Your Location</Popup>
                      </Marker>
                    )}
                    
                    {filteredVostcards.map((vostcard) => {
                      if (!vostcard.latitude || !vostcard.longitude) return null;
                      
                      const position: [number, number] = [vostcard.latitude, vostcard.longitude];
                      
                      // 🔍 DEBUG: Log icon selection for quickcards
                      if (vostcard.isQuickcard) {
                        console.log('🔍 DEBUG: Rendering quickcard marker:', {
                          title: vostcard.title,
                          userRole: vostcard.userRole,
                          isOffer: vostcard.isOffer,
                          isQuickcard: vostcard.isQuickcard
                        });
                      }
                      
                      const icon = getVostcardIcon(vostcard.isOffer, vostcard.userRole, vostcard.isQuickcard);
                      
                      // 🔍 DEBUG: Log which icon was selected
                      if (vostcard.isQuickcard) {
                        const iconName = icon === guideIcon ? 'GuideIcon' : 
                                         icon === vostcardIcon ? 'VostcardIcon' : 
                                         icon === offerIcon ? 'OfferIcon' : 'Unknown';
                        console.log('🔍 DEBUG: Selected icon for quickcard:', iconName, 'for userRole:', vostcard.userRole);
                      }
                      
                      return (
                        <Marker
                          key={vostcard.id}
                          position={position}
                          icon={icon}
                          eventHandlers={{
                            click: () => {
                              console.log('📍 Vostcard pin clicked:', vostcard.title);
                              // ✅ UNIFIED EXPERIENCE: Use VostcardDetailView for both quickcards and regular vostcards
                              if (vostcard.isOffer) {
                                navigate(`/offer/${vostcard.id}`);
                              } else {
                                // Both quickcards and regular vostcards use the same detail view
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
                                  // ✅ UNIFIED EXPERIENCE: Use VostcardDetailView for both quickcards and regular vostcards
                                  if (vostcard.isOffer) {
                                    navigate(`/offer/${vostcard.id}`);
                                  } else {
                                    // Both quickcards and regular vostcards use the same detail view
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
                    
                    <MapUpdater userLocation={userLocation} singleVostcard={singleVostcard} />
                  </MapContainer>
                )}
              </div>
            </>
          )}
        </div>

        {/* Main Menu */}
        {isMenuOpen && (
          <div style={menuStyle}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: 'bold', color: '#002B4D' }}>
              Menu
            </div>
            
            {/* 1. Personal Posts */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-vostcards');
              }}
              style={menuItemStyle}
            >
              📱 Personal Posts
            </button>
            
            {/* 2. Public Posts */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/my-posted-vostcards');
              }}
              style={menuItemStyle}
            >
              🌍 Public Posts
            </button>
            
            {/* 3. Browse Area */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/browse-area');
              }}
              style={menuItemStyle}
            >
              🗺️ Browse Area
            </button>
            
            {/* 4. Drive Mode */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/drive-mode-settings');
              }}
              style={menuItemStyle}
            >
              🚗 Drive Mode
            </button>
            
            {/* 5. Vōstbox */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/vostbox');
              }}
              style={menuItemStyle}
            >
              📬 Vōstbox
            </button>
            
            {/* 6. Friend List */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/friends');
              }}
              style={menuItemStyle}
            >
              👥 Friend List
            </button>
            
            {/* 7. Liked */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/liked-vostcards');
              }}
              style={menuItemStyle}
            >
              ❤️ Liked
            </button>
            
            {/* 8. Following */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/following');
              }}
              style={menuItemStyle}
            >
              👥 Following
            </button>

            {/* 9. Vostcard Studio */}
            {userRole === 'guide' && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/studio');
                }}
                style={menuItemStyle}
              >
                🎬 Vostcard Studio
              </button>
            )}
            
            {/* 10. Settings */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/settings');
              }}
              style={menuItemStyle}
            >
              ⚙️ Settings
            </button>
            
            {/* 11. Suggestion Box */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/suggestion-box');
              }}
              style={menuItemStyle}
            >
              💡 Suggestion Box
            </button>
            
            {/* 12. Report a bug */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/report-bug');
              }}
              style={menuItemStyle}
            >
              🐛 Report a bug
            </button>
            
            {/* 13. Logout */}
            <button
              onClick={handleLogout}
              style={{ ...menuItemStyle, color: '#d32f2f' }}
            >
              🚪 Logout
            </button>
          </div>
        )}

        {/* Info/Tutorial Menu */}
        {showInfoMenu && (
          <div style={{
            ...menuStyle,
            right: '76px' // Position next to the info button to avoid overlap with main menu
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: 'bold', color: '#002B4D' }}>
              📹 Tutorial Videos
            </div>
            
            <button
              onClick={() => handleTutorialVideo('J-ix67eZ7J4', 'What is Vōstcard')}
              style={menuItemStyle}
            >
              📍 What is Vōstcard
            </button>
            
            <button
              onClick={() => handleTutorialVideo('VTfeDwSUy-o', 'Home Screen')}
              style={menuItemStyle}
            >
              🏠 Home Screen
            </button>
          </div>
        )}

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
          top: '66.7%', // 2/3 down the screen
          right: 20, // Right side matching zoom controls
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
            userLocation={{ latitude: userLocation[0], longitude: userLocation[1] }}
            userSpeed={currentSpeed}
            isEnabled={isDriveModeEnabled}
          />
        )}
      </div>

      {/* Bottom Navigation - 2 buttons */}
      <div style={{
        position: 'fixed',
        bottom: shouldUseContainer ? 40 : 20,
        left: shouldUseContainer ? '50%' : 15,
        right: shouldUseContainer ? 'auto' : 15,
        transform: shouldUseContainer ? 'translateX(-50%)' : 'none',
        width: shouldUseContainer ? '360px' : 'auto',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '4%',
        padding: shouldUseContainer ? '0 15px' : '0',
      }}>
        {/* Create Vostcard Button */}
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
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isCreatePressed ? 'scale(0.95)' : 'scale(1)',
            textAlign: 'center',
            lineHeight: '1.2'
          }}
        >
          Create Vostcard
        </button>

        {/* Create Quickcard Button */}
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
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isQuickcardPressed ? 'scale(0.95)' : 'scale(1)',
            textAlign: 'center',
            lineHeight: '1.2'
          }}
        >
          Create Quickcard
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 2000
            }}
            onClick={() => setShowFilterModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '300px',
            width: '90%',
            height: '80vh',
            zIndex: 2001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px 24px',
              borderBottom: '1px solid #eee',
              backgroundColor: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#333' }}>
                Filter Content
              </h3>
            </div>
            
            {/* Scrollable Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px 24px'
            }}>
              {/* Content Type Filtering */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#333' }}>Content Type</h4>
                {AVAILABLE_TYPES.map((type) => (
                  <label key={type} style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    backgroundColor: selectedTypes.includes(type) ? '#e8f4fd' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes(prev => [...prev, type]);
                        } else {
                          setSelectedTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {type === 'Vostcard' && '📹'} 
                    {type === 'Quickcard' && '📸'} 
                    {type === 'Guide' && '📚'} 
                    {type}
                  </label>
                ))}
              </div>
              
              {/* Category Filtering */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#333' }}>Category</h4>
                {AVAILABLE_CATEGORIES.map((category) => (
                  <label key={category} style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    backgroundColor: selectedCategories.includes(category) ? '#f0f8ff' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (category === 'None') {
                            setSelectedCategories(['None']);
                          } else {
                            setSelectedCategories(prev => prev.filter(c => c !== 'None').concat(category));
                          }
                        } else {
                          setSelectedCategories(prev => prev.filter(c => c !== category));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {category}
                  </label>
                ))}
              </div>

              {/* Friends Only Filter */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#333' }}>Friends</h4>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  backgroundColor: showFriendsOnly ? '#f0f8ff' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    checked={showFriendsOnly}
                    onChange={(e) => setShowFriendsOnly(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  👥 Show friends only
                </label>
              </div>
            </div>
             
            {/* Fixed Button Area */}
            <div style={{
              borderTop: '1px solid #eee',
              padding: '16px 24px',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'white',
              borderRadius: '0 0 12px 12px'
            }}>
              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedCategories([]);
                  setShowFriendsOnly(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#002B4D',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden Native Camera Input */}
      <input
        id="quickcard-native-camera"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraPhoto}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default HomeView;