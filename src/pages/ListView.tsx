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
  const [locationStatus, setLocationStatus] = useState<string>('Requesting location...');
  const [debugInfo, setDebugInfo] = useState<string>('');
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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    setDebugInfo(`Device: ${isMobile ? 'Mobile' : 'Desktop'} ${isIOS ? '(iOS)' : ''}`);
    
    if (navigator.geolocation) {
      setLocationStatus('Requesting location permission...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationStatus(`Location found: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
          
          console.log('📍 ListView got user location:', location);
        },
        (error) => {
          let errorMsg = 'Location error: ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg += 'Permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg += 'Position unavailable';
              break;
            case error.TIMEOUT:
              errorMsg += 'Request timeout';
              break;
            default:
              errorMsg += 'Unknown error';
              break;
          }
          setLocationStatus(errorMsg);
          console.warn('📍 ListView location error:', error);
          
          // Continue without location - will fallback to creation date sorting
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, // Increased timeout for mobile
          maximumAge: 300000 
        }
      );
    } else {
      setLocationStatus('Geolocation not supported');
      console.warn('📍 Geolocation not supported');
    }
  }, []);

  useEffect(() => {
    const fetchVostcards = async () => {
      try {
        const q = query(
          collection(db, 'vostcards'), 
          where('state', '==', 'posted'),
          where('visibility', '==', 'public')
        );
        const snapshot = await getDocs(q);
        const allVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        
        // Filter out offers - only show regular vostcards in this view
        const regularVostcards = allVostcards.filter(v => !v.isOffer);
        
        let sortedVostcards: Vostcard[];
        
        console.log(`📊 Total vostcards fetched: ${allVostcards.length}`);
        console.log(`📊 Regular vostcards (non-offers): ${regularVostcards.length}`);
        console.log(`📍 User location available: ${!!userLocation}`);
        console.log('📋 All vostcards:', allVostcards.map(v => ({
          id: v.id,
          title: v.title,
          isOffer: v.isOffer,
          hasLocation: !!(v.latitude && v.longitude)
        })));
        
        if (userLocation) {
          // Sort by distance from user location (nearest first)
          const vostcardsWithLocation = regularVostcards.filter(v => v.latitude && v.longitude);
          console.log(`📍 Vostcards with location data: ${vostcardsWithLocation.length}`);
          
          const vostcardsWithDistance = vostcardsWithLocation
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
          setDebugInfo(prev => prev + ` | Found ${vostcardsWithDistance.length} nearby vostcards`);
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
          
          setDebugInfo(prev => prev + ` | Showing ${sortedVostcards.length} recent vostcards (no location)`);
        }
        
        setVostcards(sortedVostcards);
        
        // Alert if we're getting exactly 3 vostcards (suspicious)
        if (sortedVostcards.length === 3) {
          console.warn('⚠️ EXACTLY 3 vostcards returned - this might indicate a hidden limit!');
          setDebugInfo(prev => prev + ` | ⚠️ Got exactly 3 (suspicious!)`);
        }
      } catch (error) {
        console.error('Error fetching vostcards:', error);
        setDebugInfo(prev => prev + ` | ❌ Error: ${error.message}`);
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
        <div>
          <h1>5 Nearest Vōstcards</h1>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {debugInfo}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {locationStatus}
          </div>
        </div>
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
