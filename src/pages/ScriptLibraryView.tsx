import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaHome } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext'; // For script management

const ScriptLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { scripts, loadScripts } = useVostcard();

  useEffect(() => {
    loadScripts().catch((err: any) => {
      console.error('⚠️ Failed to fetch scripts from Firebase:', err);
    });
  }, [loadScripts]);

  const handleCreateNew = () => {
    navigate('/script-editor'); // Navigate to script editor page
  };

  const handleUseScript = (script: any) => {
    if (!script?.content) {
      alert('This script has no content.');
      return;
    }
    // Navigate to script tool with the script content
    navigate(`/script-tool?script=${encodeURIComponent(script.content)}&title=${encodeURIComponent(script.title || '')}`);
  };

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: '0 auto', 
      padding: 20, 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button 
            onClick={() => navigate('/home')}
            style={{ background: '#667eea', color: 'white', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer' }}
          >
            <FaHome />
          </button>
          <h1>Script Library</h1>
        </div>
        <button 
          onClick={handleCreateNew}
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, cursor: 'pointer' }}
        >
          <FaPlus /> New Script
        </button>
      </div>

      {/* Scripts List */}
      <div>
        {scripts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <h3>No scripts found</h3>
            <p>Create your first script to get started</p>
            <button 
              onClick={handleCreateNew}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, cursor: 'pointer', marginTop: 20 }}
            >
              <FaPlus /> Create Your First Script
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
            {scripts.map((script) => (
              <div 
                key={script.id} 
                style={{ background: 'white', borderRadius: 15, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: 600 }}>
                  {script.title || 'Untitled'}
                </h3>
                <p style={{ color: '#666', lineHeight: 1.5, margin: 0, fontSize: '0.95rem' }}>
                  {script.content.split('\n')[0].substring(0, 100)}...
                </p>
                <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: 10 }}>
                  Created {script.createdAt ? new Date(script.createdAt).toLocaleDateString() : 'recently'}
                </div>
                <button
                  onClick={() => handleUseScript(script)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptLibraryView;