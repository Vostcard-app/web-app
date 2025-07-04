import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaSave, FaTrash, FaHome } from 'react-icons/fa';

const ScriptEditorView: React.FC = () => {
  const navigate = useNavigate();
  const { scriptId } = useParams<{ scriptId: string }>();
  const { currentScript, setCurrentScript, createScript, updateScript, deleteScript } = useScripts();
  const { userID } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Calculate word and character count
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(content.length);
  }, [content]);

  // Load existing script if editing
  useEffect(() => {
    if (scriptId && currentScript && currentScript.id === scriptId) {
      setTitle(currentScript.title);
      setContent(currentScript.content);
      setLastSaved(currentScript.updatedAt);
      setHasUnsavedChanges(false);
    } else if (!scriptId) {
      // New script
      setTitle('');
      setContent('');
      setLastSaved(null);
      setHasUnsavedChanges(false);
    }
  }, [scriptId, currentScript]);

  // Track changes
  useEffect(() => {
    if (scriptId && currentScript) {
      const hasChanges = title !== currentScript.title || content !== currentScript.content;
      setHasUnsavedChanges(hasChanges);
    } else if (!scriptId) {
      setHasUnsavedChanges(title.trim() !== '' || content.trim() !== '');
    }
  }, [title, content, scriptId, currentScript]);

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
        const newScript = await createScript(title, content);
        navigate(`/script-editor/${newScript.id}`, { replace: true });
      }
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('✅ Script saved successfully');
    } catch (error) {
      console.error('❌ Failed to save script:', error);
      alert('Failed to save script. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!scriptId) {
      navigate('/scripts');
      return;
    }

    if (window.confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
      try {
        await deleteScript(scriptId);
        navigate('/scripts');
      } catch (error) {
        console.error('Failed to delete script:', error);
        alert('Failed to delete script. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/scripts');
      }
    } else {
      navigate('/scripts');
    }
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {isSaving && <span style={{ color: '#667eea', fontWeight: 600 }}>Saving...</span>}
            {lastSaved && !isSaving && (
              <span style={{ color: '#28a745' }}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || (!title.trim() && !content.trim())}
            style={{ 
              background: isSaving || (!title.trim() && !content.trim()) ? '#ccc' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: 10, 
              cursor: isSaving || (!title.trim() && !content.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSave /> Save
          </button>
          
          {scriptId && (
            <button 
              onClick={handleDelete}
              style={{ background: '#e74c3c', color: 'white', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer' }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, marginBottom: 20, background: 'white', padding: '15px 20px', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>Words:</span>
          <span style={{ color: '#333', fontWeight: 600, fontSize: '1.1rem' }}>{wordCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>Characters:</span>
          <span style={{ color: '#333', fontWeight: 600, fontSize: '1.1rem' }}>{charCount}</span>
        </div>
        {hasUnsavedChanges && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f39c12', fontWeight: 600, fontSize: '0.9rem' }}>
            <span style={{ width: 8, height: 8, background: '#f39c12', borderRadius: '50%' }}></span>
            Unsaved changes
          </div>
        )}
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

      {/* Info */}
      <div style={{ marginTop: 20, background: 'white', padding: '15px 20px', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
          💡 <strong>Auto-save:</strong> Your script saves automatically every 3 seconds
        </p>
        <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
          ⌘+S / Ctrl+S: Save manually
        </p>
      </div>
    </div>
  );
};

export default ScriptEditorView;