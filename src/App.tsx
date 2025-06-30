import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import HomeView from "./pages/HomeView";
import CreateVostcardStep1 from "./pages/CreateVostcardStep1";
import CreateVostcardStep2 from "./pages/CreateVostcardStep2";
import CreateVostcardStep3 from "./pages/CreateVostcardStep3";
import ListView from "./pages/ListView";
import ScrollingCameraView from "./pages/ScrollingCameraView";
import CameraView from "./pages/CameraView";
import SavedVostcardsListView from "./components/SavedVostcardsListView";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/home" element={<HomeView />} />

        {/* ✅ Vostcard Creation Steps */}
        <Route path="/create-step1" element={<CreateVostcardStep1 />} />
        <Route path="/create-step2" element={<CreateVostcardStep2 />} />
        <Route path="/create-step3" element={<CreateVostcardStep3 />} />

        <Route path="/list" element={<ListView />} />
        <Route path="/scrolling-camera" element={<ScrollingCameraView />} />
        <Route path="/camera" element={<CameraView />} />

        {/* ✅ NEW: Saved Vōstcards List */}
        <Route path="/saved-vostcards" element={<SavedVostcardsListView />} />
      </Routes>
    </Router>
  );
}

export default App;