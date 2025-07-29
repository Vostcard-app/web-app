import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaUser, FaSearch } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const AdminPanel: React.FC = () => {
  const { user, userRole, isAdmin, convertUserToGuide, convertUserToAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

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

  const handleConvertToAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to convert ${userEmail} to an Admin account? This will give them full administrative privileges.`)) {
      return;
    }
    
    try {
      await convertUserToAdmin(userId);
      alert(`Successfully converted ${userEmail} to Admin account!`);
      
      // Refresh admin search results
      await handleSearchAdminUsers();
      
    } catch (err) {
      console.error('Error converting user to Admin:', err);
      alert('Failed to convert user to Admin. Please try again.');
    }
  };

  const handleSearchAdminUsers = async () => {
    if (!adminSearchTerm.trim()) return;
    
    setAdminLoading(true);
    setAdminError(null);
    
    try {
      // Search users by email or username (same logic as handleSearchUsers)
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', adminSearchTerm.toLowerCase()));
      const usernameQuery = query(usersRef, where('username', '==', adminSearchTerm));
      
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
      
      setAdminSearchResults(uniqueResults);
      
    } catch (err) {
      console.error('Error searching users for admin conversion:', err);
      setAdminError('Failed to search users. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  };



  const searchForDocument = async (docId: string) => {
    try {
      console.log(`🔍 Searching for document: ${docId}`);
      
      // Check vostcards collection
      const vostcardRef = doc(db, 'vostcards', docId);
      const vostcardSnap = await getDoc(vostcardRef);
      
      if (vostcardSnap.exists()) {
        console.log(`✅ Found in vostcards:`, vostcardSnap.data());
        alert(`✅ Found in vostcards collection: ${JSON.stringify(vostcardSnap.data(), null, 2)}`);
      } else {
        console.log(`❌ Not found in vostcards collection`);
      }
      
      // Check if there are similar IDs in vostcards
      const vostcardsQuery = query(collection(db, 'vostcards'));
      const vostcardsSnapshot = await getDocs(vostcardsQuery);
      
             let similarDocs: Array<{ id: string; collection: string; data: any }> = [];
       vostcardsSnapshot.docs.forEach(doc => {
         if (doc.id.includes('6212fd87') || doc.id.includes(docId.substring(0, 8))) {
           similarDocs.push({ id: doc.id, collection: 'vostcards', data: doc.data() });
         }
       });
      
      if (similarDocs.length > 0) {
        console.log(`🔍 Found ${similarDocs.length} similar documents:`, similarDocs);
        alert(`🔍 Found ${similarDocs.length} similar documents: ${JSON.stringify(similarDocs.map(d => ({id: d.id, title: d.data.title})), null, 2)}`);
      } else {
        alert(`❌ No documents found with ID: ${docId}`);
      }
      
    } catch (error) {
      console.error('❌ Error searching for document:', error);
      alert(`❌ Error searching: ${error}`);
    }
  };

  const forceDeleteDocument = async (docId: string) => {
    try {
      console.log(`🗑️ Force deleting document: ${docId}`);
      
      // Try to delete from vostcards
      const vostcardRef = doc(db, 'vostcards', docId);
      await deleteDoc(vostcardRef);
      console.log(`✅ Deleted from vostcards`);
      
      // Also check and delete from any metadata collections
      try {
        const metadataRef = doc(db, 'vostcardMetadata', docId);
        await deleteDoc(metadataRef);
        console.log(`✅ Deleted from vostcardMetadata`);
      } catch (e) {
        console.log(`ℹ️ No metadata document found`);
      }
      
      alert(`✅ Force delete completed for: ${docId}`);
      
    } catch (error) {
      console.error('❌ Error force deleting:', error);
      alert(`❌ Error force deleting: ${error}`);
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
        <button
          onClick={() => {
            // Open RootView in a new tab to avoid navigation issues
            window.open('/', '_blank');
          }}
          style={{
            marginLeft: '10px',
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🗂️ Root View (New Tab)
        </button>
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

      {/* Convert User to Admin Section */}
      <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffeaa7' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: '#856404' }}>
          <FaKey style={{ marginRight: '10px' }} />
          Convert User to Admin
        </h2>
        
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by email or username"
            value={adminSearchTerm}
            onChange={(e) => setAdminSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '10px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchAdminUsers()}
          />
          <button
            onClick={handleSearchAdminUsers}
            disabled={adminLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: adminLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSearch style={{ marginRight: '5px' }} />
            {adminLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {adminError && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            {adminError}
          </div>
        )}

        {adminSearchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '10px' }}>Search Results:</h3>
            {adminSearchResults.map((user) => (
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
                
                {user.userRole !== 'admin' && (
                  <button
                    onClick={() => handleConvertToAdmin(user.id, user.email)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <FaKey style={{ marginRight: '5px' }} />
                    Convert to Admin
                  </button>
                )}
                
                {user.userRole === 'admin' && (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    ✅ Admin Account
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
             <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #dc3545', borderRadius: '8px' }}>
         <h3 style={{ color: '#dc3545', margin: '0 0 15px 0' }}>🔍 Document Troubleshooting</h3>
         
         <div style={{ marginBottom: '15px' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
             Document ID:
           </label>
           <input
             type="text"
             value={documentId}
             onChange={(e) => setDocumentId(e.target.value)}
             placeholder="Enter document ID (e.g., 6212fd87-fd82-4844-854c-8a2ed5df235f)"
             style={{
               width: '100%',
               padding: '10px',
               borderRadius: '4px',
               border: '1px solid #ccc',
               fontSize: '14px',
               fontFamily: 'monospace'
             }}
           />
         </div>
         
         <button
           onClick={() => {
             if (!documentId.trim()) {
               alert('Please enter a document ID first');
               return;
             }
             searchForDocument(documentId.trim());
           }}
           style={{
             backgroundColor: '#17a2b8',
             color: 'white',
             border: 'none',
             padding: '12px 24px',
             borderRadius: '6px',
             cursor: 'pointer',
             margin: '5px',
             fontWeight: 'bold'
           }}
         >
           🔍 Search for Document
         </button>
         
         <button
           onClick={() => {
             if (!documentId.trim()) {
               alert('Please enter a document ID first');
               return;
             }
             if (window.confirm(`Are you sure you want to force delete document: ${documentId.trim()}?`)) {
               forceDeleteDocument(documentId.trim());
             }
           }}
           style={{
             backgroundColor: '#dc3545',
             color: 'white',
             border: 'none',
             padding: '12px 24px',
             borderRadius: '6px',
             cursor: 'pointer',
             margin: '5px',
             fontWeight: 'bold'
           }}
         >
           🗑️ Force Delete Document
         </button>
         
         <button
           onClick={() => setDocumentId('6212fd87-fd82-4844-854c-8a2ed5df235f')}
           style={{
             backgroundColor: '#6c757d',
             color: 'white',
             border: 'none',
             padding: '8px 16px',
             borderRadius: '4px',
             cursor: 'pointer',
             margin: '5px',
             fontSize: '12px'
           }}
         >
           📋 Fill Problem Document
         </button>
       </div>
      
    </div>
  );
};

export default AdminPanel; 