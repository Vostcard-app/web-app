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
    const publicRoutes = ['/', '/login', '/register', '/landing', '/user-guide'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    // Dynamic routes that should be allowed (with any ID)
    const isDynamicRoute = [
      '/vostcard/',
      '/offer/',
      '/profile/',
      '/script-editor/',
      '/flag/'
    ].some(prefix => location.pathname.startsWith(prefix));

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute && !isDynamicRoute) {
      navigate('/login');
      return;
    }

    // If authenticated but on a public route (except root)
    if (user && isPublicRoute && location.pathname !== '/') {
      if (userRole === 'advertiser') {
        navigate('/advertiser-portal');
      } else {
        navigate('/home');
      }
      return;
    }

    // Special case for advertisers
    if (user && userRole === 'advertiser' && location.pathname === '/home') {
      navigate('/advertiser-portal');
      return;
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
}; 