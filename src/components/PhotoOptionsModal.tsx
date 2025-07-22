import React from 'react';
import { FaCamera, FaImages, FaTimes } from 'react-icons/fa';

interface PhotoOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onSelectFromGallery: () => void;
} 