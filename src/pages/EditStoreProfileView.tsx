import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const EditStoreProfileView: React.FC = () => {
  const [storeName, setStoreName] = useState("");
  // New address fields
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [description, setDescription] = useState("");
  const [storeHours, setStoreHours] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle "Use my location" functionality
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 Location detected:', { latitude, longitude });
        
        try {
          // Use Netlify function for reverse geocoding
          const response = await fetch('/.netlify/functions/geocode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'reverse',
              latitude,
              longitude
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || `Reverse geocoding error: ${response.status}`);
          }
          
          // Populate address fields with the returned data
          setStreetAddress(data.streetAddress || '');
          setCity(data.city || '');
          setStateProvince(data.stateProvince || '');
          setPostalCode(data.postalCode || '');
          setCountry(data.country || '');
          
          console.log('✅ Address populated from location:', data);
          
          alert('📍 Location detected and address fields populated!');
        } catch (error) {
          console.error('❌ Reverse geocoding error:', error);
          setError('Failed to fetch address from location.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setError('Failed to get current location. Please ensure location services are enabled.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Load existing profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.uid) {
        setDataLoading(false);
        return;
      }

      try {
        console.log('📄 Loading store profile for user:', user.uid);
        const profileRef = doc(db, "advertisers", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          console.log('✅ Store profile loaded:', data);
          
          // Populate form fields with existing data
          setStoreName(data.storeName || "");
          setStreetAddress(data.streetAddress || "");
          setCity(data.city || "");
          setStateProvince(data.stateProvince || "");
          setPostalCode(data.postalCode || "");
          setCountry(data.country || "");
          setContactEmail(data.contactEmail || "");
          setContactPerson(data.contactPerson || "");
          setDescription(data.description || "");
          setStoreHours(data.storeHours || "");
        } else {
          console.log('📄 No existing store profile found');
        }
      } catch (error) {
        console.error('❌ Error loading store profile:', error);
        setError('Failed to load profile data');
      } finally {
        setDataLoading(false);
      }
    };

    loadProfileData();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !storeName ||
      !streetAddress ||
      !city ||
      !stateProvince ||
      !country ||
      !contactEmail
    ) {
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
      console.log("💾 Saving store profile for user:", user.uid);
      
      const profileData = {
        storeName,
        streetAddress,
        city,
        stateProvince,
        postalCode,
        country,
        storeHours,
        contactEmail,
        contactPerson,
        description,
        updatedAt: new Date(),
        // Keep existing fields from advertiser registration
        name: storeName, // Use storeName as the display name
        businessName: storeName,
        email: user.email,
        role: "advertiser"
      };

      const profileRef = doc(db, "advertisers", user.uid);
      await setDoc(profileRef, profileData, { merge: true });

      console.log("✅ Store profile saved successfully");
      setSuccess(true);

      // Auto-redirect back to portal after 2 seconds
      setTimeout(() => {
        navigate("/advertiser-portal");
      }, 2000);

    } catch (error) {
      console.error("❌ Error saving store profile:", error);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while data is loading
  if (dataLoading) {
    return (
      <div style={{ overflowY: "auto", height: "100vh" }}>
        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h1 style={{ textAlign: "center", color: "#002B4D" }}>Store Profile</h1>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>Loading profile data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", height: "100vh" }}>
      <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", color: "#002B4D" }}>Store Profile</h1>
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
        <form onSubmit={handleSubmit}>
          <label>
            Store Name<span style={{ color: "red" }}>*</span>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          {/* Address Fields */}
          <label>
            Street Address<span style={{ color: "red" }}>*</span>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            City<span style={{ color: "red" }}>*</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            State/Province/Region<span style={{ color: "red" }}>*</span>
            <input
              type="text"
              value={stateProvince}
              onChange={(e) => setStateProvince(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Postal/ZIP Code
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Country<span style={{ color: "red" }}>*</span>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          
          {/* Use My Location Button */}
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              style={{
                backgroundColor: locationLoading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: locationLoading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {locationLoading ? "🔄 Getting Location..." : "📍 Use My Location"}
            </button>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Automatically populate address fields based on your current location
            </div>
          </div>

          <label>
            Store Hours
            <input
              type="text"
              value={storeHours}
              onChange={(e) => setStoreHours(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Store Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setStorePhoto(e.target.files ? e.target.files[0] : null)}
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Contact Email<span style={{ color: "red" }}>*</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Contact Person
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          <label>
            Description of Store
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
            />
          </label>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && (
            <p style={{ color: "green" }}>
              ✅ Store profile saved successfully! Redirecting to portal...
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
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditStoreProfileView;