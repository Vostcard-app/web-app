import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaPhone, FaEnvelope, FaMapMarkerAlt, FaStore, FaMapPin, FaArrowLeft } from 'react-icons/fa';

interface OfferData {
  id: string;
  title: string;
  description: string;
  userID?: string;
  userId?: string;
  username?: string;
  photoURLs?: string[];
  latitude: number;
  longitude: number;
  createdAt?: any;
  updatedAt?: any;
  offerDetails?: {
    storeName?: string;
    storeAddress?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
    storeHours?: string;
  };
}

interface StoreProfile {
  storeName?: string;
  businessName?: string;
  profileImageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  streetAddress?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
}

const OfferView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) {
      setError('No offer ID provided');
      setLoading(false);
      return;
    }

    const loadOffer = async () => {
      try {
        console.log('📄 Loading offer with ID:', id);
        
        // Load offer from vostcards collection
        const offerRef = doc(db, 'vostcards', id);
        const offerSnap = await getDoc(offerRef);
        
        if (!offerSnap.exists()) {
          setError('Offer not found');
          setLoading(false);
          return;
        }

        const offerData = { id: offerSnap.id, ...offerSnap.data() } as OfferData;
        console.log('✅ Offer loaded:', offerData);
        setOffer(offerData);

        // Load store profile from advertisers collection
        const userId = offerData.userID || offerData.userId;
        if (userId) {
          console.log('📄 Loading store profile for user:', userId);
          const storeRef = doc(db, 'advertisers', userId);
          const storeSnap = await getDoc(storeRef);
          
          if (storeSnap.exists()) {
            const storeData = storeSnap.data() as StoreProfile;
            console.log('✅ Store profile loaded:', storeData);
            setStoreProfile(storeData);
          }
        }
      } catch (err) {
        console.error('❌ Error loading offer:', err);
        setError('Failed to load offer');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading offer...</div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '18px', color: '#dc3545', marginBottom: '16px' }}>
            {error || 'Offer not found'}
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const storeName = offer.offerDetails?.storeName || storeProfile?.storeName || storeProfile?.businessName || offer.username || 'Store';
  const storeAddress = offer.offerDetails?.storeAddress || 
    (storeProfile ? `${storeProfile.streetAddress || ''}, ${storeProfile.city || ''}, ${storeProfile.stateProvince || ''} ${storeProfile.postalCode || ''}`.trim() : '');
  const phone = offer.offerDetails?.phone || storeProfile?.contactPhone;
  const email = offer.offerDetails?.email || storeProfile?.contactEmail;
  const profileImage = storeProfile?.profileImageUrl;

  return (
    <div 
      className="offer-view-container"
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8f9fa',
        paddingBottom: '40px',
        overflowY: 'auto',
        position: 'relative'
      }}>
      {/* Header - Updated to match MyVostcardListView dimensions */}
      <div style={{
        backgroundColor: '#07345c', // Changed from '#002B4D' to match
        padding: '15px 0 24px 20px', // Changed from '16px 20px' to match exactly
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        color: 'white',
        flexShrink: 0 // Match MyVostcardListView
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '30px', // Changed from '24px' to match
            fontWeight: 600
          }}>
            {storeName}
          </h1>
        </div>
        
        {/* Home Icon - Positioned absolutely like MyVostcardListView */}
        <FaHome
          size={40}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            right: 29,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Scrollable Content Container */}
      <div style={{
        height: 'calc(100vh - 80px)', // Account for header height
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
      }}>
        {/* Content */}
        <div 
          className="offer-view-content"
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: 'clamp(16px, 4vw, 20px)', // Responsive padding
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginTop: '20px',
            marginLeft: 'clamp(10px, 4vw, 20px)', // Responsive margins
            marginRight: 'clamp(10px, 4vw, 20px)',
            marginBottom: '40px', // Extra space at bottom for better scrolling
            minHeight: 'fit-content'
          }}>
          <div style={{ 
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            {/* Offer Image */}
            {offer.photoURLs && offer.photoURLs.length > 0 && offer.photoURLs[0] && (
              <div style={{ 
                width: '100%', 
                maxWidth: '400px',
                margin: '0 auto 20px auto',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa'
              }}>
                <img 
                  src={offer.photoURLs[0]} 
                  alt={offer.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '300px',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Hide image container if it fails to load
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      container.style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
            
            {/* Tell them Vōstcard sent you message */}
            <div style={{
              textAlign: 'center',
              marginBottom: '16px',
              fontStyle: 'italic',
              fontWeight: 'bold',
              color: '#002B4D',
              fontSize: '16px'
            }}>
              Tell them Vōstcard sent you
            </div>
            
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#002B4D',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {offer.title}
            </h1>
          </div>

          {/* 3. Description */}
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#002B4D',
              margin: '0 0 12px 0'
            }}>
              Description
            </h3>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#444',
              margin: 0,
              whiteSpace: 'pre-wrap'
            }}>
              {offer.description || 'No description available.'}
            </p>
          </div>

          {/* 4. Store Address */}
          {storeAddress && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FaMapMarkerAlt 
                size={18} 
                color="#dc3545" 
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#002B4D',
                  margin: '0 0 4px 0'
                }}>
                  Store Address
                </h4>
                <p style={{
                  fontSize: '15px',
                  color: '#666',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {storeAddress}
                </p>
              </div>
            </div>
          )}

          {/* 5. Phone Number */}
          {phone && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FaPhone 
                size={16} 
                color="#28a745" 
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#002B4D',
                  margin: '0 0 4px 0'
                }}>
                  Phone Number
                </h4>
                <a 
                  href={`tel:${phone}`}
                  style={{
                    fontSize: '15px',
                    color: '#28a745',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  {phone}
                </a>
              </div>
            </div>
          )}

          {/* 6. Email Address */}
          {email && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FaEnvelope 
                size={16} 
                color="#007bff" 
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#002B4D',
                  margin: '0 0 4px 0'
                }}>
                  Email Address
                </h4>
                <a 
                  href={`mailto:${email}`}
                  style={{
                    fontSize: '15px',
                    color: '#007bff',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  {email}
                </a>
              </div>
            </div>
          )}

          {/* Pin Placer Button - Only visible to creator */}
          {user && (user.uid === offer.userID || user.uid === offer.userId) && (
            <div style={{
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <button
                onClick={() => {
                  // Navigate to Pin Placer tool with offer data
                  navigate('/pin-placer', {
                    state: {
                      pinData: {
                        id: offer.id,
                        title: offer.title,
                        description: offer.description,
                        latitude: offer.latitude,
                        longitude: offer.longitude,
                        isOffer: true,
                        userID: offer.userID,
                        userId: offer.userId
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

          {/* 7. Profile Image */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#002B4D',
              margin: '0 0 16px 0'
            }}>
              {storeName}
            </h4>
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${storeName} profile`}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #002B4D',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#002B4D',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '32px',
                fontWeight: 600
              }}>
                <FaStore />
              </div>
            )}
          </div>

          {/* Additional Info */}
          {offer.createdAt && (
            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px'
            }}>
              Posted: {new Date(offer.createdAt.seconds * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {/* CSS for better scrolling and mobile optimization */}
      <style>{`
        /* Improve scrollbar appearance on webkit browsers */
        .offer-view-container div::-webkit-scrollbar {
          width: 8px;
        }
        
        .offer-view-container div::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .offer-view-container div::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .offer-view-container div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        
        /* Mobile viewport optimization */
        @media (max-width: 768px) {
          .offer-view-container {
            padding: 10px !important;
          }
          
          .offer-view-content {
            margin-left: 10px !important;
            margin-right: 10px !important;
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OfferView;
