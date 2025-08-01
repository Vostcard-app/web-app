import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaTrash, FaReply, FaPlay, FaImage, FaUser, FaHome } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { VostboxService } from '../services/vostboxService';
import { UserFriendService } from '../services/userFriendService';
import { type VostboxMessage } from '../types/FriendModels';

const VostboxView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<VostboxMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<VostboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<VostboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (user?.uid) {
      loadVostboxData();
    }
  }, [user?.uid]);

  const loadVostboxData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Initialize friend fields if needed
      await UserFriendService.initializeFriendFields(user.uid);
      
      // Load messages and stats
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
    } finally {
      setLoading(false);
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
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
          Vōstbox
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

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
        display: 'flex'
      }}>
        <button
          onClick={() => setActiveTab('inbox')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'inbox' ? '#002B4D' : 'transparent',
            color: activeTab === 'inbox' ? 'white' : '#666',
            cursor: 'pointer',
            borderBottom: activeTab === 'inbox' ? '2px solid #002B4D' : 'none'
          }}
        >
          <FaInbox size={16} style={{ marginRight: '8px' }} />
          Inbox ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'sent' ? '#002B4D' : 'transparent',
            color: activeTab === 'sent' ? 'white' : '#666',
            cursor: 'pointer',
            borderBottom: activeTab === 'sent' ? '2px solid #002B4D' : 'none'
          }}
        >
          <FaPaperPlane size={16} style={{ marginRight: '8px' }} />
          Sent ({sentMessages.length})
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'inbox' && renderMessageList(messages, true)}
        {activeTab === 'sent' && renderMessageList(sentMessages, false)}
      </div>

      {/* Message Detail Modal */}
      {renderMessageDetail()}
    </div>
  );
};

export default VostboxView; 