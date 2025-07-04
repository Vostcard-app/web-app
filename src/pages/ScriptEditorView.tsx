import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaSave, FaTrash, FaHome } from 'react-icons/fa';
import './ScriptEditorView.css';

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

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

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

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !title.trim() || !content.trim()) return;

    try {
      setIsSaving(true);
      if (scriptId) {
        await updateScript(scriptId, title, content);
      } else {
        const newScript = await createScript(title, content);
        // Navigate to the new script's edit page
        navigate(`/script-editor/${newScript.id}`, { replace: true });
      }
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('✅ Auto-saved successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [scriptId, title, content, hasUnsavedChanges, updateScript, createScript, navigate]);

  // Set up auto-save timer
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    if (hasUnsavedChanges && title.trim() && content.trim()) {
      const timer = setTimeout(autoSave, 3000); // Auto-save after 3 seconds of inactivity
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [title, content, hasUnsavedChanges, autoSave]);

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

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="script-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="header-left">
          <button className="nav-button" onClick={handleBack}>
            <FaArrowLeft />
          </button>
          <button className="nav-button" onClick={() => navigate('/home')}>
            <FaHome />
          </button>
          <h1>{scriptId ? 'Edit Script' : 'New Script'}</h1>
        </div>
        
        <div className="header-right">
          <div className="save-status">
            {isSaving && <span className="saving-indicator">Saving...</span>}
            {lastSaved && !isSaving && (
              <span className="last-saved">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={isSaving || (!title.trim() && !content.trim())}
          >
            <FaSave /> Save
          </button>
          
          {scriptId && (
            <button className="delete-button" onClick={handleDelete}>
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Words:</span>
          <span className="stat-value">{wordCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Characters:</span>
          <span className="stat-value">{charCount}</span>
        </div>
        {hasUnsavedChanges && (
          <div className="unsaved-indicator">
            <span className="dot"></span>
            Unsaved changes
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="editor-content">
        <div className="title-input-container">
          <input
            type="text"
            placeholder="Enter script title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
            maxLength={100}
          />
        </div>
        
        <div className="content-input-container">
          <textarea
            placeholder="Start writing your script..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="content-textarea"
            autoFocus
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="shortcuts-info">
        <p>💡 <strong>Auto-save:</strong> Your script saves automatically every 3 seconds</p>
        <p>⌘+S / Ctrl+S: Save manually</p>
      </div>
    </div>
  );
};

export default ScriptEditorView; 