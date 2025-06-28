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
      navigate("/"); // ✅ Navigate to LoginPage
      setTapCount(0); // Reset tap count after navigation
    }

    // Optional reset if user stops tapping for more than 2 seconds
    setTimeout(() => setTapCount(0), 2000);
  };

  return (
    <div className="landing-container">
      <img
        src="/assets/landing-image.png" // ✅ Change to your actual image path
        alt="Vōstcard Landing"
        className="landing-image"
        onClick={handleImageTap}
      />
    </div>
  );
}