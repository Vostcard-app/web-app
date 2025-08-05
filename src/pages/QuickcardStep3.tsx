import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';
import { ItineraryService } from '../services/itineraryService';
import type { Itinerary } from '../types/ItineraryTypes';

const QuickcardStep3: React.FC = () => {
  const navigate = useNavigate();
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
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [userItineraries, setUserItineraries] = useState<Itinerary[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  

  
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
    hasPhotos: (photos?.length || 0) >= 1,  // Should already have photos from step 2
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

  // Trip functionality
  const loadUserItineraries = async () => {
    try {
      const itineraries = await ItineraryService.getUserItineraries();
      setUserItineraries(itineraries);
    } catch (error) {
      console.error('Error loading itineraries:', error);
    }
  };

  const handleAddToTrip = () => {
    loadUserItineraries();
    setIsTripModalOpen(true);
  };

  const handleCreateNewTrip = async () => {
    if (!newTripName.trim()) return;
    
    setIsCreatingTrip(true);
    try {
      const newTrip = await ItineraryService.createItinerary({
        name: newTripName.trim(),
        description: '',
        isPublic: false
      });
      setUserItineraries([...userItineraries, newTrip]);
      setSelectedTripId(newTrip.id);
      setNewTripName('');
    } catch (error) {
      console.error('Error creating trip:', error);
      console.error('Trip creation error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        tripData: {
          name: newTripName.trim(),
          description: '',
          isPublic: false
        }
      });
      alert(`Error creating trip: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleAddQuickcardToTrip = async () => {
    if (!selectedTripId || !currentVostcard) return;
    
    try {
      console.log('🔄 Saving quickcard first before adding to trip...');
      
      // First, save the quickcard to get a real ID
      // We'll save it privately first, then add to trip
      const quickcardToSave = {
        ...currentVostcard,
        state: 'private' as const, // Save as private initially
        isQuickcard: true
      };
      
      // Use the VostcardContext postQuickcard function to save
      await postQuickcard(quickcardToSave);
      
      console.log('✅ Quickcard saved with ID:', quickcardToSave.id);
      
      // Now add to trip with the real ID
      await ItineraryService.addItemToItinerary(selectedTripId, {
        vostcardID: quickcardToSave.id,
        type: 'quickcard',
        title: quickcardToSave.title || 'Untitled',
        description: quickcardToSave.description,
        photoURL: quickcardToSave.photos?.[0] ? 'pending_upload' : undefined,
        latitude: quickcardToSave.geo?.latitude,
        longitude: quickcardToSave.geo?.longitude,
        username: quickcardToSave.username
      });
      
      console.log('✅ Added quickcard to trip successfully');
      alert('Quickcard saved and added to trip successfully!');
      setIsTripModalOpen(false);
      setSelectedTripId('');
      
      // Navigate back to home or wherever appropriate
      navigate('/home');
      
    } catch (error) {
      console.error('Error saving quickcard or adding to trip:', error);
      alert(`Error: ${error.message || 'Failed to save quickcard or add to trip'}`);
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
      
      // Clear the current vostcard state
      clearVostcard();
      
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
            Description* (Required for Map) {validationState.hasDescription && <span style={{color: 'green'}}>✅</span>}
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
              borderColor: validationState.hasDescription ? '#002B4D' : '#ff6b6b'
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

        {/* Add to Trip Section */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>
            Add to Trip (Not Required)
          </label>
          <button
            onClick={handleAddToTrip}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f0f8ff',
              border: '2px solid #07345c',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#07345c',
              cursor: 'pointer',
              fontWeight: '500',
              touchAction: 'manipulation',
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
        {!isReadyForMapPosting && (
          <div style={missingTextStyle}>
            Missing for map posting: {missingMapItems.join(', ')}
          </div>
        )}



        {/* Save to Personal Posts Button */}
        <button
          onClick={handleSavePrivately}
          disabled={!isReadyForPersonalSave}
          style={{
            ...saveButtonStyle,
            backgroundColor: isReadyForPersonalSave ? '#002B4D' : '#aaa',
            cursor: isReadyForPersonalSave ? 'pointer' : 'not-allowed',
            touchAction: 'manipulation'
          }}
        >
          Save to Personal Posts
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

      {/* Trip Modal */}
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
            
            {userItineraries.length > 0 && (
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
                    fontSize: '16px',
                  }}
                >
                  <option value="">Choose a trip...</option>
                  {userItineraries.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
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
                placeholder="Enter trip name..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  marginBottom: '10px',
                }}
              />
              <button
                onClick={handleCreateNewTrip}
                disabled={!newTripName.trim() || isCreatingTrip}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: isCreatingTrip ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: isCreatingTrip ? 'not-allowed' : 'pointer',
                }}
              >
                {isCreatingTrip ? 'Creating...' : 'Create New Trip'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsTripModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuickcardToTrip}
                disabled={!selectedTripId}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: selectedTripId ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: selectedTripId ? 'pointer' : 'not-allowed',
                }}
              >
                Add to Trip
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