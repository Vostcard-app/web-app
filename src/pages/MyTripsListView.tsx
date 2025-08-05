import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye, FaShare, FaMap } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/tripService';
import type { Trip } from '../types/TripTypes';

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

  const handleShareTrip = (trip: Trip) => {
    if (trip.shareableLink) {
      const shareUrl = `${window.location.origin}/trip/${trip.shareableLink}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        alert(`Share link: ${shareUrl}`);
      });
    } else {
      alert('This trip is private and cannot be shared.');
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
                  border: '1px solid #e0e0e0'
                }}
              >
                {/* Trip Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
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
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4'
                    }}>
                      {trip.description || 'No description'}
                    </p>
                    <div style={{
                      fontSize: '13px',
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span>{getTripSummary(trip)}</span>
                      {!trip.isPrivate && (
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview Images */}
                {trip.items && trip.items.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    overflowX: 'auto'
                  }}>
                    {trip.items.slice(0, 4).map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          minWidth: '60px',
                          height: '60px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}
                      >
                        {item.photoURL ? (
                          <img
                            src={item.photoURL}
                            alt={item.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '24px' }}>
                            {item.type === 'quickcard' ? '📷' : '📱'}
                          </div>
                        )}
                        {index === 3 && trip.items.length > 4 && (
                          <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            +{trip.items.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => navigate(`/trip/${trip.id}`)}
                    style={{
                      backgroundColor: '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaEye size={12} />
                    View
                  </button>
                  
                  {!trip.isPrivate && (
                    <button
                      onClick={() => handleShareTrip(trip)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FaShare size={12} />
                      Share
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteTrip(trip)}
                    disabled={deletingIds.has(trip.id)}
                    style={{
                      backgroundColor: deletingIds.has(trip.id) ? '#ccc' : '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: deletingIds.has(trip.id) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaTrash size={12} />
                    {deletingIds.has(trip.id) ? 'Deleting...' : 'Delete'}
                  </button>
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
    </div>
  );
};

export default MyTripsListView;