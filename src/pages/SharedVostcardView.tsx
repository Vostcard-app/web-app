import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import PublicVostcardView from './PublicVostcardView';
import SharedContentHeader from '../components/SharedContentHeader';
import { FaHome, FaHeart, FaMap, FaPlus, FaEye } from 'react-icons/fa';

const SharedVostcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Extract sharing context from URL params
  const sharedBy = searchParams.get('from');
  const shareToken = searchParams.get('token');
  const sharedAtParam = searchParams.get('sharedAt');
  const sharedAt = sharedAtParam ? new Date(sharedAtParam) : new Date();

  // Load vostcard data (reusing logic from PublicVostcardView)
  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading shared vostcard:', id);
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.state === 'posted' || data.isPrivatelyShared) {
            setVostcard(data);
            set 