import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { GeocodingService } from "../services/geocodingService";

const CreateOfferView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
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
        console.log('❌ No user authenticated');
        setError('User not authenticated. Please log in again.');
        setDataLoading(false);
        return;
      }

      try {
        console.log('📄 Loading offer and store profile data for user:', user.uid);
        
        // Test Firebase connectivity
        console.log('🔍 Testing Firebase connectivity...');
        console.log('📊 Database instance:', db);
        
        // Check user authentication and role
        console.log('👤 User authentication check:');
        console.log('   - User UID:', user.uid);
        console.log('   - User Email:', user.email);
        console.log('   - User Role:', userRole);
        console.log('   - User Email Verified:', user.emailVerified);
        
        // Load store profile from advertisers collection
        const advertiserRef = doc(db, "advertisers", user.uid);
        console.log('📄 Attempting to load advertiser document:', advertiserRef.path);
        
        const advertiserSnap = await getDoc(advertiserRef);

        if (advertiserSnap.exists()) {
          const advertiserData = advertiserSnap.data();
          console.log('✅ Store profile loaded from advertisers collection:', advertiserData);
          
          // Store the store profile data
          setStoreProfile(advertiserData);
          
          // Try to load existing offer from businesses collection
          const businessRef = doc(db, "businesses", user.uid);
          console.log('📄 Attempting to load business document:', businessRef.path);
          
          const businessSnap = await getDoc(businessRef);
          
          if (businessSnap.exists()) {
            const businessData = businessSnap.data();
            const offerData = businessData.currentOffer;
            
            if (offerData) {
              console.log('✅ Existing offer loaded:', offerData);
              
              // Populate form fields with existing offer data
              setTitle(offerData.title || "");
              setDescription(offerData.description || "");
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
            console.log('📄 No business document found, creating new offer');
            setIsEditing(false);
          }
        } else {
          console.log('📄 No advertiser document found');
          setError('Store profile not found. Please set up your store profile first by going to the Advertiser Portal.');
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('permission')) {
            setError('Permission denied. Please check your account permissions.');
          } else if (error.message.includes('network')) {
            setError('Network error. Please check your internet connection and try again.');
          } else if (error.message.includes('auth')) {
            setError('Authentication error. Please log out and log back in.');
          } else {
            setError(`Failed to load data: ${error.message}`);
          }
        } else {
          setError('Failed to load data. Please try again.');
        }
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
    ).isValid) {
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
          phone: storeProfile.contactPhone,
          email: storeProfile.contactEmail,
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
        vostcardId,
        createdAt: isEditing ? undefined : new Date(),
        updatedAt: new Date(),
      };

      const businessRef = doc(db, "businesses", user.uid);
      await setDoc(businessRef, { 
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

  // Show error state with detailed information
  if (error) {
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
        
        <h1 style={{ textAlign: "center", color: "#dc3545" }}>Error Loading Offer</h1>
        
        <div style={{
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "6px",
          padding: "16px",
          marginBottom: "20px",
          color: "#721c24"
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>What went wrong:</h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "16px" }}>{error}</p>
          
          <h4 style={{ margin: "12px 0 8px 0", fontSize: "16px" }}>Troubleshooting steps:</h4>
          <ol style={{ paddingLeft: "20px", margin: 0 }}>
            <li>Check your internet connection</li>
            <li>Make sure you're logged in as an advertiser</li>
            <li>Set up your store profile first in the Advertiser Portal</li>
            <li>Try refreshing the page</li>
            <li>If the problem persists, try logging out and back in</li>
          </ol>
        </div>
        
        <div style={{ textAlign: "center", gap: "12px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/store-profile-page")}
            style={{
              padding: "12px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Set Up Store Profile
          </button>
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
          backgroundColor: (() => {
            const validation = GeocodingService.validateAddress(
              storeProfile.streetAddress,
              storeProfile.city,
              storeProfile.stateProvince,
              storeProfile.country
            );
            return validation.isValid ? "#d4edda" : "#f8d7da";
          })(),
          color: (() => {
            const validation = GeocodingService.validateAddress(
              storeProfile.streetAddress,
              storeProfile.city,
              storeProfile.stateProvince,
              storeProfile.country
            );
            return validation.isValid ? "#155724" : "#721c24";
          })(),
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "16px",
          border: `1px solid ${(() => {
            const validation = GeocodingService.validateAddress(
              storeProfile.streetAddress,
              storeProfile.city,
              storeProfile.stateProvince,
              storeProfile.country
            );
            return validation.isValid ? "#c3e6cb" : "#f5c6cb";
          })()}`
        }}>
          {(() => {
            const validation = GeocodingService.validateAddress(
              storeProfile.streetAddress,
              storeProfile.city,
              storeProfile.stateProvince,
              storeProfile.country
            );
            return validation.isValid ? (
              <span>✅ Store address is complete: {GeocodingService.formatAddressForGeocoding(
                storeProfile.streetAddress,
                storeProfile.city,
                storeProfile.stateProvince,
                storeProfile.postalCode || '',
                storeProfile.country
              )}</span>
            ) : (
              <span>⚠️ Store address is missing: {validation.missingFields.join(', ')}. Please <button 
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
              >update your store profile</button> to complete these fields.</span>
            );
          })()}
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
          {loading ? "Saving..." : (isEditing ? "Post Offer" : "Create Offer")}
        </button>
      </form>
    </div>
  );
};

export default CreateOfferView;