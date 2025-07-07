import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaVideo, FaImage, FaEye, FaTrash, FaUserCircle, FaInbox } from 'react-icons/fa';
import { PrivateVostcardService, type PrivateVostcard } from '../services/privateVostcardService';
import { useAuth } from '../context/AuthContext';

const PrivateVostcardsSharedWithMeView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [privateVostcards, setPrivateVostcards] = useState<PrivateVostcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVostcard, setSelectedVostcard] = useState<PrivateVostcard | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for received private Vostcards
    const unsubscribe = PrivateVostcardService.listenToReceivedPrivateVostcards(
      user.uid,
      (vostcards) => {
        setPrivateVostcards(vostcards);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const handleView = async (privateVostcard: PrivateVostcard) => {
    try {
      // Mark as read when viewed
      if (!privateVostcard.isRead) {
        await PrivateVostcardService.markAsRead(privateVostcard.id);
      }
      setSelectedVostcard(privateVostcard);
    } catch (error) {
      console.error('Error marking as read:', error);
      setSelectedVostcard(privateVostcard);
    }
  };

  const handleDelete = async (privateVostcard: PrivateVostcard) => {
    if (!user) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete this private Vostcard from "${privateVostcard.senderUsername}"?`
    );
    
    if (confirmed) {
      try {
        await PrivateVostcardService.deletePrivateVostcard(privateVostcard.id, user.uid);
      } catch (error) {
        console.error('Error deleting private Vostcard:', error);
        alert('Failed to delete private Vostcard. Please try again.');
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      let date: Date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>Loading private Vōstcards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>Please log in to view your private Vōstcards.</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '32px 0 24px 0', 
        borderBottomLeftRadius: 24, 
        borderBottomRightRadius: 24, 
        position: 'relative', 
        textAlign: 'center' 
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            left: 16, 
            top: 36, 
            background: 'rgba(0,0,0,0.10)', 
            border: 'none', 
            borderRadius: '50%', 
            width: 48, 
            height: 48, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer' 
          }} 
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft color="#fff" size={28} />
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2rem' }}>
          📥 Private Vōstcards
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {privateVostcards.length === 0 ? (
          // Empty State
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#6c757d'
          }}>
            <FaInbox size={64} color="#dee2e6" style={{ marginBottom: '24px' }} />
            <h3 style={{ margin: '0 0 12px 0', color: '#495057' }}>
              No Private Vōstcards Yet
            </h3>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5 }}>
              When someone shares a private Vōstcard with you,<br />
              it will appear here. Private Vōstcards sync<br />
              across all your devices (iOS & PWA).
            </p>
          </div>
        ) : (
          // Vostcards List
          <div>
            <div style={{ 
              marginBottom: '24px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#333'
            }}>
              {privateVostcards.length} Private Vōstcard{privateVostcards.length !== 1 ? 's' : ''} Shared With You
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {privateVostcards.map((privateVostcard) => (
                <div
                  key={privateVostcard.id}
                  style={{
                    background: privateVostcard.isRead ? 'white' : '#f8f9fa',
                    border: privateVostcard.isRead ? '1px solid #dee2e6' : '2px solid #007aff',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}
                >
                  {/* Unread indicator */}
                  {!privateVostcard.isRead && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 12,
                      height: 12,
                      background: '#007aff',
                      borderRadius: '50%'
                    }} />
                  )}

                  {/* Sender Info */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      marginRight: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#e9ecef'
                    }}>
                      <FaUserCircle size={36} color="#6c757d" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        {privateVostcard.senderUsername}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '14px' }}>
                        {formatDate(privateVostcard.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Vostcard Info */}
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: 600 
                    }}>
                      {privateVostcard.title}
                    </h4>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        color: '#28a745'
                      }}>
                        <FaVideo size={14} />
                        <span style={{ fontSize: '14px' }}>Video</span>
                      </div>

                      {privateVostcard.photoURLs.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: '#28a745'
                        }}>
                          <FaImage size={14} />
                          <span style={{ fontSize: '14px' }}>
                            {privateVostcard.photoURLs.length} photo{privateVostcard.photoURLs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {privateVostcard.description && (
                      <p style={{ 
                        margin: '0', 
                        fontSize: '14px', 
                        color: '#6c757d',
                        lineHeight: 1.4
                      }}>
                        {privateVostcard.description.length > 120 
                          ? `${privateVostcard.description.substring(0, 120)}...` 
                          : privateVostcard.description
                        }
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '12px' 
                  }}>
                    <button
                      onClick={() => handleDelete(privateVostcard)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                    
                    <button
                      onClick={() => handleView(privateVostcard)}
                      style={{
                        background: '#007aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEye size={12} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedVostcard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedVostcard(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                {selectedVostcard.title}
              </h2>
              <button
                onClick={() => setSelectedVostcard(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666',
                  padding: 8,
                }}
              >
                ×
              </button>
            </div>

            {/* Sender Info */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '20px' 
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                From:
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {selectedVostcard.senderUsername}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {formatDate(selectedVostcard.createdAt)}
              </div>
            </div>

            {/* Video */}
            {selectedVostcard.videoURL && (
              <div style={{ marginBottom: '20px' }}>
                <video 
                  src={selectedVostcard.videoURL} 
                  controls 
                  style={{ 
                    width: '100%', 
                    maxHeight: '300px', 
                    borderRadius: '8px' 
                  }} 
                />
              </div>
            )}

            {/* Photos */}
            {selectedVostcard.photoURLs.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '12px' 
                }}>
                  {selectedVostcard.photoURLs.map((photoURL, index) => (
                    <img
                      key={index}
                      src={photoURL}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedVostcard.description && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
                  Description:
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  lineHeight: 1.5,
                  color: '#444'
                }}>
                  {selectedVostcard.description}
                </p>
              </div>
            )}

            {/* Categories */}
            {selectedVostcard.categories && selectedVostcard.categories.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
                  Categories:
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedVostcard.categories.map((category, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#e9ecef',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#495057'
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateVostcardsSharedWithMeView; 