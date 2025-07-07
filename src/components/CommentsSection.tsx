import React, { useState, useEffect } from "react";
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

interface CommentsSectionProps {
  vostcardID: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ vostcardID }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vostcardID) return;

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
  }, [vostcardID]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);

    try {
      const commentsRef = collection(db, "vostcards", vostcardID, "comments");
      await addDoc(commentsRef, {
        text: newComment.trim(),
        username: user.displayName || "Anonymous",
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
    try {
      await deleteDoc(doc(db, "vostcards", vostcardID, "comments", commentID));
    } catch (error) {
      console.error("❌ Failed to delete comment:", error);
    }
  };

  return (
    <div style={{ padding: "10px" }}>
      <h3>💬 Comments</h3>
      <div style={{ marginTop: "10px" }}>
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginBottom: "10px",
            }}
          >
            <img
              src={comment.avatarURL || "/default-avatar.png"}
              alt="Avatar"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                marginRight: "10px",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{comment.username}</strong>
                {comment.userID === user?.uid && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "red",
                      cursor: "pointer",
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p style={{ margin: "5px 0" }}>{comment.text}</p>
              <small style={{ color: "gray" }}>
                {comment.dateCreated?.toLocaleString() || "Just now"}
              </small>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <div style={{ marginTop: "10px", display: "flex" }}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || loading}
            style={{
              marginLeft: "10px",
              padding: "8px 12px",
              background: "#667eea",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      ) : (
        <p style={{ color: "gray", marginTop: "10px" }}>
          Please log in to add a comment.
        </p>
      )}
    </div>
  );
};

export default CommentsSection; 