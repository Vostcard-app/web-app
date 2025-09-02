// ✅ Guided Tours View - Display guide's available guided tours
// 📁 src/pages/GuidedToursView.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaWalking, FaClock, FaUsers, FaDollarSign, FaStar, FaPlus, FaCalendarAlt, FaTrash, FaEllipsisV, FaCalendar, FaUserCircle } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { GuidedTourService } from '../services/guidedTourService';
import TourBookingCalendar from '../components/TourBookingCalendar';
import PaymentModal from '../components/PaymentModal';
import TourDetailsForm from '../components/TourDetailsForm';
import DeleteTourModal from '../components/DeleteTourModal';
import GuideAvailabilityManager from '../components/GuideAvailabilityManager';
import type { GuidedTour, GuideAvailability } from '../types/GuidedTourTypes';

interface UserProfile {
  id: string;
  username: string;
  avatarURL?: string;
  userRole?: string;
  isGuideAccount?: boolean;
}

const GuidedToursView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guidedTours, setGuidedTours] = useState<GuidedTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [selectedTour, setSelectedTour] = useState<GuidedTour | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<any>(null);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [editingTour, setEditingTour] = useState<GuidedTour | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTour, setDeletingTour] = useState<GuidedTour | null>(null);
  const [showAvailabilityManager, setShowAvailabilityManager] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState<GuideAvailability | null>(null);

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
            isGuideAccount: data.isGuideAccount,
          });

          // Load guided tours
          try {
            const userGuidedTours = await GuidedTourService.getGuidedToursByGuide(userId);
            setGuidedTours(userGuidedTours);
          } catch (error) {
            console.error('Error loading guided tours:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndTours();
  }, [userId]);

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Handle booking submission
  const handleBookingSubmit = async (bookingData: any) => {
    try {
      console.log('📅 Booking submitted:', bookingData);
      
      if (!selectedTour) return;
      
      // Show payment modal instead of direct booking
      setShowPaymentModal(true);
      setBookingFormData(bookingData);
      setShowBookingCalendar(false);
      
    } catch (error) {
      console.error('❌ Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (bookingId: string) => {
    alert(`Booking confirmed! Booking ID: ${bookingId}. You will receive a confirmation email shortly.`);
    setShowPaymentModal(false);
    setSelectedTour(null);
    setBookingFormData(null);
  };

  // Handle edit tour details
  const handleEditTourDetails = (tour: GuidedTour) => {
    setEditingTour(tour);
    setShowDetailsForm(true);
  };

  // Handle tour updated
  const handleTourUpdated = (updatedTour: GuidedTour) => {
    setGuidedTours(prev => prev.map(tour => 
      tour.id === updatedTour.id ? updatedTour : tour
    ));
    setShowDetailsForm(false);
    setEditingTour(null);
  };

  // Handle delete tour
  const handleDeleteTour = (tour: GuidedTour) => {
    setDeletingTour(tour);
    setShowDeleteModal(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async (tourId: string) => {
    try {
      await GuidedTourService.deleteGuidedTour(tourId);
      
      // Remove tour from local state
      setGuidedTours(prev => prev.filter(tour => tour.id !== tourId));
      
      // Close modal
      setShowDeleteModal(false);
      setDeletingTour(null);
      
      alert('Tour deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting tour:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  // Handle manage availability
  const handleManageAvailability = async () => {
    try {
      if (user) {
        const availability = await GuidedTourService.getGuideAvailability(user.uid);
        setCurrentAvailability(availability);
        setShowAvailabilityManager(true);
      }
    } catch (error) {
      console.error('❌ Error loading availability:', error);
      setShowAvailabilityManager(true); // Still show the manager to create new availability
    }
  };

  // Handle save availability
  const handleSaveAvailability = async (availability: GuideAvailability) => {
    try {
      await GuidedTourService.saveGuideAvailability(availability);
      setCurrentAvailability(availability);
      alert('Availability saved successfully!');
    } catch (error) {
      console.error('❌ Error saving availability:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  // Handle book tour button click
  const handleBookTour = (tour: GuidedTour) => {
    setSelectedTour(tour);
    setShowBookingCalendar(true);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <p>Loading guided tours...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer'
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
        backgroundColor: '#134369',
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
            <h1 
              onClick={() => navigate('/home')}
              style={{ margin: 0, fontSize: '24px', fontWeight: '600', cursor: 'pointer' }}
            >
              {profile.username}'s Guided Tours
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              {guidedTours.length} guided tour{guidedTours.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Guide Action Buttons - Only for current user */}
        {isCurrentUser && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/create-guided-tour')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaPlus size={12} />
              Create New Tour
            </button>
            
            <button
              onClick={() => navigate('/booking-management')}
              style={{
                background: 'rgba(40, 167, 69, 0.8)',
                border: '1px solid rgba(40, 167, 69, 0.9)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaCalendarAlt size={12} />
              Manage Bookings
            </button>

            <button
              onClick={handleManageAvailability}
              style={{
                background: 'rgba(255, 193, 7, 0.8)',
                border: '1px solid rgba(255, 193, 7, 0.9)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaCalendar size={12} />
              Manage Availability
            </button>
          </div>
        )}
          
          {/* Home Button */}
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
        {guidedTours.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <FaWalking size={48} color="#ccc" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              {isCurrentUser ? 'No Guided Tours Yet' : 'No Guided Tours Available'}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#666' }}>
              {isCurrentUser 
                ? 'Create your first guided tour to start offering personalized experiences to visitors.'
                : 'This guide hasn\'t created any guided tours yet. Check back later!'
              }
            </p>
            {isCurrentUser && (
              <button
                onClick={() => navigate('/create-guided-tour')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <FaPlus size={14} />
                Create Your First Guided Tour
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {guidedTours.map((tour) => (
              <div
                key={tour.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
                {/* Tour Image */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  backgroundImage: tour.images && tour.images.length > 0 && tour.images[0] 
                    ? `url(${tour.images[0]})` 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Placeholder text when no image */}
                  {(!tour.images || tour.images.length === 0 || !tour.images[0]) && (
                    <div style={{
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      textAlign: 'center',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      {tour.name}
                    </div>
                  )}
                  
                  {/* Rating badge */}
                  {tour.averageRating > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'white',
                      borderRadius: '20px',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      <span style={{ color: '#ffc107' }}>★</span>
                      <span>{tour.averageRating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Hero Overlay with Guide Avatar and Tour Title */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
                    padding: '16px 16px 12px',
                    color: 'white'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '12px'
                    }}>
                      {/* Guide Avatar */}
                      <div 
                        style={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/guide-profile/${tour.guideId}`);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {(tour.guideAvatar || profile?.avatarURL) ? (
                          <img
                            src={tour.guideAvatar || profile?.avatarURL}
                            alt={tour.guideName}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid white',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#134369',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid white',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}>
                            <FaUserCircle size={24} color="white" />
                          </div>
                        )}
                      </div>

                      {/* Tour Title and Guide Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Tour Title */}
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          margin: '0 0 4px 0',
                          lineHeight: '1.2',
                          color: 'white',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {tour.name}
                        </h3>

                        {/* Guide Name */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/guide-profile/${tour.guideId}`);
                          }}
                        >
                          <span>with {tour.guideName}</span>
                          <span style={{ fontSize: '10px' }}>• View Profile</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tour Content */}
                <div style={{ padding: '20px' }}>
                  {/* Tour Description */}
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: '#666',
                      lineHeight: '1.4'
                    }}>
                      {tour.description}
                    </p>
                  </div>

                  {/* Tour Details */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock size={14} color="#666" />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {formatDuration(tour.duration)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUsers size={14} color="#666" />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Up to {tour.maxGroupSize} people
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaDollarSign size={14} color="#28a745" />
                    <span style={{ fontSize: '14px', color: '#28a745', fontWeight: '600' }}>
                      {formatPrice(tour.totalPrice)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaStar size={14} color="#ffc107" />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {tour.averageRating > 0 ? tour.averageRating.toFixed(1) : 'New'}
                      {tour.totalReviews > 0 && ` (${tour.totalReviews})`}
                    </span>
                  </div>
                </div>



                {/* Category & Difficulty */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{
                    fontSize: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    textTransform: 'capitalize'
                  }}>
                    {tour.category}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#666',
                    textTransform: 'capitalize'
                  }}>
                    {tour.difficulty} difficulty
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/guided-tour/${tour.id}`);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'white',
                      color: '#28a745',
                      border: '2px solid #28a745',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    View Details
                  </button>
                  
                  {isCurrentUser ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTourDetails(tour);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#007aff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0056b3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#007aff';
                        }}
                      >
                        ✏️ Edit
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTour(tour);
                        }}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          minWidth: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#c82333';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc3545';
                        }}
                        title="Delete Tour"
                      >
                        <FaTrash size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookTour(tour);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#218838';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#28a745';
                      }}
                    >
                      <FaCalendarAlt size={12} />
                      Book Tour
                    </button>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tour Booking Calendar */}
      {selectedTour && (
        <TourBookingCalendar
          isVisible={showBookingCalendar}
          onClose={() => {
            setShowBookingCalendar(false);
            setSelectedTour(null);
          }}
          tourId={selectedTour.id}
          guideName={selectedTour.guideName}
          guideAvatar={selectedTour.guideAvatar}
          onBookingSubmit={handleBookingSubmit}
        />
      )}

      {/* Payment Modal */}
      {selectedTour && bookingFormData && (
        <PaymentModal
          isVisible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setBookingFormData(null);
          }}
          bookingData={bookingFormData}
          tourDetails={{
            id: selectedTour.id,
            name: selectedTour.name,
            basePrice: selectedTour.basePrice,
            guideName: selectedTour.guideName
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Tour Details Form */}
      {editingTour && (
        <TourDetailsForm
          isVisible={showDetailsForm}
          onClose={() => {
            setShowDetailsForm(false);
            setEditingTour(null);
          }}
          tour={editingTour}
          onTourUpdated={handleTourUpdated}
        />
      )}

      {/* Delete Tour Modal */}
      {deletingTour && (
        <DeleteTourModal
          isVisible={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingTour(null);
          }}
          tour={deletingTour}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* Guide Availability Manager */}
      <GuideAvailabilityManager
        isVisible={showAvailabilityManager}
        onClose={() => {
          setShowAvailabilityManager(false);
          setCurrentAvailability(null);
        }}
        onSave={handleSaveAvailability}
        initialAvailability={currentAvailability || undefined}
      />
    </div>
  );
};

export default GuidedToursView;
