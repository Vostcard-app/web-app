import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';

const ScriptEditorView: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/scripts');
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button 
            onClick={handleBack}
            style={{ background: '#667eea', color: 'white', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer' }}
          >
            <FaArrowLeft />
          </button>
          <button 
            onClick={() => navigate('/home')}
            style={{ background: '#667eea', color: 'white', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer' }}
          >
            <FaHome />
          </button>
          <h1>Script Editor</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 40, textAlign: 'center' }}>
        <h3>Script Editor Coming Soon</h3>
        <p>This feature is being implemented and will be available soon.</p>
        <button 
          onClick={() => navigate('/scripts')}
          style={{ background: '#667eea', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, cursor: 'pointer', marginTop: 20 }}
        >
          Back to Scripts
        </button>
      </div>
    </div>
  );
};

export default ScriptEditorView;