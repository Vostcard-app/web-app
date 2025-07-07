import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { VostcardProvider } from "./context/VostcardContext";
import { ScriptProvider } from "./context/ScriptContext";

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
import AdvertiserPortal from "./pages/AdvertiserPortal";
import CreateOfferView from './pages/CreateOfferView';
import AllPostedVostcardsView from './pages/AllPostedVostcardsView';
import EditStoreProfileView from './pages/EditStoreProfileView';
import VostcardDetailView from './pages/VostcardDetailView';
import ScriptLibraryView from './pages/ScriptLibraryView';
import ScriptEditorView from './pages/ScriptEditorView';
import ScriptToolView from './pages/ScriptToolView';
import LikedVostcardsView from './pages/LikedVostcardsView';

function App() {
  return (
    <VostcardProvider>
      <ScriptProvider>
        <Router>
          <Routes>
            {/* 🔑 Authentication */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />

            {/* 🏠 Main */}
            <Route path="/home" element={<HomeView />} />
            <Route path="/list" element={<ListView />} />
            <Route path="/all-posted-vostcards" element={<AllPostedVostcardsView />} />
            <Route path="/my-private-vostcards" element={<MyPrivateVostcardsListView />} />
            <Route path="/my-posted-vostcards" element={<MyPostedVostcardsListView />} />
            <Route path="/edit-my-vostcards" element={<EditMyVostcardListView />} />
            <Route path="/liked-vostcards" element={<LikedVostcardsView />} />

            {/* 📜 Script Management */}
            <Route path="/scripts" element={<ScriptLibraryView />} />
            <Route path="/script-library" element={<ScriptLibraryView />} />
            <Route path="/script-editor" element={<ScriptEditorView />} />
            <Route path="/script-editor/:scriptId" element={<ScriptEditorView />} />

            {/* 🎥 Vostcard Creation */}
            <Route path="/create-step1" element={<CreateVostcardStep1 />} />
            <Route path="/create-step2" element={<CreateVostcardStep2 />} />
            <Route path="/create-step3" element={<CreateVostcardStep3 />} />

            {/* 📷 Camera */}
            <Route path="/scrolling-camera" element={<ScrollingCameraView />} />
            <Route path="/camera" element={<CameraView />} />

            {/* 📦 Saved */}
            <Route path="/saved-vostcards" element={<SavedVostcardsListView />} />

            {/* 📄 Vostcard Detail */}
            <Route path="/vostcard/:id" element={<VostcardDetailView />} />

            {/* ⚙️ Settings */}
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/account-settings" element={<AccountSettingsView />} />

            {/* 📣 Advertiser Portal */}
            <Route path="/advertiser-portal" element={<AdvertiserPortal />} />

            {/* 📄 Create Offer */}
            <Route path="/create-offer" element={<CreateOfferView />} />

            {/* 🏪 Store Profile */}
            <Route path="/store-profile-page" element={<EditStoreProfileView />} />

            {/* 📄 Script Tool */}
            <Route path="/script-tool" element={<ScriptToolView />} />
          </Routes>
        </Router>
      </ScriptProvider>
    </VostcardProvider>
  );
}

export default App;