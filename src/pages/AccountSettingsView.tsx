

// ✅ AccountSettingsView.tsx (PWA Blueprint with Firebase)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import { useVostcard } from '../context/VostcardContext';

const AccountSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { manualSync } = useVostcard();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setErrorMessage('No user is signed in');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setSuccessMessage('✅ Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('❌ Error updating password:', error);
      setErrorMessage(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await manualSync();
      setSuccessMessage('✅ Sync completed successfully! Your vostcards are now up to date.');
    } catch (error) {
      console.error('Manual sync failed:', error);
      setErrorMessage('❌ Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        height: '30px',
        padding: '15px 0 24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '30px', margin: 0 }}>Vōstcard</span>
        <FaHome
          size={48}
          style={{
            position: 'absolute',
            right: 44,
            top: 15,
            background: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
          onClick={() => navigate('/home')}
        />
      </div>

      {/* Content Container */}
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        padding: '20px',
        flex: 1,
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: 'calc(100vh - 69px)' // Subtract header height (30px + 15px top + 24px bottom)
      }}>
        {/* Back Button and Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <FaArrowLeft 
            style={{ 
              cursor: 'pointer',
              fontSize: 24,
              color: '#002B4D'
            }} 
            onClick={() => navigate(-1)} 
          />
          <h2 style={{ 
            margin: '0 0 0 15px',
            color: '#002B4D',
            fontSize: 24
          }}>
            Account Settings
          </h2>
        </div>

        {/* Change Password Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0',
            color: '#002B4D',
            fontSize: 20
          }}>
            Change Password
          </h3>
          
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />

          {/* Messages */}
          {errorMessage && (
            <div style={{ 
              color: '#dc3545', 
              backgroundColor: '#f8d7da',
              padding: '12px',
              borderRadius: 8,
              marginBottom: 12
            }}>
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div style={{ 
              color: '#28a745', 
              backgroundColor: '#d4edda',
              padding: '12px',
              borderRadius: 8,
              marginBottom: 12
            }}>
              {successMessage}
            </div>
          )}

          <button
            onClick={handleUpdatePassword}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: loading ? '#e0e0e0' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        {/* Backup & Sync Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0',
            color: '#002B4D',
            fontSize: 20
          }}>
            Backup & Sync
          </h3>
          
          <p style={{ 
            color: '#666',
            margin: '0 0 20px 0',
            fontSize: 16
          }}>
            Sync your vostcards between devices. This will check for any differences and update your data.
          </p>

          {/* Success/Error Messages */}
          {successMessage && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #c3e6cb'
            }}>
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #f5c6cb'
            }}>
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={syncing}
            style={{
              backgroundColor: syncing ? '#ccc' : '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 8,
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
              width: '100%'
            }}
          >
            {syncing ? '🔄 Syncing...' : '🔄 Force Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsView;