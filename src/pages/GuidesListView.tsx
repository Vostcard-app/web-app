import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaStar, FaUser } from 'react-icons/fa';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface Guide {
  id: string;
  name: string;
  username: string;
  avatarURL?: string;
  guideAreas: string[];
  averageRating?: number;
  totalReviews?: number;
  isGuideAccount?: boolean;
}

const GuidesListView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the selected city from navigation state
  const selectedCity = location.state?.filterByCity || '';

  useEffect(() => {
    const fetchGuides = async () => {
      if (!selectedCity) {
        setError('No city selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Fetching guides for city:', selectedCity);

        // Query users collection for guides who serve this city
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const cityGuides: Guide[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Check if user is a guide and serves the selected city
          if (userData.guideAreas && 
              Array.isArray(userData.guideAreas) && 
              userData.guideAreas.includes(selectedCity) &&
              userData.name) {
            
            cityGuides.push({
              id: doc.id,
              name: userData.name,
              username: userData.username || '',
              avatarURL: userData.avatarURL || userData.photoURL,
              guideAreas: userData.guideAreas,
              averageRating: userData.averageRating || 0,
              totalReviews: userData.totalReviews || 0,
              isGuideAccount: userData.isGuideAccount || false
            });
          }
        });

        console.log(`✅ Found ${cityGuides.length} guides in ${selectedCity}`);
        setGuides(cityGuides.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)));
        
      } catch (error) {
        console.error('❌ Error fetching guides:', error);
        setError('Failed to load guides. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, [selectedCity]);

  const handleViewProfile = (guide: Guide) => {
    console.log('👤 Viewing profile for guide:', guide.name);
    navigate(`/user-profile/${guide.id}`);
  };

  const renderStarRating = (rating: number, totalReviews: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FaStar key={i} style={{ color: '#FFD700', fontSize: '14px' }} />
      );
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(
        <FaStar key="half" style={{ color: '#FFD700', fontSize: '14px', opacity: 0.5 }} />
      );
    }
    
    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FaStar key={`empty-${i}`} style={{ color: '#ddd', fontSize: '14px' }} />
      );
    }
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {stars}
        </div>
        <span style={{ fontSize: '14px', color: '#666' }}>
          {rating > 0 ? `${rating.toFixed(1)} (${totalReviews})` : 'No reviews yet'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #002B4D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#666', fontSize: '16px' }}>Loading guides...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      color: '#333'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: '30px',
        padding: '15px 0 24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaArrowLeft
            size={20}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/browse-area')}
          />
          <h1 style={{ fontSize: '24px', margin: 0 }}>
            Tour Guides in {selectedCity}
          </h1>
        </div>
        <FaHome
          size={24}
          style={{
            cursor: 'pointer',
            marginRight: '20px'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Content */}
      <div style={{
        marginTop: '69px',
        padding: '20px'
      }}>
        {error ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={() => navigate('/browse-area')}
              style={{
                background: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Back to Browse
            </button>
          </div>
        ) : guides.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <FaUser size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
              No Tour Guides Found
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '24px' }}>
              There are currently no tour guides available in {selectedCity}.
            </p>
            <button
              onClick={() => navigate('/browse-area')}
              style={{
                background: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Try Another City
            </button>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                color: '#002B4D', 
                marginBottom: '8px' 
              }}>
                {guides.length} Tour Guide{guides.length !== 1 ? 's' : ''} Available
              </h2>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Professional guides offering tours in {selectedCity}
              </p>
            </div>

            {/* Guides List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: 'white',
                    border: '2px solid #e9ecef',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#002B4D';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 43, 77, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#f0f8ff',
                    border: '2px solid #002B4D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {guide.avatarURL ? (
                      <img
                        src={guide.avatarURL}
                        alt={guide.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <FaUser size={24} style={{ color: '#002B4D' }} />
                    )}
                  </div>

                  {/* Guide Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: '0 0 4px 0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#002B4D',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {guide.name}
                    </h3>
                    
                    {guide.username && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        @{guide.username}
                      </p>
                    )}

                    {/* Star Rating */}
                    {renderStarRating(guide.averageRating || 0, guide.totalReviews || 0)}
                  </div>

                  {/* Profile Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProfile(guide);
                    }}
                    style={{
                      background: '#134369',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0f2d4d';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#134369';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            .guides-list-item {
              flex-direction: column;
              text-align: center;
              gap: 16px;
            }
            
            .guides-list-item .guide-info {
              text-align: center;
            }
          }
        `}
      </style>
    </div>
  );
};

export default GuidesListView;
