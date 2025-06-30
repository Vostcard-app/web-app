import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import '../styles/MyPrivateVostcardsListView.css';

const MyPrivateVostcardsListView: React.FC = () => {
  const { localVostcards } = useVostcard();
  const navigate = useNavigate();

  // Filter by state === 'private' and sort by createdAt (newest first)
  const savedVostcards = (localVostcards || [])
    .filter((v) => v.state === 'private')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="vostcard-page">
      <div className="banner">Vōstcard</div>
      <h1 className="page-title">My Private Vōstcards</h1>

      {savedVostcards.length === 0 ? (
        <p className="empty-message">No private Vōstcards</p>
      ) : (
        <ul className="vostcard-list">
          {savedVostcards.map((vostcard) => (
            <li key={vostcard.id} className="vostcard-item">
              <div className="vostcard-info">
                <strong>{vostcard.title || 'Untitled'}</strong>
              </div>
              <button
                className="view-button"
                onClick={() => navigate(`/vostcard/${vostcard.id}`)}
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyPrivateVostcardsListView;