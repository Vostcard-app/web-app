

// ✅ AccountSettingsView.tsx (PWA Blueprint with Firebase)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { FaHome } from 'react-icons/fa';

const AccountSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      {/* 🔵 Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: '#002B4D',
            color: 'white',
            border: 'none',
            padding: 10,
            borderRadius: 8,
            cursor: 'pointer',
            marginRight: 10,
          }}
        >
          <FaHome /> Home
        </button>
        <h1 style={{ color: '#002B4D', fontSize: '1.8rem' }}>Account Settings</h1>
      </div>

      {/* 📝 Change Password Form */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 15 }}>Change Password</h2>
        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />
        {errorMessage && <p style={{ color: 'red', marginTop: 10 }}>{errorMessage}</p>}
        {successMessage && <p style={{ color: 'green', marginTop: 10 }}>{successMessage}</p>}
        <button
          onClick={handleUpdatePassword}
          disabled={loading}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 15,
          }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      {/* ☁️ Sync & Backup */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ color: '#002B4D' }}>Backup & Sync</h2>
        <p>You can manage your data backup and sync settings here.</p>
        <button
          onClick={() => navigate('/sync-backup')}
          style={{
            background: '#764ba2',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            marginTop: 10,
          }}
        >
          Sync & Backup
        </button>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  borderRadius: 8,
  marginBottom: 12,
};

export default AccountSettingsView;