// Vostcard Studio - Professional content creation and management interface
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaRocket } from 'react-icons/fa';
import { useStudioAccess, useStudioAccessSummary } from '../hooks/useStudioAccess';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/shared';

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, upgradeMessage } = useStudioAccess();
  const studioSummary = useStudioAccessSummary();
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);

  // Check access and load
  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
  }, [hasAccess]);

  // Access denied screen
  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <FaRocket size={48} color="#ff6b35" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
            Vostcard Studio Access Required
          </h2>
          <p style={{ color: '#666', marginBottom: '25px', lineHeight: 1.6 }}>
            {upgradeMessage}
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <strong>Your Status:</strong> {studioSummary.roleDisplay}
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading Vostcard Studio..." size="large" />;
  }

  const handleSaveDrivecard = async () => {
    if (!user || !title.trim()) {
      alert('Please enter a title for your Drivecard.');
      return;
    }

    if (!location) {
      alert('Please set a location for your Drivecard.');
      return;
    }

    if (!audio) {
      alert('Please record or add audio for your Drivecard.');
      return;
    }

    try {
      // Create new Drivecard with default "Drive mode" category
      const newDrivecard = {
        id: `drivecard_${Date.now()}`,
        title: title.trim(),
        audio: audio,
        geo: location,
        category: 'Drive mode', // Default category
        userID: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // TODO: Save to local storage and/or Firebase
      console.log('💾 Saving Drivecard:', newDrivecard);
      
      // Clear form
      setTitle('');
      setAudio(null);
      setLocation(null);
      
      alert('Drivecard saved successfully!');
      
    } catch (error) {
      console.error('❌ Error saving Drivecard:', error);
      alert('Failed to save Drivecard. Please try again.');
    }
  };

  return (
    <div style={{
      backgroundColor: 'white', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      
      {/* Standard Vostcard Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          Vōstcard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={24} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1,
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto'
      }}>
        {/* Vostcard Studio Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 10px 0',
          textAlign: 'center'
        }}>
          Vostcard Studio
        </h1>

        {/* Drive Mode Creator */}
        <div style={{
          borderRadius: '8px',
          padding: '0px 15px 15px 15px',
          width: '100%',
          maxWidth: '350px',
          backgroundColor: 'white'
        }}>
          {/* Drive Mode Creator Header */}
          <div style={{
            textAlign: 'left',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '5px'
          }}>
            Drive Mode Creator
          </div>

          {/* Title Input */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px'
            }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '2px solid #333',
                borderRadius: '4px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Button Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <button style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Record Audio
            </button>
            
            <button style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Add audio
            </button>
            
            <button style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Pin Place
            </button>
            
            <button style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VostcardStudioView; 