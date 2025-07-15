import React, { useEffect, useState } from 'react';
import { useVostcard } from '../context/VostcardContext';
import { useNavigate } from 'react-router-dom';

const SavedVostcardsListView: React.FC = () => {
  const { 
    savedVostcards, 
    syncVostcardMetadata, 
    downloadVostcardContent, 
    loadLocalVostcard 
  } = useVostcard();
  const navigate = useNavigate();
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  useEffect(() => {
    // Use lightweight metadata sync instead of full sync
    syncVostcardMetadata();
  }, [syncVostcardMetadata]);

  const handleEdit = async (id: string) => {
    try {
      setLoadingContent(id);
      
      // Check if this is metadata-only
      const vostcard = savedVostcards.find(v => v.id === id);
      if (vostcard?._isMetadataOnly) {
        console.log('📥 Downloading full content for editing...');
        await downloadVostcardContent(id);
      }
      
      // Load the vostcard for editing
      await loadLocalVostcard(id);
      navigate('/create-step1');
    } catch (error) {
      console.error('❌ Failed to load vostcard for editing:', error);
      alert('Failed to load vostcard. Please try again.');
    } finally {
      setLoadingContent(null);
    }
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
                opacity: loadingContent === vostcard.id ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{vostcard.title || 'Untitled'}</h3>
                  <p>{vostcard.description || 'No description.'}</p>
                  {vostcard.categories && (vostcard.categories?.length || 0) > 0 && (
                    <p><strong>Categories:</strong> {vostcard.categories.join(', ')}</p>
                  )}
                  
                  {/* Media indicators */}
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {vostcard.hasVideo && '🎥 Video'}
                    {vostcard.hasVideo && vostcard.hasPhotos && ' • '}
                    {vostcard.hasPhotos && '📸 Photos'}
                    {vostcard._isMetadataOnly && (
                      <span style={{ 
                        background: '#e3f2fd', 
                        color: '#1976d2', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        marginLeft: '8px'
                      }}>
                        📱 Synced
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => handleEdit(vostcard.id)}
                  disabled={loadingContent === vostcard.id}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: loadingContent === vostcard.id ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loadingContent === vostcard.id ? 'not-allowed' : 'pointer',
                    minWidth: '80px',
                  }}
                >
                  {loadingContent === vostcard.id ? '⏳ Loading...' : 'Edit'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedVostcardsListView;