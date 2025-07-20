import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import PublicQuickcardView from './PublicQuickcardView';
import SharedContentHeader from '../components/SharedContentHeader';
import { FaHome, FaHeart, FaMap, FaPlus, FaEye } from 'react-icons/fa';

const SharedQuickcardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [quickcard, setQuickcard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Extract sharing context from URL params
  const sharedBy = searchParams.get('from');
  const shareToken = searchParams.get('token');
  const sharedAtParam = searchParams.get('sharedAt');
  const sharedAt = sharedAtParam ? new Date(sharedAtParam) : new Date();

  // Load quickcard data
  useEffect(() => {
    const fetchQuickcard = async () => {
      if (!id) {
        setError('No quickcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading shared quickcard:', id);
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isQuickcard && (data.state === 'posted' || data.isPrivatelyShared)) {
            setQuickcard(data);
            setLoading(false);
            
            // Show enhanced actions for authenticated users
            if (user) {
              setTimeout(() => setShowActions(true), 1000);
            }
            return;
          }
        }
        
        setError('This quickcard is not available for sharing.');
        setLoading(false);
      } catch (err) {
        console.error('Error loading shared quickcard:', err);
        setError('Failed to load quickcard.');
        setLoading(false);
      }
    };

    fetchQuickcard();
  }, [id, user]);

  // Handle actions (same as vostcard but for quickcards)
  const handleAddToMyMap = () => {
    if (!user) {
      navigate('/register');
      return;
    }
    
    navigate('/home', {
      state: {
        highlightVostcard: id,
        focusLocation: quickcard ? [quickcard.latitude || quickcard.geo?.latitude, quickcard.longitude || quickcard.geo?.longitude] : null
      }
    });
  };

  const handleViewInContext = () => {
    if (!user) {
      navigate('/register');
      return;
    }
    
    navigate('/home', {
      state: {
        centerLocation: quickcard ? [quickcard.latitude || quickcard.geo?.latitude, quickcard.longitude || quickcard.geo?.longitude] : null,
        showNearby: true
      }
    });
  };

  const handleGoHome = () => {
    navigate(user ? '/home' : '/');
  };

  if (loading || error) {
    return <PublicQuickcardView />;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Shared Content Header */}
      <SharedContentHeader
        sharedBy={sharedBy || undefined}
        sharedAt={sharedAt}
        contentType="quickcard"
        onBack={handleGoHome}
      />

      {/* Main Content - Wrap PublicQuickcardView */}
      <div style={{ flex: 1, position: 'relative' }}>
        <PublicQuickcardView />
        
        {/* Enhanced Actions for Authenticated Users */}
        {user && showActions && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'white',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid #e0e0e0',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#002B4D',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              What would you like to do with this quickcard?
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '8px'
            }}>
              <button
                onClick={handleAddToMyMap}
                style={{
                  background: '#002B4D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <FaPlus size={16} />
                Add to My Map
              </button>

              <button
                onClick={handleViewInContext}
                style={{
                  background: '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <FaEye size={16} />
                View Near Me
              </button>

              <button
                onClick={handleGoHome}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <FaHome size={16} />
                Go to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SharedQuickcardView; 