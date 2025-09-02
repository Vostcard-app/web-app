import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaHeart, 
  FaShare, 
  FaStar, 
  FaClock, 
  FaUsers, 
  FaMapMarkerAlt, 
  FaLanguage, 
  FaCheck, 
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaUserCircle,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaWalking,
  FaCamera,
  FaInfoCircle,
  FaEdit
} from 'react-icons/fa';
import { GuidedTour } from '../types/GuidedTourTypes';
import { GuidedTourService } from '../services/guidedTourService';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import TourBookingCalendar from '../components/TourBookingCalendar';
import PaymentModal from '../components/PaymentModal';
import TourDetailsForm from '../components/TourDetailsForm';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

const TourDetailView: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const deviceInfo = useDeviceDetection();
  
  const [tour, setTour] = useState<GuidedTour | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [guideProfile, setGuideProfile] = useState<any>(null);

  useEffect(() => {
    const fetchTour = async () => {
      if (!tourId) return;
      
      try {
        setLoading(true);
        const tourData = await GuidedTourService.getGuidedTour(tourId);
        setTour(tourData);

        // Fetch guide profile data for avatar fallback
        if (tourData?.guideId) {
          try {
            const guideDoc = await getDoc(doc(db, 'users', tourData.guideId));
            if (guideDoc.exists()) {
              setGuideProfile(guideDoc.data());
            }
          } catch (error) {
            console.error('❌ Error fetching guide profile:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching tour:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tourId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e3e3e3',
            borderTop: '4px solid #007aff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#666', fontSize: '16px' }}>Loading tour details...</p>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#333', marginBottom: '16px' }}>Tour Not Found</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            The tour you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007aff',
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

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const handleBookTour = () => {
    setShowBookingCalendar(true);
  };

  const handleBookingSubmit = async (bookingData: any) => {
    try {
      console.log('📅 Booking submitted:', bookingData);
      setShowPaymentModal(true);
      setBookingFormData(bookingData);
      setShowBookingCalendar(false);
    } catch (error) {
      console.error('❌ Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const handlePaymentSuccess = (bookingId: string) => {
    alert(`Booking confirmed! Booking ID: ${bookingId}. You will receive a confirmation email shortly.`);
    setShowPaymentModal(false);
    setBookingFormData(null);
  };

  const handleTourUpdated = (updatedTour: GuidedTour) => {
    setTour(updatedTour);
    setShowEditForm(false);
  };

  const nextImage = () => {
    if (tour.images && tour.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % tour.images.length);
    }
  };

  const prevImage = () => {
    if (tour.images && tour.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + tour.images.length) % tour.images.length);
    }
  };

  const hasImages = tour.images && tour.images.length > 0;
  const currentImage = hasImages ? tour.images[currentImageIndex] : null;

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* Header Navigation */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        zIndex: 100,
        padding: '16px 24px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#333'
            }}
          >
            <FaArrowLeft size={16} />
            Back
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Edit button for tour owner */}
            {user && tour && user.uid === tour.guideId && (
              <button
                onClick={() => setShowEditForm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#134369',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                <FaEdit size={16} />
                Edit Tour
              </button>
            )}
            
            <button
              onClick={() => setIsLiked(!isLiked)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                color: isLiked ? '#e74c3c' : '#666'
              }}
            >
              <FaHeart size={16} />
              Save
            </button>
            
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              <FaShare size={16} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Hero Image Gallery */}
      <div style={{ 
        position: 'relative', 
        height: '500px', 
        backgroundColor: '#f0f0f0',
        overflow: 'hidden'
      }}>
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt={tour.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {/* Image Navigation */}
            {tour.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaChevronLeft size={20} />
                </button>
                
                <button
                  onClick={nextImage}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaChevronRight size={20} />
                </button>
                
                {/* Image Indicators */}
                <div style={{
                  position: 'absolute',
                  bottom: '80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '8px'
                }}>
                  {tour.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: index === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666'
          }}>
            <FaCamera size={48} />
          </div>
        )}

        {/* Hero Overlay with Guide Avatar and Tour Title */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
          padding: '40px 24px 24px',
          color: 'white'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px'
          }}>
            {/* Guide Avatar */}
            <div 
              style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onClick={() => navigate(`/guide-profile/${tour.guideId}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {(tour.guideAvatar || guideProfile?.avatarURL) ? (
                <img
                  src={tour.guideAvatar || guideProfile?.avatarURL}
                  alt={tour.guideName}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#134369',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid white',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}>
                  <FaUserCircle size={40} color="white" />
                </div>
              )}
            </div>

            {/* Tour Title and Guide Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Tour Category and Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  {tour.category}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaStar size={16} color="#ffc107" />
                  <span style={{ fontSize: '16px', fontWeight: '600', textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                    {tour.averageRating > 0 ? tour.averageRating.toFixed(1) : 'New'}
                  </span>
                  {tour.totalReviews > 0 && (
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                      ({tour.totalReviews} reviews)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Tour Title */}
              <h1 style={{ 
                fontSize: deviceInfo.isMobile ? '28px' : '36px', 
                fontWeight: 'bold', 
                margin: '0 0 8px 0',
                lineHeight: '1.2',
                color: 'white',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)'
              }}>
                {tour.name}
              </h1>

              {/* Guide Name */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                }}
                onClick={() => navigate(`/guide-profile/${tour.guideId}`)}
              >
                <span>with {tour.guideName}</span>
                <span style={{ fontSize: '12px' }}>• View Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: deviceInfo.isMobile ? '16px' : '32px 24px',
        display: 'grid',
        gridTemplateColumns: deviceInfo.isMobile ? '1fr' : '2fr 1fr',
        gap: deviceInfo.isMobile ? '24px' : '48px'
      }}>
        {/* Left Column - Tour Details */}
        <div>
          {/* Tour Description */}
          <div style={{ marginBottom: '32px' }}>
            <p style={{ 
              fontSize: '18px', 
              color: '#666', 
              lineHeight: '1.5',
              margin: 0
            }}>
              {tour.description}
            </p>
          </div>

          {/* Quick Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: deviceInfo.isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: deviceInfo.isMobile ? '16px' : '24px',
            marginBottom: '32px',
            padding: deviceInfo.isMobile ? '16px' : '24px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaClock size={20} color="#007aff" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Duration</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{formatDuration(tour.duration)}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaUsers size={20} color="#007aff" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Group Size</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Up to {tour.maxGroupSize} people</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaLanguage size={20} color="#007aff" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Languages</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {tour.languages?.join(', ') || 'English'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaWalking size={20} color="#007aff" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Difficulty</div>
                <div style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>
                  {tour.difficulty}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          {tour.detailedInfo?.detailedDescription && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                About This Experience
              </h2>
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.6', 
                color: '#333',
                whiteSpace: 'pre-line'
              }}>
                {tour.detailedInfo.detailedDescription}
              </p>
            </div>
          )}

          {/* What to Expect */}
          {tour.detailedInfo?.whatToExpect && tour.detailedInfo.whatToExpect.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                What to Expect
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tour.detailedInfo.whatToExpect.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <FaCheck size={16} color="#28a745" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's Included */}
          {tour.included && tour.included.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                What's Included
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tour.included.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <FaCheck size={16} color="#28a745" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's NOT Included */}
          {tour.detailedInfo?.notIncluded && tour.detailedInfo.notIncluded.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                What's NOT Included
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tour.detailedInfo.notIncluded.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <FaTimes size={16} color="#dc3545" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary */}
          {tour.detailedInfo?.itinerary && tour.detailedInfo.itinerary.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Itinerary
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {tour.detailedInfo.itinerary.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      backgroundColor: '#007aff',
                      color: 'white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {item.time}
                        </span>
                        {item.duration && item.duration > 0 && (
                          <span style={{
                            color: '#666',
                            fontSize: '12px'
                          }}>
                            {item.duration} minutes
                          </span>
                        )}
                      </div>
                      
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                        {item.activity}
                      </h4>
                      
                      {item.location && (
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>
                          <FaMapMarkerAlt size={12} style={{ marginRight: '4px' }} />
                          {item.location}
                        </p>
                      )}
                      
                      {item.description && (
                        <p style={{ fontSize: '14px', color: '#333', margin: 0, lineHeight: '1.5' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Point */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Meeting Point
            </h2>
            <div style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {tour.meetingPoint.name}
              </h4>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '12px' }}>
                <FaMapMarkerAlt size={14} style={{ marginRight: '8px' }} />
                {tour.meetingPoint.address}
              </p>
              {tour.meetingPoint.instructions && (
                <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
                  <FaInfoCircle size={14} style={{ marginRight: '8px' }} />
                  {tour.meetingPoint.instructions}
                </p>
              )}
            </div>
          </div>

          {/* Requirements */}
          {tour.requirements && tour.requirements.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Requirements
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tour.requirements.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <FaInfoCircle size={16} color="#007aff" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          {tour.detailedInfo?.policies && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Policies
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tour.detailedInfo.policies.cancellation && (
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      Cancellation Policy
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                      {tour.detailedInfo.policies.cancellation}
                    </p>
                  </div>
                )}
                
                {tour.detailedInfo.policies.weather && (
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      Weather Policy
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                      {tour.detailedInfo.policies.weather}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking Widget & Guide Info */}
        <div>
          {/* Booking Widget */}
          <div style={{
            position: 'sticky',
            top: '100px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {formatPrice(tour.basePrice)}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>per person</span>
              </div>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                All fees included
              </p>
            </div>

            <button
              onClick={handleBookTour}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaCalendarAlt size={16} />
              Book This Experience
            </button>

            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              textAlign: 'center',
              margin: 0
            }}>
              Free cancellation up to 24 hours before
            </p>
          </div>


        </div>
      </div>

      {/* Tour Booking Calendar */}
      {tour && (
        <TourBookingCalendar
          isVisible={showBookingCalendar}
          onClose={() => {
            setShowBookingCalendar(false);
          }}
          tourId={tour.id}
          guideName={tour.guideName}
          guideAvatar={tour.guideAvatar}
          onBookingSubmit={handleBookingSubmit}
        />
      )}

      {/* Payment Modal */}
      {tour && bookingFormData && (
        <PaymentModal
          isVisible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setBookingFormData(null);
          }}
          bookingData={bookingFormData}
          tourDetails={{
            id: tour.id,
            name: tour.name,
            basePrice: tour.basePrice,
            guideName: tour.guideName
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Tour Edit Form */}
      {tour && (
        <TourDetailsForm
          isVisible={showEditForm}
          onClose={() => setShowEditForm(false)}
          tour={tour}
          onTourUpdated={handleTourUpdated}
        />
      )}

      {/* CSS for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TourDetailView;
