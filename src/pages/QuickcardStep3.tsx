import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';

const QuickcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentVostcard,
    updateVostcard,
    saveQuickcard,
    clearVostcard,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  
  // Quickcard validation (simpler than regular vostcards)
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '',
    hasCategories: (categories?.length || 0) > 0,
    hasPhotos: (photos?.length || 0) >= 1,  // Quickcards only need 1 photo
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setAuthStatus(`Signed in as ${currentUser.email}`);
      } else {
        setAuthStatus('Not signed in');
      }
    };
    
    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, []);

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      updateVostcard({ categories: categories.filter((c) => c !== category) });
    } else {
      updateVostcard({ categories: [...categories, category] });
    }
  };

  const handleSaveQuickcard = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to save your quickcard.");
      navigate('/login');
      return;
    }
    
    // Show success message immediately
    alert('Your Quickcard has been saved and is available in your Quickcards list.');
    
    // Navigate to quickcards list
    navigate('/quickcards');
    
    try {
      console.log('💾 Starting quickcard save process...');
      
      // Save the quickcard privately
      await saveQuickcard();
      
      // Clear the current vostcard state
      clearVostcard();
      
      console.log('✅ Quickcard saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving quickcard:', error);
      // Don't show error alert since user is already redirected
    }
  };

  const isSaveEnabled =
    validationState.hasTitle &&
    validationState.hasDescription &&
    validationState.hasCategories &&
    validationState.hasPhotos;

  // Create specific missing items list
  const missingItems = [];
  if (!validationState.hasTitle) missingItems.push('Title');
  if (!validationState.hasDescription) missingItems.push('Description');
  if (!validationState.hasCategories) missingItems.push('Categories');
  if (!validationState.hasPhotos) missingItems.push('Photo');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 70,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        color: 'white',
        flexShrink: 0,
        position: 'relative'
      }}>
        <button
          onClick={() => navigate('/quickcard-camera')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '5px'
          }}
        >
          <FaArrowLeft />
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          Complete Quickcard
        </h1>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '5px'
          }}
        >
          <FaHome />
        </button>
      </div>

      {/* Auth Status */}
      <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          {authStatus}
        </p>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        paddingBottom: '120px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Title {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            style={{
              ...inputStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
            placeholder="Enter quickcard title"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Description {validationState.hasDescription && <span style={{color: 'green'}}>✅</span>}
          </label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            style={{
              ...textareaStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
            placeholder="Describe your quickcard"
          />
        </div>

        <div>
          <label style={labelStyle}>
            Categories {validationState.hasCategories && <span style={{color: 'green'}}>✅</span>}
          </label>
          <div
            onClick={() => setIsCategoryModalOpen(true)}
            style={{
              ...categorySelectStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
          >
            Select Categories
          </div>

          {categories.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {categories.map((cat) => (
                <div key={cat} style={{ 
                  backgroundColor: '#eee', 
                  padding: '6px 10px', 
                  borderRadius: 6, 
                  marginBottom: 4,
                  touchAction: 'manipulation',
                  fontSize: '18px'
                }}>
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photo Preview */}
        {photos.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <label style={labelStyle}>
              Photo {validationState.hasPhotos && <span style={{color: 'green'}}>✅</span>}
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {photos.map((photo, index) => (
                <div key={index} style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundImage: `url(${photo instanceof File ? URL.createObjectURL(photo) : photo})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 16,
        borderTop: '1px solid #e0e0e0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 100,
        touchAction: 'manipulation'
      }}>
        {!isSaveEnabled && (
          <div style={missingTextStyle}>
            Missing: {missingItems.join(', ')}
          </div>
        )}

        <button
          onClick={handleSaveQuickcard}
          disabled={!isSaveEnabled}
          style={{
            ...saveButtonStyle,
            backgroundColor: isSaveEnabled ? '#002B4D' : '#aaa',
            touchAction: 'manipulation'
          }}
        >
          Save Quickcard
        </button>
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Select Categories</h3>
            {availableCategories.map((cat) => (
              <div
                key={cat}
                style={categoryItemStyle}
                onClick={() => handleCategoryToggle(cat)}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  readOnly
                />
                <span style={{ marginLeft: 8 }}>{cat}</span>
              </div>
            ))}
            <button
              style={doneButtonStyle}
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 4
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  marginBottom: 16
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 100
};

const categorySelectStyle: React.CSSProperties = {
  backgroundColor: '#eee',
  padding: '12px',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 8
};

const saveButtonStyle: React.CSSProperties = {
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer'
};

const missingTextStyle: React.CSSProperties = {
  color: 'orange',
  marginBottom: 8,
  textAlign: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 998,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 12,
  width: '80%',
  maxWidth: 400,
  position: 'relative',
  zIndex: 999
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer'
};

const doneButtonStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
  width: '100%',
  marginTop: 10
};

export default QuickcardStep3; 