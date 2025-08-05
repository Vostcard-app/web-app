import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaPlus, FaMapMarkerAlt, FaCalendar, FaChevronRight, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { ItineraryService } from '../services/itineraryService';
import type { Itinerary } from '../types/ItineraryTypes';

const MyTripsListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useResponsive();
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  console.log('🔄 MyTripsListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    tripsCount: trips.length
  });

  useEffect(() => {
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
      const userTrips = await ItineraryService.getUserItineraries();
      setTrips(userTrips);
      console.log(`✅ Loaded ${userTrips.length} trips`);

    } catch (err) {
      console.error('❌ Error loading trips:', err);
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTripClick = (tripId: string) => {
    console.log('🔄 Trip clicked:', tripId);
    // TODO: Navigate to trip detail view when it's created
    navigate(`/trip/${tripId}`);
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
      
      // Add to the trips list
      setTrips(prevTrips => [newTrip, ...prevTrips]);
      
      // Reset and close modal
      setNewTripName('');
      setShowCreateModal(false);
      
      console.log('✅ Created new trip:', newTrip.id);
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
        minHeight: '100vh', 
        backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? '20px' : '0'
      }}>
        <div style={{
          width: isDesktop ? '390px' : '100%',
          maxWidth: '390px',
          height: isDesktop ? '844px' : '100vh',
          backgroundColor: '#fff',
          boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
          borderRadius: isDesktop ? '16px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #007aff', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading your trips...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? '20px' : '0'
      }}>
        <div style={{
          width: isDesktop ? '390px' : '100%',
          maxWidth: '390px',
          height: isDesktop ? '844px' : '100vh',
          backgroundColor: '#fff',
          boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
          borderRadius: isDesktop ? '16px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#ff3b30', fontSize: '16px', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={loadTrips}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDesktop ? '#f0f0f0' : '#fff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: isDesktop ? '20px' : '0'
    }}>
      <div style={{
        width: isDesktop ? '390px' : '100%',
        maxWidth: '390px',
        height: isDesktop ? '844px' : '100vh',
        backgroundColor: '#fff',
        boxShadow: isDesktop ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
        borderRadius: isDesktop ? '16px' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        
        {/* Header */}
        <div style={{
          background: '#07345c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 24px 24px 24px',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderTopLeftRadius: isDesktop ? 16 : 0,
          borderTopRightRadius: isDesktop ? 16 : 0,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 style={{
                color: 'white',
                fontWeight: 700,
                fontSize: '1.8rem',
                margin: 0,
              }}>My Trips</h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                margin: '4px 0 0 0' 
              }}>
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
              </p>
            </div>
          </div>
          
          <FaHome
            size={24}
            style={{
              cursor: 'pointer',
              color: 'white',
            }}
            onClick={() => navigate('/home')}
          />
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          
          {/* Create New Trip Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              background: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007aff'}
          >
            <FaPlus />
            Create New Trip
          </button>

          {/* Trips List */}
          {trips.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <FaMapMarkerAlt size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No trips yet</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Create your first trip to start planning your adventures!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => handleTripClick(trip.id)}
                  style={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#007aff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '18px', 
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                      paddingRight: '12px'
                    }}>
                      {trip.name}
                    </h3>
                    <FaChevronRight style={{ color: '#007aff', fontSize: '14px' }} />
                  </div>
                  
                  {trip.description && (
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '14px', 
                      color: '#666',
                      lineHeight: '1.4'
                    }}>
                      {trip.description}
                    </p>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    fontSize: '12px',
                    color: '#888'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaCalendar />
                      {formatDate(trip.createdAt)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaMapMarkerAlt />
                      {trip.items?.length || 0} {trip.items?.length === 1 ? 'stop' : 'stops'}
                    </div>
                    {trip.isPublic && (
                      <span style={{
                        background: '#e8f4fd',
                        color: '#007aff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}>
                        Public
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
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
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#333'
              }}>
                Create New Trip
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTripName('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FaTimes style={{ color: '#666' }} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Enter trip name..."
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTripName.trim()) {
                  handleCreateNewTrip();
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '20px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              autoFocus
            />

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTripName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewTrip}
                disabled={!newTripName.trim() || isCreatingTrip}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: newTripName.trim() && !isCreatingTrip ? '#007aff' : '#b0b0b0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: newTripName.trim() && !isCreatingTrip ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                {isCreatingTrip ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for loading spinner */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default MyTripsListView;