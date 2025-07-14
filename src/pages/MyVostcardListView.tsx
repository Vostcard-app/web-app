import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';
import { useAuth } from '../context/AuthContext';

const MyVostcardListView = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { savedVostcards, loadAllLocalVostcards, loadLocalVostcard, deletePrivateVostcard, resetSyncTimestamp } = useVostcard();

  // Load all Vostcards when component mounts AND authentication is complete
  useEffect(() => {
    if (!loading) {
      console.log('🔄 MyVostcardListView: Auth loading complete, loading vostcards...', { hasUser: !!user });
      loadAllLocalVostcards();
    }
  }, [loadAllLocalVostcards, loading, user]);

  const handleEdit = (vostcardId: string) => {
    loadLocalVostcard(vostcardId);
    navigate(`/edit-vostcard/${vostcardId}`);
  };

  const handleView = (vostcardId: string) => {
    loadLocalVostcard(vostcardId);
    navigate(`/vostcard/${vostcardId}`);
  };

  const handleDelete = async (e: React.MouseEvent, vostcardId: string) => {
    // Stop event propagation to prevent parent container click
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this Vōstcard? This action cannot be undone.')) {
      try {
        await deletePrivateVostcard(vostcardId);
        alert('Vōstcard deleted successfully!');
      } catch (error) {
        console.error('Failed to delete Vostcard:', error);
        alert('Failed to delete Vōstcard. Please try again.');
      }
    }
  };



  const getVostcardStatus = (vostcard: any) => {
    if (!vostcard.video) return 'No Video';
    if ((vostcard.photos?.length || 0) < 2) return 'Need More Photos';
    if (!vostcard.title) return 'No Title';
    if (!vostcard.description) return 'No Description';
    if ((vostcard.categories?.length || 0) === 0) return 'No Categories';
    return 'Ready to Post';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready to Post': return '#28a745';
      case 'No Video': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f5f5f5' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#07345c',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '16px',
        color: 'white',
        position: 'relative',
        padding: '15px 0 24px 20px'
      }}>
        <h1 style={{ fontSize: '30px', margin: 0 }}>My Vōstcards</h1>
        
        {/* Home Button */}
        <FaHome
          size={48}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 📋 List of Vostcards */}
      <div style={{ padding: '20px', height: 'calc(100vh - 55px)', overflowY: 'auto' }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <h2>Loading...</h2>
            <p>Checking authentication and syncing vostcards...</p>
          </div>
        ) : savedVostcards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <h2>No Vōstcards Found</h2>
            <p>You haven't created any Vōstcards yet.</p>
            {!user && (
              <p style={{ color: '#ff6b35', fontSize: '14px', marginTop: '10px' }}>
                💡 To sync vostcards from other devices, please log in to your account.
              </p>
            )}
            {user && (
              <p style={{ color: '#007bff', fontSize: '14px', marginTop: '10px' }}>
                💡 Vostcards from your other devices will sync automatically when you visit this page.
              </p>
            )}
            {/* Debug buttons */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  resetSyncTimestamp();
                  loadAllLocalVostcards();
                }}
                style={{
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🔄 Force Full Sync
              </button>
              <button
                onClick={() => {
                  console.log('🔍 Current sync timestamp:', localStorage.getItem('vostcard_last_sync'));
                  console.log('🔍 Current user:', user?.uid);
                  console.log('🔍 Current savedVostcards count:', savedVostcards.length);
                }}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🔍 Debug Info
              </button>
            </div>
                          <button
                onClick={() => navigate('/create-step1')}
                style={{
                  backgroundColor: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  marginTop: '20px',
                  cursor: 'pointer'
                }}
              >
              Create Your First Vōstcard
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#002B4D' }}>
                {savedVostcards.length} Vōstcard{savedVostcards.length !== 1 ? 's' : ''} Available
              </h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                Edit your Vōstcards or post them to the map when ready.
              </p>
            </div>

            {[...savedVostcards]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((vostcard) => {
              const status = getVostcardStatus(vostcard);
              const statusColor = getStatusColor(status);
              
              return (
                <div key={vostcard.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0'
                }}>
                  {/* Header with Title and Status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: '0 0 4px 0', 
                        color: '#002B4D',
                        fontSize: '18px'
                      }}>
                        {vostcard.title || 'Untitled Vōstcard'}
                      </h3>
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: statusColor,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {status}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {vostcard.description && (
                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {vostcard.description}
                    </p>
                  )}

                  {/* Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '8px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <div>
                      <strong>Video:</strong> {vostcard.video ? '✅' : '❌'}
                    </div>
                    <div>
                      <strong>Photos:</strong> {(vostcard.photos?.length || 0)}/2
                    </div>
                    <div>
                      <strong>Title:</strong> {vostcard.title ? '✅' : '❌'}
                    </div>
                    <div>
                      <strong>Description:</strong> {vostcard.description ? '✅' : '❌'}
                    </div>
                    <div>
                      <strong>Categories:</strong> {(vostcard.categories?.length || 0)}
                    </div>
                    <div>
                      <strong>Location:</strong> {vostcard.geo ? '✅' : '❌'}
                    </div>
                  </div>

                  {/* Categories */}
                  {(vostcard.categories?.length || 0) > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ fontSize: '12px', color: '#666' }}>Categories:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {vostcard.categories.map((category, index) => (
                          <span key={index} style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px'
                          }}>
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      style={{
                        backgroundColor: '#002B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px'
                      }}
                      onClick={() => handleEdit(vostcard.id)}
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>
                    
                    <button
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px'
                      }}
                      onClick={() => handleView(vostcard.id)}
                    >
                      <FaEye size={12} />
                      View
                    </button>

                    <button
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px'
                      }}
                      onClick={(e) => handleDelete(e, vostcard.id)}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                  </div>

                  {/* Last Updated */}
                  <div style={{
                    marginTop: '12px',
                    fontSize: '11px',
                    color: '#999',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '8px'
                  }}>
                    Last updated: {new Date(vostcard.updatedAt).toLocaleDateString()} at {new Date(vostcard.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVostcardListView; 