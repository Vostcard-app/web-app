import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye, FaShare, FaMap } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ItineraryService } from '../services/itineraryService';
import type { Itinerary } from '../types/ItineraryTypes';

const ItinerariesListView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItineraryName, setNewItineraryName] = useState('');
  const [newItineraryDescription, setNewItineraryDescription] = useState('');
  const [creating, setCreating] = useState(false);

  console.log('🔄 ItinerariesListView rendered', {
    authLoading,
    user: !!user,
    loading,
    error,
    itinerariesCount: itineraries.length
  });

  useEffect(() => {
    console.log('🔄 Auth state changed:', { authLoading, user: !!user });
    if (!authLoading) {
      loadItineraries();
    }
  }, [authLoading, user]);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        console.log('❌ No user authenticated');
        setError('Please log in to view your itineraries.');
        navigate('/login');
        return;
      }

      console.log('📋 Loading user itineraries...');
      const userItineraries = await ItineraryService.getUserItineraries();
      setItineraries(userItineraries);
      console.log(`✅ Loaded ${userItineraries.length} itineraries`);

    } catch (err) {
      console.error('❌ Error loading itineraries:', err);
      setError('Failed to load itineraries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) {
      alert('Please enter an itinerary name');
      return;
    }

    try {
      setCreating(true);
      const newItinerary = await ItineraryService.createItinerary({
        name: newItineraryName.trim(),
        description: newItineraryDescription.trim() || undefined,
        isPublic: true
      });

      setItineraries(prev => [newItinerary, ...prev]);
      setShowCreateModal(false);
      setNewItineraryName('');
      setNewItineraryDescription('');
      
      console.log('✅ Created new itinerary:', newItinerary.id);
    } catch (error) {
      console.error('❌ Error creating itinerary:', error);
      alert('Failed to create itinerary. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteItinerary = async (itinerary: Itinerary) => {
    if (!confirm(`Are you sure you want to delete "${itinerary.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(itinerary.id));
      await ItineraryService.deleteItinerary(itinerary.id);
      setItineraries(prev => prev.filter(i => i.id !== itinerary.id));
      console.log('✅ Deleted itinerary:', itinerary.id);
    } catch (error) {
      console.error('❌ Error deleting itinerary:', error);
      alert('Failed to delete itinerary. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itinerary.id);
        return newSet;
      });
    }
  };

  const handleShareItinerary = (itinerary: Itinerary) => {
    if (itinerary.shareableLink) {
      const shareUrl = `${window.location.origin}/itinerary/${itinerary.shareableLink}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        alert(`Share link: ${shareUrl}`);
      });
    } else {
      alert('This itinerary is not public and cannot be shared.');
    }
  };

  const getItinerarySummary = (itinerary: Itinerary) => {
    const itemCount = itinerary.items.length;
    const vostcardCount = itinerary.items.filter(item => item.type === 'vostcard').length;
    const quickcardCount = itinerary.items.filter(item => item.type === 'quickcard').length;
    
    if (itemCount === 0) return 'Empty itinerary';
    
    const parts = [];
    if (vostcardCount > 0) parts.push(`${vostcardCount} vostcard${vostcardCount !== 1 ? 's' : ''}`);
    if (quickcardCount > 0) parts.push(`${quickcardCount} quickcard${quickcardCount !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
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
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>📋</div>
          <div>Loading itineraries...</div>
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
            onClick={loadItineraries}
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
            My Itineraries
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
        {/* Create New Itinerary Button */}
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
          Create New Itinerary
        </button>

        {/* Itineraries List */}
        {itineraries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Itineraries Yet</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Create your first itinerary to start planning your adventures!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0'
                }}
              >
                {/* Itinerary Header */}
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
                      onClick={() => navigate(`/itinerary/${itinerary.id}`)}
                    >
                      {itinerary.name}
                    </h3>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4'
                    }}>
                      {itinerary.description || 'No description'}
                    </p>
                    <div style={{
                      fontSize: '13px',
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span>{getItinerarySummary(itinerary)}</span>
                      {itinerary.isPublic && (
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
                {itinerary.items.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    overflowX: 'auto'
                  }}>
                    {itinerary.items.slice(0, 4).map((item, index) => (
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
                        {index === 3 && itinerary.items.length > 4 && (
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
                            +{itinerary.items.length - 4}
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
                    onClick={() => navigate(`/itinerary/${itinerary.id}`)}
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
                  
                  {itinerary.isPublic && (
                    <button
                      onClick={() => handleShareItinerary(itinerary)}
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
                    onClick={() => handleDeleteItinerary(itinerary)}
                    disabled={deletingIds.has(itinerary.id)}
                    style={{
                      backgroundColor: deletingIds.has(itinerary.id) ? '#ccc' : '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: deletingIds.has(itinerary.id) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaTrash size={12} />
                    {deletingIds.has(itinerary.id) ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Itinerary Modal */}
      {showCreateModal && (
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
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
              Create New Itinerary
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
                value={newItineraryName}
                onChange={(e) => setNewItineraryName(e.target.value)}
                placeholder="Enter itinerary name"
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
                value={newItineraryDescription}
                onChange={(e) => setNewItineraryDescription(e.target.value)}
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
                onClick={handleCreateItinerary}
                disabled={creating || !newItineraryName.trim()}
                style={{
                  backgroundColor: creating || !newItineraryName.trim() ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: creating || !newItineraryName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItinerariesListView;