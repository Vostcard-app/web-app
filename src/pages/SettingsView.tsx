import { useVostcard } from '../context/VostcardContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';

const SettingsView = () => {
  const navigate = useNavigate();
  const { savedVostcards, setSavedVostcards } = useVostcard();

  return (
    <>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        backgroundColor: '#002B4D', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '8px' 
      }}>
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
      <div style={{ padding: '20px' }}>

        <section style={{ marginBottom: '20px' }}>
          <h2>Manual Backup (iCloud Drive / Local)</h2>
          <div>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const content = event.target?.result as string;
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                      setSavedVostcards(parsed);
                      console.log('✅ Backup loaded into app state:', parsed);
                      alert('Backup restored successfully!');
                    } else {
                      console.error('❌ Invalid backup format');
                      alert('Invalid backup file format.');
                    }
                  } catch (error) {
                    console.error('❌ Error parsing backup:', error);
                    alert('Failed to load backup.');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(savedVostcards, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vostcards.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Backup
            </button>
          </div>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2>Account</h2>
          <button style={{ marginRight: '10px' }}>Change Username</button>
          <button style={{ marginRight: '10px' }}>Change Password</button>
          <button>Logout</button>
        </section>

        <section>
          <h2>Other</h2>
          <button style={{ marginRight: '10px' }}>Suggestion Box</button>
          <button>Report a Bug</button>
        </section>
      </div>
    </>
  );
};

export default SettingsView;