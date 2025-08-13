import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaUserCircle, FaMap, FaCalendar, FaEye, FaPlay } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ItineraryService } from '../services/itineraryService';
import type { PublicItinerary, PublicItineraryItem } from '../types/ItineraryTypes';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

const PublicItineraryView: React.FC = () => {
  const { shareableLink } = useParams<{ shareableLink: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [itinerary, setItinerary] = useState<PublicItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load itinerary data
  useEffect(() => {
    const fetchItinerary = async () => {
      if (!shareableLink) {
        setError('No itinerary link provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading (extended for mobile)
      const timeoutId = setTimeout(() => {
        console.log('⏰ PublicItineraryView: Loading timed out after 30 seconds');
        setError('Loading timed out. Please check your connection and try again.');
        setLoading(false);
      }, 30000); // 30 second timeout for mobile networks

      try {
        console.log('🔍 PublicItineraryView: Loading itinerary with shareableLink:', shareableLink);
        console.log('🔍 PublicItineraryView: Using ItineraryService.getPublicItinerary method');

        const itineraryData = await ItineraryService.getPublicItinerary(shareableLink);
        console.log('🔍 PublicItineraryView: getPublicItinerary returned:', itineraryData);

        if (itineraryData) {
          console.log('✅ PublicItineraryView: Itinerary found:', {
            id: itineraryData.id,
            name: itineraryData.name,
            username: itineraryData.username,
            itemCount: itineraryData.items.length
          });
          
          clearTimeout(timeoutId);
          setItinerary(itineraryData);
          setLoading(false);
        } else {
          console.log('❌ PublicItineraryView: Itinerary not found');
          clearTimeout(timeoutId);
          setError('Itinerary not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('❌ PublicItineraryView: Error loading itinerary:', err);
        
        // More specific error messages for mobile debugging
        if (err.code === 'unavailable') {
          setError('Network connection issue. Please check your internet and try again.');
        } else if (err.code === 'permission-denied') {
          setError('Permission denied. This itinerary may not be shared publicly.');
        } else {
          setError('Failed to load itinerary. Please try again.');
        }
        setLoading(false);
      }
    };

    fetchItinerary();
  }, [shareableLink, retryCount]);

  // Manual retry function for mobile users
  const handleRetry = () => {
    console.log('🔄 PublicItineraryView: Manual retry requested');
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const handleItemClick = (item: PublicItineraryItem) => {
    // Navigate to public view of the vostcard/quickcard
    if (item.type === 'quickcard') {
      navigate(`/share-quickcard/${item.vostcardID}`);
    } else {
      navigate(`/share/${item.vostcardID}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading itinerary...</div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#fff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px' 
        }}>
          {error?.includes('not found') ? 'Itinerary Not Found' : 'Unable to Load Itinerary'}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '24px',
          maxWidth: '400px',
          lineHeight: 1.5
        }}>
          {error?.includes('not found') 
            ? 'This itinerary may have been deleted or the link is invalid. Please check the link and try again.'
            : error?.includes('not available') 
            ? 'This itinerary is private and not available for public viewing.'
            : error?.includes('timed out')
            ? 'The itinerary is taking too long to load.'
            : error || 'There was an error loading the itinerary.'
          }
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleRetry}
            style={{
              padding: '12px 24px',
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Try Again {retryCount > 0 && `(${retryCount + 1})`}
          </button>
          <button
            onClick={() => {
              // Redirect to login with returnTo parameter pointing to private version
              const privateUrl = `/itinerary/${itinerary?.id || shareableLink}`;
              navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Join (it's free)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header with gradient background */}
      <div style={{
        background: 'linear-gradient(135deg, #07345c 0%, #0a4a73 100%)',
        minHeight: '200px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        color: 'white'
      }}>
        {/* Top navigation */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div />
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (!user) {
                  const returnTo = `/itinerary/${itinerary?.id || shareableLink}`;
                  navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
                } else {
                  navigate('/home');
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <FaHome size={16} />
            </button>
          </div>
        </div>

        {/* Itinerary Info */}
        <div style={{ padding: '20px 20px 16px 20px' }}>
          
          <div style={{ 
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{ 
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {itinerary?.creatorAvatarURL ? (
                <img src={itinerary.creatorAvatarURL} alt="Creator Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FaUserCircle size={24} color="white" />
              )}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                lineHeight: '1.2',
                marginBottom: '4px'
              }}>
                {itinerary.name}
              </h1>
              
              <div style={{
                fontSize: '14px',
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>by {itinerary.username}</span>
                <span>•</span>
                <span>{formatDate(itinerary.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Promo line under banner */}
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            opacity: 0.9
          }}>
            Made with Vōstcard, a free app. It's free to join and free to use.
          </div>

          {itinerary.description && (
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              lineHeight: '1.4',
              opacity: 0.9
            }}>
              {itinerary.description}
            </p>
          )}

          <div style={{
            fontSize: '14px',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span>{itinerary.items.length} {itinerary.items.length === 1 ? 'stop' : 'stops'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Items List */}
        {itinerary.items.length > 0 ? (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {itinerary.items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Order number */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#07345c',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  {item.photoURL && (
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <img
                        src={item.photoURL}
                        alt={item.title || 'Itinerary item'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title || 'Untitled'}
                    </h3>
                    
                    {item.description && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {item.description}
                      </p>
                    )}
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {/* Type badge removed per request */}
                      {item.latitude && item.longitude && (
                        <>
                          <span>•</span>
                          <FaMap size={10} />
                          <span>Location</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Tap to view</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '18px', margin: 0 }}>This itinerary is empty</p>
          </div>
        )}
      </div>

      {/* Login/Register CTA */}
      {!user && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          backgroundColor: '#07345c',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500' }}>
            Want to create your own itineraries?
          </p>
          <button
            onClick={() => {
              const privateUrl = `/itinerary/${itinerary.id}`;
              navigate(`/login?returnTo=${encodeURIComponent(privateUrl)}`);
            }}
            style={{
              backgroundColor: 'white',
              color: '#07345c',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Join (it's free)
          </button>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <img 
              src={RoundInfoButton}
              alt="Tutorial"
              style={{ width: '60px', height: '60px', marginBottom: '16px' }}
            />
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Shared Itinerary</h3>
            <p style={{ margin: '0 0 24px 0', color: '#666', lineHeight: '1.5' }}>
              This is a shared itinerary created by {itinerary.username}. 
              Tap on any item to view the full details. Join Vōstcard to create your own itineraries!
            </p>
            <button
              onClick={() => setShowTutorialModal(false)}
              style={{
                backgroundColor: '#07345c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicItineraryView;
