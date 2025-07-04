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

      {/* Search Bar */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <input
            type="text"
            placeholder="Search scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, padding: '15px 20px', border: 'none', outline: 'none', fontSize: 16 }}
          />
          <button onClick={handleSearch} style={{ background: '#667eea', color: 'white', border: 'none', padding: '15px 20px', cursor: 'pointer' }}>
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ background: '#fee', color: '#c33', padding: 15, borderRadius: 10, marginBottom: 20, borderLeft: '4px solid #c33' }}>
          <p>{error}</p>
        </div>
      )}

      {/* Scripts List */}
      <div>
        {displayScripts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <FaFileAlt style={{ fontSize: '4rem', color: '#ccc', marginBottom: 20 }} />
            <h3>No scripts found</h3>
            <p>
              {searchTerm 
                ? `No scripts match "${searchTerm}"`
                : "Create your first script to get started"
              }
            </p>
            {!searchTerm && (
              <button 
                onClick={handleCreateNew}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, cursor: 'pointer', marginTop: 20 }}
              >
                <FaPlus /> Create Your First Script
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
            {displayScripts.map((script) => (
              <div key={script.id} style={{ background: 'white', borderRadius: 15, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: 600, flex: 1, marginRight: 10 }}>
                    {script.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEditScript(script.id)}
                      style={{ background: 'none', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer', color: '#667eea' }}
                      title="Edit script"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.title)}
                      style={{ background: 'none', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer', color: '#e74c3c' }}
                      title="Delete script"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <div style={{ marginBottom: 15 }}>
                  <p style={{ color: '#666', lineHeight: 1.5, margin: 0, fontSize: '0.95rem' }}>
                    {getPreview(script.content)}
                  </p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#999' }}>
                  <span style={{ fontStyle: 'italic' }}>
                    Updated {formatDate(script.updatedAt)}
                  </span>
                  <span style={{ background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', padding: '4px 8px', borderRadius: 12, fontWeight: 500 }}>
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
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div>Searching...</div>
        </div>
      )}
    </div>
  );
};

export default ScriptLibraryView; 