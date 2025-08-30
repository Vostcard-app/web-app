import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

interface Vostcard {
  id: string;
  title: string;
  description: string;
  username?: string;
  createdAt?: any;
  isOffer?: boolean;
  [key: string]: any;
}

const ListView: React.FC = () => {
  const [vostcards, setVostcards] = useState<Vostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  // Function to calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          console.log('📍 ListView got user location:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('📍 ListView location error:', error);
          // Continue without location - will fallback to creation date sorting
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    const fetchVostcards = async () => {
      try {
        const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
        const snapshot = await getDocs(q);
        const allVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        
        // Filter out offers - only show regular vostcards in this view
        const regularVostcards = allVostcards.filter(v => !v.isOffer);
        
        let sortedVostcards: Vostcard[];
        
        if (userLocation) {
          // Sort by distance from user location (nearest first)
          const vostcardsWithDistance = regularVostcards
            .filter(v => v.latitude && v.longitude) // Only include vostcards with location
            .map(v => ({
              ...v,
              distance: calculateDistance(
                userLocation.lat,
                userLocation.lng,
                parseFloat(v.latitude),
                parseFloat(v.longitude)
              )
            }))
            .sort((a, b) => a.distance - b.distance) // Nearest first
            .slice(0, 5); // Limit to 5 nearest
          
          console.log('📍 ListView sorted by distance, showing 5 nearest vostcards:', vostcardsWithDistance.map(v => ({
            title: v.title,
            distance: `${v.distance.toFixed(2)} km`
          })));
          
          sortedVostcards = vostcardsWithDistance;
        } else {
          // Fallback: Sort by creation date and limit to 5 (most recent first)
          sortedVostcards = regularVostcards
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                           a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                           b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bTime - aTime; // Most recent first
            })
            .slice(0, 5); // Limit to 5 most recent
          
          console.log('📅 ListView fallback: sorted by creation date, showing 5 most recent vostcards:', sortedVostcards.map(v => ({
            title: v.title,
            createdAt: v.createdAt?.toDate ? v.createdAt.toDate().toLocaleString() : 'Unknown'
          })));
        }
        
        setVostcards(sortedVostcards);
      } catch (error) {
        console.error('Error fetching vostcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVostcards();
  }, [userLocation, calculateDistance]); // Re-run when userLocation changes

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30
      }}>
        <h1>5 Nearest Vōstcards</h1>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: '#002B4D', 
            color: 'white', 
            border: 'none',
            padding: 12, 
            borderRadius: 10, 
            cursor: 'pointer'
          }}
        >
          <FaHome /> Home
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p>Loading vostcards...</p>
      ) : vostcards.length === 0 ? (
        <p>No vostcards found.</p>
      ) : (
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20
        }}>
          {vostcards.map((vostcard) => (
            <div 
              key={vostcard.id} 
              style={{
                background: 'white', 
                borderRadius: 15, 
                padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onClick={() => navigate(`/vostcard/${vostcard.id}`, {
                state: {
                  vostcardList: vostcards.map(vc => vc.id),
                  currentIndex: vostcards.findIndex(vc => vc.id === vostcard.id)
                }
              })}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>
                {vostcard.title || 'Untitled'}
              </h3>
              <p style={{ margin: '8px 0', color: '#555' }}>
                {vostcard.description?.slice(0, 100)}...
              </p>
              <div style={{ 
                marginTop: 15, 
                fontSize: '0.9rem', 
                color: '#888' 
              }}>
                By {vostcard.username || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListView;
