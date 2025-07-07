import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

  const [customCategory, setCustomCategory] = useState('');
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
    'Drive Mode Event'
  ];

  // Debug validation state
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '',
    hasCategories: (categories?.length || 0) > 0,
    hasPhotos: (photos?.length || 0) >= 2,
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

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      if (user) {
        setAuthStatus(`✅ Logged in as: ${user.email || user.uid}`);
        console.log('🔐 Auth status:', {
          uid: user.uid,
          email: user.email,
          isAnonymous: user.isAnonymous
        });
      } else {
        setAuthStatus('❌ Not logged in');
        console.log('🔐 No user logged in');
      }
    };

    checkAuth();
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, []);

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

  const handleAddCustomCategory = () => {
    if (customCategory.trim() !== '') {
      updateVostcard({ categories: [...categories, customCategory.trim()] });
      setCustomCategory('');
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

  const handleSaveChanges = async () => {
    // This saves as private (updates the existing private Vostcard)
    await saveLocalVostcard();
    alert('Vōstcard saved! You can find it in My Private Vōstcards.');
    navigate('/home');
  };

  const handlePost = async () => {
    const user = auth.currentUser;
    if (!user || !currentVostcard?.username) {
      alert("❌ Something went wrong. Please start again.");
      navigate('/home');
      return;
    }
    
    try {
      console.log('📥 Starting vostcard post process...');
      await postVostcard();
      
      // Clear the current vostcard state
      clearVostcard();
      
      console.log('✅ Vostcard posted successfully, navigating to home');
      
      // Navigate to home with a slight delay to ensure proper state cleanup
      setTimeout(() => {
        navigate('/home', { replace: true, state: { refresh: true } });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      alert('Failed to post vostcard. Please try again.');
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
    <div style={{ backgroundColor: 'white', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🔵 Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
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
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>
            Title {validationState.hasTitle && <span style={{color: 'green'}}>✅</span>}
          </label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter Title"
            style={inputStyle}
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
            style={textareaStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Categories {validationState.hasCategories && <span style={{color: 'green'}}>✅</span>}
          </label>
          <div
            onClick={() => setIsCategoryModalOpen(true)}
            style={categorySelectStyle}
          >
            Select Categories
          </div>

          {categories.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {categories.map((cat) => (
                <div key={cat} style={{ backgroundColor: '#eee', padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>
                  {cat}
                </div>
              ))}
            </div>
          )}

          <input
            placeholder="Add Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
          <button
            onClick={handleAddCustomCategory}
            style={addButtonStyle}
          >
            +
          </button>
        </div>

        {/* 📊 Validation Summary */}
        <div style={{ 
          marginTop: 20, 
          padding: 12, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 8,
          fontSize: 14
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Validation Status:</div>
          <div>Authentication: {authStatus}</div>
          <div>Video: {validationState.hasVideo ? '✅' : '❌'}</div>
          <div>Location: {validationState.hasGeo ? '✅' : '❌'}</div>
          <div>Photos: {validationState.hasPhotos ? `✅ (${photos?.length || 0})` : `❌ (${photos?.length || 0}/2)`}</div>
          <div>Title: {validationState.hasTitle ? '✅' : '❌'}</div>
          <div>Description: {validationState.hasDescription ? '✅' : '❌'}</div>
          <div>Categories: {validationState.hasCategories ? `✅ (${categories?.length || 0})` : '❌'}</div>
        </div>
      </div>


      {/* 🔘 Buttons */}
      <div style={{ padding: 16 }}>
        <button
          onClick={handleSaveChanges}
          style={saveButtonStyle}
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
            backgroundColor: isPostEnabled ? '#002B4D' : '#aaa'
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
  zIndex: 999,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 12,
  width: '80%',
  maxWidth: 400,
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