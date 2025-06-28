import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomeView from "./components/HomeView"; // Assuming HomeView is still in components
import CreateVostcardStep1 from "./components/CreateVostcardStep1";
import CreateVostcardStep2 from "./components/CreateVostcardStep2";
import CreateVostcardStep3 from "./components/CreateVostcardStep3";
import ListView from "./components/ListView";
import ScrollingCameraView from "./components/ScrollingCameraView";
import CameraView from "./components/CameraView";
import { VostcardProvider } from "./context/VostcardContext";

function App() {
  return (
    <VostcardProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomeView />} />
          <Route path="/step1" element={<CreateVostcardStep1 />} />
          <Route path="/step2" element={<CreateVostcardStep2 />} />
          <Route path="/step3" element={<CreateVostcardStep3 />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/scroll-camera" element={<ScrollingCameraView />} />
          <Route path="/camera" element={<CameraView />} />
        </Routes>
      </Router>
    </VostcardProvider>
  );
}

export default App;