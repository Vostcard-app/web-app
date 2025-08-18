import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaCamera, FaImage, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { useVostcardEdit } from '../context/VostcardEditContext';
import PhotoOptionsModal from '../components/PhotoOptionsModal';
import { TEMP_UNIFIED_VOSTCARD_FLOW } from '../utils/flags';
import { AVAILABLE_CATEGORIES } from '../types/VostcardTypes';
import type { Vostcard } from '../types/VostcardTypes';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { currentVostcard, setCurrentVostcard, saveLocalVostcard, postVostcard } = useVostcard();
  const { editVostcard } = useVostcardEdit();

  // State for vostcard data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing vostcard data if editing
  useEffect(() => {
    if (currentVostcard && title === '' && description === '') {
      console.log('📱 Loading vostcard data from context:', currentVostcard);
      
      // Populate fields from context
      setTitle(currentVostcard.title || '');
      setDescription(currentVostcard.description || '');
      setCategories(currentVostcard.categories || []);
      
      // Handle photos
      if (currentVostcard.photos && currentVostcard.photos.length > 0) {
        setPhotos(currentVostcard.photos);
        // Create preview URLs for the photos
        const previews = currentVostcard.photos.map((photo: any) => {
          if (photo && (photo instanceof File || photo instanceof Blob)) {
            return URL.createObjectURL(photo);
          }
          return '';
        });
        setPhotoPreviews(previews);
      }
      
      // Handle location
      if (currentVostcard.geo) {
        setLocation(currentVostcard.geo);
      }
    }
  }, [currentVostcard, title, description]);

  // Handle photo selection
  const handlePhotoSelect = useCallback((newPhotos: Blob[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Create preview URLs
    const newPreviews = newPhotos.map(photo => URL.createObjectURL(photo));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  // Handle photo removal
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      prev[index] && URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  }, []);

  // Handle location selection
  const handleLocationSelect = () => {
    navigate('/pin-placer', {
      state: {
        returnTo: '/studio',
        title: title || 'New Vostcard',
        pinData: {
          id: 'temp_vostcard',
          title: title || 'New Vostcard',
          description: 'Vostcard location',
          latitude: location?.latitude || 40.7128,
          longitude: location?.longitude || -74.0060,
          isOffer: false,
          type: 'vostcard'
        }
      }
    });
  };

  // Handle saving to personal posts
  const handleSaveToPersonalPosts = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your vostcard.');
      return;
    }
    
    if (photos.length < 2) {
      alert('Please add at least 2 photos to your vostcard.');
      return;
    }
    
    if (!location) {
      alert('Please select a location for your vostcard.');
      return;
    }

    try {
      const vostcard: Vostcard = {
        id: currentVostcard?.id || crypto.randomUUID(),
        title,
        description,
        photos,
        categories,
        geo: location,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'private',
        video: null,
        type: 'vostcard',
        hasVideo: false,
        hasPhotos: photos.length > 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentVostcard(vostcard);
      await saveLocalVostcard();
      
      navigate('/home');
    } catch (error) {
      console.error('Error saving vostcard:', error);
      alert('Failed to save vostcard. Please try again.');
    }
  };

  // Handle posting to map
  const handlePostToMap = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your vostcard.');
      return;
    }
    
    if (photos.length < 2) {
      alert('Please add at least 2 photos to your vostcard.');
      return;
    }
    
    if (!location) {
      alert('Please select a location for your vostcard.');
      return;
    }

    try {
      console.log('Creating vostcard for posting to map...');
      const vostcard: Vostcard = {
        id: currentVostcard?.id || crypto.randomUUID(),
        title,
        description,
        photos,
        categories,
        geo: location,
        username: user?.displayName || user?.email || 'Unknown User',
        userID: user?.uid || '',
        userRole: userRole || 'user',
        state: 'posted',
        video: null,
        type: 'vostcard',
        hasVideo: false,
        hasPhotos: photos.length > 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Setting current vostcard:', vostcard);
      setCurrentVostcard(vostcard);
      console.log('Posting vostcard...');
      await postVostcard();
      
      navigate('/home');
    } catch (error) {
      console.error('Error posting vostcard:', error);
      alert('Failed to post vostcard. Please try again.');
    }
  };

  // Handle canceling creation
  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setPhotos([]);
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews([]);
    setLocation(null);
    navigate('/home');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        padding: '20px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          {currentVostcard ? 'Edit Vostcard' : 'Create Vostcard'}
        </h1>
        <button
          onClick={handleCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <FaTimes size={24} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px' }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter title"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter description"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minHeight: '100px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Photos</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '10px'
          }}>
            {photoPreviews.map((preview, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={() => handleRemovePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
            {photos.length < 10 && (
              <button
                onClick={() => handlePhotoSelect([/* photo blobs */])}
                style={{
                  aspectRatio: '1',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                <FaCamera size={24} color="#999" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Categories</h2>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {AVAILABLE_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setCategories(prev =>
                  prev.includes(category)
                    ? prev.filter(c => c !== category)
                    : [...prev, category]
                )}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  backgroundColor: categories.includes(category) ? '#07345c' : 'white',
                  color: categories.includes(category) ? 'white' : '#333',
                  cursor: 'pointer'
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Location</h2>
          <button
            onClick={handleLocationSelect}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            {location
              ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
              : 'Select location'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '20px'
        }}>
          <button
            onClick={handleSaveToPersonalPosts}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Save to Personal Posts
          </button>
          <button
            onClick={handlePostToMap}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Post to Map
          </button>
        </div>
      </div>

      {/* Photo Options Modal */}
      <PhotoOptionsModal
        isOpen={false}
        onClose={() => {}}
        onTakePhoto={() => {}}
        currentPhotoCount={photos.length}
      />
    </div>
  );
};

export default VostcardStudioView;
