import { useVostcard } from '../context/VostcardContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import BackupRestoreComponent from '../components/BackupRestoreComponent';
import './SettingsView.css';

const SettingsView = () => {
  const navigate = useNavigate();
  const { currentVostcard } = useVostcard();

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
          size={24} 
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate('/')} 
        />
      </div>
      
      <div className="settings-content">
        {/* Legacy Backup Section (for backward compatibility) */}
        <section className="settings-section legacy-backup">
          <h2 style={{ color: '#6c757d', fontSize: '18px', marginBottom: '15px' }}>
            Legacy Backup (JSON Format)
          </h2>
          <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
            This is the old backup format. For better backup functionality, use the new ZIP-based backup below.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-block',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                color: '#007BFF',
                cursor: 'pointer'
              }}
            >
              Import JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const content = event.target?.result as string;
                      const parsed = JSON.parse(content);
                      console.log('✅ Legacy backup loaded:', parsed);
                      alert('Legacy backup loaded successfully! Note: This only loads the backup data into memory.');
                    } catch (error) {
                      console.error('❌ Error parsing backup:', error);
                      alert('Failed to load backup.');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
            <button
              style={{
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                const dataToExport = currentVostcard ? [currentVostcard] : [];
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vostcard-legacy.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Current Vostcard
            </button>
          </div>
        </section>

        {/* New Backup & Restore Component */}
        <BackupRestoreComponent />

        <section className="settings-section">
          <h2>Account</h2>
          <button style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Change Username</button>
          <button style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Change Password</button>
          <button style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Logout</button>
        </section>

        <section className="settings-section">
          <h2>Other</h2>
          <button style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Suggestion Box</button>
          <button style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}>Report a Bug</button>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;