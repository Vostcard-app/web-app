import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CreateOfferView: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description) {
      setError("Please fill out all required fields.");
      return;
    }

    // Simulate posting process
    console.log("Offer Posted:", {
      title,
      description,
      itemPhoto,
      phone,
      email
    });

    setError("");
    setSuccess(true);
    // Redirect to Advertiser Portal after posting
    setTimeout(() => navigate("/advertiser-portal"), 1500);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h1 style={{ textAlign: "center", color: "#002B4D" }}>Create Offer</h1>
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
        {success && <p style={{ color: "green" }}>Offer posted successfully!</p>}
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
          Post Offer
        </button>
      </form>
    </div>
  );
};

export default CreateOfferView;