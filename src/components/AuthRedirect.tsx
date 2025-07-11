import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if not authenticated and trying to access protected routes
    if (!loading && !user) {
      // Public routes that don't require authentication
      const publicRoutes = ['/', '/login', '/register', '/landing'];
      
      if (!publicRoutes.includes(location.pathname)) {
        navigate('/login');
      }
    }
    
    // Redirect advertisers to their portal if they're on the home page
    if (!loading && user && userRole === 'advertiser' && location.pathname === '/home') {
      navigate('/advertiser-portal');
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
}; 