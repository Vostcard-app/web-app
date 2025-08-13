import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import './SettingsView.css';
import { useVostcard } from '../context/VostcardContext';

const SettingsView = () => {
  const navigate = useNavigate();
  const { migrateToUnifiedVostcards } = useVostcard();
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<string | null>(null);




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
          <h2>Other</h2>
          <button 
            style={{ marginRight: '10px', fontSize: '18px', padding: '10px 15px', borderRadius: '6px' }}
            onClick={() => navigate('/music-library')}
          >
            Music Library (Adin)
          </button>
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

          <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #eee' }}>
            <h3>Migration</h3>
            <button
              disabled={migrating}
              onClick={async () => {
                try {
                  setMigrating(true);
                  setResult(null);
                  const res = await migrateToUnifiedVostcards();
                  setResult(`Migrated: ${res.migrated}, Skipped: ${res.skipped}, Errors: ${res.errors}`);
                } catch (e: any) {
                  setResult(`Migration failed: ${e?.message || 'Unknown error'}`);
                } finally {
                  setMigrating(false);
                }
              }}
              style={{ fontSize: '18px', padding: '10px 15px', borderRadius: '6px', background: migrating ? '#ccc' : '#07345c', color: 'white', marginTop: 8 }}
            >
              {migrating ? 'Migrating…' : 'Migrate my posts to Unified Vostcards'}
            </button>
            {result && (
              <div style={{ marginTop: 10, color: '#333' }}>{result}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;