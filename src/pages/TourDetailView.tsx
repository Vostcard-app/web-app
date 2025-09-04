import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaHome,
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<string[]>([]);
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
              const profileData = guideDoc.data();
              console.log('🔍 Guide profile data:', profileData);
              console.log('🔍 Tour guideAvatar:', tourData.guideAvatar);
              console.log('🔍 Profile avatarURL:', profileData?.avatarURL);
              console.log('🔍 Profile photoURL:', profileData?.photoURL);
              setGuideProfile(profileData);
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

  // Preload all images with high-quality settings for smooth slideshow transitions
  useEffect(() => {
    if (!tour?.images || tour.images.length === 0) return;

    const preloadImages = async () => {
      const loadPromises = tour.images.map((src) => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          
          // High-quality image loading settings
          img.crossOrigin = 'anonymous'; // Enable CORS for better processing
          img.decoding = 'sync'; // Synchronous decoding for immediate display
          img.loading = 'eager'; // Load immediately
          
          img.onload = () => {
            console.log(`✅ High-quality image loaded: ${src.substring(0, 50)}...`);
            resolve(src);
          };
          
          img.onerror = (error) => {
            console.warn(`❌ Image failed to load: ${src.substring(0, 50)}...`, error);
            reject(error);
          };
          
          // Try to get higher quality version if it's a Firebase Storage URL
          let highQualityUrl = src;
          if (src.includes('firebasestorage.googleapis.com')) {
            // Remove any existing size parameters and add high-quality parameters
            const baseUrl = src.split('?')[0];
            const urlParams = new URLSearchParams(src.split('?')[1] || '');
            
            // Remove compression parameters that might reduce quality
            urlParams.delete('w'); // width
            urlParams.delete('h'); // height  
            urlParams.delete('q'); // quality
            
            // Add high-quality parameters
            urlParams.set('alt', 'media'); // Get original file
            
            highQualityUrl = `${baseUrl}?${urlParams.toString()}`;
          }
          
          img.src = highQualityUrl;
        });
      });

      try {
        const loaded = await Promise.all(loadPromises);
        setPreloadedImages(loaded);
        console.log(`🎨 Successfully preloaded ${loaded.length} high-quality images`);
      } catch (error) {
        console.warn('Some images failed to preload:', error);
        setPreloadedImages(tour.images); // Use original URLs as fallback
      }
    };

    preloadImages();
  }, [tour?.images]);

  // Auto-advance slideshow with smooth transitions
  useEffect(() => {
    if (!tour?.images || tour.images.length <= 1 || preloadedImages.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % tour.images.length);
        setIsTransitioning(false);
      }, 150); // Half of transition duration
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [tour?.images, preloadedImages]);

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


  const hasImages = tour.images && tour.images.length > 0;
  const currentImage = hasImages ? (preloadedImages[currentImageIndex] || tour.images[currentImageIndex]) : null;

  // Smooth navigation functions
  const nextImage = () => {
    if (!tour?.images || tour.images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % tour.images.length);
      setIsTransitioning(false);
    }, 150);
  };

  const prevImage = () => {
    if (!tour?.images || tour.images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev - 1 + tour.images.length) % tour.images.length);
      setIsTransitioning(false);
    }, 150);
  };

  const goToImage = (index: number) => {
    if (!tour?.images || index === currentImageIndex || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsTransitioning(false);
    }, 150);
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#134369'
              }}
            >
              <FaHome size={16} />
              Home
            </button>
          </div>
          
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

      {/* High-Quality Slideshow Hero Section */}
      <div style={{ 
        position: 'relative',
        width: '100%',
        height: deviceInfo.isMobile ? '60vh' : '70vh',
        minHeight: '400px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start'
      }}>
        {/* High-Quality Background Image with Anti-Aliasing */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: currentImage ? `url(${currentImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transition: isTransitioning ? 'opacity 0.3s ease-in-out' : 'none',
          opacity: isTransitioning ? 0.7 : 1,
          // Enhanced image quality settings
          imageRendering: 'high-quality',
          WebkitImageRendering: 'high-quality',
          MozImageRendering: 'high-quality',
          msImageRendering: 'high-quality',
          // Subtle enhancements without over-processing
          filter: 'contrast(1.02) saturate(1.05) brightness(1.01) blur(0px)',
          transform: 'scale(1.01) translateZ(0)', // Hardware acceleration + minimal zoom
          backfaceVisibility: 'hidden', // Improve rendering performance
          WebkitBackfaceVisibility: 'hidden',
          WebkitTransform: 'translateZ(0)', // Force hardware acceleration
          zIndex: 0
        }} />

        {/* Alternative: High-Quality IMG Element Overlay (for better quality) */}
        {currentImage && (
          <img
            src={currentImage}
            alt="Tour Hero"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transition: isTransitioning ? 'opacity 0.3s ease-in-out' : 'none',
              opacity: isTransitioning ? 0.7 : 1,
              // High-quality image rendering
              imageRendering: 'high-quality',
              WebkitImageRendering: 'high-quality',
              MozImageRendering: 'high-quality',
              msImageRendering: 'high-quality',
              // Minimal processing to preserve quality
              filter: 'contrast(1.01) saturate(1.02) brightness(1.005)',
              transform: 'scale(1.005) translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              WebkitTransform: 'translateZ(0)',
              zIndex: 0
            }}
            loading="eager"
            decoding="sync"
          />
        )}

        {/* Navigation Controls */}
        {hasImages && tour.images.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={prevImage}
              disabled={isTransitioning}
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(19, 67, 105, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                opacity: isTransitioning ? 0.5 : 1,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 3
              }}
              onMouseEnter={(e) => {
                if (!isTransitioning) {
                  e.currentTarget.style.backgroundColor = 'rgba(19, 67, 105, 1)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(19, 67, 105, 0.8)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <FaChevronLeft size={18} />
            </button>

            {/* Next Button */}
            <button
              onClick={nextImage}
              disabled={isTransitioning}
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(19, 67, 105, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                opacity: isTransitioning ? 0.5 : 1,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 3
              }}
              onMouseEnter={(e) => {
                if (!isTransitioning) {
                  e.currentTarget.style.backgroundColor = 'rgba(19, 67, 105, 1)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(19, 67, 105, 0.8)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <FaChevronRight size={18} />
            </button>

            {/* Image Indicators */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
              zIndex: 3
            }}>
              {tour.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  disabled={isTransitioning}
                  style={{
                    width: index === currentImageIndex ? '32px' : '12px',
                    height: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: index === currentImageIndex 
                      ? 'white' 
                      : 'rgba(255, 255, 255, 0.5)',
                    cursor: isTransitioning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isTransitioning ? 0.5 : 1,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
              ))}
            </div>
          </>
        )}
        {/* Dark overlay for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
          zIndex: 1
        }} />
        
        {/* Tour Info Overlay */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          color: 'white',
          padding: deviceInfo.isMobile ? '32px 16px' : '48px 32px',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto'
        }}>
          <h1 style={{
            fontSize: deviceInfo.isMobile ? '32px' : '48px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            lineHeight: '1.2',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>
            {tour.name}
          </h1>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            fontSize: '18px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            {(tour.guideAvatar || guideProfile?.avatarURL || guideProfile?.photoURL) ? (
              <img
                src={tour.guideAvatar || guideProfile?.avatarURL || guideProfile?.photoURL}
                alt={tour.guideName}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              />
            ) : (
              <FaUserCircle size={24} />
            )}
            <span>with {tour.guideName}</span>
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            fontSize: '16px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaClock size={16} />
              <span>{formatDuration(tour.duration)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaUsers size={16} />
              <span>Up to {tour.maxGroupSize} people</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaStar size={16} color="#ffc107" />
              <span>{tour.averageRating > 0 ? tour.averageRating.toFixed(1) : 'New'}</span>
            </div>
          </div>
        </div>
        
        {/* Fallback background if no image */}
        {!currentImage && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#134369',
            zIndex: 0
          }} />
        )}
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
          {/* Quick Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: deviceInfo.isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: deviceInfo.isMobile ? '16px' : '24px',
            marginBottom: '32px',
            padding: deviceInfo.isMobile ? '16px' : '24px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaClock size={20} color="#134369" />
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '2px' }}>Duration</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {formatDuration(tour.duration)}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaUsers size={20} color="#134369" />
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '2px' }}>Group Size</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  Up to {tour.maxGroupSize} people
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaMapMarkerAlt size={20} color="#134369" />
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '2px' }}>Meeting Point</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {tour.meetingPoint.name}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaLanguage size={20} color="#134369" />
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '2px' }}>Languages</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {tour.languages.join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* Tour Description */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: deviceInfo.isMobile ? '20px' : '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              color: '#333'
            }}>
              About This Tour
            </h2>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#666',
              margin: 0
            }}>
              {tour.description}
            </p>
          </div>

          {/* What's Included */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: deviceInfo.isMobile ? '20px' : '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              color: '#333'
            }}>
              What's Included
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tour.included.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheck size={14} color="#28a745" />
                  <span style={{ fontSize: '14px', color: '#666' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: deviceInfo.isMobile ? '20px' : '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              color: '#333'
            }}>
              Tour Highlights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tour.highlights.map((highlight, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#134369',
                    marginTop: '8px',
                    flexShrink: 0
                  }} />
                  <span style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Booking */}
        <div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: deviceInfo.isMobile ? '20px' : '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: '100px',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {formatPrice((() => {
                    // Ensure 10% markup is always applied for display
                    // If tour has guideRate, use basePrice as-is (already includes markup)
                    // If no guideRate, assume basePrice is guide rate and add 10%
                    const hasGuideRate = tour.guideRate;
                    const displayPrice = hasGuideRate ? tour.basePrice : Math.round(tour.basePrice * 1.1);
                    return displayPrice;
                  })())}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>per person</span>
              </div>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                All fees included
              </p>
            </div>

            {user && user.uid !== tour.guideId ? (
              <button
                onClick={handleBookTour}
                style={{
                  width: '100%',
                  backgroundColor: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0f2d4d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#134369';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FaCalendarAlt style={{ marginRight: '8px' }} />
                Book This Tour
              </button>
            ) : user && user.uid === tour.guideId ? (
              <button
                onClick={() => setShowEditForm(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px'
                }}
              >
                <FaEdit style={{ marginRight: '8px' }} />
                Edit Tour Details
              </button>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: 0, color: '#666' }}>
                  Please sign in to book this tour
                </p>
              </div>
            )}

            {/* Contact Guide */}
            <div style={{
              borderTop: '1px solid #e0e0e0',
              paddingTop: '16px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 12px 0',
                color: '#333'
              }}>
                Your Guide
              </h4>
              
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => navigate(`/guide-profile/${tour.guideId}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {(tour.guideAvatar || guideProfile?.avatarURL || guideProfile?.photoURL) ? (
                  <img
                    src={tour.guideAvatar || guideProfile?.avatarURL || guideProfile?.photoURL}
                    alt={tour.guideName}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover'
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
                    justifyContent: 'center'
                  }}>
                    <FaUserCircle size={24} color="white" />
                  </div>
                )}
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                    {tour.guideName}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Tour Guide
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Calendar Modal */}
      {showBookingCalendar && (
        <TourBookingCalendar
          isVisible={showBookingCalendar}
          onClose={() => setShowBookingCalendar(false)}
          tour={tour}
          onBookingSubmit={handleBookingSubmit}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && bookingFormData && (
        <PaymentModal
          isVisible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
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

      {/* Tour Details Form Modal */}
      {showEditForm && (
        <TourDetailsForm
          isVisible={showEditForm}
          onClose={() => setShowEditForm(false)}
          tour={tour}
          onTourUpdated={handleTourUpdated}
        />
      )}
    </div>
  );
};

export default TourDetailView;
