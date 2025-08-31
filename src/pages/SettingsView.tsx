import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaUser, FaLock, FaAddressBook, FaToggleOn, FaToggleOff, FaGoogle, FaPhone, FaExclamationTriangle, FaFilter, FaSave, FaUndo } from 'react-icons/fa';
import { updatePassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import './SettingsView.css';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';

const SettingsView = () => {
  const navigate = useNavigate();
  const { user, username, userRole, refreshUserRole } = useAuth();
  const { preferences, updatePreference, updateFilterPreference } = usePreferences();
  
  // Check if user is admin
  const isAdmin = userRole === 'admin';
  
  // Form states
  const [newUsername, setNewUsername] = useState(username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Import category and type constants
  const AVAILABLE_CATEGORIES = ['Restaurants', 'Attractions', 'Entertainment', 'Shopping', 'Services', 'Outdoors', 'Nightlife', 'Hotels'];
  const AVAILABLE_TYPES = ['Vostcard', 'Guide', 'Offer'];
  
  // Handle username change
  const handleUsernameChange = async () => {
    if (!user || !newUsername.trim()) return;
    
    setIsUpdatingUsername(true);
    setError('');
    setMessage('');
    
    try {
      // Update username in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        username: newUsername.trim(),
        updatedAt: new Date()
      });
      
      // Refresh user role to get updated username
      await refreshUserRole();
      
      setMessage('Username updated successfully!');
    } catch (error: any) {
      setError(`Failed to update username: ${error.message}`);
    } finally {
      setIsUpdatingUsername(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async () => {
    if (!user || !newPassword || !confirmPassword) return;
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsUpdatingPassword(true);
    setError('');
    setMessage('');
    
    try {
      await updatePassword(user, newPassword);
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(`Failed to update password: ${error.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };




  return (
    <div className="settings-container">
      <div className="settings-header">
        <FaArrowLeft 
          size={24} 
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate(-1)} 
        />
        <h1 style={{ flex: 1, textAlign: 'center', margin: 0 }}>Settings</h1>
        <FaHome 
          size={50}
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate('/')} 
        />
      </div>
      
      <div className="settings-content">
        {/* Success/Error Messages */}
        {message && (
          <div style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            color: '#155724',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {message}
          </div>
        )}
        
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Account Settings */}
        <section className="settings-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaUser size={24} color="#07345c" />
            <h2>Account Settings</h2>
          </div>
          
          {/* Change Username */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Change Username</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
              <button
                onClick={handleUsernameChange}
                disabled={isUpdatingUsername || !newUsername.trim() || newUsername === username}
                style={{
                  backgroundColor: isUpdatingUsername ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isUpdatingUsername ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdatingUsername ? 'Updating...' : 'Update Username'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handlePasswordChange}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                style={{
                  backgroundColor: isUpdatingPassword ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </section>

        {/* Contact Access Preferences */}
        <section className="settings-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaAddressBook size={24} color="#07345c" />
            <h2>Contact Access</h2>
          </div>

          {/* iOS Notification Warning */}
          {preferences.contactAccessEnabled && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaExclamationTriangle color="#856404" />
              <div style={{ fontSize: '14px', color: '#856404' }}>
                <strong>Note:</strong> Enabling contact access may show "From X Contacts" notifications in iOS Safari.
              </div>
            </div>
          )}

          <p style={{ 
            margin: '0 0 20px 0', 
            color: '#666', 
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Control whether Vōstcard can access your device contacts for inviting friends and sharing content.
          </p>

          {/* Master Contact Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                Enable Contact Access
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                Allow the app to access your contacts for friend invitations
              </div>
            </div>
            <button
              onClick={() => updatePreference('contactAccessEnabled', !preferences.contactAccessEnabled)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: preferences.contactAccessEnabled ? '#28a745' : '#6c757d',
                fontSize: '24px'
              }}
            >
              {preferences.contactAccessEnabled ? <FaToggleOn /> : <FaToggleOff />}
            </button>
          </div>

          {/* Sub-options (only show if master toggle is enabled) */}
          {preferences.contactAccessEnabled && (
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #e9ecef' }}>
              
              {/* Google Contacts */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaGoogle size={16} color="#4285f4" />
                  <div>
                    <div style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
                      Google Contacts
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Import contacts from your Google account
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => updatePreference('allowGoogleContacts', !preferences.allowGoogleContacts)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: preferences.allowGoogleContacts ? '#28a745' : '#6c757d',
                    fontSize: '20px'
                  }}
                >
                  {preferences.allowGoogleContacts ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>

              {/* Native Contacts */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaPhone size={16} color="#07345c" />
                  <div>
                    <div style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
                      Device Contacts
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Access contacts stored on your device
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => updatePreference('allowNativeContacts', !preferences.allowNativeContacts)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: preferences.allowNativeContacts ? '#28a745' : '#6c757d',
                    fontSize: '20px'
                  }}
                >
                  {preferences.allowNativeContacts ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Map Filter Preferences */}
        <section className="settings-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaFilter size={24} color="#07345c" />
            <h2>Map Filters</h2>
          </div>

          <p style={{ 
            margin: '0 0 20px 0', 
            color: '#666', 
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Save your preferred map filters so they persist between app sessions.
          </p>

          {/* Master Filter Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                Enable Persistent Filters
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                Remember your filter preferences when you return to the map
              </div>
            </div>
            <button
              onClick={() => updateFilterPreference('enabled', !preferences.persistentFilters.enabled)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: preferences.persistentFilters.enabled ? '#28a745' : '#6c757d',
                fontSize: '24px'
              }}
            >
              {preferences.persistentFilters.enabled ? <FaToggleOn /> : <FaToggleOff />}
            </button>
          </div>

          {/* Filter Options (only show if persistent filters are enabled) */}
          {preferences.persistentFilters.enabled && (
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #e9ecef' }}>
              
              {/* Content Types */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  Content Types
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {AVAILABLE_TYPES.map(type => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`pref-type-${type}`}
                        checked={preferences.persistentFilters.selectedTypes.includes(type)}
                        onChange={(e) => {
                          const currentTypes = preferences.persistentFilters.selectedTypes;
                          if (e.target.checked) {
                            updateFilterPreference('selectedTypes', [...currentTypes, type]);
                          } else {
                            updateFilterPreference('selectedTypes', currentTypes.filter(t => t !== type));
                          }
                        }}
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          minWidth: '16px',
                          minHeight: '16px',
                          flexShrink: 0,
                          margin: 0
                        }}
                      />
                      <label htmlFor={`pref-type-${type}`} style={{ fontSize: '14px', color: '#333' }}>
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  Categories
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {AVAILABLE_CATEGORIES.map(category => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`pref-category-${category}`}
                        checked={preferences.persistentFilters.selectedCategories.includes(category)}
                        onChange={(e) => {
                          const currentCategories = preferences.persistentFilters.selectedCategories;
                          if (e.target.checked) {
                            updateFilterPreference('selectedCategories', [...currentCategories, category]);
                          } else {
                            updateFilterPreference('selectedCategories', currentCategories.filter(c => c !== category));
                          }
                        }}
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          minWidth: '16px',
                          minHeight: '16px',
                          flexShrink: 0,
                          margin: 0
                        }}
                      />
                      <label htmlFor={`pref-category-${category}`} style={{ fontSize: '14px', color: '#333' }}>
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who Filters */}
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  Who
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="pref-friends-only"
                      checked={preferences.persistentFilters.showFriendsOnly}
                      onChange={(e) => updateFilterPreference('showFriendsOnly', e.target.checked)}
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        minWidth: '16px',
                        minHeight: '16px',
                        flexShrink: 0,
                        margin: 0
                      }}
                    />
                    <label htmlFor="pref-friends-only" style={{ fontSize: '14px', color: '#333' }}>
                      Show only friends' posts
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="pref-creators-follow"
                      checked={preferences.persistentFilters.showCreatorsIFollow}
                      onChange={(e) => updateFilterPreference('showCreatorsIFollow', e.target.checked)}
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        minWidth: '16px',
                        minHeight: '16px',
                        flexShrink: 0,
                        margin: 0
                      }}
                    />
                    <label htmlFor="pref-creators-follow" style={{ fontSize: '14px', color: '#333' }}>
                      Creators I follow
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="pref-guides-only"
                      checked={preferences.persistentFilters.showGuidesOnly}
                      onChange={(e) => updateFilterPreference('showGuidesOnly', e.target.checked)}
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        minWidth: '16px',
                        minHeight: '16px',
                        flexShrink: 0,
                        margin: 0
                      }}
                    />
                    <label htmlFor="pref-guides-only" style={{ fontSize: '14px', color: '#333' }}>
                      Show only guides
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <section className="settings-section">
              <h2>Administrative Tools</h2>
              <button 
                style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}
                onClick={() => navigate('/music-library')}
              >
                Music Library (Adin)
              </button>
            </section>

            <section className="settings-section">
              <h2>Migration</h2>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                Administrative tools for data migration and system maintenance.
              </p>
              <button
                style={{ 
                  fontSize: '18px', 
                  padding: '10px 15px', 
                  borderRadius: '6px', 
                  background: '#6c757d', 
                  color: 'white',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }}
                disabled
              >
                Migration Tools (Coming Soon)
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsView;