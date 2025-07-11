import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // List of paths that should bypass the redirect
    const allowedPaths = [
      '/create-offer',
      '/store-profile-page',
      '/advertiser-portal'
    ];

    if (!loading && user) {
      // Only redirect if we're not on an allowed path
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