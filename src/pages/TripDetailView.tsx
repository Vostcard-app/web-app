import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaMapMarkerAlt, FaCalendar, FaImage, FaPlay, FaChevronRight, FaShare, FaEye, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { TripService } from '../services/tripService';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { Trip, TripItem } from '../types/TripTypes';

const TripDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsStatus, setItemsStatus] = useState<Map<string, { exists: boolean; loading: boolean }>>(new Map());
  const [cleaning, setCleaning] = useState(false);

  console.log('🔄 TripDetailView rendered', {
    id,
    user: !!user,
    loading,
    error,
    trip: trip?.name
  });

  useEffect(() => {
    if (id) {
      loadTrip();
    } else {
      setError('Invalid trip ID');
      setLoading(false);
    }
  }, [id]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        console.log('❌ No user authenticated');
        setError('Please log in to view this trip.');
        navigate('/login');
        return;
      }

      console.log('📋 Loading trip:', id);
      const tripData = await TripService.getTripById(id!);
      setTrip(tripData);
      console.log(`✅ Loaded trip: ${tripData.name} with ${tripData.items.length} items`);

    } catch (err) {
      console.error('❌ Error loading trip:', err);
      setError('Failed to load trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: TripItem) => {
    console.log('🔄 Item clicked:', item.vostcardID, item.type);
    if (item.type === 'quickcard') {
      navigate(`/quickcard/${item.vostcardID}`);
    } else {
      navigate(`/vostcard/${item.vostcardID}`);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    try {
      // Handle Firestore Timestamp or ISO string
      const jsDate = typeof date === 'string' ? new Date(date) : date.toDate ? date.toDate() : new Date(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getItemTypeIcon = (item: TripItem) => {
    if (item.type === 'quickcard') {
      return <FaImage style={{ color: '#007aff' }} />;
    } else {
      return <FaPlay style={{ color: '#34c759' }} />;
    }
  };

  const getItemTypeLabel = (item: TripItem) => {
    return item.type === 'quickcard' ? 'Quickcard' : 'Vostcard';
  };

  // ✅ Check if content still exists
  const checkContentExists = async (vostcardID: string) => {
    try {
      const docRef = doc(db, 'vostcards', vostcardID);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking content:', error);
      return false;
    }
  };

  // ✅ Check all trip items for existence
  const checkAllItemsExistence = async () => {
    if (!trip) return;
    
    const statusMap = new Map();
    
    for (const item of trip.items) {
      statusMap.set(item.vostcardID, { exists: false, loading: true });
      setItemsStatus(new Map(statusMap));
      
      const exists = await checkContentExists(item.vostcardID);
      statusMap.set(item.vostcardID, { exists, loading: false });
      setItemsStatus(new Map(statusMap));
    }
  };

  // ✅ Remove duplicates and deleted items
  const cleanupTrip = async () => {
    if (!trip || !id) return;
    
    setCleaning(true);
    try {
      // Find unique items (remove duplicates) and existing items
      const seen = new Set<string>();
      const validItems: TripItem[] = [];
      
      for (const item of trip.items) {
        const itemKey = `${item.vostcardID}-${item.type}`;
        
        // Skip duplicates
        if (seen.has(itemKey)) {
          console.log('🗑️ Removing duplicate:', item.title);
          await TripService.removeItemFromTrip(id, item.id);
          continue;
        }
        
        // Check if content exists
        const exists = await checkContentExists(item.vostcardID);
        if (!exists) {
          console.log('🗑️ Removing deleted content:', item.title);
          await TripService.removeItemFromTrip(id, item.id);
          continue;
        }
        
        seen.add(itemKey);
        validItems.push(item);
      }
      
      // Reload the trip to show cleaned data
      const updatedTrip = await TripService.getTripById(id);
      setTrip(updatedTrip);
      
      alert(`✅ Trip cleaned up!\n\n• Removed ${trip.items.length - validItems.length} duplicate/deleted items\n• ${validItems.length} valid items remaining`);
      
    } catch (error) {
      console.error('Error cleaning trip:', error);
      alert(`Error cleaning trip: ${error.message || 'Unknown error'}`);
    } finally {
      setCleaning(false);
    }
  };

  // ✅ Check for issues in the trip
  const getTripIssues = () => {
    if (!trip) return { duplicates: 0, deleted: 0, total: 0 };
    
    const seen = new Set<string>();
    let duplicates = 0;
    let deleted = 0;
    
    trip.items.forEach(item => {
      const itemKey = `${item.vostcardID}-${item.type}`;
      if (seen.has(itemKey)) {
        duplicates++;
      } else {
        seen.add(itemKey);
      }
      
      const status = itemsStatus.get(item.vostcardID);
      if (status && !status.loading && !status.exists) {
        deleted++;
      }
    });
    
    return { duplicates, deleted, total: trip.items.length };
  };

  // ✅ Check items existence when trip loads
  useEffect(() => {
    if (trip && trip.items.length > 0) {
      checkAllItemsExistence();
    }
  }, [trip]);

  if (loading) {
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
            <p style={{ color: '#666', fontSize: '14px' }}>Loading trip...</p>
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
              onClick={loadTrip}
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

  if (!trip) {
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
            <p style={{ color: '#666', fontSize: '16px' }}>Trip not found</p>
            <button
              onClick={() => navigate('/my-trips')}
              style={{
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Back to My Trips
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <button
              onClick={() => navigate('/my-trips')}
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
            <div style={{ flex: 1 }}>
              <h1 style={{
                color: 'white',
                fontWeight: 700,
                fontSize: '1.5rem',
                margin: 0,
                lineHeight: '1.2'
              }}>{trip.name}</h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '12px', 
                margin: '4px 0 0 0' 
              }}>
                {trip.items.length} {trip.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* ✅ Cleanup button if there are issues */}
            {(() => {
              const issues = getTripIssues();
              if (issues.duplicates > 0 || issues.deleted > 0) {
                return (
                  <button
                    onClick={cleanupTrip}
                    disabled={cleaning}
                    style={{
                      background: cleaning ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: cleaning ? 'not-allowed' : 'pointer',
                      color: 'white',
                      position: 'relative'
                    }}
                    title={`Clean up ${issues.duplicates} duplicates and ${issues.deleted} deleted items`}
                  >
                    {cleaning ? (
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        border: '2px solid #fff3cd', 
                        borderTop: '2px solid #fff', 
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <FaTrash size={14} />
                    )}
                    {/* Issue indicator */}
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: '#dc3545',
                      color: 'white',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      fontSize: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      {issues.duplicates + issues.deleted}
                    </div>
                  </button>
                );
              }
              return null;
            })()}
            
            {/* TODO: Add share functionality later */}
            <button
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
              onClick={() => console.log('Share trip - TODO')}
            >
              <FaShare size={16} />
            </button>
            
            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <FaHome size={16} />
            </button>
          </div>
        </div>

        {/* Trip Info */}
        <div style={{ padding: '20px 20px 16px 20px' }}>
          {trip.description && (
            <p style={{ 
              color: '#666', 
              fontSize: '14px', 
              margin: '0 0 12px 0',
              lineHeight: '1.4'
            }}>
              {trip.description}
            </p>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            fontSize: '12px',
            color: '#888'
          }}>
            <FaCalendar />
            Created {formatDate(trip.createdAt)}
          </div>
          
          {trip.isPublic && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e8f4fd',
              color: '#007aff',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              marginTop: '8px'
            }}>
              <FaEye size={10} />
              Public Trip
            </div>
          )}
        </div>

        {/* Items List */}
        <div style={{ 
          flex: 1,
          padding: '0 20px 20px 20px',
          overflowY: 'auto'
        }}>
          {trip.items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <FaMapMarkerAlt size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No items yet</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Add vostcards and quickcards to this trip when creating content!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trip.items
                .sort((a, b) => a.order - b.order) // Sort by order
                .map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
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
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    {/* Order number */}
                    <div style={{
                      background: '#f0f0f0',
                      color: '#666',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getItemTypeIcon(item)}
                          <span style={{
                            background: item.type === 'quickcard' ? '#e8f4fd' : '#e8f5e8',
                            color: item.type === 'quickcard' ? '#007aff' : '#34c759',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}>
                            {getItemTypeLabel(item)}
                          </span>
                          
                          {/* ✅ Status indicators */}
                          {(() => {
                            const status = itemsStatus.get(item.vostcardID);
                            const seen = new Set<string>();
                            let isDuplicate = false;
                            
                            // Check for duplicates by scanning items before this one
                            for (let i = 0; i < index; i++) {
                              const prevItem = trip.items[i];
                              const itemKey = `${prevItem.vostcardID}-${prevItem.type}`;
                              seen.add(itemKey);
                            }
                            
                            const currentItemKey = `${item.vostcardID}-${item.type}`;
                            isDuplicate = seen.has(currentItemKey);
                            
                            return (
                              <>
                                {/* Deleted content indicator */}
                                {status && !status.loading && !status.exists && (
                                  <span style={{
                                    background: '#fff2f2',
                                    color: '#dc3545',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    <FaExclamationTriangle size={8} />
                                    DELETED
                                  </span>
                                )}
                                
                                {/* Duplicate indicator */}
                                {isDuplicate && (
                                  <span style={{
                                    background: '#fff8e1',
                                    color: '#f57c00',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    fontWeight: '600'
                                  }}>
                                    DUPLICATE
                                  </span>
                                )}
                                
                                {/* Loading indicator */}
                                {status && status.loading && (
                                  <div style={{
                                    width: '12px',
                                    height: '12px',
                                    border: '1px solid #ddd',
                                    borderTop: '1px solid #007aff',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }} />
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <FaChevronRight style={{ color: '#007aff', fontSize: '12px' }} />
                      </div>
                      
                      <h3 style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.title || 'Untitled'}
                      </h3>
                      
                      {item.description && (
                        <p style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '14px', 
                          color: '#666',
                          lineHeight: '1.3',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {item.description}
                        </p>
                      )}
                      
                      <div style={{ 
                        fontSize: '12px',
                        color: '#888'
                      }}>
                        {item.username && `by ${item.username}`}
                        {item.latitude && item.longitude && (
                          <span style={{ marginLeft: '8px' }}>
                            📍 Location available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

export default TripDetailView;