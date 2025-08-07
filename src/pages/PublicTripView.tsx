import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaShare, FaUserCircle, FaMap, FaCalendar, FaEye, FaPlay } from 'react-icons/fa';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { Trip, TripItem } from '../types/TripTypes';
import RoundInfoButton from '../assets/RoundInfo_Button.png';

interface VostcardData {
  id: string;
  title: string;
  description: string;
  photoURLs: string[];
  videoURL?: string;
  username: string;
  createdAt: any;
  isQuickcard?: boolean;
}

const PublicTripView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tripPosts, setTripPosts] = useState<VostcardData[]>([]);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Load trip data
  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) {
        setError('No trip ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }, 15000); // 15 second timeout

      try {
        console.log('📱 Loading trip for sharing:', id);
        const docRef = doc(db, 'trips', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Trip;
          console.log('📱 Trip found:', {
            id: data.id,
            name: data.name,
            isShared: data.isShared
          });
          
          // Check if trip is shared or public
          // Allow access if: explicitly shared, public visibility, or not private (legacy)
          if (data.isShared || data.visibility === 'public' || data.isPrivate === false) {
            clearTimeout(timeoutId);
            setTrip(data);
            setLoading(false);
          } else {
            clearTimeout(timeoutId);
            setError('This trip is not available for public viewing.');
            setLoading(false);
          }
        } else {
          clearTimeout(timeoutId);
          setError('Trip not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Error loading trip:', err);
        setError('Failed to load trip. Please try again.');
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  // Load user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!trip?.userID) return;
      
      try {
        const userRef = doc(db, 'users', trip.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (trip?.userID) {
      fetchUserProfile();
    }
  }, [trip?.userID]);

  // Load trip posts data
  useEffect(() => {
    const fetchTripPosts = async () => {
      if (!trip?.items) return;

      try {
        const postsData: VostcardData[] = [];
        
        // Sort items by order to maintain trip sequence
        const sortedItems = [...trip.items].sort((a, b) => a.order - b.order);

        // Fetch full vostcard data for each item
        for (const item of sortedItems) {
          try {
            const vostcardRef = doc(db, 'vostcards', item.vostcardID);
            const vostcardSnap = await getDoc(vostcardRef);
            
            if (vostcardSnap.exists()) {
              const vostcardData = vostcardSnap.data() as VostcardData;
              postsData.push({
                id: vostcardData.id,
                title: vostcardData.title || 'Untitled',
                description: vostcardData.description || '',
                photoURLs: vostcardData.photoURLs || [],
                videoURL: vostcardData.videoURL,
                username: vostcardData.username || 'Unknown User',
                createdAt: vostcardData.createdAt,
                isQuickcard: vostcardData.isQuickcard
              });
            }
          } catch (error) {
            console.error(`Error loading post ${item.vostcardID}:`, error);
          }
        }

        setTripPosts(postsData);
      } catch (error) {
        console.error('Error loading trip posts:', error);
      }
    };

    fetchTripPosts();
  }, [trip]);

  const handlePostClick = (postId: string, isQuickcard?: boolean) => {
    // Navigate to the appropriate public post view
    if (isQuickcard) {
      navigate(`/share-quickcard/${postId}`);
    } else {
      navigate(`/share/${postId}`);
    }
  };

  const handleShareTrip = async () => {
    try {
      const shareUrl = `${window.location.origin}/share-trip/${id}`;
      const shareText = `Check out this trip I created with Vōstcard

"${trip?.name || 'My Trip'}"

${trip?.description || 'A collection of my favorite places'}

${shareUrl}`;
      
      if (navigator.share) {
        await navigator.share({
          title: trip?.name || 'Check out this trip!',
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Trip link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      alert('Failed to share trip. Please try again.');
    }
  };

  // Format creation date
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString();
      } else if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString();
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        return new Date(dateValue).toLocaleDateString();
      }
      return String(dateValue);
    } catch (error) {
      return '';
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
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🧳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading trip...</div>
      </div>
    );
  }

  if (error || !trip) {
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
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧳</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px' 
        }}>
          {error?.includes('not found') ? 'Trip Not Found' : 'Unable to Load Trip'}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '24px',
          maxWidth: '400px',
          lineHeight: 1.5
        }}>
          {error?.includes('not found') 
            ? 'This trip may have been deleted or the link is invalid. Please check the link and try again.'
            : error?.includes('not available') 
            ? 'This trip is private and not available for public viewing.'
            : error?.includes('timed out')
            ? 'The trip is taking too long to load.'
            : error || 'There was an error loading the trip.'
          }
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
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
            Try Again
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Join Vōstcard
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = userProfile?.avatarURL;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y'
    }}>
      {/* Banner */}
      <div style={{
        background: '#07345c',
        padding: '15px 16px 24px 16px',
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}>
        <span 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontWeight: 700, fontSize: '30px', cursor: 'pointer' }}>
          Vōstcard
        </span>
        
        <div 
          onClick={() => setShowTutorialModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img 
            src={RoundInfoButton} 
            alt="Round Info Button" 
            style={{
              width: '40px',
              height: '40px',
              marginBottom: '2px'
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center'
          }}>
            What's Vōstcard
          </span>
        </div>
      </div>

      {/* 20% Container with User Info */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '20%', // 20% height
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        marginTop: '69px', // Account for fixed header height
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '5px 20px 20px 20px'
        }}>
          {/* Avatar and Username - Left Justified */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div 
                style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  overflow: 'hidden',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (trip?.userID) {
                    navigate(`/user-profile/${trip.userID}`);
                  }
                }}
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={trip?.username || 'User'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                  />
                ) : (
                  <FaUserCircle size={60} color="#ccc" />
                )}
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}>
                <div 
                  style={{ 
                    fontWeight: 600, 
                    fontSize: 18,
                    color: '#333',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (trip?.userID) {
                      navigate(`/user-profile/${trip.userID}`);
                    }
                  }}
                >
                  {trip?.username || 'Unknown User'}
                </div>
                <div style={{ fontSize: 14, color: '#666' }}>
                  Creator
                </div>
              </div>
            </div>

            {/* Login/Register Button */}
            <button
              type="button"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#007bff',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: 'none',
                whiteSpace: 'nowrap'
              }}
              onClick={() => navigate('/register')}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Login / Register
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div style={{ 
        padding: '16px 16px 40px 16px',
        minHeight: 'calc(100vh - 200px)',
        boxSizing: 'border-box'
      }}>
        {/* Trip Title */}
        <div style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '24px',
          textAlign: 'center',
          lineHeight: 1.3
        }}>
          {trip.name || 'Untitled Trip'}
        </div>

        {/* Trip Posts with Thumbnails */}
        {tripPosts.length > 0 && (
          <div style={{
            marginBottom: '32px'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '16px'
            }}>
              Places in this trip ({tripPosts.length})
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {tripPosts.map((post, index) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.id, post.isQuickcard)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#e0e0e0',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {post.photoURLs && post.photoURLs.length > 0 ? (
                      <img
                        src={post.photoURLs[0]}
                        alt={post.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '24px'
                      }}>
                        📷
                      </div>
                    )}
                    
                    {/* Video indicator */}
                    {post.videoURL && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        <FaPlay />
                      </div>
                    )}
                  </div>

                  {/* Post Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {index + 1}. {post.title}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '2px 6px',
                        backgroundColor: post.isQuickcard ? '#e3f2fd' : '#f3e5f5',
                        borderRadius: '8px',
                        color: post.isQuickcard ? '#1976d2' : '#7b1fa2'
                      }}>
                        {post.isQuickcard ? '📸 Quickcard' : '📹 Vostcard'}
                      </span>
                      
                      {post.createdAt && (
                        <span>{formatDate(post.createdAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div style={{
                    color: '#999',
                    fontSize: '18px'
                  }}>
                    →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Icons and Map View Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Heart Icon */}
          <div 
            style={{ 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              minWidth: '80px'
            }}
            onClick={() => {
              // Show message for anonymous users
              alert('❤️ Like saved! Join Vōstcard to sync across devices');
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaHeart size={28} color="#333" />
            <span style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: "#333"
            }}>
              {tripPosts.length}
            </span>
          </div>

          {/* Share Icon */}
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
            onClick={handleShareTrip}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FaShare size={28} color="#333" />
          </div>

          {/* Join Free Button */}
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
            onClick={() => navigate('/user-guide')}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Join Free
          </button>
        </div>

        {/* Description Link */}
        {trip.description && (
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
            onClick={() => {
              // Toggle description visibility or navigate to full description
              console.log('Description clicked');
            }}
            >
              <FaEye size={16} />
              Description
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: 1.5
            }}>
              {trip.description}
            </div>
          </div>
        )}

        {/* Date and Made with Vostcard */}
        <div style={{
          textAlign: 'center',
          padding: '20px 0',
          borderTop: '1px solid #e0e0e0',
          marginTop: '20px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <FaCalendar size={14} />
            Posted: {formatDate(trip.createdAt)}
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#999',
            fontStyle: 'italic'
          }}>
            Made with Vōstcard
          </div>
        </div>
      </div>

      {/* Tutorial Modal - Similar to PublicVostcardView */}
      {showTutorialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '16px', color: '#333' }}>What's Vōstcard?</h2>
            <p style={{ marginBottom: '20px', color: '#666', lineHeight: 1.5 }}>
              Vōstcard lets you create and share interactive travel experiences. 
              Join free to create your own trips and explore amazing places!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowTutorialModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Join Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTripView;