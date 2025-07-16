import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { KenBurnsControls, KenBurnsCanvas } from '../components/KenBurns';

const CreateVostcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentVostcard,
    updateVostcard,
    saveLocalVostcard,
    loadLocalVostcard,
    clearLocalStorage,
    postVostcard,
    clearVostcard,
    updateScriptTitle,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  
  // Ken Burns effect state
  const [kenBurnsEnabled, setKenBurnsEnabled] = useState(false);
  const [kenBurnsProcessing, setKenBurnsProcessing] = useState(false);
  const [kenBurnsProgress, setKenBurnsProgress] = useState(0);
  const [kenBurnsResult, setKenBurnsResult] = useState<Blob | null>(null);
  const [kenBurnsError, setKenBurnsError] = useState<string | null>(null);
  const [kenBurnsUrls, setKenBurnsUrls] = useState<{ videoUrl: string; photoUrls: string[] } | null>(null);

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
    'Drive Mode Event',
  'Wish you were here',
  'Made for kids',]
  
  // Debug validation state
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '',
    hasCategories: (categories?.length || 0) > 0,
    hasPhotos: (photos?.length || 0) > 0,  // Changed from >= 2 to > 0
    hasVideo: !!currentVostcard?.video,
    hasGeo: !!currentVostcard?.geo
  };

  console.log('🔍 Step 3 Validation State:', {
    title: title,
    titleValid: validationState.hasTitle,
    description: description,
    descriptionValid: validationState.hasDescription,
    categories: categories,
    categoriesValid: validationState.hasCategories,
    photosCount: photos.length,
    photosValid: validationState.hasPhotos,
    video: !!currentVostcard?.video,
    geo: !!currentVostcard?.geo
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

  // Cleanup Ken Burns URLs on unmount
  useEffect(() => {
    return () => {
      if (kenBurnsUrls) {
        URL.revokeObjectURL(kenBurnsUrls.videoUrl);
        kenBurnsUrls.photoUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };
  }, [kenBurnsUrls]);

  // Test Firebase Storage upload
  const testStorageUpload = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in first');
      return;
    }

    try {
      console.log('🧪 Testing Firebase Storage upload...');
      
      // Create a simple test file
      const testContent = 'This is a test file for Firebase Storage';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      
      // Upload to a simple path
      const testRef = ref(storage, `test/${user.uid}/test.txt`);
      console.log('📤 Uploading test file...');
      
      const snapshot = await uploadBytes(testRef, testBlob);
      console.log('✅ Test file uploaded successfully!');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Test file URL:', downloadURL);
      
      alert('✅ Firebase Storage test successful! Check console for details.');
    } catch (error) {
      console.error('❌ Firebase Storage test failed:', error);
      alert(`❌ Firebase Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      updateVostcard({ categories: categories.filter((c) => c !== category) });
    } else {
      updateVostcard({ categories: [...categories, category] });
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    // Update the vostcard title
    updateVostcard({ title: newTitle });
    
    // If there's an associated script, update its title too
    if (currentVostcard?.scriptId && newTitle.trim() !== '') {
      try {
        await updateScriptTitle(currentVostcard.scriptId, newTitle);
        console.log('✅ Script title updated to match vostcard title:', newTitle);
      } catch (error) {
        console.error('❌ Failed to update script title:', error);
        // Don't show an alert here as it might be disruptive to the user experience
      }
    }
  };

  // Ken Burns effect handlers
  const handleKenBurnsToggle = (enabled: boolean) => {
    setKenBurnsEnabled(enabled);
    if (!enabled) {
      setKenBurnsProcessing(false);
      setKenBurnsProgress(0);
      setKenBurnsResult(null);
      setKenBurnsError(null);
      
      // Clean up URLs
      if (kenBurnsUrls) {
        URL.revokeObjectURL(kenBurnsUrls.videoUrl);
        kenBurnsUrls.photoUrls.forEach(url => URL.revokeObjectURL(url));
        setKenBurnsUrls(null);
      }
    } else {
      // Create URLs when enabling
      if (currentVostcard?.video && currentVostcard?.photos) {
        const videoUrl = URL.createObjectURL(currentVostcard.video);
        const photoUrls = currentVostcard.photos.map(photo => URL.createObjectURL(photo));
        setKenBurnsUrls({ videoUrl, photoUrls });
      }
    }
  };

  const handleKenBurnsStart = () => {
    if (!currentVostcard?.video || !currentVostcard?.photos || currentVostcard.photos.length < 2) {
      setKenBurnsError('Video and at least 2 photos are required for Ken Burns effect');
      return;
    }
    
    setKenBurnsProcessing(true);
    setKenBurnsProgress(0);
    setKenBurnsError(null);
  };

  const handleKenBurnsStop = () => {
    setKenBurnsProcessing(false);
  };

  const handleKenBurnsProgress = (progress: number) => {
    setKenBurnsProgress(progress);
  };

  const handleKenBurnsComplete = (blob: Blob) => {
    setKenBurnsResult(blob);
    setKenBurnsProcessing(false);
    setKenBurnsProgress(100);
    console.log('🎥 Ken Burns complete blob:', {
      blob: blob,
      size: blob.size,
      type: blob.type,
      isValid: blob.size > 0,
      timestamp: new Date().toISOString()
    });
  };

  const handleKenBurnsError = (error: string) => {
    setKenBurnsError(error);
    setKenBurnsProcessing(false);
    console.error('❌ Ken Burns effect failed:', error);
  };

  const handleSaveChanges = async () => {
    // Show success message immediately
    alert('Your Vōstcard has been saved and in a few minutes available in your Private Vōstcard list.');
    
    // Navigate to home view after user dismisses the message
    navigate('/home');
    
    try {
      console.log('💾 Starting vostcard save process...');
      
      // This saves as private (updates the existing private Vostcard)
      await saveLocalVostcard();
      
      console.log('✅ Vostcard saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving vostcard:', error);
      // Don't show error alert since user is already on home screen
      // Could implement a more subtle error notification if needed
    }
  };

  const handlePost = async () => {
    const user = auth.currentUser;
    if (!user || !currentVostcard?.username) {
      alert("❌ Something went wrong. Please start again.");
      navigate('/home');
      return;
    }
    
    // Show success message immediately
    alert('Your Vōstcard will appear on the map in a minute or two.');
    
    // Navigate to home without replacing history
    navigate('/home', { 
      state: { 
        freshLoad: true,
        timestamp: Date.now() 
      }
    });
    
    try {
      console.log('📥 Starting vostcard post process...');
      console.log('🎬 Ken Burns status:', {
        kenBurnsEnabled,
        kenBurnsResult: !!kenBurnsResult,
        kenBurnsResultSize: kenBurnsResult?.size,
        kenBurnsResultType: kenBurnsResult?.type
      });
      
      // If Ken Burns effect was applied, use that result
      if (kenBurnsEnabled && kenBurnsResult) {
        console.log('🎬 Using Ken Burns processed video for posting', {
          originalVideoSize: currentVostcard?.video?.size,
          kenBurnsVideoSize: kenBurnsResult.size,
          kenBurnsVideoType: kenBurnsResult.type
        });
        // Update the current vostcard with the Ken Burns result
        updateVostcard({ video: kenBurnsResult });
      } else if (kenBurnsEnabled && !kenBurnsResult) {
        console.warn('⚠️ Ken Burns was enabled but no result blob available, using original video');
      }
      
      await postVostcard();
      
      // Clear the current vostcard state
      clearVostcard();
      
      console.log('✅ Vostcard posted successfully');
      
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      // Don't show error alert since user is already on home screen
      // Instead, could implement a more subtle error notification if needed
    }
  };

  const isPostEnabled =
    validationState.hasTitle &&
    validationState.hasDescription &&
    validationState.hasCategories &&
    validationState.hasPhotos;

  // Create specific missing items list
  const missingItems = [];
  if (!validationState.hasTitle) missingItems.push('Title');
  if (!validationState.hasDescription) missingItems.push('Description');
  if (!validationState.hasCategories) missingItems.push('Categories');
  if (!validationState.hasPhotos) missingItems.push('Photos (need at least 2)');

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
        zIndex: 1000  // Higher than the modal overlay
      }}>
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>Vōstcard</div>
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
        paddingBottom: 140, // Add space for the fixed buttons
        touchAction: 'manipulation'
      }}>
        <div>
          <label style={labelStyle}>
            Title {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
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

        {/* Ken Burns Effect Section */}
        {currentVostcard?.video && currentVostcard?.photos && currentVostcard.photos.length >= 2 && (
          <div>
            <KenBurnsControls
              isEnabled={kenBurnsEnabled}
              isProcessing={kenBurnsProcessing}
              progress={kenBurnsProgress}
              onToggleEnabled={handleKenBurnsToggle}
              onStartProcessing={handleKenBurnsStart}
              onStopProcessing={handleKenBurnsStop}
            />
            
            {kenBurnsEnabled && kenBurnsUrls && (
              <div style={{ marginTop: '16px' }}>
                <KenBurnsCanvas
                  videoUrl={kenBurnsUrls.videoUrl}
                  photoUrls={kenBurnsUrls.photoUrls}
                  isProcessing={kenBurnsProcessing}
                  onProgress={handleKenBurnsProgress}
                  onComplete={handleKenBurnsComplete}
                  onError={handleKenBurnsError}
                />
              </div>
            )}
            
            {kenBurnsError && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                fontSize: '14px'
              }}>
                {kenBurnsError}
              </div>
            )}
            
            {kenBurnsResult && (
              <div style={{
                background: '#d4edda',
                color: '#155724',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                fontSize: '14px'
              }}>
                ✅ Ken Burns effect completed successfully!
              </div>
            )}
          </div>
        )}
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
        <button
          onClick={handleSaveChanges}
          style={{...saveButtonStyle, touchAction: 'manipulation'}}
        >
          Save Changes
        </button>

        {!isPostEnabled && (
          <div style={missingTextStyle}>
            Missing: {missingItems.join(', ')}
          </div>
        )}

        <button
          onClick={handlePost}
          disabled={!isPostEnabled}
          style={{
            ...postButtonStyle,
            backgroundColor: isPostEnabled ? '#002B4D' : '#aaa',
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

const addButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 12px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#002B4D',
  color: 'white',
  cursor: 'pointer'
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer'
};

const postButtonStyle: React.CSSProperties = {
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  marginTop: 10,
  cursor: 'pointer'
};

const missingTextStyle: React.CSSProperties = {
  color: 'orange',
  marginTop: 8,
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
  zIndex: 998,  // Lower than the header
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 12,
  width: '80%',
  maxWidth: 400,
  position: 'relative',
  zIndex: 999  // Higher than overlay but lower than header
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

export default CreateVostcardStep3;