import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { auth } from '../firebase/firebaseConfig';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';

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
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
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
  const loadUserTrips = async () => {
    try {
      const trips = await TripService.getUserTrips();
      setUserTrips(trips);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const handleAddToTrip = () => {
    loadUserTrips();
    setIsTripModalOpen(true);
  };

  const handleCreateNewTrip = async () => {
    if (!newTripName.trim()) return;
    
    setIsCreatingTrip(true);
    try {
      const newTrip = await TripService.createTrip({
        name: newTripName.trim(),
        description: '',
        isPrivate: true
      });
      
      // ✅ Update state immediately
      setUserTrips([...userTrips, newTrip]);
      setSelectedTripId(newTrip.id);
      setNewTripName('');
      
      // ✅ Close modal and add quickcard to the new trip
      setIsTripModalOpen(false);
      
      // ✅ Small delay for smooth transition
      setTimeout(() => {
        alert(`✅ Trip "${newTrip.name}" created!\n\nAdding quickcard to your new trip...`);
        
        console.log('🔄 Adding quickcard to new trip...');
        // This will handle the background saving - no navigation
        handleAddQuickcardToTripOptimized(newTrip.id);
      }, 100);
      
    } catch (error) {
      console.error('Error creating trip:', error);
      alert(`Error creating trip: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // ✅ Add quickcard to trip and stay on current page
  const handleAddQuickcardToTripOptimized = async (tripId: string) => {
    if (!tripId || !currentVostcard) return;
    
    try {
      // ✅ Close modal and show success immediately
      setIsTripModalOpen(false);
      setSelectedTripId('');
      
      const tripName = userTrips.find(t => t.id === tripId)?.name || 'your trip';
      alert(`✅ Quickcard added to "${tripName}"!\n\nYou can now save or post your quickcard.`);
      
      // 🔄 Background processing - save quickcard and add to trip
      console.log('🔄 Background: Saving quickcard and adding to trip...');
      
      // ✅ Save quickcard as private post (not public to map)
      await saveQuickcard();
      console.log('✅ Background: Quickcard saved privately with ID:', currentVostcard.id);
      
      // Add to trip (let the service fetch photoURL from the saved vostcard)
      await TripService.addItemToTrip(tripId, {
        vostcardID: currentVostcard.id,
        type: 'quickcard',
        title: currentVostcard.title || 'Untitled',
        description: currentVostcard.description,
        // Don't pass photoURL - let addItemToTrip fetch it from the saved vostcard
        latitude: currentVostcard.geo?.latitude,
        longitude: currentVostcard.geo?.longitude
      });
      
      console.log('✅ Background: Quickcard added to trip successfully');
      
    } catch (error) {
      console.error('Background error adding quickcard to trip:', error);
      alert('⚠️ There was an issue adding to the trip. Please try again.');
    }
  };

  const handleAddQuickcardToTrip = async () => {
    if (!selectedTripId || !currentVostcard) return;
    
    setIsAddingToTrip(true);
    try {
      // ✅ Use the optimized version for existing trips too
      await handleAddQuickcardToTripOptimized(selectedTripId);
    } finally {
      setIsAddingToTrip(false);
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
                    fontSize: '16px',
                  }}
                >
                  <option value="">Choose a trip...</option>
                  {userTrips.map((trip) => (
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
                {isCreatingTrip ? 'Creating Trip...' : 'Create New Trip'}
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
                disabled={!selectedTripId || isAddingToTrip}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: isAddingToTrip ? '#ccc' : (selectedTripId ? '#007bff' : '#ccc'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: (isAddingToTrip || !selectedTripId) ? 'not-allowed' : 'pointer',
                }}
              >
                {isAddingToTrip ? 'Adding to Trip...' : 'Add to Trip'}
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