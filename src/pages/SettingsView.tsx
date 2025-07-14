import { useVostcard } from '../context/VostcardContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import './SettingsView.css';

const SettingsView = () => {
  const navigate = useNavigate();
  const { 
    currentVostcard, 
    debugFirebaseVostcards, 
    debugLocalVostcards, 
    manualSync,
    clearLocalStorage,
    clearAllPrivateVostcardsFromFirebase
  } = useVostcard();

  const handleDebugFirebase = async () => {
    try {
      await debugFirebaseVostcards();
    } catch (error) {
      console.error('Debug Firebase failed:', error);
    }
  };

  const handleDebugLocal = async () => {
    try {
      await debugLocalVostcards();
    } catch (error) {
      console.error('Debug local failed:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      alert('🔄 Starting manual sync...');
      await manualSync();
      alert('✅ Manual sync completed! Check if your vostcards are now in sync.');
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('❌ Manual sync failed. Check console for details.');
    }
  };

  const handleClearLocal = async () => {
    if (confirm('⚠️ This will delete ALL vostcards from your laptop\'s local storage. Are you sure?')) {
      try {
        await clearLocalStorage();
        alert('✅ Local storage cleared. Your vostcards will re-sync from Firebase on next load.');
        window.location.reload();
      } catch (error) {
        console.error('Clear local storage failed:', error);
        alert('❌ Failed to clear local storage. Check console for details.');
      }
    }
  };

  const handleClearFirebase = async () => {
    if (confirm('⚠️ This will delete ALL private vostcards from Firebase cloud storage. This action cannot be undone. Are you sure?')) {
      try {
        alert('🗑️ Deleting all private vostcards from Firebase...');
        await clearAllPrivateVostcardsFromFirebase();
        alert('✅ All private vostcards deleted from Firebase cloud storage.');
        window.location.reload();
      } catch (error) {
        console.error('Clear Firebase failed:', error);
        alert('❌ Failed to clear Firebase storage. Check console for details.');
      }
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
        <section className="settings-section">
          <h2>Account</h2>
          <button style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Change Username</button>
          <button style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Change Password</button>
          <button style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Logout</button>
        </section>

        <section className="settings-section">
          <h2>Sync Debug Tools</h2>
          <p style={{ fontSize: '14px', marginBottom: '15px', color: '#666' }}>
            Use these tools to troubleshoot sync issues between devices
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              style={{ fontSize: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#007bff', color: 'white' }}
              onClick={handleDebugFirebase}
            >
              🔍 Check Firebase Cloud Storage
            </button>
            
            <button 
              style={{ fontSize: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#28a745', color: 'white' }}
              onClick={handleDebugLocal}
            >
              📱 Check Local Storage (This Device)
            </button>
            
            <button 
              style={{ fontSize: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#ffc107', color: 'black' }}
              onClick={handleManualSync}
            >
              🔄 Force Manual Sync
            </button>
            
            <button 
              style={{ fontSize: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#dc3545', color: 'white' }}
              onClick={handleClearLocal}
            >
              🗑️ Clear Local Storage & Re-sync
            </button>
            
            <button 
              style={{ fontSize: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#6c757d', color: 'white' }}
              onClick={handleClearFirebase}
            >
              ☁️🗑️ Clear Firebase Cloud Storage
            </button>
          </div>
          
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            <strong>Instructions:</strong>
            <ol style={{ paddingLeft: '20px' }}>
              <li>Check Firebase to see what's in the cloud</li>
              <li>Check Local to see what's on this device</li>
              <li>Try Manual Sync to sync differences</li>
              <li>If still having issues, Clear Local Storage to force a fresh sync</li>
              <li>If sync problems persist, Clear Firebase Cloud Storage to start fresh</li>
            </ol>
          </div>
        </section>

        <section className="settings-section">
          <h2>Other</h2>
          <button 
            style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}
            onClick={() => navigate('/suggestion-box')}
          >
            Suggestion Box
          </button>
          <button 
            style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}
            onClick={() => navigate('/report-bug')}
          >
            Report a Bug
          </button>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;