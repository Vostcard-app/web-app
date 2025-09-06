import React, { useState, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaImage, FaVideo, FaUser, FaSearch, FaCheck } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { VostboxService } from '../services/vostboxService';
import { FriendService } from '../services/friendService';
import { type Friend } from '../types/FriendModels';
import { type Vostcard } from '../types/VostcardTypes';

interface ComposePrivateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedPost?: Vostcard | null;
}

const ComposePrivateMessageModal: React.FC<ComposePrivateMessageModalProps> = ({
  isOpen,
  onClose,
  preSelectedPost
}) => {
  const { user } = useAuth();
  const { savedVostcards, loadAllLocalVostcards } = useVostcard();
  
  // Message state
  const [message, setMessage] = useState('');
  const [selectedPost, setSelectedPost] = useState<Vostcard | null>(preSelectedPost || null);
  
  // Friend selection state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  // Users (non-friend) search and selection
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<Friend[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Post selection state
  const [showPostPicker, setShowPostPicker] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Vostcard[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && user?.uid) {
      loadFriends();
      loadPosts();
    }
  }, [isOpen, user?.uid]);

  // Set pre-selected post
  useEffect(() => {
    if (preSelectedPost) {
      setSelectedPost(preSelectedPost);
    }
  }, [preSelectedPost]);

  // Filter friends based on search
  useEffect(() => {
    if (friendSearchQuery.trim()) {
      setFilteredFriends(
        friends.filter(friend =>
          friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [friendSearchQuery, friends]);

  // Debounced user search (registered users)
  useEffect(() => {
    const run = async () => {
      if (!userSearchQuery.trim()) { setUserResults([]); return; }
      try {
        const results = await FriendService.searchUsers(userSearchQuery.trim(), user?.uid || '');
        setUserResults(results);
      } catch (e) {
        console.error('User search failed:', e);
        setUserResults([]);
      }
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [userSearchQuery, user?.uid]);

  // Filter posts based on search
  useEffect(() => {
    if (postSearchQuery.trim()) {
      setFilteredPosts(
        savedVostcards.filter(post =>
          (post.title?.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
           post.description?.toLowerCase().includes(postSearchQuery.toLowerCase()))
        )
      );
    } else {
      setFilteredPosts(savedVostcards);
    }
  }, [postSearchQuery, savedVostcards]);

  const loadFriends = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const friendsList = await FriendService.getFriendsList(user.uid);
      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      await loadAllLocalVostcards();
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleFriendToggle = (friendUID: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendUID)) {
      newSelected.delete(friendUID);
    } else {
      newSelected.add(friendUID);
    }
    setSelectedFriends(newSelected);
  };

  const handleSendMessage = async () => {
    const totalSelected = selectedFriends.size + selectedUsers.size;
    if (!user?.uid || totalSelected === 0 || (!message.trim() && !selectedPost)) {
      if (!message.trim() && !selectedPost) {
        alert('Please write a message or attach a post.');
      } else {
        alert('Please select at least one recipient.');
      }
      return;
    }

    try {
      setSending(true);
      const results = [];

      const recipients = [...selectedFriends, ...selectedUsers];
      for (const friendUID of recipients) {
        if (selectedPost) {
          // Send with post attachment
          const result = await VostboxService.sendVostcardToFriend({
            senderUID: user.uid,
            receiverUID: friendUID,
            vostcardID: selectedPost.id,
            message: message.trim() || undefined
          });
          results.push(result);
        } else {
          // Send text-only message
          const result = await VostboxService.sendTextMessageToFriend({
            senderUID: user.uid,
            receiverUID: friendUID,
            message: message.trim()
          });
          results.push(result);
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        const friendWord = selectedFriends.size === 1 ? 'friend' : 'friends';
        alert(`✅ Message sent to ${successful} ${friendWord}!${failed > 0 ? ` (${failed} failed)` : ''}`);
        
        // Reset form
        setMessage('');
        setSelectedPost(null);
        setSelectedFriends(new Set());
        setFriendSearchQuery('');
        setUserSearchQuery('');
        setPostSearchQuery('');
        onClose();
      } else {
        alert('❌ Failed to send messages. Please try again.');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('❌ Failed to send messages. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderPostThumbnail = (post: Vostcard) => {
    const hasPhotos = post.photos && post.photos.length > 0;
    const hasVideo = post.videoURL || post.videoBlob;
    
    return (
      <div
        key={post.id}
        onClick={() => {
          setSelectedPost(post);
          setShowPostPicker(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          margin: '8px 0',
          backgroundColor: selectedPost?.id === post.id ? '#e3f2fd' : '#f8f9fa',
          border: selectedPost?.id === post.id ? '2px solid #002B4D' : '1px solid #e0e0e0',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Thumbnail */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '6px',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontSize: '20px',
          color: '#666'
        }}>
          {hasPhotos ? <FaImage /> : hasVideo ? <FaVideo /> : '📝'}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: '600',
            fontSize: '14px',
            color: '#333',
            marginBottom: '4px'
          }}>
            {post.title || 'Untitled'}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {post.isQuickcard ? 'Quickcard' : 'Vostcard'} • {hasPhotos ? `${post.photos.length} photo${post.photos.length !== 1 ? 's' : ''}` : hasVideo ? 'Video' : 'Text'}
          </div>
        </div>
        
        {/* Selection indicator */}
        {selectedPost?.id === post.id && (
          <FaCheck style={{ color: '#002B4D', fontSize: '16px' }} />
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          zIndex: 10001,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#002B4D'
          }}>
            Compose Private Message
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          maxHeight: 'calc(90vh - 140px)',
          overflowY: 'auto'
        }}>
          {/* Message Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a personal message to your friends..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Post Attachment */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Attach Post (Optional)
            </label>
            
            {selectedPost ? (
              <div>
                {renderPostThumbnail(selectedPost)}
                <button
                  onClick={() => setShowPostPicker(true)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#002B4D',
                    border: '1px solid #002B4D',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Change Post
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPostPicker(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  border: '2px dashed #e0e0e0',
                  borderRadius: '8px',
                  color: '#666',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaImage />
                Select Post to Attach
              </button>
            )}
          </div>

          {/* Post Picker Modal */}
          {showPostPicker && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '400px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    Select Post
                  </h3>
                  <button
                    onClick={() => setShowPostPicker(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <input
                  type="text"
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  placeholder="Search your posts..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}
                />
                
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {filteredPosts.length > 0 ? (
                    filteredPosts.map(post => renderPostThumbnail(post))
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#666'
                    }}>
                      No posts found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Friend Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Send To Friends
            </label>
            
            <input
              type="text"
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              placeholder="Search friends..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '14px'
              }}
            />
            
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {filteredFriends.length > 0 ? (
                filteredFriends.map(friend => (
                  <div
                    key={friend.uid}
                    onClick={() => handleFriendToggle(friend.uid)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      margin: '4px 0',
                      backgroundColor: selectedFriends.has(friend.uid) ? '#e3f2fd' : 'transparent',
                      border: selectedFriends.has(friend.uid) ? '1px solid #002B4D' : '1px solid transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      fontSize: '14px'
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
                        <FaUser />
                      )}
                    </div>
                    <span style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {friend.username}
                    </span>
                    {selectedFriends.has(friend.uid) && (
                      <FaCheck style={{ color: '#002B4D', fontSize: '14px' }} />
                    )}
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#666'
                }}>
                  {loading ? 'Loading friends...' : 'No friends found'}
                </div>
              )}
            </div>
            
            {selectedFriends.size > 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#666'
              }}>
                {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Users Selection (Registered Users) */}
          <div style={{ marginTop: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Send To Users
            </label>

            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search users..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '14px'
              }}
            />

            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {userResults.length > 0 ? (
                userResults.map(userRow => (
                  <div
                    key={userRow.uid}
                    onClick={() => {
                      const next = new Set(selectedUsers);
                      if (next.has(userRow.uid)) next.delete(userRow.uid); else next.add(userRow.uid);
                      setSelectedUsers(next);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      margin: '4px 0',
                      backgroundColor: selectedUsers.has(userRow.uid) ? '#e3f2fd' : 'transparent',
                      border: selectedUsers.has(userRow.uid) ? '1px solid #002B4D' : '1px solid transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      fontSize: '14px'
                    }}>
                      {userRow.avatarURL ? <img src={userRow.avatarURL} alt={userRow.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <FaUser />}
                    </div>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{userRow.username}</span>
                    {selectedUsers.has(userRow.uid) && (
                      <FaCheck style={{ color: '#002B4D', fontSize: '14px' }} />
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  {userSearchQuery.trim() ? 'No users found' : 'Search registered users by username'}
                </div>
              )}
            </div>

            {(selectedUsers.size > 0) && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={sending || (selectedFriends.size + selectedUsers.size === 0) || (!message.trim() && !selectedPost)}
            style={{
              backgroundColor: sending ? '#ccc' : '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: ((selectedFriends.size + selectedUsers.size === 0) || (!message.trim() && !selectedPost)) ? 0.5 : 1
            }}
          >
            <FaPaperPlane size={14} />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ComposePrivateMessageModal;
