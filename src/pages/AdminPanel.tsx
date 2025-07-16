import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaUser, FaSearch } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const AdminPanel: React.FC = () => {
  const { user, userRole, isAdmin, convertUserToGuide } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
    }
  }, [isAdmin, navigate]);

  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Search users by email or username
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', searchTerm.toLowerCase()));
      const usernameQuery = query(usersRef, where('username', '==', searchTerm));
      
      const [emailResults, usernameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(usernameQuery)
      ]);
      
      const allResults = [
        ...emailResults.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...usernameResults.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Remove duplicates
      const uniqueResults = allResults.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      setSearchResults(uniqueResults);
      
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToGuide = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to convert ${userEmail} to a Guide account?`)) {
      return;
    }
    
    try {
      await convertUserToGuide(userId);
      alert(`Successfully converted ${userEmail} to Guide account!`);
      
      // Refresh search results
      await handleSearchUsers();
      
    } catch (err) {
      console.error('Error converting user to Guide:', err);
      alert('Failed to convert user to Guide. Please try again.');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <FaArrowLeft 
          onClick={() => navigate('/home')}
          style={{ cursor: 'pointer', marginRight: '10px', fontSize: '18px' }}
        />
        <h1>Admin Panel</h1>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <FaKey style={{ marginRight: '10px' }} />
          Convert User to Guide
        </h2>
        
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by email or username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '10px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
          />
          <button
            onClick={handleSearchUsers}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSearch style={{ marginRight: '5px' }} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        {searchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '10px' }}>Search Results:</h3>
            {searchResults.map((user) => (
              <div 
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  border: '1px solid #ddd'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    <FaUser style={{ marginRight: '5px' }} />
                    {user.email}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Username: {user.username || 'Not set'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Role: {user.role || 'user'}
                  </div>
                </div>
                
                {user.role !== 'guide' && (
                  <button
                    onClick={() => handleConvertToGuide(user.id, user.email)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <FaKey style={{ marginRight: '5px' }} />
                    Convert to Guide
                  </button>
                )}
                
                {user.role === 'guide' && (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                    ✓ Guide Account
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 