import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserFriends, FaUserPlus, FaSearch, FaUsers, FaEnvelope, FaCheck, FaTimes, FaEllipsisV } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { FriendService } from '../services/friendService';
import { UserFriendService } from '../services/userFriendService';
import { type Friend, type FriendRequest } from '../types/FriendModels';

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
      
      // Load friends and requests
      const [friendsList, requests, fCount, rCount] = await Promise.all([
        FriendService.getFriendsList(user.uid),
        FriendService.getPendingRequests(user.uid),
        UserFriendService.getFriendCount(user.uid),
        UserFriendService.getPendingRequestCount(user.uid)
      ]);

      setFriends(friendsList);
      setPendingRequests(requests);
      setFriendCount(fCount);
      setRequestCount(rCount);
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
            placeholder="Search by username or email..."
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
        
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FaSearch size={48} color="#ccc" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Search for Friends</div>
          <div style={{ color: '#666' }}>Enter a username or email to find friends</div>
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
    </div>
  );
};

export default FriendListView; 