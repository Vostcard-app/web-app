import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { FaPlus, FaHome } from 'react-icons/fa';

const ScriptLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { scripts, loading, error } = useScripts();

  const handleCreateNew = () => {
    navigate('/script-editor');
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>Loading your scripts...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
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

      {/* Error Display */}
      {error && (
        <div style={{ background: '#fee', color: '#c33', padding: 15, borderRadius: 10, marginBottom: 20, borderLeft: '4px solid #c33' }}>
          <p>{error}</p>
        </div>
      )}

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
              <div key={script.id} style={{ background: 'white', borderRadius: 15, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: 600 }}>
                  {script.title}
                </h3>
                <p style={{ color: '#666', lineHeight: 1.5, margin: '15px 0', fontSize: '0.95rem' }}>
                  {script.content.substring(0, 100)}...
                </p>
                <div style={{ fontSize: '0.85rem', color: '#999' }}>
                  Updated {script.updatedAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptLibraryView; 