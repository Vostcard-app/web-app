import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaAddressBook, FaToggleOn, FaToggleOff, FaGoogle, FaPhone, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';

const PreferencesView: React.FC = () => {
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { preferences, updatePreference } = usePreferences();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #07345c 0%, #0a4a73 100%)',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <FaArrowLeft size={16} />
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            🔧 Preferences
          </h1>
        </div>
        
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <FaHome size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Contact Access Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaAddressBook size={24} color="#07345c" />
            <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Contact Access</h2>
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
        </div>

        {/* Future Settings Placeholder */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px dashed #dee2e6',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#6c757d',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              🚧 More preferences and customization options coming soon
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#07345c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a4a73'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#07345c'}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesView;
