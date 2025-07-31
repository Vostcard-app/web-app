import React, { useState } from 'react';
import { FaTimes, FaArrowLeft, FaArrowRight, FaCheck, FaMapPin, FaCamera, FaStar, FaWalking, FaUsers, FaHeart } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TourSlide {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: string[];
}

const tourSlides: TourSlide[] = [
  {
    id: 1,
    title: "Welcome to Vōstcard!",
    description: "Find free tours wherever you go. A location-based storytelling platform. Share experiences, discover places, and connect with others around you.",
    icon: <FaMapPin size={48} color="#002B4D" />,
    features: [
      "Share location-based content",
      "Discover nearby experiences", 
      "Connect with your community"
    ]
  },
  {
    id: 2,
    title: "Create Vostcards & Quickcards",
    description: "Capture and share your experiences instantly. Create detailed Vostcards or quick photo-based Quickcards.",
    icon: <FaCamera size={48} color="#002B4D" />,
    features: [
      "Full Vostcards with photos, videos & stories",
      "Quick photo-based Quickcards",
      "Automatically tagged with your location"
    ]
  },
  {
    id: 3,
    title: "Explore Your Map",
    description: "See what's happening around you. Discover posts, offers, and tours from other users in your area.",
    icon: <FaMapPin size={48} color="#002B4D" />,
    features: [
      "View all content on an interactive map",
      "Filter by categories and types",
      "Find offers and special deals nearby"
    ]
  },
  {
    id: 4,
    title: "Join Tours & Adventures",
    description: "Follow guided tours created by local guides. Experience curated journeys through interesting locations.",
    icon: <FaWalking size={48} color="#002B4D" />,
    features: [
      "Follow step-by-step guided tours",
      "Rate and review your experiences",
      "Discover hidden gems with local guides"
    ]
  },
  {
    id: 5,
    title: "Connect & Share",
    description: "Follow friends, like posts, and build your community. Your Vōstbox keeps track of all your interactions.",
    icon: <FaUsers size={48} color="#002B4D" />,
    features: [
      "Follow friends and interesting creators",
      "Like and comment on posts",
      "Get notifications in your Vōstbox"
    ]
  },
  {
    id: 6,
    title: "You're All Set!",
    description: "Ready to start exploring? Create your first post or discover what's around you!",
    icon: <FaCheck size={48} color="#00C851" />,
    features: [
      "Tap 'Create Vostcard' to share something",
      "Tap 'Create Quickcard' for instant sharing",
      "Explore the map to see what's nearby"
    ]
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    
    if (currentSlide < tourSlides.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      onComplete();
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

  const currentSlideData = tourSlides[currentSlide];
  const isLastSlide = currentSlide === tourSlides.length - 1;

  console.log('🎯 OnboardingTour render - isOpen:', isOpen, 'currentSlide:', currentSlide);
  
  if (!isOpen) {
    console.log('🎯 OnboardingTour not rendering - isOpen is false');
    return null;
  }
  
  console.log('🎯 OnboardingTour rendering modal - currentSlide:', currentSlideData?.title);

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
          zIndex: 10000,
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
          zIndex: 10001,
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
              Quick Tour
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
            onClick={onSkip}
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
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              {currentSlideData.icon}
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#002B4D',
              lineHeight: '1.2'
            }}>
              {currentSlideData.title}
            </h2>

            {/* Description */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
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
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#002B4D',
                      flexShrink: 0
                    }} />
                    {feature}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

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
              onClick={onSkip}
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

export default OnboardingTour;