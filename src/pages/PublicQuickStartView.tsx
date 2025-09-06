import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaArrowLeft, FaArrowRight, FaCheck, FaMapPin, FaCamera, FaStar, FaWalking, FaUsers, FaHeart, FaFilter, FaBars } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import VostcardPin from '../assets/Vostcard_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import GuidePin from '../assets/Guide_pin.png';

interface TourSlide {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: (string | { icon: React.ReactNode; text: string })[];
}

const tourSlides: TourSlide[] = [
  {
    id: 1,
    title: "Free Tours!\nWherever you go!",
    description: "",
    icon: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={GuidePin}
          alt="Guide Pin"
          style={{ width: '128px', height: '128px' }}
        />
      </div>
    )
  },
  {
    id: 2,
    title: "",
    description: "",
    icon: <div></div>,
    features: [
      {
        icon: (
          <img 
            src={GuidePin} 
            alt="Guide Pin" 
            style={{ width: '128px', height: '128px', flexShrink: 0 }} 
          />
        ),
        text: "Points of interests made by a guide"
      },
      {
        icon: (
          <img 
            src={VostcardPin} 
            alt="Vostcard Pin" 
            style={{ width: '128px', height: '128px', flexShrink: 0 }} 
          />
        ),
        text: "Points of interest made by anyone"
      },
      {
        icon: (
          <img 
            src={OfferPin} 
            alt="Offer Pin" 
            style={{ width: '128px', height: '128px', flexShrink: 0 }} 
          />
        ),
        text: "Special offers and deals"
      }
    ]
  },
  {
    id: 3,
    title: "Join Tours & Adventures",
    description: "Tap the Tour button or Guide avatar to see curated tours.",
    icon: (
      <div style={{
        backgroundColor: '#002B4D',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '12px 16px',
        fontSize: '16px',
        fontWeight: 500,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: '100px',
        marginTop: '20px'
      }}>
        <FaWalking style={{ fontSize: '16px' }} />
        <span>Tours</span>
      </div>
    )
  },
  {
    id: 4,
    title: "Try the pulldown menu",
    description: "Find Help, your posts and much more",
    icon: <FaBars size={48} color="#002B4D" />
  },
  {
    id: 5,
    title: "You're All Set!",
    description: "Ready to start exploring? Create your first post or discover what's around you!",
    icon: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <FaCheck size={48} color="#00C851" />
        <div
          style={{
            backgroundColor: '#00C851',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,200,81,0.3)',
            textAlign: 'center'
          }}
          className="join-button"
        >
          Join (It's free)
        </div>
      </div>
    )
  }
];

const PublicQuickStartView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Helper function to handle navigation - if user is logged in, go to home, otherwise register
  const handleJoinNavigation = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/register');
    }
  };

  const handleNext = () => {
    if (isAnimating) return;
    
    if (currentSlide < tourSlides.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      // On completion, navigate based on auth status
      handleJoinNavigation();
    }
  };

  const handlePrevious = () => {
    if (isAnimating || currentSlide === 0) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleDotClick = (slideIndex: number) => {
    if (isAnimating || slideIndex === currentSlide) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(slideIndex);
      setIsAnimating(false);
    }, 150);
  };

  // Swipe handling
  const handleSwipe = (event: any, info: any) => {
    if (isAnimating) return;

    const swipeThreshold = 50; // Minimum distance for a swipe
    const velocityThreshold = 500; // Minimum velocity for a swipe
    
    // Check if it's a significant swipe (either distance or velocity)
    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > 0) {
        // Swipe right - go to previous slide
        handlePrevious();
      } else {
        // Swipe left - go to next slide
        handleNext();
      }
    }
  };

  const currentSlideData = tourSlides[currentSlide];
  const isLastSlide = currentSlide === tourSlides.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 100000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          zIndex: 100001,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#002B4D'
            }}>
              Quick Start
            </span>
            <span style={{
              fontSize: '12px',
              color: '#666',
              backgroundColor: '#e9ecef',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {currentSlide + 1} of {tourSlides.length}
            </span>
          </div>
          
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleSwipe}
            style={{
              padding: '0px 24px 32px 24px',
              textAlign: 'center',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              cursor: 'grab'
            }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            {/* Icon */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '0px'
              }}
              onClick={(e) => {
                // Handle join button click on slide 5
                if (currentSlide === 4 && (e.target as HTMLElement).classList.contains('join-button')) {
                  handleJoinNavigation();
                }
              }}
            >
              {currentSlideData.icon}
            </div>

            {/* Title */}
            <h2 style={{
              margin: '20px 0 16px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: '#002B4D',
              lineHeight: '1.2',
              whiteSpace: 'pre-line'
            }}>
              {currentSlideData.title}
            </h2>

            {/* Description */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '28px',
              lineHeight: '1.5',
              color: '#555',
              textAlign: 'center'
            }}>
              {currentSlideData.description}
            </p>

            {/* Features */}
            {currentSlideData.features && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'flex-start',
                textAlign: 'left'
              }}>
                {currentSlideData.features.map((feature, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '28px',
                    color: '#666'
                  }}>
                    {typeof feature === 'string' ? (
                      <>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#002B4D',
                          flexShrink: 0
                        }} />
                        {feature}
                      </>
                    ) : (
                      <>
                        {feature.icon}
                        {feature.text}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Swipe Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px 24px 0 24px',
          fontSize: '12px',
          color: '#999',
          gap: '4px'
        }}>
          <span>←</span>
          <span>Swipe to navigate</span>
          <span>→</span>
        </div>

        {/* Progress Dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '0 24px 16px 24px'
        }}>
          {tourSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentSlide ? '#002B4D' : '#e0e0e0',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px 24px 24px',
          gap: '16px'
        }}>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentSlide === 0 || isAnimating}
            style={{
              background: currentSlide === 0 ? '#f5f5f5' : 'white',
              color: currentSlide === 0 ? '#ccc' : '#002B4D',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '80px',
              justifyContent: 'center'
            }}
          >
            <FaArrowLeft size={12} />
            Back
          </button>

          {/* Skip Button */}
          {!isLastSlide && (
            <button
              onClick={handleJoinNavigation}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px'
              }}
            >
              Skip Tour
            </button>
          )}

          {/* Next/Complete Button */}
          <button
            onClick={handleNext}
            disabled={isAnimating}
            style={{
              background: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isAnimating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '80px',
              justifyContent: 'center'
            }}
          >
            {isLastSlide ? (
              <>
                <FaCheck size={12} />
                Done
              </>
            ) : (
              <>
                Next
                <FaArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default PublicQuickStartView;