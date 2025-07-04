import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScripts } from '../context/ScriptContext';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaHome, FaFileAlt } from 'react-icons/fa';
import './ScriptLibraryView.css';

const ScriptLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { scripts, loading, error, deleteScript, searchScripts } = useScripts();
  const { username } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleCreateNew = () => {
    navigate('/script-editor');
  };

  const handleEditScript = (scriptId: string) => {
    navigate(`/script-editor/${scriptId}`);
  };

  const handleDeleteScript = async (scriptId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteScript(scriptId);
      } catch (error) {
        console.error('Failed to delete script:', error);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchScripts(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const displayScripts = searchTerm ? searchResults : scripts;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPreview = (content: string) => {
    const cleanContent = content.replace(/\n/g, ' ').trim();
    return cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;
  };

  if (loading) {
    return (
      <div className="script-library">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your scripts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="script-library">
      {/* Header */}
      <div className="script-header">
        <div className="header-left">
          <button className="nav-button" onClick={() => navigate('/home')}>
            <FaHome />
          </button>
          <h1>Script Library</h1>
        </div>
        <div className="header-right">
          <button className="create-button" onClick={handleCreateNew}>
            <FaPlus /> New Script
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Search scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Scripts List */}
      <div className="scripts-container">
        {displayScripts.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <h3>No scripts found</h3>
            <p>
              {searchTerm 
                ? `No scripts match "${searchTerm}"`
                : "Create your first script to get started"
              }
            </p>
            {!searchTerm && (
              <button className="create-button" onClick={handleCreateNew}>
                <FaPlus /> Create Your First Script
              </button>
            )}
          </div>
        ) : (
          <div className="scripts-grid">
            {displayScripts.map((script) => (
              <div key={script.id} className="script-card">
                <div className="script-header">
                  <h3 className="script-title">{script.title}</h3>
                  <div className="script-actions">
                    <button
                      onClick={() => handleEditScript(script.id)}
                      className="action-button edit"
                      title="Edit script"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.title)}
                      className="action-button delete"
                      title="Delete script"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <div className="script-content">
                  <p className="script-preview">
                    {getPreview(script.content)}
                  </p>
                </div>
                
                <div className="script-footer">
                  <span className="script-date">
                    Updated {formatDate(script.updatedAt)}
                  </span>
                  <span className="script-length">
                    {script.content.length} characters
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Loading */}
      {isSearching && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      )}
    </div>
  );
};

export default ScriptLibraryView; 