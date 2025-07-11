import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const allowedPaths = [
      '/create-offer',
      '/store-profile-page',
      '/advertiser-portal',
      '/pin-placer',
      '/home',
      '/all-posted-vostcards',
      '/offers-list',
      '/create-step1',
      '/list',
      '/vostcard',
      '/offer'
    ];

    if (!loading && user) {
      // Check if current path starts with any of the allowed paths
      const isAllowedPath = allowedPaths.some(path => 
        location.pathname === path || location.pathname.startsWith(`${path}/`)
      );

      if (!isAllowedPath) {
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