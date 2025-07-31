import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaHome, FaPlus } from 'react-icons/fa';
import { TourService } from '../services/tourService';
import TourCreationModal from '../components/TourCreationModal';
import TourEditModal from '../components/TourEditModal';
import TourList from '../components/TourList';
import type { Tour } from '../types/TourTypes';

interface UserProfile {
  id: string;
  username: string;
  avatarURL?: string;
  userRole?: string;
}

const ToursView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const isCurrentUser = user?.uid === userId;

  useEffect(() => {
    const fetchProfileAndTours = async () => {
      try {
        if (!userId) return;

        // Fetch user profile
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            id: docSnap.id,
            username: data.username || 'Unknown User',
            avatarURL: data.avatarURL,
            userRole: data.userRole,
          });

          // Load tours
          try {
            const userTours = isCurrentUser 
              ? await TourService.getToursByCreator(userId)
              : await TourService.getPublicToursByCreator(userId);
            setTours(userTours);
          } catch (error) {
            console.error('Error loading tours:', error);
          }

          // Load user posts for tour creation/editing (only for current user)
          if (isCurrentUser) {
            try {
              const allPostsQuery = query(
                collection(db, 'vostcards'),
                where('userID', '==', userId)
              );
              const allPostsSnapshot = await getDocs(allPostsQuery);
              const allUserPosts = allPostsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setUserPosts(allUserPosts);
            } catch (error) {
              console.error('Error loading user posts:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndTours();
  }, [userId, isCurrentUser]);

  const handleTourCreated = async () => {
    try {
      const userTours = await TourService.getToursByCreator(userId!);
      setTours(userTours);
    } catch (error) {
      console.error('Error refreshing tours:', error);
    }
  };

  const handleTourClick = async (tour: Tour) => {
    try {
      console.log('🎬 Loading tour for dedicated map view:', tour.name);
      
      // Get the tour posts
      const tourPosts = await TourService.getTourPosts(tour);
      console.log('🎬 Fetched tour posts:', tourPosts.length);
      
      // Navigate to dedicated TourMapView with tour data (same as HomeView tours)
      navigate(`/tour-map/${tour.id}`, { 
        state: { 
          tourData: {
            tour,
            tourPosts
          }
        } 
      });
    } catch (error) {
      console.error('❌ Error loading tour for map view:', error);
      // Fallback to original tour detail view
      navigate(`/tour/${tour.id}`, { state: { tour, autoRecenter: true } });
    }
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setIsEditModalOpen(true);
  };

  const handleTourUpdated = async () => {
    try {
      const userTours = await TourService.getToursByCreator(userId!);
      setTours(userTours);
    } catch (error) {
      console.error('Error refreshing tours after update:', error);
    }
  };

  const handleDeleteTour = async (tour: Tour) => {
    try {
      await TourService.deleteTour(tour.id);
      
      // Refresh tours list
      await handleTourCreated();
    } catch (error) {
      console.error('Error deleting tour:', error);
      alert('Failed to delete tour');
    }
  };

  const handleToggleSharing = async (tour: Tour) => {
    try {
      await TourService.updateTour(tour.id, {
        ...tour,
        isPublic: !tour.isPublic,
      });
      
      // Refresh tours list
      await handleTourCreated();
    } catch (error) {
      console.error('Error toggling tour sharing:', error);
      alert('Failed to update tour');
    }
  };

  const getTourTerminology = () => {
    return profile?.userRole === 'guide' ? 'Tour' : 'Trip';
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <p style={{ color: '#d32f2f' }}>User not found</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              {profile.username}'s {getTourTerminology()}s
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              {tours.length} {getTourTerminology().toLowerCase()}{tours.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Home Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <FaHome />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Create New Tour Button (only for current user) */}
        {isCurrentUser && (
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsTourModalOpen(true)}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              <FaPlus />
              Add {getTourTerminology()}
            </button>
          </div>
        )}

        {/* Tour/Trip List */}
        <TourList
          tours={tours}
          isCurrentUser={isCurrentUser}
          onTourClick={handleTourClick}
          onEditTour={isCurrentUser ? handleEditTour : undefined}
          onDeleteTour={isCurrentUser ? handleDeleteTour : undefined}
          onToggleSharing={isCurrentUser ? handleToggleSharing : undefined}
          userRole={profile?.userRole}
        />
      </div>

      {/* Tour Creation Modal */}
      <TourCreationModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onTourCreated={handleTourCreated}
        creatorId={userId!}
        userPosts={userPosts}
        userRole={profile?.userRole}
      />

      {/* Tour Edit Modal */}
      {editingTour && (
        <TourEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTour(null);
          }}
          onTourUpdated={handleTourUpdated}
          tour={editingTour}
          userPosts={userPosts}
          userRole={profile?.userRole}
        />
      )}
    </div>
  );
};

export default ToursView; 