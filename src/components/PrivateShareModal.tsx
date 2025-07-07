import React, { useState } from 'react';
import { FaTimes, FaVideo, FaImage, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import UserSelector from './UserSelector';
import { PrivateVostcardService } from '../services/privateVostcardService';
import { useAuth } from '../context/AuthContext';
import type { Vostcard } from '../context/VostcardContext';

interface User {
  id: string;
  username: string;
  avatarURL?: string;
}

interface PrivateShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vostcard: Vostcard;
}

const PrivateShareModal: React.FC<PrivateShareModalProps> = ({
  isOpen,
  onClose,
  vostcard
}) => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!selectedUser || !user) {
      setError('Please select a recipient');
      return;
    }

    if (!vostcard.video) {
      setError('This Vostcard has no video to share');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      await PrivateVostcardService.sendPrivateVostcard(
        {
          video: vostcard.video,
          photos: vostcard.photos || [],
          title: vostcard.title,
          description: vostcard.description,
          categories: vostcard.categories || [],
          geo: vostcard.geo || undefined,
          script: vostcard.script,
          scriptId: vostcard.scriptId
        },
        selectedUser.id,
        selectedUser.username,
        user.uid,
        user.displayName || 'Anonymous'
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedUser(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error sharing private Vostcard:', err);
      setError(err.message || 'Failed to share Vostcard. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    if (!isSharing) {
      onClose();
      setSelectedUser(null);
      setError(null);
      setSuccess(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px' 
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 700, 
            color: '#002B4D' 
          }}>
            📤 Share Private Vōstcard
          </h2>
          <button
            onClick={handleClose}
            disabled={isSharing}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: isSharing ? 'not-allowed' : 'pointer',
              color: '#666',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSharing ? 0.5 : 1
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Vostcard Preview */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '18px', 
            fontWeight: 600 
          }}>
            {vostcard.title || 'Untitled Vostcard'}
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: '12px'
          }}>
            {/* Video indicator */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: vostcard.video ? '#28a745' : '#dc3545'
            }}>
              <FaVideo size={16} />
              <span style={{ fontSize: '14px' }}>
                {vostcard.video ? 'Video included' : 'No video'}
              </span>
            </div>

            {/* Photos indicator */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: (vostcard.photos?.length || 0) > 0 ? '#28a745' : '#6c757d'
            }}>
              <FaImage size={16} />
              <span style={{ fontSize: '14px' }}>
                {vostcard.photos?.length || 0} photo(s)
              </span>
            </div>
          </div>

          {vostcard.description && (
            <p style={{ 
              margin: '0', 
              fontSize: '14px', 
              color: '#6c757d',
              lineHeight: 1.4
            }}>
              {vostcard.description.length > 100 
                ? `${vostcard.description.substring(0, 100)}...` 
                : vostcard.description
              }
            </p>
          )}
        </div>

        {/* User Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '12px',
            color: '#333'
          }}>
            Select Recipient:
          </label>
          <UserSelector
            onUserSelect={setSelectedUser}
            currentUserID={user?.uid || ''}
            selectedUser={selectedUser}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ✅ Private Vostcard shared successfully!
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '12px' 
        }}>
          <button
            onClick={handleClose}
            disabled={isSharing}
            style={{
              background: '#6c757d',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              cursor: isSharing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 500,
              opacity: isSharing ? 0.5 : 1,
              flex: 1
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleShare}
            disabled={!selectedUser || isSharing || !vostcard.video}
            style={{
              background: (!selectedUser || isSharing || !vostcard.video) ? '#ccc' : '#007aff',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              cursor: (!selectedUser || isSharing || !vostcard.video) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flex: 1
            }}
          >
            {isSharing ? (
              <>
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                Sharing...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Share Private
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1976d2',
          lineHeight: 1.4
        }}>
          <strong>💡 Private Sharing:</strong> This Vostcard will be sent privately to the selected user. 
          Only you and the recipient will be able to view it. It will sync across all devices (iOS & PWA).
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PrivateShareModal; 