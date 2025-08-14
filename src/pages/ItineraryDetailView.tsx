import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaEdit, FaTrash, FaShare, FaPlus, FaGripVertical, FaEye, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ItineraryService } from '../services/itineraryService';
import type { Itinerary, ItineraryItem } from '../types/ItineraryTypes';

const ItineraryDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(new Set());

  console.log('🔄 ItineraryDetailView rendered', {
    id,
    user: !!user,
    loading,
    error,
    itinerary: itinerary?.name
  });

  useEffect(() => {
    if (id) {
      loadItinerary();
    } else {
      setError('Invalid itinerary ID');
      setLoading(false);
    }
  }, [id]);

  const loadItinerary = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Please log in to view this itinerary.');
        navigate('/login');
        return;
      }

      console.log('📋 Loading itinerary:', id);
      const itineraryData = await ItineraryService.getItinerary(id!);
      
      if (!itineraryData) {
        setError('Itinerary not found. It may have been deleted.');
        return;
      }

      // Check if user owns this itinerary
      if (itineraryData.userID !== user.uid) {
        setError('You do not have permission to view this itinerary.');
        return;
      }

      setItinerary(itineraryData);
      setEditName(itineraryData.name);
      setEditDescription(itineraryData.description || '');
      setEditIsPublic(itineraryData.isPublic);
      
      console.log(`✅ Loaded itinerary: ${itineraryData.name} with ${itineraryData.items.length} items`);

    } catch (err) {
      console.error('❌ Error loading itinerary:', err);
      setError('Failed to load itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItinerary = async () => {
    if (!editName.trim() || !itinerary) {
      alert('Please enter an itinerary name');
      return;
    }

    try {
      setUpdating(true);
      await ItineraryService.updateItinerary(itinerary.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        isPublic: editIsPublic
      });

      // Update local state
      setItinerary(prev => prev ? {
        ...prev,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        isPublic: editIsPublic
      } : null);

      setShowEditModal(false);
      console.log('✅ Updated itinerary');
    } catch (error) {
      console.error('❌ Error updating itinerary:', error);
      alert('Failed to update itinerary. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (item: ItineraryItem) => {
    if (!confirm(`Remove "${item.title || 'this item'}" from the itinerary?`)) {
      return;
    }

    try {
      setRemovingItemIds(prev => new Set(prev).add(item.id));
      await ItineraryService.removeItemFromItinerary(itinerary!.id, item.id);
      
      // Update local state
      setItinerary(prev => prev ? {
        ...prev,
        items: prev.items.filter(i => i.id !== item.id)
      } : null);

      console.log('✅ Removed item from itinerary:', item.id);
    } catch (error) {
      console.error('❌ Error removing item:', error);
      alert('Failed to remove item. Please try again.');
    } finally {
      setRemovingItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleItemClick = (item: ItineraryItem) => {
    // Navigate to public view of the vostcard/quickcard
    if (item.type === 'quickcard') {
      navigate(`/share-quickcard/${item.vostcardID}`);
    } else {
      navigate(`/share/${item.vostcardID}`);
    }
  };

  const handleShareItinerary = () => {
    if (!itinerary) return;

    const ensurePublicAndLink = async () => {
      let shareableLink = itinerary.shareableLink;
      if (!shareableLink) {
        shareableLink = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      if (!itinerary.isPublic || itinerary.shareableLink !== shareableLink) {
        try {
          await ItineraryService.updateItinerary(itinerary.id, {
            isPublic: true,
            // @ts-ignore allow updating
            shareableLink
          } as any);
          setItinerary(prev => prev ? { ...prev, isPublic: true, shareableLink } : prev);
        } catch (e) {
          alert('Failed to enable public sharing for this itinerary.');
        }
      }
      return shareableLink!;
    };

    (async () => {
      const link = await ensurePublicAndLink();
      const shareUrl = `${window.location.origin}/share-itinerary/${link}`;
    
    // Generate share text
    const shareText = `Check out this itinerary I created with Vōstcard

"${itinerary.name}"

${itinerary.description ? itinerary.description + '\n\n' : ''}${shareUrl}`;

      // Use native sharing or clipboard
      if (navigator.share) {
        navigator.share({ text: shareText }).catch(() => {
          navigator.clipboard.writeText(shareText).then(() => {
            alert('Share link copied to clipboard!');
          }).catch(() => {
            alert(`Share link: ${shareUrl}`);
          });
        });
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Share link copied to clipboard!');
        }).catch(() => {
          alert(`Share link: ${shareUrl}`);
        });
      }
    })();
  };

  const moveItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!itinerary) return;

    const items = [...itinerary.items];
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= items.length) return;

    // Swap items
    [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];
    
    // Update order values
    items.forEach((item, index) => {
      item.order = index;
    });

    try {
      // Update in Firebase
      const itemIds = items.map(item => item.id);
      await ItineraryService.reorderItineraryItems(itinerary.id, itemIds);
      
      // Update local state
      setItinerary(prev => prev ? { ...prev, items } : null);
      console.log('✅ Reordered items');
    } catch (error) {
      console.error('❌ Error reordering items:', error);
      alert('Failed to reorder items. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>📋</div>
          <div>Loading itinerary...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center', maxWidth: '300px', padding: '20px' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>❌</div>
          <div style={{ marginBottom: '20px' }}>{error}</div>
          <button
            onClick={() => navigate('/itineraries')}
            style={{
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer'
            }}
          >
            Back to Itineraries
          </button>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
        {/* Header */}
        <div style={{
          background: '#07345c',
          padding: '15px 16px 9px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
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
            onClick={() => navigate('/itineraries')}
          >
            <FaArrowLeft color="#fff" size={20} />
          </button>
          <div style={{ color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', lineHeight: '1.2' }}>
              {itinerary.name}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {itinerary.items.length} item{itinerary.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            onClick={() => setShowEditModal(true)}
          >
            <FaEdit color="#fff" size={18} />
          </button>
          
          {itinerary.isPublic && (
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
              onClick={handleShareItinerary}
            >
              <FaShare color="#fff" size={18} />
            </button>
          )}
          
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
            <FaHome color="#fff" size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Itinerary Info */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {itinerary.description && (
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.5'
            }}>
              {itinerary.description}
            </p>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '14px',
            color: '#888'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaClock size={12} />
              Created {formatDate(itinerary.createdAt)}
            </div>
          </div>
        </div>

        {/* Items List */}
        {itinerary.items.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Items Yet</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666' }}>
              Add vostcards and quickcards to your itinerary using the "Add to Itinerary" buttons.
            </p>
            <button
              onClick={() => navigate('/home')}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Explore Content
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itinerary.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                {/* Item Image */}
                <div
                  style={{
                    minWidth: '80px',
                    height: '80px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  {item.photoURL ? (
                    <img
                      src={item.photoURL}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '32px' }}>
                      {item.type === 'quickcard' ? '📷' : '📱'}
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                        onClick={() => handleItemClick(item)}
                      >
                        {item.title || 'Untitled'}
                      </h4>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#888',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        {/* Type labels removed per request */}
                        
                        {item.username && (
                          <span>by {item.username}</span>
                        )}
                      </div>

                      {item.latitude && item.longitude && (
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FaMapMarkerAlt size={10} />
                          <span>Location available</span>
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginLeft: '8px'
                    }}>
                      {/* Reorder buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => moveItem(item.id, 'up')}
                          disabled={index === 0}
                          style={{
                            backgroundColor: index === 0 ? '#f0f0f0' : '#e0e0e0',
                            color: index === 0 ? '#ccc' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          ↑
                        </button>
                        
                        <button
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === itinerary.items.length - 1}
                          style={{
                            backgroundColor: index === itinerary.items.length - 1 ? '#f0f0f0' : '#e0e0e0',
                            color: index === itinerary.items.length - 1 ? '#ccc' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: index === itinerary.items.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          ↓
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        disabled={removingItemIds.has(item.id)}
                        style={{
                          backgroundColor: removingItemIds.has(item.id) ? '#ffebee' : '#fff5f5',
                          color: removingItemIds.has(item.id) ? '#ccc' : '#d32f2f',
                          border: '1px solid #ffcdd2',
                          borderRadius: '4px',
                          width: '52px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: removingItemIds.has(item.id) ? 'not-allowed' : 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        <FaTrash size={10} />
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Itinerary Modal */}
      {showEditModal && (
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
          onClick={() => !updating && setShowEditModal(false)}
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
              Edit Itinerary
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
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                disabled={updating}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
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
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
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
                disabled={updating}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                cursor: updating ? 'not-allowed' : 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  disabled={updating}
                  style={{ cursor: updating ? 'not-allowed' : 'pointer' }}
                />
                <span>Make itinerary public (allows sharing)</span>
              </label>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={updating}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleUpdateItinerary}
                disabled={updating || !editName.trim()}
                style={{
                  backgroundColor: updating || !editName.trim() ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: updating || !editName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryDetailView;