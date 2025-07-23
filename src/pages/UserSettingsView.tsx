import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaArrowLeft, FaCamera, FaImage, FaTimes } from 'react-icons/fa';

interface UserProfile {
  username: string;
  email: string;
  name: string;
  message: string;
  avatarURL?: string;
  buyMeACoffeeURL?: string;
  isGuideAccount?: boolean;
}

const UserSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  // Debug: Log user role for troubleshooting
  useEffect(() => {
    console.log('🔍 UserSettingsView Debug - userRole:', userRole);
    console.log('🔍 UserSettingsView Debug - user:', user?.uid);
  }, [userRole, user]);
  
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    email: '',
    name: '',
    message: '',
    avatarURL: '',
    buyMeACoffeeURL: '',
    isGuideAccount: false
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showNameSeparationModal, setShowNameSeparationModal] = useState(false);
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempLastName, setTempLastName] = useState('');

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
            avatarURL: data.avatarURL || '',
            buyMeACoffeeURL: data.buyMeACoffeeURL || '',
            isGuideAccount: data.isGuideAccount || false
          });
          
          // Check if user needs to separate their name
          if (data.name && !data.firstName && !data.lastName) {
            setShowNameSeparationModal(true);
            // Auto-parse the name as a suggestion
            const parts = data.name.split(' ');
            setTempFirstName(parts[0] || '');
            setTempLastName(parts.slice(1).join(' ') || '');
          }
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
    setShowAvatarOptions(true);
  };

  const handleTakePhoto = () => {
    setShowAvatarOptions(false);
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleChoosePhoto = () => {
    setShowAvatarOptions(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadAvatarImage = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `avatar_${timestamp}.${fileExtension}`;
      
      // Upload to Firebase Storage with userId-based path structure
      const storageRef = ref(storage, `avatars/${user.uid}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('✅ Avatar uploaded successfully:', downloadURL);

      // Update user profile with new avatar URL
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        avatarURL: downloadURL,
        avatarUpdatedAt: new Date().toISOString()
      });

      console.log('✅ User profile updated with new avatar URL');

      // Update local state
      setProfile(prev => ({
        ...prev,
        avatarURL: downloadURL
      }));

      alert('Avatar updated successfully!');
    } catch (error: any) {
      console.error('❌ Error uploading avatar:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update avatar. Please try again.';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Permission denied. Please make sure you are logged in.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'An unknown error occurred. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
      });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP).');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Image file must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
        return;
      }

      // Validate minimum dimensions (optional)
      const img = new Image();
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          alert('Image must be at least 50x50 pixels.');
          return;
        }
        uploadAvatarImage(file);
      };
      img.onerror = () => {
        alert('Invalid image file. Please try another image.');
      };
      img.src = URL.createObjectURL(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const handleNameSeparation = async () => {
    if (!user || !tempFirstName) return;
    
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        firstName: tempFirstName,
        lastName: tempLastName,
        // Keep original name for backward compatibility
        name: `${tempFirstName} ${tempLastName}`,
        nameSeparatedAt: new Date()
      });
      
      setProfile(prev => ({
        ...prev,
        name: `${tempFirstName} ${tempLastName}`
      }));
      
      setShowNameSeparationModal(false);
      alert('Name updated successfully!');
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name. Please try again.');
    }
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
    <div style={{ 
      minHeight: '100vh', 
      height: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
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
        flexShrink: 0,
      }}>
        <h1 
          onClick={() => navigate('/home')}
          style={{
          color: 'white',
          fontWeight: 700,
          fontSize: '2.5rem',
          margin: 0,
          cursor: 'pointer',
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

      {/* Scrollable Content */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
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
            disabled={uploading}
            style={{
              background: uploading ? '#ccc' : '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {uploading ? 'Uploading...' : 'Update Avatar'}
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

        {/* ☕ Support Me Section for Guides */}
        {userRole === 'guide' && (
          <div style={{ 
            marginBottom: 30,
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '12px',
            background: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '20px' }}>
              ☕ Support Link (Buy Me a Coffee)
            </h3>
            <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '16px', lineHeight: 1.5 }}>
              Add your Buy Me a Coffee URL so visitors can leave you a tip on your Vōstcards.
              You can create a free account at{' '}
              <a href="https://www.buymeacoffee.com" target="_blank" rel="noopener noreferrer" style={{ color: '#007aff', textDecoration: 'underline' }}>
                buymeacoffee.com
              </a>.
              <br /><br />
              <strong>Format:</strong> https://www.buymeacoffee.com/yourname (don't include @ symbol)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="url"
                value={profile?.buyMeACoffeeURL || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, buyMeACoffeeURL: e.target.value } : prev)}
                placeholder="https://www.buymeacoffee.com/vostcard"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={async () => {
                  if (!profile || !user) return;
                  const url = profile.buyMeACoffeeURL?.trim();
                  if (!url || (!url.startsWith('https://www.buymeacoffee.com/') && !url.startsWith('https://buymeacoffee.com/'))) {
                    alert('Please enter a valid Buy Me a Coffee URL starting with https://www.buymeacoffee.com/ or https://buymeacoffee.com/');
                    return;
                  }
                  try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      buyMeACoffeeURL: url
                    });
                    alert('Buy Me a Coffee URL saved!');
                  } catch (err) {
                    console.error('Failed to save URL:', err);
                    alert('Error saving URL. Please try again.');
                  }
                }}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  alignSelf: 'flex-start'
                }}
              >
                Save Support Link
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
       </div>
      </div>

      {/* Avatar Options Modal */}
      {showAvatarOptions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            margin: 20,
            maxWidth: 300,
            width: '100%',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowAvatarOptions(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#666',
              }}
            >
              <FaTimes />
            </button>

            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
              Update Avatar
            </h3>

            {/* Take Photo Button */}
            <button
              onClick={handleTakePhoto}
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: 10,
                background: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <FaCamera />
              Take Photo
            </button>

            {/* Choose Photo Button */}
            <button
              onClick={handleChoosePhoto}
              style={{
                width: '100%',
                padding: '15px',
                background: '#34C759',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <FaImage />
              Choose from Gallery
            </button>
          </div>
        </div>
      )}

      {showNameSeparationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            margin: 20,
            maxWidth: 300,
            width: '100%',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowNameSeparationModal(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#666',
              }}
            >
              <FaTimes />
            </button>

            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
              Please separate your name
            </h3>
            <p>We've updated our system to use separate first and last names.</p>
            <input
              type="text"
              placeholder="First Name"
              value={tempFirstName}
              onChange={(e) => setTempFirstName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={tempLastName}
              onChange={(e) => setTempLastName(e.target.value)}
            />
            <button onClick={handleNameSeparation}>Update Name</button>
            <button onClick={() => setShowNameSeparationModal(false)}>Skip for now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettingsView;
