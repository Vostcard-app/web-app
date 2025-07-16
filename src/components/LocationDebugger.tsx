import React, { useState, useEffect } from 'react';
import { LocationService } from '../utils/locationService';

const LocationDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateDebugInfo = async () => {
      const info = [
        `Protocol: ${window.location.protocol}`,
        `Host: ${window.location.hostname}`,
        `User Agent: ${navigator.userAgent}`,
        `