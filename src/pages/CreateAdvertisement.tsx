import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCamera, FaMapMarkerAlt, FaTag } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';

const CreateAdvertisement: React.FC = () => {
  const navigate = useNavigate();
  const { currentVostcard, updateVostcard, saveLocalVostcard, postVostcard, clearVostcard } = useVostcard();
  const { userRole } = useAuth();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [customCategory, setCustomCategory] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCategories = ['Restaurant', 'Retail', 'Entertainment', 'Services', 'Events', 'Promotions'];

  // Check if user is an advertiser
  if (userRole !== 'Advertiser') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Only advertisers can access this page.</p>
        <button onClick={() => navigate('/home')}>Go to Home</button>
      </div>
    );
  }

  const handleCategoryToggle = (category: string) => {
    const updatedCategories = categories.includes(category)
      ? categories.filter(c => c !== category)
      : [...categories, category];
    updateVostcard({ categories: updatedCategories });
  };

  const handleCustomCategoryAdd = () => {
    if (customCategory.trim() && !categories.includes(customCategory.trim())) {
      updateVostcard({ categories: [...categories, customCategory.trim()] });
      setCustomCategory('');
      setIsCategoryModalOpen(false);
    }
  };

  const handlePostAdvertisement = async () => {
    if (!currentVostcard?.title || !currentVostcard?.description || currentVostcard.categories.length === 0) {
      alert('Please fill in title, description, and select at least one category.');
      return;
    }

    if (!currentVostcard.geo) {
      alert('Location is required for advertisements. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await postVostcard();
      alert('🎉 Advertisement posted successfully!');
      navigate('/advertiser-portal');
    } catch (error) {
      console.error('Error posting advertisement:', error);
      alert('Failed to post advertisement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <FaArrowLeft
          size={24}
          onClick={() => navigate('/advertiser-portal')}
          style={{ cursor: 'pointer' }}
        />
        <h1 style={{ margin: 0, fontSize: '24px' }}>Create Advertisement</h1>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Title Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Advertisement Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            placeholder="Enter your advertisement title"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Description Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            placeholder="Describe your advertisement, special offers, or promotions"
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Categories * (Select at least one)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            marginBottom: '10px'
          }}>
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                style={{
                  padding: '8px 12px',
                  border: categories.includes(category) ? '2px solid #002B4D' : '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: categories.includes(category) ? '#002B4D' : 'white',
                  color: categories.includes(category) ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {category}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            style={{
              padding: '8px 12px',
              border: '1px solid #002B4D',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#002B4D',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <FaTag style={{ marginRight: '5px' }} />
            Add Custom Category
          </button>
        </div>

        {/* Custom Category Modal */}
        {isCategoryModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '400px'
            }}>
              <h3>Add Custom Category</h3>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCustomCategoryAdd}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#002B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setCustomCategory('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Categories Display */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Selected Categories:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((category) => (
                <span
                  key={category}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#002B4D',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location Status */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Location Status
          </label>
          <div style={{
            padding: '12px',
            backgroundColor: currentVostcard?.geo ? '#d4edda' : '#f8d7da',
            border: `1px solid ${currentVostcard?.geo ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '8px',
            color: currentVostcard?.geo ? '#155724' : '#721c24'
          }}>
            <FaMapMarkerAlt style={{ marginRight: '8px' }} />
            {currentVostcard?.geo 
              ? 'Location captured successfully' 
              : 'Location not captured. Please record a video to capture location.'
            }
          </div>
        </div>

        {/* Photos Status */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Photos ({photos.length}/2)
          </label>
          <div style={{
            padding: '12px',
            backgroundColor: photos.length >= 2 ? '#d4edda' : '#fff3cd',
            border: `1px solid ${photos.length >= 2 ? '#c3e6cb' : '#ffeaa7'}`,
            borderRadius: '8px',
            color: photos.length >= 2 ? '#155724' : '#856404'
          }}>
            <FaCamera style={{ marginRight: '8px' }} />
            {photos.length >= 2 
              ? 'Photos added successfully' 
              : `${photos.length} photo(s) added. Add ${2 - photos.length} more photo(s).`
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button
            onClick={() => navigate('/advertiser-portal')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handlePostAdvertisement}
            disabled={isSubmitting || !currentVostcard?.title || !currentVostcard?.description || currentVostcard.categories.length === 0 || !currentVostcard.geo}
            style={{
              padding: '12px 24px',
              backgroundColor: isSubmitting || !currentVostcard?.title || !currentVostcard?.description || currentVostcard.categories.length === 0 || !currentVostcard.geo ? '#ccc' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting || !currentVostcard?.title || !currentVostcard?.description || currentVostcard.categories.length === 0 || !currentVostcard.geo ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              flex: 1
            }}
          >
            {isSubmitting ? 'Posting...' : 'Post Advertisement'}
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#002B4D' }}>How to Create an Advertisement:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#333' }}>
            <li>Record a video to capture location and create your advertisement</li>
            <li>Add photos to showcase your business or promotion</li>
            <li>Fill in the title and description above</li>
            <li>Select relevant categories</li>
            <li>Click "Post Advertisement" to publish</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CreateAdvertisement; 