import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { FaArrowLeft, FaSave, FaPlus, FaTimes } from 'react-icons/fa';
import type { GuideProfile } from '../types/GuidedTourTypes';

interface GuideProfileData extends GuideProfile {
  id: string;
  username?: string;
  avatarURL?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  joinedDate?: Date;
  totalBookings?: number;
  responseRate?: number;
  responseTime?: string;
  languages?: string[];
  verified?: boolean;
}

const GuideProfileEditView: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();

  const [profile, setProfile] = useState<GuideProfileData>({
    id: '',
    bio: '',
    location: '',
    languages: ['English'],
    specialties: [],
    experience: '',
    certifications: [],
    responseTime: 'within an hour',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLanguage, setNewLanguage] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCertification, setNewCertification] = useState('');

  // Check if user can edit this profile
  const canEdit = user?.uid === guideId;

  useEffect(() => {
    if (!canEdit) {
      navigate(`/guide-profile/${guideId}`);
      return;
    }

    const fetchProfile = async () => {
      if (!guideId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', guideId));
        if (!userDoc.exists()) {
          setError('User not found');
          return;
        }

        const userData = userDoc.data();

        // Fetch guide profile if exists
        let guideProfileData = null;
        try {
          const guideProfileDoc = await getDoc(doc(db, 'guideProfiles', guideId));
          if (guideProfileDoc.exists()) {
            guideProfileData = guideProfileDoc.data();
          }
        } catch (profileError) {
          console.warn('Guide profile not found, will create new one');
        }

        // Set profile data
        setProfile({
          id: guideId,
          username: userData.username,
          avatarURL: userData.avatarURL,
          name: userData.name,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          joinedDate: userData.createdAt?.toDate(),
          bio: guideProfileData?.bio || userData.message || '',
          location: guideProfileData?.location || '',
          languages: guideProfileData?.languages || userData.languages || ['English'],
          specialties: guideProfileData?.specialties || [],
          experience: guideProfileData?.experience || '',
          certifications: guideProfileData?.certifications || [],
          totalBookings: guideProfileData?.totalBookings || 0,
          responseRate: guideProfileData?.responseRate || 95,
          responseTime: guideProfileData?.responseTime || 'within an hour',
          verified: guideProfileData?.verified || userData.userRole === 'guide',
          createdAt: guideProfileData?.createdAt?.toDate() || userData.createdAt?.toDate() || new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [guideId, canEdit, navigate]);

  const handleSave = async () => {
    if (!guideId || !canEdit) return;

    try {
      setSaving(true);
      setError(null);

      // Update guide profile
      const guideProfileData = {
        bio: profile.bio,
        location: profile.location,
        languages: profile.languages,
        specialties: profile.specialties,
        experience: profile.experience,
        certifications: profile.certifications,
        responseTime: profile.responseTime,
        updatedAt: new Date()
      };

      // Check if guide profile exists
      const guideProfileDoc = await getDoc(doc(db, 'guideProfiles', guideId));
      
      if (guideProfileDoc.exists()) {
        // Update existing profile
        await updateDoc(doc(db, 'guideProfiles', guideId), guideProfileData);
      } else {
        // Create new profile
        await setDoc(doc(db, 'guideProfiles', guideId), {
          ...guideProfileData,
          createdAt: new Date()
        });
      }

      // Also update user's message field with bio
      await updateDoc(doc(db, 'users', guideId), {
        message: profile.bio,
        languages: profile.languages
      });

      // Navigate back to profile
      navigate(`/guide-profile/${guideId}`);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !profile.languages?.includes(newLanguage.trim())) {
      setProfile(prev => ({
        ...prev,
        languages: [...(prev.languages || []), newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (language: string) => {
    setProfile(prev => ({
      ...prev,
      languages: prev.languages?.filter(l => l !== language) || []
    }));
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !profile.specialties?.includes(newSpecialty.trim())) {
      setProfile(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties?.filter(s => s !== specialty) || []
    }));
  };

  const handleAddCertification = () => {
    if (newCertification.trim() && !profile.certifications?.includes(newCertification.trim())) {
      setProfile(prev => ({
        ...prev,
        certifications: [...(prev.certifications || []), newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (certification: string) => {
    setProfile(prev => ({
      ...prev,
      certifications: prev.certifications?.filter(c => c !== certification) || []
    }));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return null; // Will redirect in useEffect
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate(`/guide-profile/${guideId}`)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#134369',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            <FaArrowLeft size={16} />
            Cancel
          </button>

          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#333'
          }}>
            Edit Profile
          </h1>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#ccc' : '#134369',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <FaSave size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isMobile ? '20px 16px' : '40px 20px'
      }}>
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: isMobile ? '24px' : '32px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          {/* Bio */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell visitors about yourself, your experience, and what makes your tours special..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Location */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Location
            </label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
              placeholder="City, Country"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Languages */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Languages
            </label>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {profile.languages?.map((language, index) => (
                <span
                  key={index}
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {language}
                  <button
                    onClick={() => handleRemoveLanguage(language)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1976d2',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                placeholder="Add a language"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
              />
              <button
                onClick={handleAddLanguage}
                style={{
                  background: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaPlus size={12} />
                Add
              </button>
            </div>
          </div>

          {/* Specialties */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Specialties
            </label>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {profile.specialties?.map((specialty, index) => (
                <span
                  key={index}
                  style={{
                    background: '#f3e5f5',
                    color: '#7b1fa2',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {specialty}
                  <button
                    onClick={() => handleRemoveSpecialty(specialty)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7b1fa2',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add a specialty (e.g., Food Tours, Historical Sites)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialty()}
              />
              <button
                onClick={handleAddSpecialty}
                style={{
                  background: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaPlus size={12} />
                Add
              </button>
            </div>
          </div>

          {/* Experience */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Experience
            </label>
            <textarea
              value={profile.experience}
              onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
              placeholder="Describe your experience as a guide, your background, and qualifications..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Certifications */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Certifications
            </label>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {profile.certifications?.map((certification, index) => (
                <span
                  key={index}
                  style={{
                    background: '#e8f5e8',
                    color: '#2e7d32',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {certification}
                  <button
                    onClick={() => handleRemoveCertification(certification)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2e7d32',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Add a certification"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCertification()}
              />
              <button
                onClick={handleAddCertification}
                style={{
                  background: '#134369',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaPlus size={12} />
                Add
              </button>
            </div>
          </div>

          {/* Response Time */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Response Time
            </label>
            <select
              value={profile.responseTime}
              onChange={(e) => setProfile(prev => ({ ...prev, responseTime: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="within an hour">Within an hour</option>
              <option value="within a few hours">Within a few hours</option>
              <option value="within a day">Within a day</option>
              <option value="within 2-3 days">Within 2-3 days</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideProfileEditView;
