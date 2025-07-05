import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { FaArrowLeft, FaSave, FaHome } from 'react-icons/fa';

const ScriptEditorView: React.FC = () => {
  const navigate = useNavigate();
  const { scriptId } = useParams<{ scriptId: string }>();
  const { createScript, updateScript } = useScripts();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your script');
      return;
    }

    if (!content.trim()) {
      alert('Please enter some content for your script');
      return;
    }

    try {
      setIsSaving(true);
      if (scriptId) {
        await updateScript(scriptId, title, content);
      } else {
        await createScript(title, content);
      }
      navigate('/scripts');
    } catch (error) {
      console.error('Failed to save script:', error);
      alert('Failed to save script. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
          <h1>{scriptId ? 'Edit Script' : 'New Script'}</h1>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{ 
            background: isSaving ? '#ccc' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: 10, 
            cursor: isSaving ? 'not-allowed' : 'pointer'
          }}
        >
          <FaSave /> {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Editor Content */}
      <div style={{ background: 'white', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0 20px' }}>
          <input
            type="text"
            placeholder="Enter script title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: 15, border: '2px solid #e9ecef', borderRadius: 10, fontSize: '1.5rem', fontWeight: 600, color: '#333' }}
            maxLength={100}
          />
        </div>
        
        <div style={{ padding: 20 }}>
          <textarea
            placeholder="Start writing your script..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: 500, 
              padding: 20, 
              border: '2px solid #e9ecef', 
              borderRadius: 10, 
              fontSize: '1.1rem', 
              lineHeight: 1.6, 
              color: '#333', 
              resize: 'vertical',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default ScriptEditorView;