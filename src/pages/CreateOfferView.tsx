import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { GeocodingService } from "../services/geocodingService";

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
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [offerId, setOfferId] = useState<string | null>(null);

  // Load existing offer and store profile data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) {
        setDataLoading(false);
        return;
      }

      try {
        console.log('📄 Loading offer and store profile data for user:', user.uid);
        const advertiserRef = doc(db, "advertisers", user.uid);
        const advertiserSnap = await getDoc(advertiserRef);

        if (advertiserSnap.exists()) {
          const data = advertiserSnap.data();
          
          // Store the store profile data
          setStoreProfile(data);
          
          const offerData = data.currentOffer;
          
          if (offerData) {
            console.log('✅ Existing offer loaded:', offerData);
            
            // Populate form fields with existing offer data
            setTitle(offerData.title || "");
            setDescription(offerData.description || "");
            setPhone(offerData.phone || "");
            setEmail(offerData.email || "");
            setIsEditing(true);
            
            // If offer has a vostcard ID, store it for updates
            if (offerData.vostcardId) {
              setOfferId(offerData.vostcardId);
            }
          } else {
            console.log('📄 No existing offer found, creating new offer');
            setIsEditing(false);
          }
        } else {
          console.log('📄 No advertiser document found');
          setError('Store profile not found. Please set up your store profile first.');
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setError('Failed to load data');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
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

    if (!storeProfile) {
      setError("Store profile not found. Please set up your store profile first.");
      return;
    }

    // Validate store address for geocoding
    if (!GeocodingService.validateAddress(
      storeProfile.streetAddress,
      storeProfile.city,
      storeProfile.stateProvince,
      storeProfile.country
    )) {
      setError("Store address is incomplete. Please update your store profile with a complete address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      console.log("💾 Saving offer for user:", user.uid);
      
      // Step 1: Geocode the store address
      console.log("🌍 Geocoding store address...");
      const geocodingResult = await GeocodingService.geocodeAddress(
        storeProfile.streetAddress,
        storeProfile.city,
        storeProfile.stateProvince,
        storeProfile.postalCode || "",
        storeProfile.country
      );

      // Step 2: Prepare offer data for vostcards collection
      const vostcardData = {
        title,
        description,
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude,
        geo: {
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude
        },
        state: 'posted',
        isOffer: true,
        userID: user.uid,
        userId: user.uid, // Both formats for compatibility
        username: storeProfile.storeName || storeProfile.businessName || 'Business',
        createdAt: isEditing ? undefined : new Date(),
        updatedAt: new Date(),
        categories: ['offer'], // Default category for offers
        offerDetails: {
          storeName: storeProfile.storeName || storeProfile.businessName,
          storeAddress: geocodingResult.displayAddress,
          phone: phone || storeProfile.contactPhone,
          email: email || storeProfile.contactEmail,
          storeHours: storeProfile.storeHours,
          contactPerson: storeProfile.contactPerson
        }
      };

      let vostcardId = offerId;

      // Step 3: Save/update in vostcards collection
      if (isEditing && offerId) {
        // Update existing offer
        console.log("📝 Updating existing offer in vostcards collection...");
        const vostcardRef = doc(db, "vostcards", offerId);
        await setDoc(vostcardRef, vostcardData, { merge: true });
        console.log("✅ Offer updated in vostcards collection");
      } else {
        // Create new offer
        console.log("📝 Creating new offer in vostcards collection...");
        const vostcardRef = await addDoc(collection(db, "vostcards"), vostcardData);
        vostcardId = vostcardRef.id;
        setOfferId(vostcardId);
        console.log("✅ New offer created in vostcards collection with ID:", vostcardId);
      }

      // Step 4: Update advertiser document with reference to vostcard
      const advertiserOfferData = {
        title,
        description,
        phone,
        email,
        vostcardId,
        createdAt: isEditing ? undefined : new Date(),
        updatedAt: new Date(),
      };

      const advertiserRef = doc(db, "advertisers", user.uid);
      await setDoc(advertiserRef, { 
        currentOffer: advertiserOfferData 
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
      const errorMessage = error instanceof Error ? error.message : "Failed to save offer. Please try again.";
      setError(errorMessage);
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
      
      {/* Store Profile Status */}
      {storeProfile && (
        <div style={{
          backgroundColor: GeocodingService.validateAddress(
            storeProfile.streetAddress,
            storeProfile.city,
            storeProfile.stateProvince,
            storeProfile.country
          ) ? "#d4edda" : "#f8d7da",
          color: GeocodingService.validateAddress(
            storeProfile.streetAddress,
            storeProfile.city,
            storeProfile.stateProvince,
            storeProfile.country
          ) ? "#155724" : "#721c24",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "16px",
          border: `1px solid ${GeocodingService.validateAddress(
            storeProfile.streetAddress,
            storeProfile.city,
            storeProfile.stateProvince,
            storeProfile.country
          ) ? "#c3e6cb" : "#f5c6cb"}`
        }}>
          {GeocodingService.validateAddress(
            storeProfile.streetAddress,
            storeProfile.city,
            storeProfile.stateProvince,
            storeProfile.country
          ) ? (
            <span>✅ Store address is complete. Your offer will appear on the map at: {storeProfile.storeName || "Your Store"}</span>
          ) : (
            <span>⚠️ Store address is incomplete. Please <button 
              onClick={() => navigate("/store-profile-page")}
              style={{
                color: "#721c24",
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                font: "inherit"
              }}
            >update your store profile</button> with a complete address for your offer to appear on the map.</span>
          )}
        </div>
      )}
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