import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye, FaShare, FaMap, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const MyTripsListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDescription, setNewTripDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [preparingShare, setPreparingShare] = useState(false);
  const [currentSharingTrip, setCurrentSharingTrip] = useState<Trip | null>(null);
  


  console.log('🔄 MyTripsListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    tripsCount: trips.length
  });

  useEffect(() => {
    console.log('🔄 Auth state changed:', { authLoading, user: !!user });
    if (!authLoading) {
      loadTrips();
    }
  }, [authLoading, user]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        console.log('❌ No user authenticated');
        setError('Please log in to view your trips.');
        navigate('/login');
        return;
      }

      console.log('📋 Loading user trips...');
      const userTrips = await TripService.getUserTrips();
      
      // Debug: Log trip data to see what photoURL data we have
      console.log('🧳 Loaded trips:', userTrips.length);
      userTrips.forEach(trip => {
        console.log(`Trip "${trip.name}":`, {
          itemCount: trip.items?.length || 0,
          firstItem: trip.items?.[0] ? {
            id: trip.items[0].id,
            title: trip.items[0].title,
            photoURL: trip.items[0].photoURL,
            type: trip.items[0].type,
            hasPhotoURL: !!trip.items[0].photoURL,
            photoURLLength: trip.items[0].photoURL?.length
          } : null
        });
        
        // Log all items to see if any have photoURLs
        if (trip.items && trip.items.length > 0) {
          console.log(`📸 All items for "${trip.name}":`, trip.items.map(item => ({
            title: item.title,
            photoURL: item.photoURL,
            hasPhotoURL: !!item.photoURL
          })));
        }
      });
      
      setTrips(userTrips);
      console.log(`✅ Loaded ${userTrips.length} trips`);

    } catch (err) {
      console.error('❌ Error loading trips:', err);
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) {
      alert('Please enter a trip name');
      return;
    }

    try {
      setCreating(true);
      const newTrip = await TripService.createTrip({
        name: newTripName.trim(),
        description: newTripDescription.trim() || undefined,
        isPrivate: true
      });

      setTrips(prev => [newTrip, ...prev]);
      setShowCreateModal(false);
      setNewTripName('');
      setNewTripDescription('');
      
      console.log('✅ Created new trip:', newTrip.id);
    } catch (error) {
      console.error('❌ Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    if (!confirm(`Are you sure you want to delete "${trip.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(trip.id));
      await TripService.deleteTrip(trip.id);
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      console.log('✅ Deleted trip:', trip.id);
    } catch (error) {
      console.error('❌ Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(trip.id);
        return newSet;
      });
    }
  };

  const handleShareTrip = async (trip: Trip) => {
    // Show public sharing warning
    const confirmMessage = `⚠️ Attention:

This will create a public link for your trip. Anyone with the link can see it.

Tap OK to continue.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    setPreparingShare(true);
    setCurrentSharingTrip(trip);
    
    try {
      console.log('🔄 MyTripsListView: Starting share process for trip:', trip.id, trip.name);
      
      // Mark trip as shared and public
      const updatedTrip = await TripService.updateTrip(trip.id, {
        isShared: true,
        isPrivate: false,
        visibility: 'public'
      });
      
      console.log('✅ MyTripsListView: Trip updated successfully');
      
      // Update the trips list with the updated trip
      setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
      
      // Generate public share URL
      const generatedShareUrl = `${window.location.origin}/share-trip/${updatedTrip.id}`;
      setShareUrl(generatedShareUrl);
      
      // Show share modal
      setShowShareModal(true);
      
    } catch (error) {
      console.error('❌ MyTripsListView: Error preparing share:', error);
      alert('Failed to prepare share link. Please try again.');
    } finally {
      setPreparingShare(false);
    }
  };

  // Copy link to clipboard
  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  // Share via native sharing
  const shareViaSystem = async () => {
    if (!currentSharingTrip) return;
    
    const shareText = `Check out this trip I created with Vōstcard

"${currentSharingTrip.name || 'My Trip'}"

${currentSharingTrip.description || 'A collection of my favorite places'}

${shareUrl}`;
    
    try {
      if (navigator.share) {
        await navigator.share({ 
          title: currentSharingTrip.name || 'My Trip',
          text: shareText,
          url: shareUrl
        });
      } else {
        // Fallback to copying text
        await navigator.clipboard.writeText(shareText);
        alert('Share text copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  // 🔧 Cleanup function to fix existing trip items with 'pending_upload' photoURLs
  const handleFixTripThumbnails = async (trip: Trip) => {
    try {
      console.log('🔧 Fixing trip thumbnails for:', trip.name);
      if (!trip.items) return;

      let fixedCount = 0;
      for (const item of trip.items) {
        if (item.photoURL === 'pending_upload') {
          console.log('🔧 Fixing item with pending_upload:', item.id, item.title);
          
          // Fetch the actual photoURL from the vostcard
          try {
            const vostcardDoc = await getDoc(doc(db, 'vostcards', item.vostcardID));
            if (vostcardDoc.exists()) {
              const vostcardData = vostcardDoc.data();
              const actualPhotoURL = (vostcardData.photoURLs && vostcardData.photoURLs[0]) || vostcardData.photoURL;
              
              if (actualPhotoURL && actualPhotoURL !== 'pending_upload') {
                // Update the trip item with the correct photoURL
                await updateDoc(doc(db, 'trips', trip.id, 'items', item.id), {
                  photoURL: actualPhotoURL
                });
                console.log('✅ Fixed photoURL for:', item.title, actualPhotoURL);
                fixedCount++;
              }
            }
          } catch (error) {
            console.warn('⚠️ Could not fix item:', item.id, error);
          }
        }
      }
      
      if (fixedCount > 0) {
        alert(`✅ Fixed ${fixedCount} thumbnail(s)!\n\nRefresh the page to see the images.`);
        // Reload trips to show the fixes
        loadTrips();
      } else {
        alert('ℹ️ No thumbnails needed fixing.');
      }
    } catch (error) {
      console.error('❌ Error fixing trip thumbnails:', error);
      alert('Failed to fix thumbnails. Please try again.');
    }
  };



  const getTripSummary = (trip: Trip) => {
    const itemCount = trip.items?.length || 0;
    const vostcardCount = trip.items?.filter(item => item.type === 'vostcard').length || 0;
    const quickcardCount = trip.items?.filter(item => item.type === 'quickcard').length || 0;
    
    if (itemCount === 0) return 'Empty trip';
    
    const parts = [];
    if (vostcardCount > 0) parts.push(`${vostcardCount} vostcard${vostcardCount !== 1 ? 's' : ''}`);
    if (quickcardCount > 0) parts.push(`${quickcardCount} quickcard${quickcardCount !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  const getTripCreationDate = (trip: Trip) => {
    if (!trip.items || trip.items.length === 0) {
      // If no items, use trip creation date
      return new Date(trip.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // Find the earliest item (first post added to trip)
    const sortedItems = trip.items.sort((a, b) => 
      new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    );
    
    return new Date(sortedItems[0].addedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    try {
      // Handle Firestore Timestamp
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{
        background: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>🧳</div>
          <div>Loading trips...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '300px', padding: '20px' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>❌</div>
          <div style={{ marginBottom: '20px' }}>{error}</div>
          <button
            onClick={loadTrips}
            style={{
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#07345c',
        padding: '15px 16px 9px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            style={{
              background: 'rgba(0,0,0,0.10)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={20} />
          </button>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>
            My Trips
          </span>
        </div>
        
        <button
          style={{
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/home')}
        >
          <FaHome color="#fff" size={24} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Create New Trip Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            width: '100%',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <FaPlus size={16} />
          Create New Trip
        </button>

        {/* Trips List */}
        {trips.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧳</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Trips Yet</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Create your first trip to start planning your adventures!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0',
                  position: 'relative'
                }}
              >
                {/* Delete Button - Upper Right Corner */}
                <button
                  onClick={() => handleDeleteTrip(trip)}
                  disabled={deletingIds.has(trip.id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: deletingIds.has(trip.id) ? '#ccc' : '#ff4444',
                    cursor: deletingIds.has(trip.id) ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  title={deletingIds.has(trip.id) ? 'Deleting...' : 'Delete trip'}
                >
                  <FaTrash size={22} />
                </button>

                {/* Trip Title and Date */}
                <div style={{ marginBottom: '16px', paddingRight: '40px' }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                    onClick={() => navigate(`/trip/${trip.id}`)}
                  >
                    {trip.name}
                  </h3>
                  <div style={{
                    fontSize: '14px',
                    color: '#888'
                  }}>
                    {getTripCreationDate(trip)}
                  </div>
                </div>

                {/* Main Content Area */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  {/* Single Thumbnail */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    minWidth: '50px',
                    maxWidth: '50px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {(() => {
                      const hasItems = !!(trip.items && trip.items.length > 0);
                      const firstItem = trip.items?.[0];
                      const photoURL = firstItem?.photoURL;
                      
                      console.log('🖼️ THUMBNAIL RENDER DEBUG for:', trip.name, {
                        hasItems,
                        firstItemExists: !!firstItem,
                        photoURL,
                        hasPhotoURL: !!photoURL,
                        photoURLType: typeof photoURL,
                        condition1: hasItems,
                        condition2: !!photoURL,
                        finalCondition: hasItems && !!photoURL
                      });
                      
                      return hasItems && photoURL && photoURL !== 'pending_upload' ? (
                        <img
                          src={photoURL}
                          alt={firstItem?.title || 'Trip item'}
                          style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: '50px',
                            maxHeight: '50px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block'
                          }}
                          onError={(e) => {
                            console.error('🚨 Image failed to load:', photoURL);
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            // Show fallback icon
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div style="fontSize: 20px">${trip.items[0].type === 'quickcard' ? '📷' : '📱'}</div>`;
                            }
                          }}
                        />
                      ) : hasItems ? (
                        <div style={{ fontSize: '20px' }}>
                          {trip.items[0].type === 'quickcard' ? '📷' : '📱'}
                        </div>
                      ) : (
                        <div style={{ fontSize: '20px', color: '#ccc' }}>🧳</div>
                      );
                    })()}
                    {trip.items && trip.items.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        +{trip.items.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '6px',
                    flex: 1
                  }}>
                    <button
                      onClick={() => navigate(`/trip/${trip.id}`)}
                      style={{
                        backgroundColor: '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: '500',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      <FaEye size={12} />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleShareTrip(trip)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: '500',
                        flex: 1,
                        minWidth: 0
                      }}
                      title={trip.isPrivate ? 'Make public and share' : 'Share trip'}
                    >
                      <FaShare size={12} />
                      Share
                    </button>
                    

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => !creating && setShowCreateModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              textAlign: 'center'
            }}>
              Create New Trip
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '6px'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Enter trip name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                maxLength={50}
                disabled={creating}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '6px'
              }}>
                Description (optional)
              </label>
              <textarea
                value={newTripDescription}
                onChange={(e) => setNewTripDescription(e.target.value)}
                placeholder="Enter description"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                maxLength={200}
                disabled={creating}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: creating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleCreateTrip}
                disabled={creating || !newTripName.trim()}
                style={{
                  backgroundColor: creating || !newTripName.trim() ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: creating || !newTripName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share Modal */}
      {showShareModal && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Share Trip
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              wordBreak: 'break-all',
              color: '#666'
            }}>
              {shareUrl}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={copyLinkToClipboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
              >
                <FaShare size={14} />
                Copy Link
              </button>

              {navigator.share && (
                <button
                  onClick={shareViaSystem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e7e34'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                >
                  <FaShare size={14} />
                  Share via System
                </button>
              )}

              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyTripsListView;