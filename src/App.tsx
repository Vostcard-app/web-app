import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { VostcardProvider } from "./context/VostcardContext";
import { ScriptProvider } from "./context/ScriptContext";
import { FollowingProvider } from "./context/FollowingContext";
import { DriveModeProvider } from "./context/DriveModeContext";
import ResponsiveContainer from "./components/ResponsiveContainer";

import RootView from "./pages/RootView";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import UserGuideView from "./pages/UserGuideView";
import HomeView from "./pages/HomeView";
import PublicHomeView from "./pages/PublicHomeView";
import BrowseAreaView from "./pages/BrowseAreaView";
import CreateVostcardStep1 from "./pages/CreateVostcardStep1";
import CreateVostcardStep2 from "./pages/CreateVostcardStep2";
import CreateVostcardStep3 from "./pages/CreateVostcardStep3";
import QuickcardStep3 from "./pages/QuickcardStep3";
import ListView from "./pages/ListView";
import ScrollingCameraView from "./pages/ScrollingCameraView";
import CameraView from "./pages/CameraView";
import QuickcardCameraView from "./pages/QuickcardCameraView";
import Step2CameraView from "./pages/Step2CameraView";
import SavedVostcardsListView from "./components/SavedVostcardsListView";
import SettingsView from "./pages/SettingsView";
import AccountSettingsView from "./pages/AccountSettingsView";
import UserSettingsView from "./pages/UserSettingsView";
import VostcardDetailView from "./pages/VostcardDetailView";
import PinPlacerTool from "./pages/PinPlacerTool";
import DrivecardPinPlacer from "./pages/DrivecardPinPlacer";
import MyVostcardListView from "./pages/MyVostcardListView";
import MyPostedVostcardsListView from "./pages/MyPostedVostcardsListView";
import AllPostedVostcardsView from "./pages/AllPostedVostcardsView";
import LikedVostcardsView from "./pages/LikedVostcardsView";
import FollowingView from "./pages/FollowingView";
import FriendListView from "./pages/FriendListView";
import VostboxView from "./pages/VostboxView";
import QuickcardListView from "./pages/QuickcardListView";
import QuickcardDetailView from "./pages/QuickcardDetailView";
import ScriptLibraryView from "./pages/ScriptLibraryView";
import ScriptEditorView from "./pages/ScriptEditorView";
import ScriptToolView from "./pages/ScriptToolView";
import UserProfileView from "./pages/UserProfileView";
import BusinessProfileView from "./pages/BusinessProfileView";
import AdvertiserPortal from "./pages/AdvertiserPortal";
import CreateOfferView from "./pages/CreateOfferView";
import EditStoreProfileView from "./pages/EditStoreProfileView";
import OfferView from "./pages/OfferView";
import OffersListView from "./pages/OffersListView";
import AdminPanel from "./pages/AdminPanel";
import ReportBugView from "./pages/ReportBugView";
import FlagFormView from "./pages/FlagFormView";
import SuggestionBoxView from "./pages/SuggestionBoxView";
import DrivecardsListView from "./pages/DrivecardsListView";
import VostcardStudioView from "./pages/VostcardStudioView";
import ExampleView from "./pages/ExampleView";
import PublicVostcardView from "./pages/PublicVostcardView";
import PublicQuickcardView from "./pages/PublicQuickcardView";
import EmailVostcardView from "./pages/EmailVostcardView";
import AuthRedirect from "./components/AuthRedirect";

function App() {
  return (
    <AuthProvider>
      <VostcardProvider>
        <ScriptProvider>
          <FollowingProvider>
            <DriveModeProvider>
              <Router>
              <AuthRedirect />
              <ResponsiveContainer>
                <Routes>
                  {/* 🔑 Authentication */}
                  <Route path="/" element={<RootView />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegistrationPage />} />
                  <Route path="/user-guide" element={<UserGuideView />} />

                  {/*  Public Access */}
                  <Route path="/share/:id" element={<PublicVostcardView />} />
                  <Route path="/share-quickcard/:id" element={<PublicQuickcardView />} />
                  <Route path="/email/:id" element={<EmailVostcardView />} />
                  <Route path="/public-map" element={<PublicHomeView />} />

                  {/* 🏠 Main */}
                  <Route path="/home" element={<HomeView />} />
                  <Route path="/browse-area" element={<BrowseAreaView />} />
                  <Route path="/list" element={<ListView />} />
                  <Route path="/all-posted-vostcards" element={<AllPostedVostcardsView />} />
                  <Route path="/offers-list" element={<OffersListView />} />
    
                  <Route path="/my-posted-vostcards" element={<MyPostedVostcardsListView />} />
                  <Route path="/edit-my-vostcards" element={<MyVostcardListView />} />
                  <Route path="/liked-vostcards" element={<LikedVostcardsView />} />
                  <Route path="/following" element={<FollowingView />} />
                  <Route path="/friends" element={<FriendListView />} />
                  <Route path="/vostbox" element={<VostboxView />} />

                  {/* 📱 Quickcard Routes */}
                  <Route path="/quickcards" element={<QuickcardListView />} />
                  <Route path="/quickcard/:id" element={<QuickcardDetailView />} />

                  {/* 📜 Script Management */}
                  <Route path="/scripts" element={<ScriptLibraryView />} />
                  <Route path="/script-editor" element={<ScriptEditorView />} />
                  <Route path="/script-tool" element={<ScriptToolView />} />

                  {/* 📹 Recording */}
                  <Route path="/camera" element={<CameraView />} />
                  <Route path="/scrolling-camera" element={<ScrollingCameraView />} />
                  <Route path="/quickcard-camera" element={<QuickcardCameraView />} />

                  {/* 🛠️ Creation Flow */}
                  <Route path="/create-step1" element={<CreateVostcardStep1 />} />
                  <Route path="/create-step2" element={<CreateVostcardStep2 />} />
                  <Route path="/create-step3" element={<CreateVostcardStep3 />} />
                  <Route path="/quickcard-step3" element={<QuickcardStep3 />} />
                  <Route path="/step2-camera" element={<Step2CameraView />} />

                  {/* 📍 Location */}
                  <Route path="/pin-placer" element={<PinPlacerTool />} />
                  <Route path="/drivecard-pin-placer" element={<DrivecardPinPlacer />} />

                  {/* 🎯 Details */}
                  <Route path="/vostcard/:id" element={<VostcardDetailView />} />
                  <Route path="/offer/:id" element={<OfferView />} />

                  {/* 👤 Profile */}
                  <Route path="/user-settings" element={<UserSettingsView />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="/account-settings" element={<AccountSettingsView />} />
                  <Route path="/user-profile/:userId" element={<UserProfileView />} />
                  <Route path="/business-profile/:businessId" element={<BusinessProfileView />} />

                  {/* 🏢 Business */}
                  <Route path="/advertiser-portal" element={<AdvertiserPortal />} />
                  <Route path="/create-offer" element={<CreateOfferView />} />
                  <Route path="/edit-store-profile" element={<EditStoreProfileView />} />

                  {/* 🛡️ Admin */}
                  <Route path="/admin" element={<AdminPanel />} />

                  {/* 🐛 Support */}
                  <Route path="/report-bug" element={<ReportBugView />} />
                  <Route path="/flag-form" element={<FlagFormView />} />
                  <Route path="/suggestion-box" element={<SuggestionBoxView />} />

                  {/* 🏎️ Drive Mode */}
                  <Route path="/drivecards" element={<DrivecardsListView />} />

                  {/* 🎬 Studio */}
                  <Route path="/studio" element={<VostcardStudioView />} />

                  {/* 🔍 Examples */}
                  <Route path="/example" element={<ExampleView />} />
                </Routes>
              </ResponsiveContainer>
            </Router>
            </DriveModeProvider>
          </FollowingProvider>
        </ScriptProvider>
      </VostcardProvider>
    </AuthProvider>
  );
}

export default App;