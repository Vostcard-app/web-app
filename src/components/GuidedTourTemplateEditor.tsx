import React, { useState, useRef } from 'react';
import { FaTimes, FaCamera, FaClock, FaDollarSign, FaUsers, FaMapPin, FaPlus, FaTrash, FaUpload } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

interface GuidedTourTemplateEditorProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (tourData: TourFormData) => void;
  initialData?: Partial<TourFormData>;
}

export interface TourFormData {
  // Basic Info
  title: string;
  description: string;
  category: string;
  customCategory: string;
  
  // Guide Info
  guideAvatar: string;
  guideName: string;
  
  // Tour Details
  duration: number; // in minutes
  maxGroupSize: number;
  pricePerPerson: number;
  
  // Location
  meetingPoint: {
    name: string;
    address: string;
    instructions: string;
  };
  
  // Content
  coverImage: string;
  highlights: string[];
  included: string[];
  tags: string[];
  
  // Settings
  difficulty: 'easy' | 'moderate' | 'challenging';
  languages: string[];
  instantConfirm: boolean;
}

const tourCategories = [
  'City Tour',
  'Food Tour', 
  'History Tour',
  'Art Tour',
  'Adventure',
  'Nature Tour',
  'Cultural Experience',
  'Walking Tour',
  'Photography Tour',
  'Custom'
];

const GuidedTourTemplateEditor: React.FC<GuidedTourTemplateEditorProps> = ({
  isVisible,
  onClose,
  onSave,
  initialData
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TourFormData>({
    title: initialData?.title || 'City Highlights Walking Tour',
    description: initialData?.description || 'Discover the most iconic landmarks and hidden gems of the city with a local expert guide.',
    category: initialData?.category || 'City Tour',
    customCategory: initialData?.customCategory || '',
    guideAvatar: initialData?.guideAvatar || '',
    guideName: initialData?.guideName || user?.displayName || 'Guide',
    duration: initialData?.duration || 180, // 3 hours
    maxGroupSize: initialData?.maxGroupSize || 8,
    pricePerPerson: initialData?.pricePerPerson || 45,
    meetingPoint: initialData?.meetingPoint || {
      name: '',
      address: '',
      instructions: ''
    },
    coverImage: initialData?.coverImage || 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop',
    highlights: initialData?.highlights || ['Historic landmarks', 'Local stories', 'Photo opportunities'],
    included: initialData?.included || ['Professional guide', 'Walking tour', 'Local recommendations'],
    tags: initialData?.tags || ['walking', 'history', 'culture'],
    difficulty: initialData?.difficulty || 'easy',
    languages: initialData?.languages || ['English'],
    instantConfirm: initialData?.instantConfirm || true
  });

  const [newTag, setNewTag] = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [newIncluded, setNewIncluded] = useState('');

  if (!isVisible) return null;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (type === 'cover') {
          setFormData(prev => ({ ...prev, coverImage: result }));
        } else {
          setFormData(prev => ({ ...prev, guideAvatar: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, newHighlight.trim()]
      }));
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const addIncluded = () => {
    if (newIncluded.trim()) {
      setFormData(prev => ({
        ...prev,
        included: [...prev.included, newIncluded.trim()]
      }));
      setNewIncluded('');
    }
  };

  const removeIncluded = (index: number) => {
    setFormData(prev => ({
      ...prev,
      included: prev.included.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
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
            overflow: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 10
          }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Create Guided Tour
            </h2>
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

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {/* Live Preview Card */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Live Preview
              </h3>
              
              {/* Tour Card Preview */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '400px'
              }}>
                {/* Cover Image */}
                <div 
                  style={{
                    height: '200px',
                    backgroundImage: `url(${formData.coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))'
                  }} />
                  
                  {/* Guide Avatar */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#28a745',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundImage: formData.guideAvatar ? `url(${formData.guideAvatar})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        avatarInputRef.current?.click();
                      }}
                    >
                      {!formData.guideAvatar && (formData.guideName.charAt(0) || 'G')}
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
                    {formData.category === 'Custom' ? formData.customCategory : formData.category}
                  </div>

                  {/* Title */}
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
                      {formData.title}
                    </h3>
                  </div>

                  {/* Upload overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    opacity: 0.8
                  }}>
                    <FaCamera style={{ marginRight: '4px' }} />
                    Click to upload image
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '16px' }}>
                  {/* Rating and Duration */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        backgroundColor: '#ffc107',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        ⭐ New
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaClock size={12} color="#666" />
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {formatDuration(formData.duration)}
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
                    {formData.description}
                  </p>

                  {/* Tags */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {formData.tags.slice(0, 3).map((tag, index) => (
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
                          #{tag}
                        </span>
                      ))}
                      {formData.tags.length > 3 && (
                        <span style={{ fontSize: '11px', color: '#666' }}>
                          +{formData.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

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
                        ${formData.pricePerPerson}
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
                        {formData.category === 'Custom' ? formData.customCategory.toUpperCase() : formData.category.toUpperCase()}
                      </span>
                      {formData.instantConfirm && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left Column */}
              <div>
                {/* Basic Information */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                    Basic Information
                  </h4>
                  
                  {/* Title */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Tour Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., City Highlights Walking Tour"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {tourCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Category */}
                  {formData.category === 'Custom' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                        Custom Category *
                      </label>
                      <input
                        type="text"
                        value={formData.customCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                        placeholder="Enter custom category"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your tour experience..."
                      rows={4}
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
                </div>

                {/* Tour Details */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                    Tour Details
                  </h4>
                  
                  {/* Duration */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Duration (hours) *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaClock color="#666" />
                      <input
                        type="number"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={formData.duration / 60}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: parseFloat(e.target.value) * 60 }))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        ({formatDuration(formData.duration)})
                      </span>
                    </div>
                  </div>

                  {/* Price Per Person */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Price Per Person (USD) *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaDollarSign color="#28a745" />
                      <input
                        type="number"
                        min="1"
                        value={formData.pricePerPerson}
                        onChange={(e) => setFormData(prev => ({ ...prev, pricePerPerson: parseInt(e.target.value) }))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Max Group Size */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Maximum Group Size *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaUsers color="#666" />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.maxGroupSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxGroupSize: parseInt(e.target.value) }))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Tags */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                    Tags & Highlights
                  </h4>
                  
                  {/* Tags */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Tags (for search and categorization)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag (e.g., walking, history)"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={addTag}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#007aff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#f8f9fa',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        >
                          #{tag}
                          <button
                            onClick={() => removeTag(tag)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666'
                            }}
                          >
                            <FaTimes size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Highlights */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Tour Highlights
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={newHighlight}
                        onChange={(e) => setNewHighlight(e.target.value)}
                        placeholder="Add a highlight"
                        onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={addHighlight}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {formData.highlights.map((highlight, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#f8f9fa',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <span>{highlight}</span>
                          <button
                            onClick={() => removeHighlight(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc3545'
                            }}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What's Included */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      What's Included
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={newIncluded}
                        onChange={(e) => setNewIncluded(e.target.value)}
                        placeholder="Add what's included"
                        onKeyPress={(e) => e.key === 'Enter' && addIncluded()}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={addIncluded}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {formData.included.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#f8f9fa',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <span>{item}</span>
                          <button
                            onClick={() => removeIncluded(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc3545'
                            }}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                    Settings
                  </h4>
                  
                  {/* Instant Confirmation */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.instantConfirm}
                        onChange={(e) => setFormData(prev => ({ ...prev, instantConfirm: e.target.checked }))}
                      />
                      <span style={{ fontSize: '14px' }}>Enable instant confirmation</span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 24px' }}>
                      Bookings will be automatically confirmed without manual approval
                    </p>
                  </div>

                  {/* Difficulty */}
                  <div style={{ marginBottom: '16px' }}>
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
              </div>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, 'cover')}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, 'avatar')}
            />

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '24px',
              borderTop: '1px solid #eee'
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
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Create Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedTourTemplateEditor;
