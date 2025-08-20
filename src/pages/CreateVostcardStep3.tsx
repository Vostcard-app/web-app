import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft, FaPencilAlt } from 'react-icons/fa';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { AVAILABLE_CATEGORIES } from '../types/VostcardTypes';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import EditTripNameModal from '../components/EditTripNameModal';
import { useAuth } from '../context/AuthContext';

const CreateVostcardStep3: React.FC = () => {
  const navigate = useNavigate();
    const { 
    currentVostcard, 
    setCurrentVostcard, 
    saveVostcard,
    loadLocalVostcard,
    clearLocalStorage,
    postVostcard,
    clearVostcard,
    updateScriptTitle,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  
  // Trip functionality states
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [lastUsedTrip, setLastUsedTrip] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  const { user } = useAuth();

  const availableCategories = [...AVAILABLE_CATEGORIES]
  
  // Debug validation state
  const validationState = {
    hasTitle: title.trim() !== '',
    hasDescription: description.trim() !== '',
    hasCategories: (categories?.length || 0) > 0,
    hasPhotos: (photos?.length || 0) >= 1,  // Vostcards need 1 photo
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

  // Load user trips when component mounts
  useEffect(() => {
    const loadTrips = async () => {
      if (!user) return;
      
      try {
        const trips = await TripService.getUserTrips(user.uid);
        setUserTrips(trips);
        
        // Set last used trip if available
        if (trips.length > 0) {
          const sortedTrips = trips.sort((a, b) => 
            (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
          );
          setLastUsedTrip(sortedTrips[0]);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
      }
    };

    loadTrips();
  }, [user]);

  // Trip handler functions
  const handleAddToTrip = () => {
    // Pre-select the last used trip if available
    if (lastUsedTrip) {
      setSelectedTripId(lastUsedTrip.id);
    }
    setIsTripModalOpen(true);
  };

  const handleTripSelection = async () => {
    if (!selectedTripId && !newTripName.trim()) {
      alert('Please select a trip or enter a new trip name');
      return;
    }

    if (!currentVostcard) {
      alert('No vostcard to add to trip');
      return;
    }

    setIsCreatingTrip(true);

    try {
      let tripId = selectedTripId;

      // Create new trip if needed
      if (!tripId && newTripName.trim()) {
        const newTrip = await TripService.createTrip({
          name: newTripName.trim(),
          description: '',
          isPrivate: true
        });
        tripId = newTrip.id;
        
        // Add to trips list
        setUserTrips(prev => [newTrip, ...prev]);
        setLastUsedTrip(newTrip);
      }

      if (tripId && currentVostcard.geo) {
        // Add vostcard to trip
        await TripService.addItemToTrip(tripId, {
          vostcardID: currentVostcard.id,
          type: 'vostcard',
          title: currentVostcard.title || `Vostcard ${new Date().toLocaleDateString()}`,
          description: currentVostcard.description,
          photoURL: currentVostcard.photos?.[0] ? URL.createObjectURL(currentVostcard.photos[0]) : undefined,
          latitude: currentVostcard.geo?.latitude,
          longitude: currentVostcard.geo?.longitude,
          username: currentVostcard.username
        });
        
        alert('Successfully added to trip!');
        setIsTripModalOpen(false);
        setSelectedTripId('');
        setNewTripName('');
      }
    } catch (error) {
      console.error('Error adding to trip:', error);
      alert('Failed to add to trip. Please try again.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

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
    if (!currentVostcard) return;
    
    if (categories.includes(category)) {
      setCurrentVostcard({ ...currentVostcard, categories: categories.filter((c) => c !== category) });
    } else {
      setCurrentVostcard({ ...currentVostcard, categories: [...categories, category] });
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    // Update the vostcard title
    if (currentVostcard) {
      setCurrentVostcard({ ...currentVostcard, title: newTitle });
    }
    
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
    try {
      console.log('💾 Starting vostcard save process...');
      
      // This saves as private (updates the existing private Vostcard)
      await saveVostcard();
      
      console.log('✅ Vostcard saved successfully');

      // Show success message and navigate only after successful save
      alert('Your Vōstcard has been saved and will be available in your Private Vōstcard list.');
      navigate('/home');
      
    } catch (error) {
      console.error('❌ Error saving vostcard:', error);
      alert('Failed to save Vōstcard. Please try again.');
    }
  };

  const handlePost = async () => {
    const user = auth.currentUser;
    if (!user || !currentVostcard?.username) {
      alert("❌ Something went wrong. Please start again.");
      navigate('/home');
      return;
    }

    // Additional validation
    if (!currentVostcard.geo) {
      alert("❌ Location is required. Please go back and set a location.");
      return;
    }

    if (!currentVostcard.photos || currentVostcard.photos.length < 1) {
      alert("❌ At least 1 photo is required. Please go back and add a photo.");
      return;
    }
    
    try {
      console.log('📥 Starting vostcard post process...');
      
      // Set the vostcard state to 'posted' before posting
      if (currentVostcard) {
        setCurrentVostcard({
          ...currentVostcard,
          state: 'posted'
        });
      }
      
      await postVostcard();
      
      // Clear the current vostcard state
      clearVostcard();
      
      console.log('✅ Vostcard posted successfully');

      // Show success message and navigate only after successful post
      alert('Your Vōstcard has been posted and will appear on the map in a minute or two.');
      navigate('/home', { 
        state: { 
          freshLoad: true,
          timestamp: Date.now() 
        }
      });
      
    } catch (error) {
      console.error('❌ Error posting vostcard:', error);
      alert('Failed to post Vōstcard. Please try again.');
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
  if (!validationState.hasPhotos) {
    missingItems.push('Photos (need at least 1)');
  }

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
        <div 
          onClick={() => navigate('/home')}
          style={{ color: 'white', fontSize: 28, fontWeight: 'bold', cursor: 'pointer' }}>Vōstcard</div>
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
            onChange={(e) => currentVostcard && setCurrentVostcard({ ...currentVostcard, description: e.target.value })}
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

        {/* 🎒 Add to Trip Section */}
        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>
            Add to Trip (Optional)
          </label>
          <button
            onClick={handleAddToTrip}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              width: '100%',
              padding: '14px',
              borderRadius: 8,
              fontSize: 18,
              cursor: 'pointer',
              fontWeight: 600,
              touchAction: 'manipulation'
            }}
          >
            Add to Trip
          </button>
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
                <span style={{ fontSize: '16px', fontWeight: '600', textAlign: 'center' }}>
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
                  <span style={{ fontSize: '16px', fontWeight: '500', textAlign: 'center' }}>{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trip Modal */}
      {editingTrip && (
        <EditTripNameModal
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onUpdate={(updatedTrip) => {
            setUserTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
            setEditingTrip(null);
          }}
          onDelete={async (tripId) => {
            try {
              await TripService.deleteTrip(tripId);
              setUserTrips(prev => prev.filter(t => t.id !== tripId));
              setEditingTrip(null);
            } catch (error) {
              console.error('Error deleting trip:', error);
              alert('Failed to delete trip. Please try again.');
            }
          }}
        />
      )}
      {isTripModalOpen && (
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
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Add to Trip</h3>
            
            {userTrips.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Existing Trip:
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Choose a trip...</option>
                  {userTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
                {selectedTripId && (
                  <button
                    onClick={() => {
                      const trip = userTrips.find(t => t.id === selectedTripId);
                      if (trip) {
                        setEditingTrip(trip);
                      }
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaPencilAlt size={12} />
                    Edit Trip Name
                  </button>
                )}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Or Create New Trip:
              </label>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Enter trip name"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsTripModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleTripSelection}
                disabled={!selectedTripId && !newTripName.trim() || isCreatingTrip}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: (selectedTripId || newTripName.trim()) && !isCreatingTrip ? '#002B4D' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: (selectedTripId || newTripName.trim()) && !isCreatingTrip ? 'pointer' : 'not-allowed',
                }}
              >
                {isCreatingTrip ? 'Adding...' : 'Add to Trip'}
              </button>
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
  width: '90%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflowY: 'auto',
  position: 'relative',
  zIndex: 999  // Higher than overlay but lower than header
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer',
};

const categoryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(93px, 1fr))',
  gap: '8px',
  marginBottom: '20px'
};

const categoryGridItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 5px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  minHeight: '29px',
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

export default CreateVostcardStep3;
