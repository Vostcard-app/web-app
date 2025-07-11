import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db, storage } from "../firebase/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { GeocodingService } from "../services/geocodingService";
import { FaMapMarkerAlt } from 'react-icons/fa';  // Add this import

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
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [uploadedImageURL, setUploadedImageURL] = useState<string>('');

  // Test Firebase connectivity
  const testFirebaseConnection = async () => {
    try {
      setConnectionStatus('Testing Firebase connection...');
      
      // Test actual Firebase operations that we'll need
      console.log('🔍 Testing Firebase connection and permissions for user:', user?.uid);
      
      if (!user?.uid) {
        throw new Error('No authenticated user for connection test');
      }
      
      // Test reading from advertisers collection (the actual operation we need)
      const testRef = doc(db, "advertisers", user.uid);
      console.log('🔍 Testing advertisers collection access...');
      
      // This tests the actual permission we need
      await getDoc(testRef);
      
      setConnectionStatus('Firebase connection and permissions verified');
      console.log('✅ Firebase connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      
      let errorMessage = 'Unknown connection error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setConnectionStatus(`Firebase connection test failed: ${errorMessage}`);
      return false;
    }
  };

  // Upload offer image to Firebase Storage
  const uploadOfferImage = async (file: File, userId: string, offerId: string): Promise<string> => {
    try {
      console.log('📤 Uploading offer image...');
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `offer_${timestamp}.${fileExtension}`;
      
      // Upload to Firebase Storage with userId-based path structure
      const storageRef = ref(storage, `vostcards/${userId}/${offerId}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('✅ Offer image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading offer image:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
        
        // Test Firebase connectivity first
        console.log('🔍 Testing Firebase connectivity...');
        const isConnected = await testFirebaseConnection();
        if (!isConnected) {
          throw new Error('Firebase connection test failed - see connection status above for details');
        }
        
        console.log('📊 Database instance:', db);
        
        // Check user authentication and role
        console.log('👤 User authentication check:');
        console.log('   - User UID:', user.uid);
        console.log('   - User Email:', user.email);
        console.log('   - User Role:', userRole);
        console.log('   - User Email Verified:', user.emailVerified);
        
        // Load store profile from advertisers collection
        setConnectionStatus('Loading store profile...');
        const advertiserRef = doc(db, "advertisers", user.uid);
        console.log('📄 Attempting to load advertiser document:', advertiserRef.path);
        
        let advertiserSnap;
        try {
          advertiserSnap = await getDoc(advertiserRef);
        } catch (profileError) {
          console.error('❌ Failed to load store profile:', profileError);
          throw new Error(`Failed to load store profile: ${profileError instanceof Error ? profileError.message : 'Unknown error'}`);
        }

        if (advertiserSnap.exists()) {
          const advertiserData = advertiserSnap.data();
          console.log('✅ Store profile loaded from advertisers collection:', advertiserData);
          
          // Store the store profile data
          setStoreProfile(advertiserData);
          setConnectionStatus('Store profile loaded successfully');
          
          // Try to load existing offer from businesses collection
          setConnectionStatus('Checking for existing offers...');
          const businessRef = doc(db, "businesses", user.uid);
          console.log('📄 Attempting to load business document:', businessRef.path);
          
          let businessSnap;
          try {
            businessSnap = await getDoc(businessRef);
          } catch (businessError) {
            console.warn('⚠️ Failed to load business document (this is OK for new offers):', businessError);
            // Business document not existing is OK - just means no existing offer
            setConnectionStatus('Ready to create new offer');
            setIsEditing(false);
            return;
          }
          
          if (businessSnap.exists()) {
            const businessData = businessSnap.data();
            const offerData = businessData.currentOffer;
            
            if (offerData) {
              console.log('✅ Existing offer loaded:', offerData);
              setConnectionStatus('Existing offer loaded for editing');
              
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
              setConnectionStatus('Ready to create new offer');
              setIsEditing(false);
            }
          } else {
            console.log('📄 No business document found, creating new offer');
            setConnectionStatus('Ready to create new offer');
            setIsEditing(false);
          }
        } else {
          console.log('📄 No advertiser document found');
          setConnectionStatus('Store profile not found');
          setError('Store profile not found. Please set up your store profile first by going to the Advertiser Portal.');
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setConnectionStatus('Error occurred during loading');
        
        // Enhanced error handling with specific messages
        if (error instanceof Error) {
          console.log('🔍 Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          
          // Firebase-specific error handling
          if (error.message.includes('permission-denied')) {
            setError('Permission denied. Your account may not have advertiser permissions. Please contact support.');
          } else if (error.message.includes('not-found')) {
            setError('Store profile not found. Please set up your store profile first in the Advertiser Portal.');
          } else if (error.message.includes('network-request-failed')) {
            setError('Network error. Please check your internet connection and try again.');
          } else if (error.message.includes('auth')) {
            setError('Authentication error. Please log out and log back in.');
          } else if (error.message.includes('unavailable')) {
            setError('Firebase service temporarily unavailable. Please try again in a few minutes.');
          } else {
            setError(`Failed to load data: ${error.message}`);
          }
        } else {
          console.log('🔍 Non-Error object thrown:', error);
          setError('Failed to load data. Please try again.');
        }
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [user?.uid, userRole]);

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

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      console.log("💾 Saving offer for user:", user.uid);
      
      // Check if store has valid location coordinates
      if (storeProfile.latitude === undefined || storeProfile.longitude === undefined || 
          storeProfile.latitude === null || storeProfile.longitude === null) {
        throw new Error("Store location not set. Please update your store profile and use 'Use My Location' to set your coordinates.");
      }
      
      console.log("✅ Using store location coordinates:", { 
        latitude: storeProfile.latitude, 
        longitude: storeProfile.longitude 
      });
      
      // Step 1: Use stored coordinates for positioning
      const latitude = storeProfile.latitude;
      const longitude = storeProfile.longitude;
      
      // Step 2: Format business address for display (optional)
      const businessAddress = storeProfile.businessAddress;
      const displayAddress = businessAddress ? 
        GeocodingService.formatBusinessAddress(businessAddress) : 
        `${storeProfile.streetAddress || ""}, ${storeProfile.city || ""}, ${storeProfile.stateProvince || ""}, ${storeProfile.country || ""}`.replace(/^,\s*|,\s*$/g, '');

      // Step 3: Generate or use existing offer ID
      let vostcardId = offerId;
      if (!vostcardId) {
        // Generate unique ID for new offers
        vostcardId = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Step 4: Upload offer image if provided
      let photoURL = '';
      if (itemPhoto) {
        try {
          setConnectionStatus('Uploading offer image...');
          photoURL = await uploadOfferImage(itemPhoto, user.uid, vostcardId);
          console.log('✅ Offer image uploaded:', photoURL);
          setConnectionStatus('Offer image uploaded successfully');
          setUploadedImageURL(photoURL);
        } catch (imageError) {
          console.error('❌ Failed to upload offer image:', imageError);
          setConnectionStatus('Image upload failed, continuing without image');
          setUploadedImageURL('');
          // Continue without image rather than failing completely
          alert('⚠️ Failed to upload image, but offer will be saved without image.');
        }
      }

      // Step 5: Prepare offer data for vostcards collection
      const vostcardData = {
        title,
        description,
        latitude,        // 📍 Direct coordinates from "Use My Location"
        longitude,       // 📍 Direct coordinates from "Use My Location"
        geo: {
          latitude,
          longitude
        },
        state: 'posted',
        isOffer: true,   // 🎯 This ensures offer_pin is used on the map
        userID: user.uid,
        userId: user.uid,
        username: storeProfile.storeName || storeProfile.businessName || 'Business',
        updatedAt: new Date(),
        categories: ['offer'],
        // Include offer image if uploaded
        photoURLs: photoURL ? [photoURL] : [],
        hasPhotos: !!photoURL,
        offerDetails: {
          storeName: storeProfile.storeName || storeProfile.businessName || '',
          storeAddress: displayAddress || '', // For contact info only
          phone: storeProfile.contactPhone || '',        // 🔧 Fix: fallback to empty string
          email: storeProfile.contactEmail || '',        // 🔧 Fix: fallback to empty string
          storeHours: storeProfile.storeHours || '',     // 🔧 Fix: fallback to empty string
          contactPerson: storeProfile.contactPerson || '' // 🔧 Fix: fallback to empty string
        },
        // Only include createdAt for new offers (not when editing)
        ...(isEditing ? {} : { createdAt: new Date() })
      };

      // Step 6: Save/update in vostcards collection
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

      // Step 7: Update advertiser document with reference to vostcard
      const advertiserOfferData = {
        title,
        description,
        vostcardId,
        updatedAt: new Date(),
        // Only include createdAt for new offers (not when editing)
        ...(isEditing ? {} : { createdAt: new Date() })
      };

      const businessRef = doc(db, "businesses", user.uid);
      await setDoc(businessRef, { 
        currentOffer: advertiserOfferData 
      }, { merge: true });

      console.log("✅ Offer saved successfully");
      setSuccess(true);
      setIsEditing(true); // Now we're in edit mode
      setConnectionStatus(`Offer ${isEditing ? 'updated' : 'created'} successfully${photoURL ? ' with image' : ''}`);

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

  const handlePinPlacerClick = () => {
    console.log('📍 Navigating to Pin Placer Tool');
    navigate('/pin-placer');
  };

  // Show loading spinner while data is loading
  if (dataLoading) {
    return (
      <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", color: "#002B4D" }}>Loading Offer...</h1>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ 
            display: "inline-block", 
            width: "20px", 
            height: "20px", 
            border: "2px solid #f3f3f3", 
            borderTop: "2px solid #002B4D", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            marginBottom: "16px"
          }}></div>
          <p style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>Loading offer data...</p>
          <p style={{ fontSize: "14px", color: "#999" }}>Status: {connectionStatus}</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
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
          
          <h4 style={{ margin: "12px 0 8px 0", fontSize: "16px" }}>System Status:</h4>
          <ul style={{ paddingLeft: "20px", margin: "0 0 12px 0" }}>
            <li>User ID: {user?.uid ? '✅ Available' : '❌ Missing'}</li>
            <li>User Email: {user?.email ? `✅ ${user.email}` : '❌ Missing'}</li>
            <li>User Role: {userRole ? `✅ ${userRole}` : '❌ Missing'}</li>
            <li>Email Verified: {user?.emailVerified ? '✅ Yes' : '⚠️ No'}</li>
            <li>Connection Status: {connectionStatus.includes('failed') ? '❌' : connectionStatus.includes('successful') || connectionStatus.includes('verified') ? '✅' : '🔄'} {connectionStatus}</li>
          </ul>
          
          <h4 style={{ margin: "12px 0 8px 0", fontSize: "16px" }}>Troubleshooting steps:</h4>
          <ol style={{ paddingLeft: "20px", margin: 0 }}>
            <li>Check your internet connection</li>
            <li>Make sure you're logged in as an advertiser</li>
            <li>Set up your store profile first in the Advertiser Portal</li>
            <li>Try refreshing the page</li>
            <li>If the problem persists, try logging out and back in</li>
            <li>Check browser console (F12) for detailed error messages</li>
          </ol>
        </div>
        
        <div style={{ textAlign: "center", gap: "12px", display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              margin: "4px"
            }}
          >
            🔄 Try Again
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
              fontSize: "16px",
              margin: "4px"
            }}
          >
            🏪 Set Up Store Profile
          </button>
          <button
            onClick={() => {
              console.log('🔍 System Debug Info:', {
                user: user,
                userRole: userRole,
                db: db,
                error: error,
                timestamp: new Date().toISOString()
              });
              alert('Debug info logged to console. Press F12 to view.');
            }}
            style={{
              padding: "12px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              margin: "4px"
            }}
          >
            🐛 Debug Info
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflowY: 'auto',  // Add this to enable scrolling
      position: 'fixed',  // Add this to prevent body scrolling
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px',
      }}>
        <h1 style={{ color: '#002B4D', marginBottom: '24px' }}>
          {isEditing ? 'Edit Offer' : 'Create New Offer'}
        </h1>

        {/* Form fields and other content */}
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
              onChange={(e) => {
                const file = e.target.files ? e.target.files[0] : null;
                if (file) {
                  // Validate file type
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                  if (!allowedTypes.includes(file.type.toLowerCase())) {
                    alert('Please select a valid image file (JPEG, PNG, GIF, or WebP).');
                    e.target.value = '';
                    return;
                  }
                  
                  // Validate file size (max 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    alert(`Image file must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
                    e.target.value = '';
                    return;
                  }
                  
                  console.log('📁 Offer image selected:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
                  });
                }
                setItemPhoto(file);
              }}
              style={{ display: "block", width: "100%", marginBottom: "12px" }}
            />
            {itemPhoto && (
              <div style={{ 
                marginTop: "8px", 
                padding: "8px", 
                backgroundColor: "#f8f9fa", 
                borderRadius: "4px",
                fontSize: "14px",
                color: "#666"
              }}>
                📷 Selected: {itemPhoto.name} ({(itemPhoto.size / (1024 * 1024)).toFixed(2)}MB)
              </div>
            )}
          </label>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && (
            <p style={{ color: "green" }}>
              ✅ Offer {isEditing ? "updated" : "created"} successfully{itemPhoto ? (uploadedImageURL ? " with image" : " (image upload failed)") : ""}! Redirecting to portal...
            </p>
          )}

          {/* Set Location Section - Now just above the Update button */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              color: '#002B4D', 
              display: 'flex', 
              alignItems: 'center'
            }}>
              <FaMapMarkerAlt style={{ marginRight: '8px' }} /> Set Location
            </h3>
            <button
              onClick={handlePinPlacerClick}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s'
              }}
            >
              <FaMapMarkerAlt style={{ marginRight: '8px' }} />
              Open Pin Placer
            </button>
          </div>

          {/* Update/Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Offer' : 'Create Offer')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateOfferView;