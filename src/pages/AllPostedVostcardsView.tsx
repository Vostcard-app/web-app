import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaGlobe, FaHeart, FaStar, FaInfoCircle, FaFilter, FaTimes, FaUser } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import FollowButton from '../components/FollowButton';
import { RatingService, type RatingStats } from '../services/ratingService';

interface Vostcard {
  id: string;
  title: string;
  username?: string;
  createdAt?: any;  // you can adjust type to Timestamp if you use Firestore Timestamps
  [key: string]: any;
}

const AllPostedVostcardsView: React.FC = () => {
  const [vostcards, setVostcards] = useState<Vostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [likeCounts, setLikeCounts] = useState<{ [vostcardId: string]: number }>({});
  const [likedStatus, setLikedStatus] = useState<{ [vostcardId: string]: boolean }>({});
  const [ratingStats, setRatingStats] = useState<{ [vostcardId: string]: RatingStats }>({});
  const navigate = useNavigate();
  const { toggleLike, getLikeCount, isLiked, setupLikeListeners } = useVostcard();

  // Load like and rating data for each vostcard
  const loadData = useCallback(async (vostcardIds: string[]) => {
    const counts: { [key: string]: number } = {};
    const statuses: { [key: string]: boolean } = {};
    const ratings: { [key: string]: RatingStats } = {};
    
    for (const id of vostcardIds) {
      try {
        const [count, liked, stats] = await Promise.all([
          getLikeCount(id),
          isLiked(id),
          RatingService.getRatingStats(id)
        ]);
        counts[id] = count;
        statuses[id] = liked;
        ratings[id] = stats;
      } catch (error) {
        console.error(`Error loading data for ${id}:`, error);
        counts[id] = 0;
        statuses[id] = false;
        ratings[id] = {
          vostcardID: id,
          averageRating: 0,
          ratingCount: 0,
          lastUpdated: ''
        };
      }
    }
    
    setLikeCounts(counts);
    setLikedStatus(statuses);
    setRatingStats(ratings);
  }, [getLikeCount, isLiked]);

  useEffect(() => {
    const fetchAllPostedVostcards = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching all posted vostcards...');
        const q = query(collection(db, 'vostcards'), where('state', '==', 'posted'));
        const snapshot = await getDocs(q);
        const allVostcards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vostcard[];
        
        // Filter out offers - only show regular vostcards in this view
        const regularVostcards = allVostcards.filter(v => !v.isOffer);
        
        console.log('📋 Loaded vostcards:', regularVostcards.length);
        setVostcards(regularVostcards);
        setLastUpdated(new Date());
        
        // Load like and rating data for all vostcards
        if (regularVostcards.length > 0) {
          await loadData(regularVostcards.map(v => v.id));
        }
      } catch (error) {
        console.error('Error fetching posted vostcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPostedVostcards();
  }, [loadData]);

  // Add effect to handle page focus/visibility for refreshing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing vostcards...');
        // Refresh data when page becomes visible
        setLoading(true);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Set up real-time listeners for like and rating updates
  useEffect(() => {
    if (vostcards.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    vostcards.forEach(vostcard => {
      // Like listeners
      const unsubscribeLikes = setupLikeListeners(
        vostcard.id,
        (count) => {
          setLikeCounts(prev => ({ ...prev, [vostcard.id]: count }));
        },
        (liked) => {
          setLikedStatus(prev => ({ ...prev, [vostcard.id]: liked }));
        }
      );
      unsubscribers.push(unsubscribeLikes);

      // Rating listeners
      const unsubscribeRatings = RatingService.listenToRatingStats(vostcard.id, (stats) => {
        setRatingStats(prev => ({ ...prev, [vostcard.id]: stats }));
      });
      unsubscribers.push(unsubscribeRatings);
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [vostcards, setupLikeListeners]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async (vostcardId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const newLikedStatus = await toggleLike(vostcardId);
      
      // Update local state immediately for better UX
      setLikedStatus(prev => ({
        ...prev,
        [vostcardId]: newLikedStatus
      }));
      
      // Update like count
      setLikeCounts(prev => ({
        ...prev,
        [vostcardId]: newLikedStatus ? (prev[vostcardId] || 0) + 1 : Math.max((prev[vostcardId] || 0) - 1, 0)
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [toggleLike]);

  // Count by platform (mocked as all Web for now)
  const iosCount = 0;
  const webCount = vostcards.length;

  return (
    <div 
      key={`all-posted-${Date.now()}`}
      style={{ 
        background: '#f5f5f5', 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        background: '#002B4D',
        color: 'white',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 1 }}>Vōstcard</div>
        <button
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            fontSize: 50,
            cursor: 'pointer' 
          }}
          onClick={() => navigate('/home')}
        >
          <FaHome />
        </button>
      </div>

      {/* Summary Bar */}
      <div style={{
        background: 'white',
        padding: '16px 20px 8px 20px',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        zIndex: 9
      }}>
        <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Nearby Vōstcards</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: '#444' }}>
          <span style={{ fontWeight: 600 }}>Total: {vostcards.length}</span>
          <span style={{ marginLeft: 12, color: '#888', fontSize: 14 }}>
            Last updated: {lastUpdated ? `${Math.round((Date.now() - lastUpdated.getTime()) / 1000)} sec` : '--'}
          </span>
          <span style={{ marginLeft: 12, color: '#888', fontSize: 14 }}>iOS: {iosCount}  B7 Web: {webCount}</span>
          <FaInfoCircle style={{ marginLeft: 'auto', color: '#1976d2', fontSize: 18 }} />
        </div>
      </div>

      {/* Scrollable List */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 0 80px 0',
        WebkitOverflowScrolling: 'touch',
        // Prevent bounce scrolling
        overscrollBehavior: 'contain',
        touchAction: 'pan-y'
      } as React.CSSProperties}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>Loading posted Vostcards...</div>
        ) : vostcards.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>No posted Vostcards found.</div>
        ) : (
          vostcards.map((v, idx) => (
            <React.Fragment key={v.id}>
              <div
                style={{
                  background: 'white',
                  borderRadius: 12,
                  margin: '0 16px',
                  marginTop: idx === 0 ? 16 : 0,
                  marginBottom: 0,
                  padding: '18px 16px 12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
                onClick={() => navigate(`/vostcard/${v.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = '#f5faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${v.title || 'Untitled'}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/vostcard/${v.id}`);
                  }
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>{v.title || 'Untitled'}</div>
                <div style={{ color: '#888', fontSize: 15, marginBottom: 2 }}>0.0 km away</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ color: '#444', fontSize: 15 }}>By {v.username || 'Unknown'}</div>
                  {v.userID && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton 
                        targetUserId={v.userID} 
                        targetUsername={v.username}
                        size="small"
                        variant="secondary"
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 15, marginBottom: 2 }}>
                  <FaGlobe style={{ color: '#1976d2', marginRight: 6 }} />
                  <span style={{ color: '#1976d2', fontWeight: 500 }}>Web App</span>
                </div>
                <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Star Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaStar style={{ color: '#FFD700', fontSize: 18 }} />
                    <span style={{ color: '#888', fontSize: 16, fontWeight: 500 }}>
                      {ratingStats[v.id]?.averageRating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  
                  {/* Heart Like */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: likedStatus[v.id] ? '#ff4444' : '#888', 
                        fontSize: 22, 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        transition: 'color 0.2s, transform 0.1s',
                      }} 
                      onClick={(e) => handleLikeToggle(v.id, e)}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <FaHeart />
                    </button>
                    <span style={{ color: '#888', fontSize: 16, fontWeight: 500 }}>
                      {likeCounts[v.id] || 0}
                    </span>
                  </div>
                </div>
              </div>
              {/* Divider */}
              {idx < vostcards.length - 1 && (
                <div style={{ height: 1, background: '#e0e0e0', margin: '8px 0 0 0', marginLeft: 16, marginRight: 16 }} />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Filter/Clear Bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        zIndex: 20,
        flexShrink: 0
      }}>
        <button style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaTimes /> Clear
        </button>
        <button style={{ background: '#002B4D', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaFilter /> Filter
        </button>
      </div>
    </div>
  );
};

export default AllPostedVostcardsView;