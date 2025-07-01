import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const MyPrivateVostcardsListView = () => {
  const navigate = useNavigate();
  const { privateVostcards, loadPrivateVostcards } = useVostcard();

  // Load private Vostcards when component mounts
  useEffect(() => {
    loadPrivateVostcards();
  }, [loadPrivateVostcards]);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
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

      {/* 🔲 List of Saved Vostcards */}
      <div style={{ padding: '20px' }}>
        {privateVostcards.length === 0 ? (
          <p>No saved Vōstcards found.</p>
        ) : (
          privateVostcards.map((vostcard) => (
            <div key={vostcard.id} style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ margin: '0 0 8px 0' }}>{vostcard.title || 'Untitled Vōstcard'}</h2>
              <p>{vostcard.description || 'No description provided.'}</p>
              <p><strong>Categories:</strong> {vostcard.categories?.join(', ') || 'None'}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  style={{
                    backgroundColor: '#002B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/edit-vostcard/${vostcard.id}`)}
                >
                  Edit
                </button>
                <button
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/post-vostcard/${vostcard.id}`)}
                >
                  Post
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPrivateVostcardsListView;