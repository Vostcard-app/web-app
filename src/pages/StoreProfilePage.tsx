import React, { useState } from "react";

const StoreProfilePage: React.FC = () => {
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName || !storeAddress || !contactEmail || !storePhoto) {
      setError("Please fill out all required fields.");
      return;
    }

    // Simulate save process
    console.log("Store Profile Saved:", {
      storeName,
      storeAddress,
      storePhoto,
      contactEmail,
      contactPerson,
      description,
    });

    setError("");
    setSuccess(true);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h1 style={{ textAlign: "center", color: "#002B4D" }}>Store Profile</h1>
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
        <label>
          Store Address<span style={{ color: "red" }}>*</span>
          <input
            type="text"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginBottom: "12px", padding: "8px" }}
          />
        </label>
        <label>
          Store Photo<span style={{ color: "red" }}>*</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setStorePhoto(e.target.files ? e.target.files[0] : null)}
            required
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
        {success && <p style={{ color: "green" }}>Store profile saved successfully!</p>}
        <button
          type="submit"
          style={{
            backgroundColor: "#002B4D",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "8px",
            width: "100%",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default StoreProfilePage;