

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';

const MyPrivateVostcardsListView = () => {
  const { savedVostcards } = useVostcard();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Private Vōstcards</h1>
      {savedVostcards.length === 0 ? (
        <p>No saved Vōstcards yet.</p>
      ) : (
        <div>
          {savedVostcards.map((vostcard) => (
            <div
              key={vostcard.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '10px',
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/create-step1?id=${vostcard.id}`)}
            >
              <h3>{vostcard.title || 'Untitled'}</h3>
              <p>{vostcard.description || 'No description'}</p>
              <p><strong>Categories:</strong> {vostcard.categories?.join(', ') || 'None'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPrivateVostcardsListView;