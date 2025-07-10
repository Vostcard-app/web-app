import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { GeocodingService } from "../services/geocodingService";

// Temporary interface definition until module loading is fixed
interface BusinessAddress {
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

const EditStoreProfileView: React.FC = () => {
  const [storeName, setStoreName] = useState("");
  
  // Business Address (for contact/display)
  const [businessAddress, setBusinessAddress] = useState<BusinessAddress>({
    streetAddress: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: ""
  });
  
  // Location coordinates (captured from "Use My Location")
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Other fields
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [description, setDescription] = useState("");
  const [storeHours, setStoreHours] = useState("");
  
  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle address field changes
  const handleAddressChange = (field: keyof BusinessAddress, value: string) => {
    setBusinessAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle "Use my location" for capturing coordinates
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        console.log('📍 Location captured:', { latitude: lat, longitude: lng });
        
        setLatitude(lat);
        setLongitude(lng);
        setLocationLoading(false);
        
        alert(`📍 Location captured!\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`);
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

  // Load existing profile data
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
          
          // Basic info
          setStoreName(data.storeName || "");
          setContactEmail(data.contactEmail || "");
          setContactPerson(data.contactPerson || "");
          setDescription(data.description || "");
          setStoreHours(data.storeHours || "");
          
          // Business Address
          if (data.businessAddress) {
            setBusinessAddress(data.businessAddress);
          } else {
            // Legacy support - convert old address fields
            setBusinessAddress({
              streetAddress: data.streetAddress || "",
              city: data.city || "",
              stateProvince: data.stateProvince || "",
              postalCode: data.postalCode || "",
              country: data.country || ""
            });
          }
          
          // Location coordinates
          if (data.latitude !== undefined && data.longitude !== undefined) {
            setLatitude(data.latitude);
            setLongitude(data.longitude);
          }
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
    if (!storeName || !contactEmail) {
      setError("Please fill out all required fields (Store Name, Contact Email).");
      return;
    }

    // Validate business address
    const addressValidation = GeocodingService.validateBusinessAddress(businessAddress);
    if (!addressValidation.isValid) {
      setError(`Please complete your business address: ${addressValidation.missingFields.join(', ')} missing`);
      return;
    }

    // Validate location
    if (latitude === null || longitude === null) {
      setError("Please set your location using the 'Use My Location' button.");
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
        businessAddress, // Business contact address
        latitude, // Location coordinates
        longitude,
        storeHours,
        contactEmail,
        contactPerson,
        description,
        updatedAt: new Date(),
        
        // Keep legacy fields for backward compatibility
        streetAddress: businessAddress.streetAddress,
        city: businessAddress.city,
        stateProvince: businessAddress.stateProvince,
        postalCode: businessAddress.postalCode,
        country: businessAddress.country,
        
        // Keep existing fields from advertiser registration
        name: storeName,
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

  const addressValidation = GeocodingService.validateBusinessAddress(businessAddress);
  const hasValidLocation = latitude !== null && longitude !== null;

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

          {/* Business Address Section */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ color: "#002B4D", marginBottom: "8px" }}>Business Address</h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
              Your business contact address for customers.
            </p>

            <label>
              Street Address<span style={{ color: "red" }}>*</span>
              <input
                type="text"
                value={businessAddress.streetAddress}
                onChange={(e) => handleAddressChange('streetAddress', e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
              />
            </label>
            <label>
              City<span style={{ color: "red" }}>*</span>
              <input
                type="text"
                value={businessAddress.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
              />
            </label>
            <label>
              State/Province/Region<span style={{ color: "red" }}>*</span>
              <input
                type="text"
                value={businessAddress.stateProvince}
                onChange={(e) => handleAddressChange('stateProvince', e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
              />
            </label>
            <label>
              Postal/ZIP Code
              <input
                type="text"
                value={businessAddress.postalCode}
                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
              />
            </label>
            <label>
              Country<span style={{ color: "red" }}>*</span>
              <input
                type="text"
                value={businessAddress.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
              />
            </label>
          </div>

          {/* Other Store Details */}
          <label>
            Store Hours
            <input
              type="text"
              value={storeHours}
              onChange={(e) => setStoreHours(e.target.value)}
              placeholder="e.g., Mon-Fri 9AM-6PM, Sat 9AM-4PM"
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
              style={{ display: "block", width: "100%", marginBottom: "24px", padding: "8px" }}
            />
          </label>

          {/* Location Section - At Bottom */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ color: "#002B4D", marginBottom: "8px" }}>📍 Store Location</h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
              Capture your exact location coordinates for map positioning.
            </p>

            {/* Location Display Field */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                Location Coordinates<span style={{ color: "red" }}>*</span>
              </label>
              <div style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px"
              }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={latitude !== null ? `${latitude.toFixed(6)}` : ""}
                    placeholder="Latitude"
                    readOnly
                    style={{ 
                      display: "block", 
                      width: "100%", 
                      padding: "8px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px"
                    }}
                  />
                  <small style={{ color: "#666" }}>Latitude</small>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={longitude !== null ? `${longitude.toFixed(6)}` : ""}
                    placeholder="Longitude"
                    readOnly
                    style={{ 
                      display: "block", 
                      width: "100%", 
                      padding: "8px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px"
                    }}
                  />
                  <small style={{ color: "#666" }}>Longitude</small>
                </div>
              </div>
            </div>

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
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  cursor: locationLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {locationLoading ? (
                  <>🔄 Getting Location...</>
                ) : (
                  <>📍 Use My Location</>
                )}
              </button>
            </div>

            {/* Location Status */}
            <div style={{
              backgroundColor: hasValidLocation ? "#d4edda" : "#f8d7da",
              color: hasValidLocation ? "#155724" : "#721c24",
              padding: "12px",
              borderRadius: "6px",
              border: `1px solid ${hasValidLocation ? "#c3e6cb" : "#f5c6cb"}`
            }}>
              <strong>Status:</strong>
              <div style={{ marginTop: "4px" }}>
                {hasValidLocation ? (
                  <>✅ Location captured and ready</>
                ) : (
                  <>⚠️ Location not set. Please tap 'Use My Location' to capture your coordinates.</>
                )}
              </div>
            </div>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && (
            <p style={{ color: "green" }}>
              ✅ Store profile saved successfully! Redirecting to portal...
            </p>
          )}
          
          <button
            type="submit"
            disabled={loading || !addressValidation.isValid || !hasValidLocation}
            style={{
              backgroundColor: loading || !addressValidation.isValid || !hasValidLocation ? "#ccc" : "#002B4D",
              color: "#fff",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              width: "100%",
              cursor: loading || !addressValidation.isValid || !hasValidLocation ? "not-allowed" : "pointer",
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