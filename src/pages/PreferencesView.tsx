import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaAddressBook, FaToggleOn, FaToggleOff, FaGoogle, FaPhone, FaExclamationTriangle, FaFilter, FaSave, FaUndo } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';

const PreferencesView: React.FC = () => {
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { preferences, updatePreference, updateFilterPreference } = usePreferences();

  // Import category and type constants
  const AVAILABLE_CATEGORIES = ['Restaurants', 'Attractions', 'Entertainment', 'Shopping', 'Services', 'Outdoors', 'Nightlife', 'Hotels'];
  const AVAILABLE_TYPES = ['Vostcard', 'Guide', 'Offer'];

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

        {/* Persistent Filters Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaFilter size={24} color="#07345c" />
            <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Map Filters</h2>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
