import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera, FaMapPin, FaClock, FaUsers, FaDollarSign, FaStar, FaCheck, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { GuidedTourService } from '../services/guidedTourService';
import GuidedTourTemplateEditor, { TourFormData } from '../components/GuidedTourTemplateEditor';
import type { GuidedTour } from '../types/GuidedTourTypes';

interface TourTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  suggestedDuration: number; // in minutes
  suggestedPrice: number;
  highlights: string[];
  included: string[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  coverImage: string;
  tags: string[];
}

const tourTemplates: TourTemplate[] = [
  {
    id: 'city-highlights',
    name: 'City Highlights Walking Tour',
    category: 'City Tour',
    description: 'Discover the most iconic landmarks and hidden gems of the city with a local expert guide.',
    suggestedDuration: 180, // 3 hours
    suggestedPrice: 45,
    highlights: ['Historic landmarks', 'Local stories', 'Photo opportunities', 'Cultural insights'],
    included: ['Professional guide', 'Walking tour', 'Local recommendations'],
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop',
    tags: ['walking', 'history', 'culture', 'landmarks']
  },
  {
    id: 'food-culture',
    name: 'Food & Culture Experience',
    category: 'Food Tour',
    description: 'Taste authentic local cuisine while learning about the cultural heritage and culinary traditions.',
    suggestedDuration: 240, // 4 hours
    suggestedPrice: 65,
    highlights: ['Local food tastings', 'Cultural stories', 'Hidden restaurants', 'Cooking insights'],
    included: ['Food tastings', 'Professional guide', 'Cultural explanations'],
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    tags: ['food', 'culture', 'tastings', 'local']
  },
  {
    id: 'historical-walk',
    name: 'Historical Walking Discovery',
    category: 'History Tour',
    description: 'Journey through time as we explore historical sites and uncover fascinating stories from the past.',
    suggestedDuration: 150, // 2.5 hours
    suggestedPrice: 40,
    highlights: ['Historical sites', 'Expert storytelling', 'Architectural gems', 'Time periods'],
    included: ['Professional historian guide', 'Historical insights', 'Photo stops'],
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop',
    tags: ['history', 'walking', 'architecture', 'stories']
  },
  {
    id: 'nature-adventure',
    name: 'Nature & Adventure Tour',
    category: 'Adventure',
    description: 'Explore natural landscapes and enjoy outdoor activities with stunning views and fresh air.',
    suggestedDuration: 300, // 5 hours
    suggestedPrice: 75,
    highlights: ['Scenic viewpoints', 'Nature photography', 'Outdoor activities', 'Wildlife spotting'],
    included: ['Adventure guide', 'Safety equipment', 'Nature insights'],
    difficulty: 'moderate',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    tags: ['nature', 'adventure', 'hiking', 'outdoors']
  },
  {
    id: 'art-culture',
    name: 'Art & Culture Immersion',
    category: 'Art Tour',
    description: 'Dive deep into the local art scene, visiting galleries, studios, and meeting local artists.',
    suggestedDuration: 210, // 3.5 hours
    suggestedPrice: 55,
    highlights: ['Art galleries', 'Artist studios', 'Creative process', 'Local art scene'],
    included: ['Art expert guide', 'Gallery visits', 'Artist interactions'],
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    tags: ['art', 'culture', 'galleries', 'artists']
  },
  {
    id: 'custom-tour',
    name: 'Create Custom Tour',
    category: 'Custom',
    description: 'Design your own unique tour experience from scratch.',
    suggestedDuration: 180,
    suggestedPrice: 50,
    highlights: [],
    included: [],
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&h=600&fit=crop',
    tags: ['custom']
  }
];

const GuidedTourCreationView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TourTemplate | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Form state
  const [tourData, setTourData] = useState({
    name: '',
    description: '',
    duration: 180,
    maxGroupSize: 8,
    basePrice: 50,
    category: 'City Tour',
    difficulty: 'easy' as const,
    highlights: [''],
    included: [''],
    meetingPoint: {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      instructions: ''
    },
    languages: ['English'],
    coverImage: ''
  });

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handleTemplateSelect = (template: TourTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateEditor(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleSaveTour = async (formData: TourFormData) => {
    if (!user) return;

    setIsCreating(true);
    try {
      // Calculate platform fee (10%)
      const platformFee = formData.pricePerPerson * 0.1;
      const totalPrice = formData.pricePerPerson + platformFee;

      const guidedTour: Partial<GuidedTour> = {
        type: 'guided',
        creatorId: user.uid,
        guideId: user.uid,
        guideName: formData.guideName,
        guideAvatar: formData.guideAvatar,
        name: formData.title,
        description: formData.description,
        duration: formData.duration,
        maxGroupSize: formData.maxGroupSize,
        basePrice: formData.pricePerPerson,
        platformFee,
        totalPrice,
        category: formData.category === 'Custom' ? formData.customCategory : formData.category as any,
        difficulty: formData.difficulty,
        highlights: formData.highlights,
        included: formData.included,
        meetingPoint: formData.meetingPoint,
        languages: formData.languages,
        images: formData.coverImage ? [formData.coverImage] : [],
        tags: formData.tags,
        averageRating: 0,
        totalReviews: 0,
        isPublic: true,
        postIds: [], // Will be populated later when posts are added
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create the tour using the service
      const tourId = await GuidedTourService.createGuidedTour({
        tourData: guidedTour as any
      });
      
      console.log('✅ Guided tour created with ID:', tourId);
      alert('Guided tour created successfully! You can now manage bookings and add more details.');
      navigate('/user-profile/' + user.uid + '/guided-tours');
      
    } catch (error) {
      console.error('❌ Error creating guided tour:', error);
      alert('Failed to create guided tour. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getInitialFormData = (template: TourTemplate): Partial<TourFormData> => {
    return {
      title: template.name,
      description: template.description,
      category: template.category,
      duration: template.suggestedDuration,
      pricePerPerson: template.suggestedPrice,
      highlights: [...template.highlights],
      included: [...template.included],
      tags: [...template.tags],
      coverImage: template.coverImage,
      difficulty: template.difficulty,
      guideName: user?.displayName || 'Guide'
    };
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#28a745',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            Create Guided Tour
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            Choose a template to get started quickly
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {!selectedTemplate ? (
          <>
            {/* Template Selection */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
                Choose a Tour Template
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Select a pre-designed template to create your guided tour quickly, or start from scratch.
              </p>
            </div>

            {/* Template Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {tourTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Cover Image */}
                  <div style={{
                    height: '200px',
                    backgroundImage: `url(${template.coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    {/* Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))'
                    }} />
                    
                    {/* Guide Info (like in your image) */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#28a745',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {user.displayName?.charAt(0) || 'G'}
                      </div>
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: '500' }}>
                        3 other locals available
                      </span>
                    </div>

                    {/* Category Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {template.category}
                    </div>

                    {/* Title at bottom of image */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      right: '12px'
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}>
                        {template.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px' }}>
                    {/* Rating and Duration */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaStar size={14} color="#ffc107" />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>New</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaClock size={12} color="#666" />
                        <span style={{ fontSize: '14px', color: '#666' }}>
                          {formatDuration(template.suggestedDuration)}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4',
                      margin: '0 0 12px 0'
                    }}>
                      {template.description}
                    </p>

                    {/* Highlights */}
                    {template.highlights.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {template.highlights.slice(0, 3).map((highlight, index) => (
                            <span
                              key={index}
                              style={{
                                fontSize: '11px',
                                backgroundColor: '#f8f9fa',
                                color: '#495057',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef'
                              }}
                            >
                              {highlight}
                            </span>
                          ))}
                          {template.highlights.length > 3 && (
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              +{template.highlights.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price and Badges */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaDollarSign size={14} color="#28a745" />
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#28a745'
                        }}>
                          {formatPrice(template.suggestedPrice)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>per person</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: '600'
                        }}>
                          CITY HIGHLIGHTS TOUR
                        </span>
                        <span style={{
                          fontSize: '10px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: '600'
                        }}>
                          INSTANTLY CONFIRMED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Selected Template Preview */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
                Selected Template: {selectedTemplate.name}
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                {selectedTemplate.description}
              </p>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaClock size={14} color="#666" />
                  <span>{formatDuration(selectedTemplate.suggestedDuration)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaDollarSign size={14} color="#28a745" />
                  <span>{formatPrice(selectedTemplate.suggestedPrice)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaUsers size={14} color="#666" />
                  <span>Up to 8 people</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Choose Different Template
                </button>
                <button
                  onClick={handleCreateTour}
                  disabled={isCreating}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isCreating ? 0.7 : 1
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create Tour from Template'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Template Editor Modal */}
      {selectedTemplate && (
        <GuidedTourTemplateEditor
          isVisible={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false);
            setSelectedTemplate(null);
          }}
          onSave={handleSaveTour}
          initialData={getInitialFormData(selectedTemplate)}
        />
      )}
    </div>
  );
};

export default GuidedTourCreationView;
