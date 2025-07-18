import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaSearch, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { FriendService } from '../services/friendService';
import { type Friend } from '../types/FriendModels';

interface FriendPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToFriend: (friendUID: string, message?: string) => Promise<void>;
  title?: string;
  itemType?: 'vostcard' | 'quickcard';
}

const FriendPickerModal: React.FC<FriendPickerModalProps> = ({
  isOpen,
  onClose,
  onSendToFriend,
  title = 'Send to Friend',
  itemType = 'vostcard'
}) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadFriends();
    }
  }, [isOpen, user?.uid]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredFriends(
        friends.filter(friend =>
          friend.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const friendsList = await FriendService.getFriendsList(user.uid);
      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedFriend) return;
    
    setSending(true);
    try {
      await onSendToFriend(selectedFriend.uid, message.trim() || undefined);
      onClose();
      setSelectedFriend(null);
      setMessage('');
      setSearchQuery('');
    } catch (error) {
      console.error('Error sending to friend:', error);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedFriend(null);
    setMessage('');
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
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
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
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
          <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
          <button
            onClick={handleClose}
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

        {/* Search */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
          <div style={{ position: 'relative' }}>
            <FaSearch size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Friends List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          maxHeight: '300px'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading friends...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {friends.length === 0 ? 'No friends added yet' : 'No friends found'}
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.uid}
                onClick={() => setSelectedFriend(friend)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  backgroundColor: selectedFriend?.uid === friend.uid ? '#f0f8ff' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {friend.avatarURL ? (
                    <img
                      src={friend.avatarURL}
                      alt={friend.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FaUser size={20} color="#ccc" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {friend.username}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {friend.email}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        {selectedFriend && (
          <div style={{ padding: '16px', borderTop: '1px solid #eee' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Send to {selectedFriend.username}
            </div>
            <textarea
              placeholder={`Add a message with your ${itemType}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Send Button */}
        <div style={{ padding: '16px', borderTop: '1px solid #eee' }}>
          <button
            onClick={handleSend}
            disabled={!selectedFriend || sending}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: selectedFriend && !sending ? '#007aff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedFriend && !sending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {sending ? (
              'Sending...'
            ) : (
              <>
                <FaPaperPlane size={16} />
                Send {itemType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendPickerModal; 