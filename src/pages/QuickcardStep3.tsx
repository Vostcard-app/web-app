import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft, FaMicrophone } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';

const QuickcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentVostcard,
    updateVostcard,
    saveQuickcard,
    postQuickcard, // Add this import
    clearVostcard,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  
  // Audio state (managed by QuickAudio screen)
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const availableCategories = [
    'None',
    'Landmark',
    'Fun Fact',
    'Macabre',
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

  // Check if quickcard is ready for posting (all validation must pass)
  const isReadyForPosting = validationState.hasTitle && 
    validationState.hasDescription && 
    validationState.hasCategories && 
    validationState.hasPhotos;

  // Create specific missing items list
  const missingItems: string[] = [];
  if (!validationState.hasTitle) missingItems.push('Title');
  if (!validationState.hasDescription) missingItems.push('Description');
  if (!validationState.hasCategories) missingItems.push('Categories');
  if (!validationState.hasPhotos) missingItems.push('Photos (need at least 1)');

  console.log('🔍 Quickcard Step 3 Validation State:', {
    title: title,
    titleValid: validationState.hasTitle,
    description: description,
    descriptionValid: validationState.hasDescription,
    categories: categories,
    categoriesValid: validationState.hasCategories,
    photosCount: photos.length,
    photosValid: validationState.hasPhotos,
    isQuickcard: true,
    isReadyForPosting
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

  // Initialize audio state from current vostcard
  useEffect(() => {
    const vostcardWithAudio = currentVostcard as any;
    if (vostcardWithAudio?.audio && vostcardWithAudio.audio instanceof Blob) {
      setAudioBlob(vostcardWithAudio.audio);
      // We don't have the original recording time, so just set it to 0
      setRecordingTime(0);
    }
  }, [currentVostcard]);

  // Handle returned audio from QuickAudio screen
  useEffect(() => {
    const state = location.state as any;
    if (state?.audioBlob) {
      console.log('📱 Received audio from QuickAudio:', {
        size: state.audioBlob.size,
        duration: state.recordingTime || 0
      });
      
      setAudioBlob(state.audioBlob);
      setRecordingTime(state.recordingTime || 0);
      
      // Save audio to vostcard context
      updateVostcard({ 
        audio: state.audioBlob, 
        hasAudio: true 
      } as any);
      
      // Clear the navigation state to prevent re-processing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state, updateVostcard]);

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
    
    try {
      console.log('💾 Starting quickcard private save...');
      
      // Save the quickcard privately
      await saveQuickcard();
      
      // Show success message
      alert('Your Quickcard has been saved privately and is available in your Quickcards list.');
      
      // Navigate to quickcards list
      navigate('/quickcards');
      
    } catch (error) {
      console.error('❌ Error saving quickcard privately:', error);
      alert('Failed to save quickcard. Please try again.');
    }
  };

  const handlePostToMap = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please sign in to post your quickcard.");
      navigate('/login');
      return;
    }
    
    if (!isReadyForPosting) {
      alert(`Please complete the following before posting: ${missingItems.join(', ')}`);
      return;
    }
    
    try {
      console.log('📍 Starting quickcard post to map...');
      
      // Post the quickcard to the public map
      await postQuickcard();
      
      // Show success message
      alert('🎉 Quickcard posted successfully! It will appear on the map for everyone to see.');
      
      // Navigate to home to see it on the map
      navigate('/home', { state: { freshLoad: true } });
      
    } catch (error) {
      console.error('❌ Error posting quickcard:', error);
      alert('Failed to post quickcard. Please try again.');
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    
    // Clear audio from vostcard context
    updateVostcard({ 
      audio: null, 
      hasAudio: false 
    } as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        position: 'relative',
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
        touchAction: 'manipulation'
      }}>
        <div>
          <label style={labelStyle}>
            Title {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            placeholder="Enter Title"
            style={{
              ...inputStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Description {validationState.hasDescription && <span style={{color: 'green'}}>✅</span>}
          </label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            placeholder="Enter Description"
            rows={4}
            style={{
              ...textareaStyle,
              touchAction: 'manipulation',
              fontSize: '18px',
              WebkitTextSizeAdjust: '100%'
            }}
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

        {/* 🎤 Optional Audio Recording */}
        <div style={{ marginTop: 20 }}>

          {/* Audio Status */}
          <div style={{
            backgroundColor: audioBlob ? '#4caf50' : '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '10px',
            textAlign: 'center',
            border: '1px solid #ddd'
          }}>
            {audioBlob ? (
              <div>
                <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  ✅ Audio Recording Ready
                </div>
                <div style={{ fontSize: '14px' }}>
                  Duration: {formatTime(recordingTime)}
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>
                Optional: Record audio to enhance your quickcard
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: audioBlob ? '1fr 1fr' : '1fr',
            gap: '10px'
          }}>
            <button 
              onClick={() => {
                console.log('🎤 Audio button clicked');
                navigate('/quick-audio');
              }}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                padding: '12px 8px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                touchAction: 'manipulation'
              }}
            >
              <>
                <FaMicrophone size={16} />
                {audioBlob ? 'Change Audio' : 'Add Audio'}
              </>
            </button>
            
            {audioBlob && (
              <button 
                onClick={clearRecording}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 8px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                Clear Audio
              </button>
            )}
          </div>
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
        {!isReadyForPosting && (
          <div style={missingTextStyle}>
            Missing: {missingItems.join(', ')}
          </div>
        )}

        {/* Save Privately Button */}
        <button
          onClick={handleSavePrivately}
          style={{
            ...saveButtonStyle,
            backgroundColor: '#002B4D', // Always enabled for private save
            touchAction: 'manipulation'
          }}
        >
          Save Privately
        </button>

        {/* Post to Map Button */}
        <button
          onClick={handlePostToMap}
          disabled={!isReadyForPosting}
          style={{
            ...postButtonStyle,
            backgroundColor: isReadyForPosting ? '#28a745' : '#aaa', // Green when ready
            touchAction: 'manipulation'
          }}
        >
          Post to Map
        </button>
      </div>

      {/* ✅ Category Modal */}
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
  width: '80%',
  maxWidth: 400,
  position: 'relative',
  zIndex: 999
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer',
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