import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaTrash, FaReply, FaPlay, FaImage, FaUser, FaHome, FaEdit, FaUserFriends, FaUserPlus, FaSearch, FaUsers, FaCheck, FaTimes, FaEllipsisV, FaSms, FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { VostboxService } from '../services/vostboxService';
import { UserFriendService } from '../services/userFriendService';
import { FriendService } from '../services/friendService';
import { InvitationService } from '../services/invitationService';
import { type VostboxMessage, type Friend, type FriendRequest, type FriendSearchResult, type InvitationRequest } from '../types/FriendModels';
import ComposePrivateMessageModal from '../components/ComposePrivateMessageModal';

const VostboxView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Navigation state
  const [currentView, setCurrentView] = useState<'messages' | 'friends'>('messages');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'friends' | 'requests' | 'search'>('inbox');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  
  // Vostbox state
  const [messages, setMessages] = useState<VostboxMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<VostboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<VostboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  
  // Friends state  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [sentInvitations, setSentInvitations] = useState<InvitationRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [inviteRecipient, setInviteRecipient] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Combined loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadAllData();
    }
  }, [user?.uid]);

  const loadAllData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Initialize friend fields if needed
      await UserFriendService.initializeFriendFields(user.uid);
      
      // Load both Vostbox and Friends data in parallel
      const [
        inboxMessages, 
        sentMessages, 
        unreadCount,
        friendsList,
        requests,
        fCount,
        rCountDirect,
        invitations
      ] = await Promise.all([
        // Vostbox data
        VostboxService.getVostboxMessages(user.uid),
        VostboxService.getSentMessages(user.uid),
        UserFriendService.getUnreadVostboxCount(user.uid),
        // Friends data
        FriendService.getFriendsList(user.uid),
        FriendService.getPendingRequests(user.uid),
        UserFriendService.getFriendCount(user.uid),
        UserFriendService.getPendingRequestCountDirect(user.uid),
        InvitationService.getSentInvitations(user.uid)
      ]);

      // Set Vostbox data
      setMessages(inboxMessages);
      setSentMessages(sentMessages);
      setUnreadCount(unreadCount);
      
      // Set Friends data
      setFriends(friendsList);
      setPendingRequests(requests);
      setFriendCount(fCount);
      setRequestCount(rCountDirect);
      setSentInvitations(invitations);
    } catch (error) {
      console.error('Error loading social hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Keep the original function for when we only need to refresh Vostbox data
  const loadVostboxData = async () => {
    if (!user?.uid) return;

    try {
      const [inboxMessages, sentMessages, unreadCount] = await Promise.all([
        VostboxService.getVostboxMessages(user.uid),
        VostboxService.getSentMessages(user.uid),
        UserFriendService.getUnreadVostboxCount(user.uid)
      ]);

      setMessages(inboxMessages);
      setSentMessages(sentMessages);
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Error loading vostbox data:', error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!user?.uid) return;
    
    const result = await VostboxService.markMessageAsRead(messageId, user.uid);
    if (result.success) {
      await loadVostboxData(); // Refresh data
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.uid) return;
    
    const result = await VostboxService.deleteMessage(messageId, user.uid);
    if (result.success) {
      await loadVostboxData(); // Refresh data
      setSelectedMessage(null);
    } else {
      alert(result.error || 'Failed to delete message');
    }
  };

  const handleReply = async (messageId: string) => {
    if (!user?.uid || !replyText.trim()) return;
    
    const result = await VostboxService.replyToMessage({
      messageID: messageId,
      userUID: user.uid,
      replyMessage: replyText.trim()
    });
    
    if (result.success) {
      setReplyText('');
      await loadVostboxData(); // Refresh data
    } else {
      alert(result.error || 'Failed to send reply');
    }
  };

  // Friends-related handlers
  const handleAcceptRequest = async (requestId: string) => {
    if (!user?.uid) return;
    
    const result = await FriendService.acceptFriendRequest(requestId, user.uid);
    if (result.success) {
      await loadAllData(); // Refresh all data
    } else {
      alert(result.error || 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user?.uid) return;
    
    const result = await FriendService.rejectFriendRequest(requestId, user.uid);
    if (result.success) {
      await loadAllData(); // Refresh all data
    } else {
      alert(result.error || 'Failed to reject friend request');
    }
  };

  const handleUserSearch = async (query: string) => {
    if (!user?.uid || !query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const results = await FriendService.searchUsers(query.trim(), user.uid);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSendFriendRequest = async (targetUID: string) => {
    if (!user?.uid) return;
    
    const result = await FriendService.sendFriendRequest(user.uid, targetUID);
    if (result.success) {
      await handleUserSearch(searchQuery); // Refresh search results
      await loadAllData(); // Refresh data
    } else {
      alert(result.error || 'Failed to send friend request');
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
        message: inviteMessage.trim() || `Hey! I'm using Vōstcard to share posts privately with friends. Join me!`
      });

      if (result.success) {
        alert('Invitation sent successfully! 🎉');
        setInviteRecipient('');
        setInviteMessage('');
        setShowInviteModal(false);
        await loadAllData(); // Refresh data to show new invitation
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

  // Debounced search effect
  useEffect(() => {
    if (showAddFriendModal && searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleUserSearch(searchQuery);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, user?.uid, showAddFriendModal]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const renderFriendsList = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>Loading friends...</div>
        </div>
      );
    }

    if (friends.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FaUserFriends size={48} color="#ccc" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No Friends Yet
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Add friends to start sharing posts privately!
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        {friends.map((friend) => (
          <div 
            key={friend.uid} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              margin: '8px 0',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #f0f0f0'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontSize: '20px'
            }}>
              {friend.avatarURL ? (
                <img
                  src={friend.avatarURL}
                  alt={friend.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <FaUser color="#666" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                {friend.username}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Friends since {new Date(friend.friendsSince).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => {
                setShowComposeModal(true);
                // Could pre-select this friend in the compose modal
              }}
              style={{
                backgroundColor: '#6B4D9B',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Message
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderRequestsList = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>Loading requests...</div>
        </div>
      );
    }

    if (pendingRequests.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FaUsers size={48} color="#ccc" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No Pending Requests
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Friend requests will appear here
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        {pendingRequests.map((request) => (
          <div 
            key={request.id} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              margin: '8px 0',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #f0f0f0'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontSize: '20px'
            }}>
              <FaUser color="#666" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                {request.senderUsername}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Sent {new Date(request.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleAcceptRequest(request.id)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <FaCheck style={{ marginRight: '4px' }} />
                Accept
              </button>
              <button
                onClick={() => handleRejectRequest(request.id)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <FaTimes style={{ marginRight: '4px' }} />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAddFriendModal = () => {
    if (!showAddFriendModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Add Friend
            </h2>
            <button
              onClick={() => {
                setShowAddFriendModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          {/* Search Input */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search for friends by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Search Results */}
          {searchingUsers ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Searching users...
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                Search Results
              </h3>
              {searchResults.map((result) => (
                <div 
                  key={result.uid} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    margin: '8px 0',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '16px'
                  }}>
                    <FaUser color="#666" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {result.username}
                    </div>
                    {result.status && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {result.status}
                      </div>
                    )}
                  </div>
                  {!result.isFriend && !result.hasPendingRequest && (
                    <button
                      onClick={() => handleSendFriendRequest(result.uid)}
                      style={{
                        backgroundColor: '#002B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaUserPlus style={{ marginRight: '4px' }} />
                      Add
                    </button>
                  )}
                  {result.hasPendingRequest && (
                    <div style={{
                      color: '#666',
                      fontSize: '12px',
                      fontStyle: 'italic'
                    }}>
                      Sent
                    </div>
                  )}
                  {result.isFriend && (
                    <div style={{
                      color: '#28a745',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ✓ Friends
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery.trim() && !searchingUsers ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No users found matching "{searchQuery}"
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FaSearch size={48} color="#ccc" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Find Friends
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Search for friends by their username
              </div>
            </div>
          )}

          {/* Invite Section */}
          <div style={{
            borderTop: '1px solid #eee',
            paddingTop: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Invite Friends
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Can't find your friend? Send them an invitation to join Vōstcard.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                backgroundColor: '#6B4D9B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMessageList = (messageList: VostboxMessage[], isInbox: boolean) => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>Loading messages...</div>
        </div>
      );
    }

    if (messageList.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FaInbox size={48} color="#ccc" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            {isInbox ? 'No Messages Yet' : 'No Sent Messages'}
          </div>
          <div style={{ color: '#666' }}>
            {isInbox 
              ? 'Friend-shared vostcards will appear here' 
              : 'Vostcards you share with friends will appear here'
            }
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        {messageList.map((message) => (
          <div 
            key={message.id} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              borderBottom: '1px solid #eee',
              backgroundColor: message.isRead ? 'white' : '#f8f9ff',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              setSelectedMessage(message);
              if (isInbox && !message.isRead) {
                handleMarkAsRead(message.id);
              }
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
              {message.senderAvatarURL ? (
                <img 
                  src={message.senderAvatarURL} 
                  alt={message.senderUsername}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <FaUser size={24} color="#ccc" />
              )}
            </div>

            {/* Message Content */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {isInbox ? message.senderUsername : `To: ${message.receiverUID}`}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {formatTimeAgo(message.sharedAt)}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '14px', 
                color: '#333',
                fontWeight: '500',
                marginBottom: '2px'
              }}>
                📱 {message.vostcardTitle}
              </div>
              
              {message.message && (
                <div style={{ 
                  color: '#666', 
                  fontSize: '13px',
                  fontStyle: 'italic',
                  marginBottom: '4px'
                }}>
                  "{message.message}"
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {message.vostcardVideoURL && (
                  <FaPlay size={12} color="#007aff" />
                )}
                {message.vostcardPhotoURLs && message.vostcardPhotoURLs.length > 0 && (
                  <FaImage size={12} color="#007aff" />
                )}
                {message.replyMessage && (
                  <FaReply size={12} color="#28a745" />
                )}
              </div>
            </div>

            {/* Read Status */}
            {isInbox && (
              <div style={{ marginLeft: '8px' }}>
                {message.isRead ? (
                  <FaEnvelopeOpen size={16} color="#ccc" />
                ) : (
                  <FaEnvelope size={16} color="#007aff" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMessageDetail = () => {
    if (!selectedMessage) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#002B4D',
          color: 'white',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSelectedMessage(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <FaArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              {selectedMessage.vostcardTitle}
            </h2>
          </div>
          <button
            onClick={() => handleDeleteMessage(selectedMessage.id)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <FaTrash size={18} />
          </button>
        </div>

        {/* Message Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Sender Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedMessage.senderAvatarURL ? (
                <img 
                  src={selectedMessage.senderAvatarURL} 
                  alt={selectedMessage.senderUsername}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <FaUser size={20} color="#ccc" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{selectedMessage.senderUsername}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {selectedMessage.sharedAt.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Personal Message */}
          {selectedMessage.message && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: '4px solid #2196f3'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Message:</div>
              <div style={{ fontStyle: 'italic' }}>"{selectedMessage.message}"</div>
            </div>
          )}

          {/* Vostcard Preview */}
          <div style={{
            border: '1px solid #eee',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>{selectedMessage.vostcardTitle}</h3>
            {selectedMessage.vostcardDescription && (
              <p style={{ margin: '0 0 12px 0', color: '#666' }}>
                {selectedMessage.vostcardDescription}
              </p>
            )}
            
            {/* Media Preview */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {selectedMessage.vostcardVideoURL && (
                <div style={{
                  backgroundColor: '#f0f0f0',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FaPlay size={14} color="#007aff" />
                  <span style={{ fontSize: '12px' }}>Video</span>
                </div>
              )}
              {selectedMessage.vostcardPhotoURLs && selectedMessage.vostcardPhotoURLs.length > 0 && (
                <div style={{
                  backgroundColor: '#f0f0f0',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FaImage size={14} color="#007aff" />
                  <span style={{ fontSize: '12px' }}>
                    {selectedMessage.vostcardPhotoURLs.length} Photo{selectedMessage.vostcardPhotoURLs.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/vostcard/${selectedMessage.vostcardID}`)}
              style={{
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              View Full Vostcard
            </button>
          </div>

          {/* Reply Section */}
          {activeTab === 'inbox' && (
            <div style={{
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Reply:</h4>
              {selectedMessage.replyMessage && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    You replied on {selectedMessage.repliedAt?.toLocaleString()}:
                  </div>
                  <div>"{selectedMessage.replyMessage}"</div>
                </div>
              )}
              
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => handleReply(selectedMessage.id)}
                disabled={!replyText.trim()}
                style={{
                  backgroundColor: replyText.trim() ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  marginTop: '8px'
                }}
              >
                Send Reply
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#002B4D',
        color: 'white',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 
          onClick={() => navigate('/home')}
          style={{ margin: 0, fontSize: '24px', cursor: 'pointer' }}
        >
          Social Hub
        </h1>
          {unreadCount > 0 && (
            <div style={{
              backgroundColor: '#ff4444',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {unreadCount}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Home Button */}
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: 'rgba(0,0,0,0.10)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FaHome size={40} color="white" />
        </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
        display: 'flex',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {currentView === 'messages' ? (
          // Level 1: Messages View
          <>
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: activeTab === 'inbox' ? '#002B4D' : 'transparent',
                color: activeTab === 'inbox' ? 'white' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'inbox' ? '2px solid #002B4D' : 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <FaInbox size={16} style={{ marginRight: '8px' }} />
              Inbox ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: activeTab === 'sent' ? '#002B4D' : 'transparent',
                color: activeTab === 'sent' ? 'white' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'sent' ? '2px solid #002B4D' : 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <FaPaperPlane size={16} style={{ marginRight: '8px' }} />
              Sent ({sentMessages.length})
            </button>
            <button
              onClick={() => {
                setCurrentView('friends');
                setActiveTab('friends');
              }}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#666',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <FaUserFriends size={16} style={{ marginRight: '8px' }} />
              Friends ({friendCount})
            </button>
          </>
        ) : (
          // Level 2: Friends View
          <>
            <button
              onClick={() => {
                setCurrentView('messages');
                setActiveTab('inbox');
              }}
              style={{
                minWidth: '60px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#002B4D',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <FaArrowLeft size={14} style={{ marginRight: '6px' }} />
              Back
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: activeTab === 'friends' ? '#002B4D' : 'transparent',
                color: activeTab === 'friends' ? 'white' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'friends' ? '2px solid #002B4D' : 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <FaUserFriends size={16} style={{ marginRight: '8px' }} />
              Friends ({friendCount})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '16px 12px',
                border: 'none',
                backgroundColor: activeTab === 'requests' ? '#002B4D' : 'transparent',
                color: activeTab === 'requests' ? 'white' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'requests' ? '2px solid #002B4D' : 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <FaUsers size={16} style={{ marginRight: '8px' }} />
              Requests ({requestCount})
            </button>
            {/* Removed Inbox tab from friends view (Back button covers navigation) */}
          </>
        )}
      </div>

      {/* Compose Button below tabs (messages view only) */}
      {currentView === 'messages' && (
        <div style={{
          backgroundColor: 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #eee'
        }}>
          <button
            onClick={() => setShowComposeModal(true)}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <FaEdit size={14} />
            Compose
          </button>
        </div>
      )}

      {/* Add Friend Button (only show in friends view) */}
      {currentView === 'friends' && (
        <div style={{
          backgroundColor: 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #eee'
        }}>
          <button
            onClick={() => setShowAddFriendModal(true)}
            style={{
              backgroundColor: '#6B4D9B',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <FaUserPlus size={14} />
            Add Friend
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1 }}>
        {currentView === 'messages' ? (
          // Messages View Content
          <>
            {activeTab === 'inbox' && renderMessageList(messages, true)}
            {activeTab === 'sent' && renderMessageList(sentMessages, false)}
          </>
        ) : (
          // Friends View Content
          <>
            {activeTab === 'friends' && renderFriendsList()}
            {activeTab === 'requests' && renderRequestsList()}
          </>
        )}
      </div>

      {/* Message Detail Modal */}
      {renderMessageDetail()}
      
      {/* Add Friend Modal */}
      {renderAddFriendModal()}
      
      {/* Existing Invitation Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Send Invitation
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Invitation Method:
              </label>
              <select
                value={inviteMethod}
                onChange={(e) => setInviteMethod(e.target.value as 'email' | 'sms' | 'whatsapp')}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                {inviteMethod === 'email' ? 'Email Address:' : 'Phone Number:'}
              </label>
              <input
                type={inviteMethod === 'email' ? 'email' : 'tel'}
                placeholder={inviteMethod === 'email' ? 'friend@example.com' : '+1234567890'}
                value={inviteRecipient}
                onChange={(e) => setInviteRecipient(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Personal Message (Optional):
              </label>
              <textarea
                placeholder="Hey! I'm using Vōstcard to share posts privately with friends. Join me!"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={sendingInvite || !inviteRecipient.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: sendingInvite || !inviteRecipient.trim() ? '#ccc' : '#6B4D9B',
                  color: 'white',
                  cursor: sendingInvite || !inviteRecipient.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {sendingInvite ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Compose Private Message Modal */}
      <ComposePrivateMessageModal
        isOpen={showComposeModal}
        onClose={() => {
          setShowComposeModal(false);
          // Refresh all data when modal closes (in case messages were sent)
          loadVostboxData(); // Only refresh messages, not all friends data
        }}
      />
    </div>
  );
};

export default VostboxView; 