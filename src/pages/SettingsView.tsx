import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import './SettingsView.css';
import { useAuth } from '../context/AuthContext';

const SettingsView = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  // Check if user is admin
  const isAdmin = userRole === 'admin';




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



        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <section className="settings-section">
              <h2>Other</h2>
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