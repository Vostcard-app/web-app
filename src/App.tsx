import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { VostcardProvider } from "./context/VostcardContext";

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
import SettingsView from "./pages/SettingsView";
import AccountSettingsView from "./pages/AccountSettingsView";
import MyPrivateVostcardsListView from "./pages/MyPrivateVostcardsListView";
import MyPostedVostcardsListView from "./pages/MyPostedVostcardsListView";
import EditMyVostcardListView from "./pages/EditMyVostcardListView";

function App() {
  return (
    <VostcardProvider>
      <Router>
        <Routes>
          {/* 🔑 Authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />

          {/* 🏠 Main */}
          <Route path="/home" element={<HomeView />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/my-private-vostcards" element={<MyPrivateVostcardsListView />} />
          <Route path="/my-posted-vostcards" element={<MyPostedVostcardsListView />} />
          <Route path="/edit-my-vostcards" element={<EditMyVostcardListView />} />

          {/* 🎥 Vostcard Creation */}
          <Route path="/create-step1" element={<CreateVostcardStep1 />} />
          <Route path="/create-step2" element={<CreateVostcardStep2 />} />
          <Route path="/create-step3" element={<CreateVostcardStep3 />} />

          {/* 📷 Camera */}
          <Route path="/scrolling-camera" element={<ScrollingCameraView />} />
          <Route path="/camera" element={<CameraView />} />

          {/* 📦 Saved */}
          <Route path="/saved-vostcards" element={<SavedVostcardsListView />} />

          {/* ⚙️ Settings */}
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/account-settings" element={<AccountSettingsView />} />
        </Routes>
      </Router>
    </VostcardProvider>
  );
}

export default App;