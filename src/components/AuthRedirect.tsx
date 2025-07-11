import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip redirection if still loading
    if (loading) return;

    // Public routes that don't require auth
    const publicRoutes = ['/', '/login', '/register', '/landing'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (!user && !isPublicRoute) {
      // Not logged in and trying to access protected route
      navigate('/login');
    } else if (user && isPublicRoute && location.pathname !== '/') {
      // Logged in but on a public route (except root)
      if (userRole === 'advertiser') {
        navigate('/advertiser-portal');
      } else {
        navigate('/home');
      }
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
}; 