import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaTrash } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const MyPrivateVostcardsListView = () => {
  const navigate = useNavigate();
  const { savedVostcards, loadAllLocalVostcards, loadLocalVostcard, deletePrivateVostcard } = useVostcard();

  // Load private Vostcards when component mounts
  useEffect(() => {
    loadAllLocalVostcards();
  }, [loadAllLocalVostcards]);

  const handleEdit = (vostcardId: string) => {
    loadLocalVostcard(vostcardId);
    navigate('/create-step1');
  };

  const handleDelete = async (vostcardId: string) => {
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

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f5f5f5' }}>
      {/* 🔵 Header with Home Icon */}
      <div style={{
        backgroundColor: '#002B4D',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>My Private Vōstcards</h1>
        <FaHome
          size={28}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* 📋 List of Vostcards */}
      <div style={{ padding: '20px', height: 'calc(100vh - 70px)', overflowY: 'auto' }}>
        {savedVostcards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <h2>No Private Vōstcards</h2>
            <p>You haven't created any private Vōstcards yet.</p>
            <button
              onClick={() => navigate('/create-step1')}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Create Your First Vōstcard
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {savedVostcards.map((vostcard) => (
              <div key={vostcard.id} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#002B4D',
                  fontSize: '18px'
                }}>
                  {vostcard.title || 'Untitled Vōstcard'}
                </h3>
                
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

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
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
                      fontSize: '14px'
                    }}
                    onClick={() => handleEdit(vostcard.id)}
                  >
                    Edit
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
                    onClick={() => handleDelete(vostcard.id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPrivateVostcardsListView;
