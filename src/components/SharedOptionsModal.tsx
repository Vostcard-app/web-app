import React, { useState } from 'react';
import { FaTimes, FaShare, FaUserFriends, FaGlobe, FaLock } from 'react-icons/fa';
import { generateShareText } from '../utils/vostcardUtils';
import FriendPickerModal from './FriendPickerModal';
import { VostboxService } from '../services/vostboxService';
import { useAuth } from '../context/AuthContext';

interface SharedOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title?: string;
    description?: string;
    type?: 'vostcard' | 'guide';
  };
}

const SharedOptionsModal: React.FC<SharedOptionsModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const { user } = useAuth();
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  const handlePublicShare = async () => {
    try {
      // Generate public share URL
      const shareUrl = `${window.location.origin}/share/${item.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText(item, shareUrl);
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Share link copied to clipboard!');
      }
      
      onClose();
    } catch (error) {
      console.error('Error sharing publicly:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const handleVostboxShare = () => {
    setShowFriendPicker(true);
  };

  const handleSendToFriend = async (friendUID: string, message?: string) => {
    if (!user?.uid) return;
    
    try {
      const result = await VostboxService.sendVostcardToFriend({
        senderUID: user.uid,
        receiverUID: friendUID,
        vostcardID: item.id,
        message
      });
      
      if (result.success) {
        alert('Vostcard sent to friend via Vōstbox!');
        onClose();
      } else {
        alert(result.error || 'Failed to send to friend');
      }
    } catch (error) {
      console.error('Error sending to friend:', error);
      alert('Failed to send to friend');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Share Vostcard
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#666'
              }}
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content Info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {item.title || 'Untitled Vostcard'}
            </div>
            {item.description && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                {item.description.length > 100 
                  ? `${item.description.substring(0, 100)}...`
                  : item.description
                }
              </div>
            )}
          </div>

          {/* Sharing Options */}
          <div style={{ padding: '20px' }}>
            {/* Public Share Option */}
            <button
              onClick={handlePublicShare}
              style={{
                width: '100%',
                padding: '16px',
                marginBottom: '12px',
                border: '2px solid #007aff',
                borderRadius: '12px',
                backgroundColor: '#f0f8ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#007aff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaGlobe size={24} color="white" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#007aff', marginBottom: '2px' }}>
                  Public Share
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Anyone can view with the link
                </div>
              </div>
            </button>

            {/* Vostbox Share Option */}
            <button
              onClick={handleVostboxShare}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #28a745',
                borderRadius: '12px',
                backgroundColor: '#f8fff9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaLock size={24} color="white" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#28a745', marginBottom: '2px' }}>
                  Send to Friend (Vōstbox)
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Private sharing with your friends
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Friend Picker Modal */}
      <FriendPickerModal
        isOpen={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
        onSendToFriend={handleSendToFriend}
        title="Send Vostcard to Friend"
        itemType="vostcard"
      />
    </>
  );
};

export default SharedOptionsModal;
