import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { FaArrowLeft, FaSpinner, FaHome } from 'react-icons/fa';

interface Offer {
  id: string;
  title: string;
  description: string;
  username: string;
  latitude: number;
  longitude: number;
  photoURLs?: string[];
  createdAt: any;
  offerDetails?: {
    storeName?: string;
    storeAddress?: string;
    phone?: string;
    email?: string;
  };
}

const OffersListView: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("OffersListView mounted"); // Debug log
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching offers from vostcards collection...');
      
      // Simplified query to avoid composite index requirement
      // First get all posted vostcards, then filter for offers
      const q = query(
        collection(db, 'vostcards'),
        where('state', '==', 'posted')
      );

      const querySnapshot = await getDocs(q);
      const fetchedOffers: Offer[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter for offers only
        if (data.isOffer === true) {
          fetchedOffers.push({
            id: doc.id,
            title: data.title || 'Untitled Offer',
            description: data.description || 'No description',
            username: data.username || 'Unknown Store',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            photoURLs: data.photoURLs || [],
            createdAt: data.createdAt,
            offerDetails: data.offerDetails || {}
          });
        }
      });

      // Sort by createdAt in client-side (most recent first)
      fetchedOffers.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setOffers(fetchedOffers);
      console.log(`✅ Fetched ${fetchedOffers.length} offers`);
    } catch (err) {
      console.error('❌ Error fetching offers:', err);
      setError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferClick = (offerId: string) => {
    console.log(`Navigating to offer ${offerId}`); // Debug log
    navigate(`/offer/${offerId}`);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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
          <FaSpinner className="fa-spin" size={24} color="#002B4D" />
          <div style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
            Loading offers...
          </div>
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
            {error}
          </div>
          <button
            onClick={fetchOffers}
            style={{
              padding: '12px 24px',
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '12px'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      paddingBottom: '40px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/home')}
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
            fontSize: '24px',
            fontWeight: 600
          }}>
            Available Offers ({offers.length})
          </h1>
        </div>
        
        {/* Home Button */}
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FaHome size={40} color="white" />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {offers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#666', fontSize: '24px', marginBottom: '16px' }}>
              No Offers Available
            </h2>
            <p style={{ color: '#888', fontSize: '16px', marginBottom: '24px' }}>
              There are currently no offers posted in your area.
            </p>
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
              Back to Map
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '16px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {offers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => handleOfferClick(offer.id)}
                style={{
                  display: 'flex',
                  padding: '16px',
                  marginBottom: '16px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  border: '1px solid #e9ecef'
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
                {/* Offer Image */}
                {offer.photoURLs && offer.photoURLs.length > 0 && offer.photoURLs[0] && (
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    marginRight: '16px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      src={offer.photoURLs[0]} 
                      alt={offer.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#002B4D',
                    fontSize: '18px',
                    fontWeight: 600
                  }}>
                    {offer.title}
                  </h3>
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: 1.4
                  }}>
                    {offer.description.length > 100 
                      ? offer.description.substring(0, 100) + '...' 
                      : offer.description}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px'
                  }}>
                    <span style={{ 
                      color: '#28a745',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {offer.offerDetails?.storeName || offer.username}
                    </span>
                    <span style={{ 
                      color: '#888',
                      fontSize: '12px'
                    }}>
                      {offer.createdAt ? new Date(offer.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffersListView;