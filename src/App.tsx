import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeView from './components/HomeView';
import CreateVostcardStep1 from './components/CreateVostcardStep1';
import CreateVostcardStep2 from './components/CreateVostcardStep2';
import CreateVostcardStep3 from './components/CreateVostcardStep3';
import ScrollingCameraView from './components/ScrollingCameraView';
import CameraView from './components/CameraView';
import ListView from './components/ListView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<HomeView />} />
        <Route path="/create-step1" element={<CreateVostcardStep1 />} />
        <Route path="/create-step2" element={<CreateVostcardStep2 />} />
        <Route path="/create-step3" element={<CreateVostcardStep3 />} />
        <Route path="/scrolling-camera" element={<ScrollingCameraView />} />
        <Route path="/camera" element={<CameraView />} />
        <Route path="/list-view" element={<ListView />} />
      </Routes>
    </Router>
  );
}

export default App;