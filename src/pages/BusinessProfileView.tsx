import React from "react";
import { useParams, useNavigate } from "react-router-dom";

const BusinessProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { businessId } = useParams();

  // Simulate loading business data (replace this with API call in real app)
  const business = {
    photoUrl: "/default-store.png", // fallback image
    name: "Sample Business",
    address: "123 Main Street, Dublin, Ireland",
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
          marginBottom: "20px",
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
        <p><strong>Contact Person:</strong> {business.contactPerson}</p>
        <p><strong>Phone:</strong> {business.phone}</p>
        <p><strong>Email:</strong> {business.email}</p>
        <p><strong>Description:</strong> {business.description}</p>
      </div>
    </div>
  );
};

export default BusinessProfileView;
