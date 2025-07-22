import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaSearch, FaPaperPlane, FaUserPlus, FaEnvelope, FaSms, FaWhatsapp, FaAddressBook, FaGoogle, FaCheck, FaSpinner } from 'react-icons/fa';
import { ContactImportService, type ImportedContact } from '../services/contactImportService';

interface EnhancedFriendPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToFriend: (friendUID: string, message?: string) => Promise<void>;
  title?: string;
  itemType?: 'vostcard' | 'quickcard';
}

const EnhancedFriendPickerModal: React.FC<EnhancedFriendPickerModalProps> = ({
  isOpen,
  onClose,
  onSendToFriend,
  title = 'Send to Friend',
  itemType = 'vostcard'
}) => {
  // ... existing state variables ...
  
  // New state for contact import
  const [showContactImport, setShowContactImport] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [importingContacts, setImportingContacts] = useState(false);
  const [importSource, setImportSource] = useState<'google' | 'native' | null>(null);

  // Enhanced contact picker with multiple options
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
        // Use existing invitation service
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

  if (!isOpen) return null;

  return (
    <div style={{ /* existing modal styles */ }}>
      <div style={{ /* existing modal content styles */ }}>
        
        {/* Enhanced Invite Friends Section */}
        <div style={{ borderBottom: '1px solid #eee' }}>
          <button
            onClick={() => setShowInviteSection(!showInviteSection)}
            style={{ /* existing button styles */ }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaUserPlus size={16} />
              Invite Friends to Vōstcard
            </div>
          </button>
          
          {showInviteSection && (
            <div style={{ padding: '16px 20px', backgroundColor: '#fafbfc' }}>
              
              {/* Contact Import Options */}
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
                      <FaSpinner className="spinner" size={16} />
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
                      <FaSpinner className="spinner" size={16} />
                    ) : (
                      <FaAddressBook size={16} />
                    )}
                    Device Contacts
                  </button>
                </div>
              </div>

              {/* Existing manual entry section */}
              {/* ... rest of your existing invitation UI ... */}
              
            </div>
          )}
        </div>

        {/* ... existing friends list and other sections ... */}
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

            {/* Select 