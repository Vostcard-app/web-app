import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaUser, FaSearch } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { NameMigrationService } from '../utils/nameMigration';

const AdminPanel: React.FC = () => {
  const { user, userRole, isAdmin, convertUserToGuide } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<{
    isRunning: boolean;
    processed: number;
    errors: string[];
  } | null>(null);

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

  const handleRunMigration = async () => {
    if (!confirm('Are you sure you want to run the name migration? This will update all existing users to have separate first and last names.')) {
      return;
    }

    setMigrationStatus({ isRunning: true, processed: 0, errors: [] });
    
    try {
      const results = await NameMigrationService.migrateExistingUsers();
      setMigrationStatus({ 
        isRunning: false, 
        processed: results.processed, 
        errors: results.errors 
      });
      
      if (results.success) {
        alert(`Migration completed successfully!\nProcessed: ${results.processed} users\nErrors: ${results.errors.length}`);
      } else {
        alert(`Migration completed with errors.\nProcessed: ${results.processed} users\nErrors: ${results.errors.length}`);
      }
    } catch (err) {
      console.error('Migration failed:', err);
      setMigrationStatus({ 
        isRunning: false, 
        processed: 0, 
        errors: [`Migration failed: ${err}`] 
      });
      alert(`Migration failed: ${err}`);
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
        <button
          onClick={() => navigate('/')}
          style={{
            marginLeft: '20px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🏠 Root View
        </button>
      </div>

      {/* Name Migration Section */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#495057' }}>
          <FaUser style={{ marginRight: '10px' }} />
          Name Migration Tool
        </h2>
        
        <p style={{ marginBottom: '15px', color: '#6c757d' }}>
          This tool will migrate all existing users to have separate first and last names. 
          Users who already have separate names will be skipped.
        </p>
        
        <button
          onClick={handleRunMigration}
          disabled={migrationStatus?.isRunning}
          style={{
            padding: '12px 24px',
            backgroundColor: migrationStatus?.isRunning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: migrationStatus?.isRunning ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {migrationStatus?.isRunning ? 'Running Migration...' : 'Run Name Migration'}
        </button>

        {migrationStatus && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: migrationStatus.errors.length > 0 ? '#f8d7da' : '#d1ecf1', 
            borderRadius: '4px', 
            border: `1px solid ${migrationStatus.errors.length > 0 ? '#f5c6cb' : '#bee5eb'}` 
          }}>
            <h4 style={{ marginBottom: '10px', color: '#495057' }}>Migration Results:</h4>
            <div style={{ marginBottom: '10px' }}>
              <strong>Status:</strong> {migrationStatus.isRunning ? 'Running...' : 'Completed'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Users Processed:</strong> {migrationStatus.processed}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Errors:</strong> {migrationStatus.errors.length}
            </div>
            
            {migrationStatus.errors.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h5 style={{ color: '#721c24', marginBottom: '10px' }}>Error Details:</h5>
                <div style={{ 
                  backgroundColor: '#f1f3f4', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  {migrationStatus.errors.map((error, index) => (
                    <div key={index} style={{ marginBottom: '5px', color: '#721c24' }}>
                      {index + 1}. {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert User to Guide Section */}
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
                    Role: {user.userRole || 'user'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Name: {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.name || 'Not set')}
                  </div>
                </div>
                
                {user.userRole !== 'guide' && (
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
                
                {user.userRole === 'guide' && (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                    ✅ Guide Account
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