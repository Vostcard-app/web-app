import React, { useEffect, useState } from "react";
import { useVostcard } from "../context/VostcardContext";
import { useNavigate } from "react-router-dom";

const SavedVostcardsListView: React.FC = () => {
  const { 
    savedVostcards, 
    syncVostcardMetadata, 
    downloadVostcardContent, 
    loadLocalVostcard 
  } = useVostcard();
  const navigate = useNavigate();
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  useEffect(() => {
    syncVostcardMetadata();
  }, [syncVostcardMetadata]);

  const handleEdit = async (id: string) => {
    try {
      setLoadingContent(id);
      const vostcard = savedVostcards.find(v => v.id === id);
      if (vostcard?._isMetadataOnly) {
        await downloadVostcardContent(id);
      }
      await loadLocalVostcard(id);
      navigate("/create-step1");
    } catch (error) {
      console.error("Failed to load vostcard:", error);
      alert("Failed to load vostcard. Please try again.");
    } finally {
      setLoadingContent(null);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Saved Vōstcards</h1>
      {savedVostcards.length === 0 ? (
        <p>No saved Vōstcards yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {savedVostcards.map((vostcard) => (
            <li key={vostcard.id} style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px"
            }}>
              <h3>{vostcard.title || "Untitled"}</h3>
              <p>{vostcard.description || "No description"}</p>
              <button onClick={() => handleEdit(vostcard.id)}>
                {loadingContent === vostcard.id ? "Loading..." : "Edit"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedVostcardsListView;
