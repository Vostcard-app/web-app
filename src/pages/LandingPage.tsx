import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const [tapCount, setTapCount] = useState(0);
  const navigate = useNavigate();

  const handleImageTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 3) {
      navigate("/login"); // ✅ Send user to Login page after 3 taps
      setTapCount(0);      // ✅ Reset count
    }

    // Optional: Reset if no further taps within 2 seconds
    setTimeout(() => setTapCount(0), 2000);
  };

  return (
    <div className="landing-container">
      <img
        src="/underconstruction.jpg"
        alt="Vōstcard Landing"
        className="landing-image"
        onClick={handleImageTap}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.innerText = 'Image not found. Tap anywhere to continue.';
          fallback.style.color = '#002B4D';
          fallback.style.fontSize = '18px';
          fallback.style.textAlign = 'center';
          fallback.style.marginTop = '20px';
          target.parentElement?.appendChild(fallback);
        }}
      />
    </div>
  );
}