import React, { useState, useEffect } from "react";
import { FaTimes, FaTrash, FaPaperPlane } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc
} from "firebase/firestore";

interface Comment {
  id: string;
  text: string;
  username: string;
  avatarURL?: string;
  userID: string;
  dateCreated: Date;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vostcardID: string;
  vostcardTitle?: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ 
  isOpen, 
  onClose, 
  vostcardID, 
  vostcardTitle 
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vostcardID || !isOpen) return;

    const commentsRef = collection(db, "vostcards", vostcardID, "comments");
    const q = query(commentsRef, orderBy("dateCreated", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateCreated: doc.data().dateCreated?.toDate(),
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [vostcardID, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || loading) return;

    setLoading(true);

    try {
      const commentsRef = collection(db, "vostcards", vostcardID, "comments");
      await addDoc(commentsRef, {
        text: newComment.trim(),
        username: user.displayName || user.email || "Anonymous",
        avatarURL: user.photoURL || "",
        userID: user.uid,
        dateCreated: serverTimestamp(),
      });
      setNewComment("");
    } catch (error) {
      console.error("❌ Failed to add comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentID: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      await deleteDoc(doc(db, "vostcards", vostcardID, "comments", commentID));
    } catch (error) {
      console.error("❌ Failed to delete comment:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: 600,
            color: '#002B4D'
          }}>
            💬 Comments
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              borderRadius: '4px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Vostcard Title */}
        {vostcardTitle && (
          <div style={{
            padding: '16px 24px',
            background: '#f8f9fa',
            borderBottom: '1px solid #eee',
            flexShrink: 0,
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#666',
              fontWeight: 500
            }}>
              {vostcardTitle}
            </div>
          </div>
        )}

        {/* Comments List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          minHeight: '200px',
          maxHeight: '400px',
        }}>
          {comments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#666',
              fontSize: '16px',
              padding: '40px 20px',
            }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {comment.avatarURL ? (
                      <img
                        src={comment.avatarURL}
                        alt={comment.username}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#007aff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}>
                        {comment.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px',
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '15px',
                        color: '#002B4D',
                      }}>
                        {comment.username}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                        }}>
                          {comment.dateCreated?.toLocaleString() || "Just now"}
                        </div>
                        {comment.userID === user?.uid && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                            title="Delete comment"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#333',
                      lineHeight: 1.4,
                      wordWrap: 'break-word',
                    }}>
                      {comment.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #eee',
          flexShrink: 0,
        }}>
          {user ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '24px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#f8f9fa',
                }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || loading}
                style={{
                  padding: '12px 20px',
                  background: (!newComment.trim() || loading) ? '#ccc' : '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: (!newComment.trim() || loading) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '80px',
                  justifyContent: 'center',
                }}
              >
                {loading ? (
                  "Posting..."
                ) : (
                  <>
                    <FaPaperPlane size={12} />
                    Post
                  </>
                )}
              </button>
            </form>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
              padding: '12px',
            }}>
              Please log in to add a comment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsModal; 