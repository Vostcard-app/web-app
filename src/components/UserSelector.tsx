import React, { useState, useEffect } from 'react';
import { FaUser, FaSearch, FaTimes, FaUserCircle } from 'react-icons/fa';
import { PrivateVostcardService } from '../services/privateVostcardService';

interface User {
  id: string;
  username: string;
  avatarURL?: string;
}

interface UserSelectorProps {
  onUserSelect: (user: User) => void;
  currentUserID: string;
  selectedUser?: User | null;
  onClose?: () => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ 
  onUserSelect, 
  currentUserID, 
  selectedUser, 
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const users = await PrivateVostcardService.searchUsers(searchTerm, currentUserID);
        setSearchResults(users);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, currentUserID]);

  const handleUserSelect = (user: User) => {
    onUserSelect(user);
    setSearchTerm('');
    setShowResults(false);
  };

  const handleClearSelection = () => {
    onUserSelect(null as any);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Selected User Display */}
      {selectedUser && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #007aff',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              marginRight: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#e9ecef'
            }}>
              {selectedUser.avatarURL ? (
                <img 
                  src={selectedUser.avatarURL} 
                  alt={selectedUser.username} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <FaUserCircle size={40} color="#6c757d" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {selectedUser.username}
              </div>
              <div style={{ color: '#6c757d', fontSize: '14px' }}>
                Selected recipient
              </div>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#dc3545',
              padding: '8px'
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <div style={{ position: 'relative' }}>
          <FaSearch 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#6c757d' 
            }} 
          />
          <input
            type="text"
            placeholder="Search users to send private Vostcard..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
          />
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '8px'
            }}
          >
            <FaTimes size={16} />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isSearching && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Searching users...
        </div>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {searchResults.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserSelect(user)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                marginRight: '12px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e9ecef'
              }}>
                {user.avatarURL ? (
                  <img 
                    src={user.avatarURL} 
                    alt={user.username} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <FaUserCircle size={36} color="#6c757d" />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {user.username}
                </div>
                <div style={{ color: '#6c757d', fontSize: '13px' }}>
                  Tap to select
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && searchResults.length === 0 && searchTerm.trim().length >= 2 && !isSearching && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '16px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          No users found matching "{searchTerm}"
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

export default UserSelector; 