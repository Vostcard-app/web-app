import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaTrash, FaPlay, FaPause, FaMusic, FaMapPin } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import type { Drivecard } from '../types/VostcardTypes';

const DrivecardsListView: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username } = useAuth();
  const [drivecards, setDrivecards] = useState<Drivecard[]>([]);
  const [loading, setLoading] = useState(true); 