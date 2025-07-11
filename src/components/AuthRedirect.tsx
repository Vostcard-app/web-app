import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Add pin-placer to allowed paths
    const allowedPaths = [
      '/create-offer',
      '/store-profile-page',
      '/advertiser-portal',
      '/pin-placer'  // Add this line
    ];

    if (!loading && user) {
      if (!allowedPaths.includes(location.pathname)) {
        if (userRole === 'advertiser') {
          navigate('/advertiser-portal');
        } else {
          navigate('/home');
        }
      }
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
}; 