import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserFriends, FaUserPlus, FaSearch, FaUsers, FaEnvelope, FaCheck, FaTimes, FaEllipsisV, FaSms, FaWhatsapp, FaPaperPlane, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { FriendService } from '../services/friendService';
import { UserFriendService } from '../services/userFriendService';
import { InvitationService } from '../services/invitationService';
import { type Friend, type FriendRequest, type FriendSearchResult, type InvitationRequest } from '../types/FriendModels';

const FriendListView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [sentInvitations, setSentInvitations] = useState<InvitationRequest[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [inviteRecipient, setInviteRecipient] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadFriendData();
    }
  }, [user?.uid]);

  const loadFriendData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Initialize friend fields if needed
      await UserFriendService.initializeFriendFields(user.uid);
      
      // Load friends, requests, and invitations
      const [friendsList, requests, fCount, rCount, invitations] = await Promise.all([
        FriendService.getFriendsList(user.uid),
        FriendService.getPendingRequests(user.uid),
        UserFriendService.getFriendCount(user.uid),
        UserFriendService.getPendingRequestCount(user.uid),
        InvitationService.getSentInvitations(user.uid)
      ]);

      setFriends(friendsList);
      setPendingRequests(requests);
      setFriendCount(fCount);
      setRequestCount(rCount);
      setSentInvitations(invitations);
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user?.uid) return;
    
    const result = await FriendService.acceptFriendRequest(requestId, user.uid);
    if (result.success) {
      await loadFriendData(); // Refresh data
    } else {
      alert(result.error || 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user?.uid) return;
    
    const result = await FriendService.rejectFriendRequest(requestId, user.uid);
    if (result.success) {
      await loadFriendData(); // Refresh data
    } else {
      alert(result.error || 'Failed to reject friend request');
    }
  };

  const handleUserSearch = async (query: string) => {
    if (!user?.uid || !query.trim() || query.trim().length < 2) {
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
      await loadFriendData(); // Refresh data
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
        message: inviteMessage.trim()
      });

      if (result.success) {
        alert('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteRecipient('');
        setInviteMessage('');
        await loadFriendData(); // Refresh data to show new invitation
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
    const timer = setTimeout(() => {
      handleUserSearch(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.uid]);

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
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Friends Yet</div>
          <div style={{ color: '#666', marginBottom: '24px' }}>Search for friends to get started!</div>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Find Friends
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        {friends.map((friend) => (
          <div key={friend.uid} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderBottom: '1px solid #eee',
            backgroundColor: 'white'
          }}>
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
              {friend.avatarURL ? (
                <img 
                  src={friend.avatarURL} 
                  alt={friend.username}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <FaUserFriends size={24} color="#ccc" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{friend.username}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>Friends since {friend.establishedAt?.toLocaleDateString()}</div>
            </div>
            <button
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: '8px',
                cursor: 'pointer'
              }}
            >
              <FaEllipsisV size={16} color="#666" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderPendingRequests = () => {
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
          <FaEnvelope size={48} color="#ccc" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Pending Requests</div>
          <div style={{ color: '#666' }}>Friend requests will appear here</div>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        {pendingRequests.map((request) => (
          <div key={request.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderBottom: '1px solid #eee',
            backgroundColor: 'white'
          }}>
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
              {request.senderAvatarURL ? (
                <img 
                  src={request.senderAvatarURL} 
                  alt={request.senderUsername}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <FaUserFriends size={24} color="#ccc" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{request.senderUsername}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {request.createdAt?.toLocaleDateString()}
                {request.message && <div style={{ marginTop: '4px' }}>"{request.message}"</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleAcceptRequest(request.id)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FaCheck size={14} />
              </button>
              <button
                onClick={() => handleRejectRequest(request.id)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div style={{ padding: '16px' }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <FaSearch size={16} color="#666" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Invite Friends Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            width: '100%',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FaPaperPlane size={16} />
          Invite Friends via Email/SMS/WhatsApp
        </button>

        {/* Search Results */}
        {searchingUsers && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div>Searching...</div>
          </div>
        )}

        {searchQuery.trim().length >= 2 && !searchingUsers && searchResults.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Search Results:</h4>
            {searchResults.map((result) => (
              <div 
                key={result.uid} 
                onClick={() => {
                  if (!result.isFriend && !result.hasPendingRequest && !result.isBlocked) {
                    handleSendFriendRequest(result.uid);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: (!result.isFriend && !result.hasPendingRequest && !result.isBlocked) ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  border: '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!result.isFriend && !result.hasPendingRequest && !result.isBlocked) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#007aff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = 'transparent';
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
                  marginRight: '12px'
                }}>
                  {result.avatarURL ? (
                    <img 
                      src={result.avatarURL} 
                      alt={result.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FaUserFriends size={20} color="#ccc" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{result.name}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{result.email}</div>
                  {result.mutualFriends > 0 && (
                    <div style={{ color: '#007aff', fontSize: '12px' }}>
                      {result.mutualFriends} mutual friend{result.mutualFriends > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div>
                  {result.isFriend ? (
                    <span style={{ color: '#28a745', fontSize: '12px', fontWeight: '600' }}>
                      <FaCheck size={12} style={{ marginRight: '4px' }} />
                      Friends
                    </span>
                  ) : result.hasPendingRequest ? (
                    <span style={{ color: '#ffc107', fontSize: '12px', fontWeight: '600' }}>
                      Pending
                    </span>
                  ) : result.isBlocked ? (
                    <span style={{ color: '#dc3545', fontSize: '12px', fontWeight: '600' }}>
                      Blocked
                    </span>
                  ) : (
                    <div style={{ 
                      color: '#007aff', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FaUserPlus size={12} />
                      Tap to Add
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim().length >= 2 && !searchingUsers && searchResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>No users found</div>
            <div style={{ fontSize: '14px', color: '#999', marginTop: '4px' }}>
              Try searching by exact username or email
            </div>
          </div>
        )}

        {/* Sent Invitations */}
        {sentInvitations.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Sent Invitations:</h4>
            {sentInvitations.filter(inv => inv.status === 'pending').slice(0, 5).map((invitation) => (
              <div key={invitation.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#007aff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px'
                }}>
                  {invitation.inviteMethod === 'email' && <FaEnvelope size={16} color="white" />}
                  {invitation.inviteMethod === 'sms' && <FaSms size={16} color="white" />}
                  {invitation.inviteMethod === 'whatsapp' && <FaWhatsapp size={16} color="white" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {invitation.inviteeEmail || invitation.inviteePhone || invitation.inviteeWhatsApp}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    Sent {invitation.createdAt.toLocaleDateString()} • Expires {invitation.expiresAt.toLocaleDateString()}
                  </div>
                </div>
                <div style={{ color: '#ffc107', fontSize: '12px', fontWeight: '600' }}>
                  Pending
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {searchQuery.trim().length < 2 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FaSearch size={48} color="#ccc" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Find & Invite Friends</div>
            <div style={{ color: '#666', marginBottom: '16px' }}>
              Search for existing users or invite friends to join Vōstcard
            </div>
          </div>
        )}
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
        gap: '16px'
      }}>
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>Friends</h1>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
        display: 'flex'
      }}>
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'friends' ? '#002B4D' : 'transparent',
            color: activeTab === 'friends' ? 'white' : '#666',
            cursor: 'pointer',
            borderBottom: activeTab === 'friends' ? '2px solid #002B4D' : 'none'
          }}
        >
          <FaUsers size={16} style={{ marginRight: '8px' }} />
          Friends ({friendCount})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'requests' ? '#002B4D' : 'transparent',
            color: activeTab === 'requests' ? 'white' : '#666',
            cursor: 'pointer',
            borderBottom: activeTab === 'requests' ? '2px solid #002B4D' : 'none'
          }}
        >
          <FaEnvelope size={16} style={{ marginRight: '8px' }} />
          Requests ({requestCount})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'search' ? '#002B4D' : 'transparent',
            color: activeTab === 'search' ? 'white' : '#666',
            cursor: 'pointer',
            borderBottom: activeTab === 'search' ? '2px solid #002B4D' : 'none'
          }}
        >
          <FaUserPlus size={16} style={{ marginRight: '8px' }} />
          Add Friends
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'friends' && renderFriendsList()}
        {activeTab === 'requests' && renderPendingRequests()}
        {activeTab === 'search' && renderSearch()}
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
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
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#333' }}>Invite Friends</h3>
                              <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteRecipient('');
                    setInviteMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
            </div>

            {/* Invitation Method Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                Invitation Method:
              </label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setInviteMethod('email')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `2px solid ${inviteMethod === 'email' ? '#007aff' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      backgroundColor: inviteMethod === 'email' ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaEnvelope size={16} />
                    Email
                  </button>
                  <button
                    onClick={() => setInviteMethod('sms')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `2px solid ${inviteMethod === 'sms' ? '#007aff' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      backgroundColor: inviteMethod === 'sms' ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaSms size={16} />
                    SMS
                  </button>
                  <button
                    onClick={() => setInviteMethod('whatsapp')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `2px solid ${inviteMethod === 'whatsapp' ? '#007aff' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      backgroundColor: inviteMethod === 'whatsapp' ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaWhatsapp size={16} />
                    WhatsApp
                  </button>
                </div>
            </div>

                          {/* Contact Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Select Contact:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => {
                      alert('Contact picker functionality is removed. Please enter recipient manually.');
                    }}
                    disabled
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid #ccc',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      color: '#666',
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      opacity: 0.6
                    }}
                  >
                    <FaUser size={16} />
                    Choose from Contacts (Not Available)
                  </button>
                  
                  {/* Removed manual recipient input field */}
                </div>
                
                {/* Removed Device Support Info */}
              </div>

              {/* Manual Recipient Input (fallback) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Or enter {inviteMethod === 'email' ? 'Email Address' : 'Phone Number'} manually:
                </label>
                <input
                  type={inviteMethod === 'email' ? 'email' : 'tel'}
                  value={inviteRecipient}
                  onChange={(e) => setInviteRecipient(e.target.value)}
                  placeholder={inviteMethod === 'email' ? 'friend@example.com' : '+1234567890'}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

            {/* Custom Message */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                Personal Message (Optional):
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Hey! I think you'd love this app..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                              <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteRecipient('');
                    setInviteMessage('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#666',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              <button
                onClick={handleSendInvitation}
                disabled={!inviteRecipient.trim() || sendingInvite}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: sendingInvite ? '#ccc' : '#28a745',
                  color: 'white',
                  fontSize: '16px',
                  cursor: sendingInvite ? 'not-allowed' : 'pointer'
                }}
              >
                {sendingInvite ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendListView; 