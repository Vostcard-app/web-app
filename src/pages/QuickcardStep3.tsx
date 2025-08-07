import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';


const QuickcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentVostcard,
    updateVostcard,
    saveQuickcard,
    postQuickcard, // Add this import
    clearVostcard,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [], photoURLs = [], _firebasePhotoURLs = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');

  const [isSaving, setIsSaving] = useState(false);
  

  
  const availableCategories = [
    'None',
    'View',
    'Landmark',
    'Fun Fact',
    'Macabre',
    'Architecture',
    'Historical',
    'Museum',
    'Gallery',
    'Restaurant',
    'Nature',
    'Park',
    'Drive Mode Event',
    'Wish you were here',
    'Made for kids',
  ];
  
  // Quickcard validation (only title required now)
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '', // Not required but tracked
    hasCategories: (categories?.length || 0) > 0, // Not required but tracked
    hasPhotos: (photos?.length || 0) >= 1 || (photoURLs?.length || 0) >= 1 || (_firebasePhotoURLs?.length || 0) >= 1,  // Check all photo sources
  };

  // Check if quickcard is ready for posting (title, description, category required)
  const isReadyForMapPosting = validationState.hasTitle && 
    validationState.hasDescription && 
    validationState.hasCategories && 
    validationState.hasPhotos;

  // Personal posts only need title
  const isReadyForPersonalSave = validationState.hasTitle && validationState.hasPhotos;

  // Create specific missing items list for map posting
  const missingMapItems: string[] = [];
  if (!validationState.hasTitle) missingMapItems.push('Title');
  if (!validationState.hasDescription) missingMapItems.push('Description'); 
  if (!validationState.hasCategories) missingMapItems.push('Categories');
  if (!validationState.hasPhotos) missingMapItems.push('Photos (need at least 1)');

  console.log('🔍 Quickcard Step 3 Validation State:', {
    title: title,
    titleValid: validationState.hasTitle,
    description: description,
    descriptionValid: validationState.hasDescription,
    categories: categories,
    categoriesValid: validationState.hasCategories,
    photosCount: photos.length,
    photoURLsCount: photoURLs.length,
    firebasePhotoURLsCount: _firebasePhotoURLs.length,
    photosValid: validationState.hasPhotos,
    isQuickcard: true,
    isReadyForMapPosting
  });

  // Check Firebase Auth
  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      if (user) {
        setAuthStatus(`✅ Authenticated: ${user.email}`);
      } else {
        setAuthStatus('❌ Not authenticated');
      }
    };

    checkAuth();
    
    // Listen for auth state changes
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





  const handleSavePrivately = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to save your quickcard.");
      navigate('/login');
      return;
    }
    
    // ✅ Set saving state and provide immediate feedback
    setIsSaving(true);
    
    // ✅ Show immediate success message and navigate to home
    alert('✅ Saving your Quickcard...\n\nReturning to home screen.');
    
    // ✅ Navigate to home immediately
    console.log('🔄 Navigating to home while saving in background...');
    navigate('/home');
    
    // 🔄 Handle saving in background
    try {
      console.log('💾 Background: Starting quickcard private save...');
      
      // Save the quickcard privately
      await saveQuickcard();
      
      // Clear the current vostcard state
      clearVostcard();
      
      console.log('✅ Background: Quickcard saved successfully');
      
    } catch (error) {
      console.error('❌ Background error saving quickcard:', error);
      // Silent error - user already navigated away
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostToMap = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to post your quickcard.");
      navigate('/login');
      return;
    }
    
    if (!isReadyForMapPosting) {
      alert(`Please complete the following before posting: ${missingMapItems.join(', ')}`);
      return;
    }
    
    // Show success message (matches vostcard posting)
    alert('Your Quickcard will appear on the map in a minute or two.');
    
    // Navigate to home with proper state (matches vostcard posting pattern)
    navigate('/home', { 
      state: { 
        freshLoad: true,
        timestamp: Date.now(),
        justPosted: 'quickcard'
      }
    });
    
    try {
      console.log('📍 Starting quickcard post to map...');
      
      // Post the quickcard to the public map in background
      await postQuickcard();
      
      // Clear the current vostcard state (matches vostcard posting)
      clearVostcard();
      
      console.log('✅ Quickcard posted successfully');
      
    } catch (error) {
      console.error('❌ Error posting quickcard:', error);
      // Don't show error alert since user is already on home screen
      // Could implement a more subtle error notification if needed
    }
  };



  return (
    <div style={{ 
      backgroundColor: 'white', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      
      {/* 🔵 Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        touchAction: 'manipulation',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}>
          Vōstcard
        </div>
        <FaArrowLeft
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
      </div>

      {/* 📝 Form */}
      <div style={{ 
        padding: 16, 
        flex: 1, 
        overflowY: 'auto',
        paddingBottom: 180, // Increased space for two buttons
        touchAction: 'manipulation',
        marginTop: '80px', // Account for fixed header
      }}>
        <div>
          <label style={labelStyle}>
            Title* {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            placeholder="Enter Title (Required)"
            style={{
              ...inputStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%',
              borderColor: validationState.hasTitle ? '#002B4D' : '#ff6b6b'
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Description (Required for Map) {validationState.hasDescription && <span style={{color: 'green'}}>✅</span>}
          </label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            placeholder="Enter Description (Required for Map posting)"
            rows={4}
            style={{
              ...textareaStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%',
              borderColor: validationState.hasDescription ? '#002B4D' : '#ccc' // Use normal border color instead of red
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Categories* (Required for Map) {validationState.hasCategories && <span style={{color: 'green'}}>✅</span>}
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



      </div>

      {/* 🔘 Fixed Bottom Buttons */}
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
        {!isReadyForMapPosting && (
          <div style={missingTextStyle}>
            Missing for map posting: {missingMapItems.join(', ')}
          </div>
        )}



        {/* Save to Personal Posts Button */}
        <button
          onClick={handleSavePrivately}
          disabled={!isReadyForPersonalSave || isSaving}
          style={{
            ...saveButtonStyle,
            backgroundColor: isSaving ? '#28a745' : (isReadyForPersonalSave ? '#002B4D' : '#aaa'),
            cursor: (isSaving || !isReadyForPersonalSave) ? 'not-allowed' : 'pointer',
            touchAction: 'manipulation'
          }}
        >
          {isSaving ? '✅ Saving...' : 'Save to Personal Posts'}
        </button>

        {/* Post to Map (Public Posts) Button */}
        <button
          onClick={handlePostToMap}
          disabled={!isReadyForMapPosting}
          style={{
            ...postButtonStyle,
            backgroundColor: isReadyForMapPosting ? '#28a745' : '#aaa', // Green when ready
            cursor: isReadyForMapPosting ? 'pointer' : 'not-allowed',
            touchAction: 'manipulation'
          }}
        >
          Post to Map (Public)
        </button>
      </div>

      {/* ✅ Category Modal */}
      {isCategoryModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Select Categories</h3>
            <div style={categoryGridStyle}>
              <div
                style={{
                  ...categoryGridItemStyle,
                  backgroundColor: categories.length > 0 ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: categories.length > 0 ? '2px solid #28a745' : '2px solid #6c757d',
                  fontWeight: 'bold',
                  opacity: categories.length > 0 ? 1 : 0.7,
                  cursor: categories.length > 0 ? 'pointer' : 'not-allowed'
                }}
                onClick={() => {
                  if (categories.length > 0) {
                    setIsCategoryModalOpen(false);
                  }
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                  Done {categories.length > 0 && `(${categories.length})`}
                </span>
              </div>
              {availableCategories.map((cat) => (
                <div
                  key={cat}
                  style={{
                    ...categoryGridItemStyle,
                    backgroundColor: categories.includes(cat) ? '#07345c' : '#f8f9fa',
                    color: categories.includes(cat) ? 'white' : '#333',
                    border: categories.includes(cat) ? '2px solid #07345c' : '2px solid #e9ecef'
                  }}
                  onClick={() => handleCategoryToggle(cat)}
                >
                  <span style={{ fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>{cat}</span>
                </div>
              ))}
            </div>
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
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer',
  marginBottom: 10
};

const postButtonStyle: React.CSSProperties = {
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
  marginTop: 8,
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
  width: '90%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflowY: 'auto',
  position: 'relative',
  zIndex: 999
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer',
};

const categoryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '8px',
  marginBottom: '20px'
};

const categoryGridItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 8px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  minHeight: '44px',
  textAlign: 'center'
};

const doneButtonStyle: React.CSSProperties = {
  marginTop: 20,
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
};

export default QuickcardStep3; 