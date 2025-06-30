import React, { useEffect } from 'react';
import { useVostcard } from '../context/VostcardContext';
import { useNavigate } from 'react-router-dom';

const SavedVostcardsListView: React.FC = () => {
  const { savedVostcards, loadAllLocalVostcards, loadLocalVostcard } = useVostcard();
  const navigate = useNavigate();

  useEffect(() => {
    loadAllLocalVostcards();
  }, []);

  const handleEdit = (id: string) => {
    loadLocalVostcard(id);
    navigate('/create-step1'); // Replace with your actual edit view route
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Saved Vōstcards</h1>

      {savedVostcards.length === 0 ? (
        <p>No saved Vōstcards yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {savedVostcards.map((vostcard) => (
            <li
              key={vostcard.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <h3>{vostcard.title || 'Untitled'}</h3>
              <p>{vostcard.description || 'No description.'}</p>
              <p>
                <strong>Categories:</strong>{' '}
                {vostcard.categories.length > 0
                  ? vostcard.categories.join(', ')
                  : 'None'}
              </p>
              <button onClick={() => handleEdit(vostcard.id)}>Edit</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedVostcardsListView;