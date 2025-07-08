import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const CreateOfferView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load existing offer data on component mount
  useEffect(() => {
    const loadOfferData = async () => {
      if (!user?.uid) {
        setDataLoading(false);
        return;
      }

      try {
        console.log('📄 Loading offer data for user:', user.uid);
        const advertiserRef = doc(db, "advertisers", user.uid);
        const advertiserSnap = await getDoc(advertiserRef);

        if (advertiserSnap.exists()) {
          const data = advertiserSnap.data();
          const offerData = data.currentOffer;
          
          if (offerData) {
            console.log('✅ Existing offer loaded:', offerData);
            
            // Populate form fields with existing offer data
            setTitle(offerData.title || "");
            setDescription(offerData.description || "");
            setPhone(offerData.phone || "");
            setEmail(offerData.email || "");
            setIsEditing(true);
          } else {
            console.log('📄 No existing offer found, creating new offer');
            setIsEditing(false);
          }
        } else {
          console.log('📄 No advertiser document found');
        }
      } catch (error) {
        console.error('❌ Error loading offer data:', error);
        setError('Failed to load offer data');
      } finally {
        setDataLoading(false);
      }
    };

    loadOfferData();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description) {
      setError("Please fill out all required fields.");
      return;
    }

    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      console.log("💾 Saving offer for user:", user.uid);
      
      const offerData = {
        title,
        description,
        phone,
        email,
        createdAt: isEditing ? undefined : new Date(), // Only set createdAt for new offers
        updatedAt: new Date(),
      };

      const advertiserRef = doc(db, "advertisers", user.uid);
      await setDoc(advertiserRef, { 
        currentOffer: offerData 
      }, { merge: true });

      console.log("✅ Offer saved successfully");
      setSuccess(true);
      setIsEditing(true); // Now we're in edit mode

      // Auto-redirect back to portal after 2 seconds
      setTimeout(() => {
        navigate("/advertiser-portal");
      }, 2000);

    } catch (error) {
      console.error("❌ Error saving offer:", error);
      setError("Failed to save offer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while data is loading
  if (dataLoading) {
    return (
      <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", color: "#002B4D" }}>Loading Offer...</h1>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading offer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <button
        onClick={() => navigate("/advertiser-portal")}
        style={{
          backgroundColor: "#ccc",
          color: "#333",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        ← Back to Portal
      </button>
      <h1 style={{ textAlign: "center", color: "#002B4D" }}>
        {isEditing ? "Edit Offer" : "Create Offer"}
      </h1>
      <form onSubmit={handleSubmit}>
        <label>
          Offer Title<span style={{ color: "red" }}>*</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
          />
        </label>
        <label>
          Description of the Offer<span style={{ color: "red" }}>*</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
          />
        </label>
        <label>
          Photo of the Item
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setItemPhoto(e.target.files ? e.target.files[0] : null)}
            style={{ display: "block", width: "100%", marginBottom: "12px" }}
          />
        </label>
        <label>
          Phone Number
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
          />
        </label>
        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
          />
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && (
          <p style={{ color: "green" }}>
            ✅ Offer {isEditing ? "updated" : "created"} successfully! Redirecting to portal...
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? "#ccc" : "#002B4D",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "8px",
            width: "100%",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Saving..." : (isEditing ? "Update Offer" : "Create Offer")}
        </button>
      </form>
    </div>
  );
};

export default CreateOfferView;