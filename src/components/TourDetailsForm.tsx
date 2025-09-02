import React, { useState, useRef } from 'react';
import { FaTimes, FaPlus, FaTrash, FaUpload, FaMapMarkerAlt, FaClock, FaUsers, FaDollarSign, FaCamera, FaInfoCircle, FaSave } from 'react-icons/fa';
import { GuidedTour } from '../types/GuidedTourTypes';
import { GuidedTourService } from '../services/guidedTourService';

interface TourDetailsFormProps {
  isVisible: boolean;
  onClose: () => void;
  tour: GuidedTour;
  onTourUpdated: (updatedTour: GuidedTour) => void;
}

interface DetailedTourData {
  // Basic Info (already exists but can be edited)
  name: string;
  description: string;
  duration: number;
  maxGroupSize: number;
  basePrice: number;
  
  // Detailed Information
  detailedDescription: string;
  whatToExpect: string[];
  highlights: string[];
  included: string[];
  notIncluded: string[];
  requirements: string[];
  recommendations: string[];
  
  // Location & Meeting
  meetingPoint: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    instructions: string;
    landmarks?: string;
  };
  
  // Itinerary
  itinerary: {
    time: string;
    activity: string;
    location?: string;
    duration?: number;
    description?: string;
  }[];
  
  // Policies
  cancellationPolicy: string;
  weatherPolicy: string;
  ageRestrictions: string;
  groupSizePolicy: string;
  
  // Media
  images: string[];
  videoUrl?: string;
  
  // Additional Settings
  languages: string[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  accessibility: string[];
  tags: string[];
  
  // Pricing Options
  groupDiscounts: {
    minSize: number;
    discount: number; // percentage
  }[];
  seasonalPricing: {
    season: string;
    priceMultiplier: number;
  }[];
}

const TourDetailsForm: React.FC<TourDetailsFormProps> = ({
  isVisible,
  onClose,
  tour,
  onTourUpdated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'itinerary' | 'policies' | 'media' | 'pricing'>('basic');
  
  const [formData, setFormData] = useState<DetailedTourData>({
    name: tour.name,
    description: tour.description || '',
    duration: tour.duration,
    maxGroupSize: tour.maxGroupSize,
    basePrice: tour.basePrice,
    detailedDescription: '',
    whatToExpect: [],
    highlights: tour.highlights || [],
    included: tour.included || [],
    notIncluded: [],
    requirements: tour.requirements || [],
    recommendations: [],
    meetingPoint: tour.meetingPoint,
    itinerary: [],
    cancellationPolicy: 'Free cancellation up to 24 hours before the tour starts.',
    weatherPolicy: 'Tours run rain or shine. In case of severe weather, we will contact you to reschedule.',
    ageRestrictions: 'Suitable for all ages.',
    groupSizePolicy: `Maximum ${tour.maxGroupSize} participants per tour.`,
    images: tour.images || [],
    videoUrl: '',
    languages: tour.languages || ['English'],
    difficulty: tour.difficulty,
    accessibility: [],
    tags: tour.tags || [],
    groupDiscounts: [],
    seasonalPricing: []
  });

  const [newItem, setNewItem] = useState('');
  const [newItineraryItem, setNewItineraryItem] = useState({
    time: '',
    activity: '',
    location: '',
    duration: 0,
    description: ''
  });

  if (!isVisible) return null;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, result]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addListItem = (listName: keyof DetailedTourData, item: string) => {
    if (!item.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [listName]: [...(prev[listName] as string[]), item.trim()]
    }));
    setNewItem('');
  };

  const removeListItem = (listName: keyof DetailedTourData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [listName]: (prev[listName] as string[]).filter((_, i) => i !== index)
    }));
  };

  const addItineraryItem = () => {
    if (!newItineraryItem.time || !newItineraryItem.activity) return;
    
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { ...newItineraryItem }]
    }));
    
    setNewItineraryItem({
      time: '',
      activity: '',
      location: '',
      duration: 0,
      description: ''
    });
  };

  const removeItineraryItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Handle pricing logic - if basePrice changed, recalculate guide rate and platform fee
      let pricingUpdates = {};
      if (formData.basePrice !== tour.basePrice) {
        // If the guide is updating the display price, we need to reverse-calculate the guide rate
        // Current basePrice includes platform fee, so guide rate = basePrice / 1.1
        const newGuideRate = formData.basePrice / 1.1;
        const newPlatformFee = formData.basePrice - newGuideRate;
        
        pricingUpdates = {
          basePrice: formData.basePrice, // Display price (inclusive)
          guideRate: newGuideRate, // What guide receives
          platformFee: newPlatformFee, // Platform fee amount
          totalPrice: formData.basePrice // Same as basePrice for per-person pricing
        };
      }

      // Update the tour with detailed information
      const updatedTour: Partial<GuidedTour> = {
        name: formData.name,
        description: formData.description,
        duration: formData.duration,
        maxGroupSize: formData.maxGroupSize,
        ...pricingUpdates, // Include pricing updates if basePrice changed
        highlights: formData.highlights,
        included: formData.included,
        requirements: formData.requirements,
        meetingPoint: formData.meetingPoint,
        images: formData.images,
        languages: formData.languages,
        difficulty: formData.difficulty,
        tags: formData.tags,
        // Add detailed information as custom fields
        detailedInfo: {
          detailedDescription: formData.detailedDescription,
          whatToExpect: formData.whatToExpect,
          notIncluded: formData.notIncluded,
          recommendations: formData.recommendations,
          itinerary: formData.itinerary,
          policies: {
            cancellation: formData.cancellationPolicy,
            weather: formData.weatherPolicy,
            age: formData.ageRestrictions,
            groupSize: formData.groupSizePolicy
          },
          accessibility: formData.accessibility,
          pricing: {
            groupDiscounts: formData.groupDiscounts,
            seasonalPricing: formData.seasonalPricing
          },
          videoUrl: formData.videoUrl
        },
        updatedAt: new Date()
      };

      // Update the tour in Firestore
      await GuidedTourService.updateGuidedTour(tour.id, updatedTour);
      
      // Call the callback with updated tour
      onTourUpdated({ ...tour, ...updatedTour } as GuidedTour);
      
      alert('Tour details updated successfully!');
      onClose();
    } catch (error) {
      console.error('❌ Error updating tour:', error);
      alert('Failed to update tour details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FaInfoCircle },
    { id: 'details', label: 'Details', icon: FaInfoCircle },
    { id: 'itinerary', label: 'Itinerary', icon: FaClock },
    { id: 'policies', label: 'Policies', icon: FaInfoCircle },
    { id: 'media', label: 'Media', icon: FaCamera },
    { id: 'pricing', label: 'Pricing', icon: FaDollarSign }
  ];

  const renderListEditor = (
    title: string,
    listName: keyof DetailedTourData,
    placeholder: string,
    description?: string
  ) => (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
        {title}
      </label>
      {description && (
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          {description}
        </p>
      )}
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          onKeyPress={(e) => e.key === 'Enter' && addListItem(listName, newItem)}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={() => addListItem(listName, newItem)}
          style={{
            padding: '12px 16px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <FaPlus size={12} />
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(formData[listName] as string[]).map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontSize: '14px' }}>{item}</span>
            <button
              onClick={() => removeListItem(listName, index)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#dc3545',
                padding: '4px'
              }}
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Basic Information
            </h3>
            
            {/* Tour Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Tour Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Short Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Short Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Duration, Group Size, Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Max Group Size *
                </label>
                <input
                  type="number"
                  value={formData.maxGroupSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxGroupSize: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Base Price (USD) *
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Difficulty Level
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="challenging">Challenging</option>
              </select>
            </div>
          </div>
        );

      case 'details':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Detailed Information
            </h3>
            
            {/* Detailed Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Detailed Description
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Provide a comprehensive description of your tour experience.
              </p>
              <textarea
                value={formData.detailedDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, detailedDescription: e.target.value }))}
                rows={6}
                placeholder="Tell potential guests everything they need to know about this tour..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {renderListEditor(
              'What to Expect',
              'whatToExpect',
              'e.g., Walking through historic neighborhoods',
              'List the key experiences guests will have on this tour.'
            )}

            {renderListEditor(
              'Tour Highlights',
              'highlights',
              'e.g., Visit to famous landmark',
              'The most exciting and memorable parts of your tour.'
            )}

            {renderListEditor(
              "What's Included",
              'included',
              'e.g., Professional guide, entrance fees',
              'Everything that is included in the tour price.'
            )}

            {renderListEditor(
              "What's NOT Included",
              'notIncluded',
              'e.g., Food and drinks, transportation',
              'Items guests need to bring or pay for separately.'
            )}

            {renderListEditor(
              'Requirements',
              'requirements',
              'e.g., Comfortable walking shoes required',
              'Any physical requirements or items guests must bring.'
            )}

            {renderListEditor(
              'Recommendations',
              'recommendations',
              'e.g., Bring a camera, wear sunscreen',
              'Helpful suggestions to enhance the tour experience.'
            )}
          </div>
        );

      case 'itinerary':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Tour Itinerary
            </h3>
            
            {/* Add New Itinerary Item */}
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '24px' 
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Add Itinerary Item
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Time (e.g., 9:00 AM)"
                  value={newItineraryItem.time}
                  onChange={(e) => setNewItineraryItem(prev => ({ ...prev, time: e.target.value }))}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="Activity (e.g., Meet at central square)"
                  value={newItineraryItem.activity}
                  onChange={(e) => setNewItineraryItem(prev => ({ ...prev, activity: e.target.value }))}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newItineraryItem.location}
                  onChange={(e) => setNewItineraryItem(prev => ({ ...prev, location: e.target.value }))}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="number"
                  placeholder="Duration (min)"
                  value={newItineraryItem.duration}
                  onChange={(e) => setNewItineraryItem(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <textarea
                placeholder="Description (optional)"
                value={newItineraryItem.description}
                onChange={(e) => setNewItineraryItem(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '12px',
                  resize: 'vertical'
                }}
              />
              
              <button
                onClick={addItineraryItem}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaPlus size={12} />
                Add to Itinerary
              </button>
            </div>

            {/* Itinerary Items */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Current Itinerary ({formData.itinerary.length} items)
              </h4>
              
              {formData.itinerary.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  No itinerary items added yet. Add your first item above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.itinerary.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '16px',
                        position: 'relative'
                      }}
                    >
                      <button
                        onClick={() => removeItineraryItem(index)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc3545',
                          padding: '4px'
                        }}
                      >
                        <FaTrash size={12} />
                      </button>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ 
                          backgroundColor: '#007aff', 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {item.time}
                        </span>
                        {item.duration > 0 && (
                          <span style={{ 
                            backgroundColor: '#f8f9fa', 
                            color: '#666', 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '12px'
                          }}>
                            {item.duration} min
                          </span>
                        )}
                      </div>
                      
                      <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {item.activity}
                      </h5>
                      
                      {item.location && (
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                          <FaMapMarkerAlt size={12} style={{ marginRight: '4px' }} />
                          {item.location}
                        </p>
                      )}
                      
                      {item.description && (
                        <p style={{ fontSize: '14px', color: '#333', marginTop: '8px' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'policies':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Policies & Guidelines
            </h3>
            
            {/* Cancellation Policy */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Cancellation Policy
              </label>
              <textarea
                value={formData.cancellationPolicy}
                onChange={(e) => setFormData(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Weather Policy */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Weather Policy
              </label>
              <textarea
                value={formData.weatherPolicy}
                onChange={(e) => setFormData(prev => ({ ...prev, weatherPolicy: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Age Restrictions */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Age Restrictions
              </label>
              <input
                type="text"
                value={formData.ageRestrictions}
                onChange={(e) => setFormData(prev => ({ ...prev, ageRestrictions: e.target.value }))}
                placeholder="e.g., Suitable for all ages, 18+ only, etc."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Group Size Policy */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Group Size Policy
              </label>
              <textarea
                value={formData.groupSizePolicy}
                onChange={(e) => setFormData(prev => ({ ...prev, groupSizePolicy: e.target.value }))}
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {renderListEditor(
              'Accessibility Features',
              'accessibility',
              'e.g., Wheelchair accessible, Audio descriptions available',
              'List any accessibility accommodations your tour provides.'
            )}
          </div>
        );

      case 'media':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Photos & Media
            </h3>
            
            {/* Image Upload */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Tour Photos
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Add high-quality photos that showcase your tour experience.
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <FaUpload size={12} />
                Upload Photos
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              
              {/* Image Gallery */}
              {formData.images.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                  gap: '12px' 
                }}>
                  {formData.images.map((image, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        aspectRatio: '1'
                      }}
                    >
                      <img
                        src={image}
                        alt={`Tour photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <button
                        onClick={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(220, 53, 69, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video URL */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Tour Video (Optional)
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Add a YouTube or Vimeo URL to showcase your tour.
              </p>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {renderListEditor(
              'Tags',
              'tags',
              'e.g., history, walking, photography',
              'Add tags to help guests find your tour.'
            )}
          </div>
        );

      case 'pricing':
        return (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Advanced Pricing
            </h3>
            
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              Set up group discounts and seasonal pricing to maximize your bookings.
            </p>
            
            {/* Group Discounts */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Group Discounts
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Offer discounts for larger groups to encourage bigger bookings.
              </p>
              
              {/* Add Group Discount */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Minimum Group Size
                    </label>
                    <input
                      type="number"
                      min="2"
                      placeholder="5"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="10"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>
              
              {formData.groupDiscounts.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  No group discounts set up yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formData.groupDiscounts.map((discount, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>
                        {discount.discount}% off for groups of {discount.minSize}+ people
                      </span>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc3545',
                          padding: '4px'
                        }}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seasonal Pricing */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Seasonal Pricing
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Adjust pricing for different seasons or peak times.
              </p>
              
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                Seasonal pricing feature coming soon...
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Tour Details
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                {tour.name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #007aff' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  color: activeTab === tab.id ? '#007aff' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '24px' 
          }}>
            {renderTabContent()}
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#007aff',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaSave size={14} />
              {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TourDetailsForm;
