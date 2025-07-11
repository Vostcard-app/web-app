import { useVostcard } from '../context/VostcardContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
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