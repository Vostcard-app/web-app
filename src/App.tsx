import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomeView from "./pages/HomeView"; // ✅ Correct — HomeView is now in /pages
import CreateVostcardStep1 from "./pages/CreateVostcardStep1";
import CreateVostcardStep2 from "./pages/CreateVostcardStep2";
import CreateVostcardStep3 from "./pages/CreateVostcardStep3";
import ListView from "./pages/ListView";
import ScrollingCameraView from "./pages/ScrollingCameraView";
import CameraView from "./pages/CameraView";
import { VostcardProvider } from "./context/VostcardContext";

function App() {
  return (
    <VostcardProvider>
      <Router>
        <Routes>
          {/* 🔥 Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* 🔐 Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 🏠 Main App */}
          <Route path="/home" element={<HomeView />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/camera" element={<CameraView />} />
          <Route path="/scroll-camera" element={<ScrollingCameraView />} />

          {/* 🎥 Create Vostcard Flow */}
          <Route path="/step1" element={<CreateVostcardStep1 />} />
          <Route path="/step2" element={<CreateVostcardStep2 />} />
          <Route path="/step3" element={<CreateVostcardStep3 />} />
        </Routes>
      </Router>
    </VostcardProvider>
  );
}

export default App;