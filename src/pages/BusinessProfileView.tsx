import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BusinessProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { businessId } = useParams();

  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("📍 Latitude:", latitude, "Longitude:", longitude);

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
          );
          const data = await response.json();
          if (data.status === "OK" && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            setDetectedAddress(address);
            alert(`📍 Address detected: ${address}`);
          } else {
            alert("Unable to retrieve address from coordinates");
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          alert("Error fetching address");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Simulate loading business data (replace this with API call in real app)
  const business = {
    photoUrl: "/default-store.png", // fallback image
    name: "Sample Business",
    address: detectedAddress || "123 Main Street, Dublin, Ireland",
    contactPerson: "Jane Doe",
    phone: "+353 1 234 5678",
    email: "contact@samplebusiness.com",
    description: "This is a sample description of the business. Here you can add details about what this business offers and why customers should visit.",
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          backgroundColor: "#ccc",
          color: "#333",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        ← Back
      </button>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src={business.photoUrl}
          alt="Business"
          style={{
            width: "150px",
            height: "150px",
            objectFit: "cover",
            borderRadius: "12px",
            border: "2px solid #002B4D",
          }}
        />
        <h1 style={{ margin: "16px 0", color: "#002B4D" }}>{business.name}</h1>
      </div>

      <div style={{ lineHeight: "1.6" }}>
        <p><strong>Address:</strong> {business.address}</p>
        <button
          onClick={fetchLocation}
          style={{
            backgroundColor: "#002B4D",
            color: "#fff",
            border: "none",
            padding: "10px 15px",
            borderRadius: "6px",
            cursor: "pointer",
            display: "block",
            margin: "10px auto",
          }}
        >
          📍 Use My Location
        </button>
        <p><strong>Contact Person:</strong> {business.contactPerson}</p>
        <p><strong>Phone:</strong> {business.phone}</p>
        <p><strong>Email:</strong> {business.email}</p>
        <p><strong>Description:</strong> {business.description}</p>
      </div>
    </div>
  );
};

export default BusinessProfileView;
