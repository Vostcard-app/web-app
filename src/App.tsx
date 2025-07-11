import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { VostcardProvider } from "./context/VostcardContext";
import { ScriptProvider } from "./context/ScriptContext";
import { FollowingProvider } from "./context/FollowingContext";

import RootView from "./pages/RootView";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import UserGuideView from "./pages/UserGuideView";
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

import MyPostedVostcardsListView from "./pages/MyPostedVostcardsListView";
import EditMyVostcardListView from "./pages/EditMyVostcardListView";
import AdvertiserPortal from "./pages/AdvertiserPortal";
import CreateOfferView from './pages/CreateOfferView';
import AllPostedVostcardsView from './pages/AllPostedVostcardsView';
import EditStoreProfileView from './pages/EditStoreProfileView';
import VostcardDetailView from './pages/VostcardDetailView';
import OfferView from './pages/OfferView';
import OffersListView from './pages/OffersListView';
import ScriptLibraryView from './pages/ScriptLibraryView';
import ScriptEditorView from './pages/ScriptEditorView';
import ScriptToolView from './pages/ScriptToolView';
import LikedVostcardsView from './pages/LikedVostcardsView';
import FollowingView from './pages/FollowingView';
import UserProfileView from './pages/UserProfileView';
import UserSettingsView from './pages/UserSettingsView';
import SuggestionBoxView from './pages/SuggestionBoxView';
import FlagFormView from './pages/FlagFormView';
import ReportBugView from './pages/ReportBugView';
import PinPlacerTool from './pages/PinPlacerTool';
import { AuthRedirect } from './components/AuthRedirect';

function App() {
  return (
    <VostcardProvider>
      <ScriptProvider>
        <FollowingProvider>
          <Router>
            <AuthRedirect />
            <Routes>
              {/* 🔑 Authentication */}
              <Route path="/" element={<RootView />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/user-guide" element={<UserGuideView />} />

              {/* 🏠 Main */}
              <Route path="/home" element={<HomeView />} />
              <Route path="/list" element={<ListView />} />
              <Route path="/all-posted-vostcards" element={<AllPostedVostcardsView />} />
              <Route path="/offers-list" element={<OffersListView />} />
    
              <Route path="/my-posted-vostcards" element={<MyPostedVostcardsListView />} />
              <Route path="/edit-my-vostcards" element={<EditMyVostcardListView />} />
              <Route path="/liked-vostcards" element={<LikedVostcardsView />} />
              <Route path="/following" element={<FollowingView />} />

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
              <Route path="/offer/:id" element={<OfferView />} />

              {/*  Flag Vostcard */}
              <Route path="/flag/:vostcardID/:title/:username" element={<FlagFormView />} />

              {/* 👤 User Profile */}
              <Route path="/profile/:userId" element={<UserProfileView />} />

              {/* ⚙️ Settings */}
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/user-settings" element={<UserSettingsView />} />
              <Route path="/account-settings" element={<AccountSettingsView />} />
              <Route path="/suggestion-box" element={<SuggestionBoxView />} />
              <Route path="/report-bug" element={<ReportBugView />} />

              {/* 📣 Advertiser Portal */}
              <Route path="/advertiser-portal" element={<AdvertiserPortal />} />

              {/* 📄 Create Offer */}
              <Route path="/create-offer" element={<CreateOfferView />} />

              {/* 🏪 Store Profile */}
              <Route path="/store-profile-page" element={<EditStoreProfileView />} />

              {/* 📄 Script Tool */}
              <Route path="/script-tool" element={<ScriptToolView />} />

              {/* 📍 Pin Placer */}
              <Route path="/pin-placer" element={<PinPlacerTool />} />
            </Routes>
          </Router>
        </FollowingProvider>
      </ScriptProvider>
    </VostcardProvider>
  );
}

export default App;