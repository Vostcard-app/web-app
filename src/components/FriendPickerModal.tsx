import React, { useState, useEffect } from 'react';
import { 
  FaTimes, FaUser, FaSearch, FaPaperPlane, FaUserPlus, FaEnvelope, FaSms, 
  FaWhatsapp, FaAddressBook, FaGoogle, FaSpinner, FaCheck 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { FriendService } from '../services/friendService';
import { InvitationService } from '../services/invitationService';
import { ContactImportService, type ImportedContact } from '../services/contactImportService';
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

  // Enhanced contact import state
  const [showContactImport, setShowContactImport] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [importingContacts, setImportingContacts] = useState(false);
  const [importSource, setImportSource] = useState<'google' | 'native' | null>(null);

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

  // Enhanced contact import with Google Contacts
  const handleContactImport = async (source: 'google' | 'native') => {
    setImportingContacts(true);
    setImportSource(source);
    
    try {
      let contacts: ImportedContact[] = [];
      
      if (source === 'google') {
        contacts = await ContactImportService.importFromGoogle();
      } else {
        contacts = await ContactImportService.importFromNative();
      }
      
      setImportedContacts(contacts);
      setShowContactImport(true);
    } catch (error) {
      console.error('Contact import failed:', error);
      alert(`Failed to import contacts: ${error.message}`);
    } finally {
      setImportingContacts(false);
      setImportSource(null);
    }
  };

  const handleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleBulkInvite = async () => {
    const contactsToInvite = importedContacts.filter(contact => 
      selectedContacts.has(contact.id)
    );
    
    for (const contact of contactsToInvite) {
      try {
        const recipient = contact.email || contact.phone || '';
        const method = contact.email ? 'email' : 'sms';
        
        await InvitationService.sendInvitation({
          senderUID: user!.uid,
          inviteMethod: method as 'email' | 'sms',
          recipient: recipient,
          message: `Hey ${contact.name}! I'm using Vōstcard to share ${itemType}s privately with friends. Join me!`
        });
      } catch (error) {
        console.error(`Failed to invite ${contact.name}:`, error);
      }
    }
    
    alert(`Sent ${contactsToInvite.length} invitations!`);
    setShowContactImport(false);
    setSelectedContacts(new Set());
    setImportedContacts([]);
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
    setShowContactImport(false);
    setImportedContacts([]);
    setSelectedContacts(new Set());
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

          {/* Enhanced Invite Friends Section */}
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
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                    Import contacts to invite multiple friends at once
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {/* Google Contacts Button */}
                    <button
                      onClick={() => handleContactImport('google')}
                      disabled={importingContacts}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #4285f4',
                        borderRadius: '8px',
                        backgroundColor: importingContacts && importSource === 'google' ? '#f0f0f0' : 'white',
                        color: '#4285f4',
                        cursor: importingContacts ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: importingContacts && importSource !== 'google' ? 0.5 : 1
                      }}
                    >
                      {importingContacts && importSource === 'google' ? (
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={16} />
                      ) : (
                        <FaGoogle size={16} />
                      )}
                      Google Contacts
                    </button>
                    
                    {/* Native Contacts Button */}
                    <button
                      onClick={() => handleContactImport('native')}
                      disabled={importingContacts}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #007aff',
                        borderRadius: '8px',
                        backgroundColor: importingContacts && importSource === 'native' ? '#f0f0f0' : 'white',
                        color: '#007aff',
                        cursor: importingContacts ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: importingContacts && importSource !== 'native' ? 0.5 : 1
                      }}
                    >
                      {importingContacts && importSource === 'native' ? (
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={16} />
                      ) : (
                        <FaAddressBook size={16} />
                      )}
                      Device Contacts
                    </button>
                  </div>
                </div>

                {/* Manual Entry Section */}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                  <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                    Or send individual invitations manually
                  </div>
                  
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

      {/* Contact Import Modal */}
      {showContactImport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0 }}>
                Select Contacts ({selectedContacts.size}/{importedContacts.length})
              </h3>
              <button
                onClick={() => setShowContactImport(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Select All/None */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedContacts(new Set(importedContacts.map(c => c.id)))}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #007aff',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#007aff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedContacts(new Set())}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #666',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Select None
                </button>
              </div>
            </div>

            {/* Contacts List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
              {importedContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => handleContactSelection(contact.id)}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    backgroundColor: selectedContacts.has(contact.id) ? '#f0f8ff' : 'white',
                    borderLeft: selectedContacts.has(contact.id) ? '4px solid #007aff' : '4px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${selectedContacts.has(contact.id) ? '#007aff' : '#ddd'}`,
                    backgroundColor: selectedContacts.has(contact.id) ? '#007aff' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedContacts.has(contact.id) && (
                      <FaCheck size={12} color="white" />
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {contact.email || contact.phone || 'No contact info'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#999',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    {contact.source}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
              <button
                onClick={handleBulkInvite}
                disabled={selectedContacts.size === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: selectedContacts.size > 0 ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: selectedContacts.size > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaPaperPlane size={16} />
                Send {selectedContacts.size} Invitations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default FriendPickerModal; 