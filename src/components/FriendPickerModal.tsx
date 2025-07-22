import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaSearch, FaPaperPlane, FaUserPlus, FaEnvelope, FaSms, FaWhatsapp, FaAddressBook } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { FriendService } from '../services/friendService';
import { InvitationService } from '../services/invitationService';
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
  
  // Invitation state
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [inviteRecipient, setInviteRecipient] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

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

  const handleSendInvitation = async () => {
    if (!user?.uid || !inviteRecipient.trim()) return;
    
    try {
      setSendingInvite(true);
      const result = await InvitationService.sendInvitation({
        senderUID: user.uid,
        inviteMethod,
        recipient: inviteRecipient.trim(),
        message: inviteMessage.trim() || `Hey! I'm using Vōstcard to share ${itemType}s privately with friends. Join me!`
      });

      if (result.success) {
        alert('Invitation sent successfully! 🎉');
        setInviteRecipient('');
        setInviteMessage('');
        setShowInviteSection(false);
      } else {
        alert(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleContactsPicker = async () => {
    try {
      // Check if Contact Picker API is supported
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel']);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          // Use email if available, otherwise phone
          if (contact.email && contact.email.length > 0) {
            setInviteRecipient(contact.email[0]);
            setInviteMethod('email');
          } else if (contact.tel && contact.tel.length > 0) {
            setInviteRecipient(contact.tel[0]);
            setInviteMethod('sms');
          }
        }
      } else {
        // Fallback for unsupported browsers
        alert('Contact picker not supported on this device. Please enter contact details manually.');
      }
    } catch (error) {
      console.error('Contact picker error:', error);
      alert('Unable to access contacts. Please enter contact details manually.');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedFriend(null);
    setMessage('');
    setSearchQuery('');
    setShowInviteSection(false);
    setInviteRecipient('');
    setInviteMessage('');
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
        maxHeight: '85vh',
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

        {/* Invite Friends Section */}
        <div style={{ borderBottom: '1px solid #eee' }}>
          <button
            onClick={() => setShowInviteSection(!showInviteSection)}
            style={{
              width: '100%',
              padding: '16px 20px',
              border: 'none',
              backgroundColor: showInviteSection ? '#f0f8ff' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: '600',
              color: '#007aff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaUserPlus size={16} />
              Invite Friends to Vōstcard
            </div>
            <span style={{ transform: showInviteSection ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </button>
          
          {showInviteSection && (
            <div style={{ padding: '16px 20px', backgroundColor: '#fafbfc', borderTop: '1px solid #eee' }}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                Send a request to join Vōstcard so they can see your shares privately
              </div>
              
              {/* Contact Picker Button */}
              <button
                onClick={handleContactsPicker}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '12px',
                  border: '2px dashed #007aff',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#007aff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <FaAddressBook size={16} />
                Choose from Contacts
              </button>
              
              {/* Method Selection */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { method: 'email' as const, icon: FaEnvelope, label: 'Email' },
                  { method: 'sms' as const, icon: FaSms, label: 'SMS' },
                  { method: 'whatsapp' as const, icon: FaWhatsapp, label: 'WhatsApp' }
                ].map(({ method, icon: Icon, label }) => (
                  <button
                    key={method}
                    onClick={() => setInviteMethod(method)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: `2px solid ${inviteMethod === method ? '#007aff' : '#ddd'}`,
                      borderRadius: '6px',
                      backgroundColor: inviteMethod === method ? '#f0f8ff' : 'white',
                      color: inviteMethod === method ? '#007aff' : '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Recipient Input */}
              <input
                type={inviteMethod === 'email' ? 'email' : 'tel'}
                placeholder={
                  inviteMethod === 'email' ? 'friend@email.com' : 
                  inviteMethod === 'sms' ? '+1234567890' : 
                  'WhatsApp number'
                }
                value={inviteRecipient}
                onChange={(e) => setInviteRecipient(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              
              {/* Optional Message */}
              <textarea
                placeholder="Add a personal message (optional)"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '8px',
                  marginBottom: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  resize: 'none',
                  outline: 'none'
                }}
              />
              
              {/* Send Invitation Button */}
              <button
                onClick={handleSendInvitation}
                disabled={!inviteRecipient.trim() || sendingInvite}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: inviteRecipient.trim() && !sendingInvite ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: inviteRecipient.trim() && !sendingInvite ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {sendingInvite ? '⏳ Sending...' : (
                  <>
                    <FaPaperPlane size={12} />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          )}
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
          maxHeight: '250px'
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