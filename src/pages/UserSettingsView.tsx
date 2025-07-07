import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';

interface UserProfile {
  username: string;
  email: string;
  name: string;
  message: string;
  avatarURL?: string;
}

const UserSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    email: '',
    name: '',
    message: '',
    avatarURL: ''
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            username: data.username || '',
            email: data.email || user.email || '',
            name: data.name || '',
            message: data.message || '',
            avatarURL: data.avatarURL || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const handleSave = async (field: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        [field]: tempValue
      });
      
      setProfile(prev => ({
        ...prev,
        [field]: tempValue
      }));
      
      setEditingField(null);
      setTempValue('');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleUpdateAvatar = () => {
    // TODO: Implement avatar upload functionality
    alert('Avatar update functionality coming soon!');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#07345c',
        color: 'white',
        padding: '32px 24px 24px 24px',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{
          color: 'white',
          fontWeight: 700,
          fontSize: '2.5rem',
          margin: 0,
        }}>Vōstcard</h1>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: 'pointer',
          }}
        >
          <FaArrowLeft style={{ color: 'white', fontSize: 24 }} />
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
        {/* Avatar Section */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: '#ddd',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#666',
            marginBottom: 15,
            position: 'relative',
          }}>
            {profile.avatarURL ? (
              <img
                src={profile.avatarURL}
                alt="Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              'No Avatar'
            )}
          </div>
          <button
            onClick={handleUpdateAvatar}
            style={{
              background: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Update Avatar
          </button>
        </div>

        {/* Profile Fields */}
        <div style={{ marginBottom: 30 }}>
          {/* Username */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 25,
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              <span style={{ color: '#333' }}>Username: </span>
              {editingField === 'username' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      fontSize: 18,
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave('username')}
                    disabled={saving}
                    style={{
                      background: '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      background: '#888',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span>{profile.username}</span>
              )}
            </div>
            {editingField !== 'username' && (
              <button
                onClick={() => handleEdit('username', profile.username)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 16,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Email */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 25,
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              <span style={{ color: '#333' }}>Email: </span>
              {editingField === 'email' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="email"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      fontSize: 18,
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave('email')}
                    disabled={saving}
                    style={{
                      background: '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      background: '#888',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span>{profile.email}</span>
              )}
            </div>
            {editingField !== 'email' && (
              <button
                onClick={() => handleEdit('email', profile.email)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 16,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 25,
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              <span style={{ color: '#333' }}>Name: </span>
              {editingField === 'name' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      fontSize: 18,
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave('name')}
                    disabled={saving}
                    style={{
                      background: '#007aff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      background: '#888',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span>{profile.name}</span>
              )}
            </div>
            {editingField !== 'name' && (
              <button
                onClick={() => handleEdit('name', profile.name)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 16,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Public Message */}
        <div style={{ marginBottom: 30 }}>
          <label style={{
            display: 'block',
            fontSize: 18,
            fontWeight: 600,
            color: '#333',
            marginBottom: 10,
          }}>
            Public Message:
          </label>
          <textarea
            value={profile.message}
            onChange={(e) => setProfile(prev => ({ ...prev, message: e.target.value }))}
            onBlur={async () => {
              if (user) {
                try {
                  const docRef = doc(db, 'users', user.uid);
                  await updateDoc(docRef, { message: profile.message });
                } catch (error) {
                  console.error('Error updating message:', error);
                }
              }
            }}
            style={{
              width: '100%',
              height: 120,
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 8,
              fontSize: 16,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            placeholder="Enter your public message..."
          />
        </div>
      </div>
    </div>
  );
};

export default UserSettingsView;
