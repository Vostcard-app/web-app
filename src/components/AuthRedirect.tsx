import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Add this debug logging
  console.log('🔍 AuthRedirect Debug:', {
    loading,
    user: !!user,
    userRole,
    currentPath: location.pathname,
    isPublicRoute: ['/', '/login', '/register', '/landing', '/user-guide', '/public-map'].includes(location.pathname)
  });

  useEffect(() => {
    // 🎯 SMART ROUTING: Handle shared content based on authentication status
    const sharedContentRoutes = ['/share/', '/share-quickcard/', '/share-trip/', '/email/', '/public-map', '/public-trip-map'];
    const isSharedContentRoute = sharedContentRoutes.some(prefix => location.pathname.startsWith(prefix));
    
    if (isSharedContentRoute) {
      // Skip during loading to avoid premature redirects
      if (loading) {
        console.log('⏳ AuthRedirect: Still loading, skipping shared content logic');
        return;
      }

      // If user is logged in, redirect to private version
      if (user) {
        console.log('🔐 AuthRedirect: Logged in user accessing shared content, redirecting to private version');
        
        // Extract content ID and redirect to private version
        if (location.pathname.startsWith('/share-quickcard/')) {
          const id = location.pathname.replace('/share-quickcard/', '').split('?')[0]; // Remove query params
          if (id && id.length > 0) {
            console.log('🎯 Redirecting to private quickcard:', `/quickcard/${id}`);
            navigate(`/quickcard/${id}`);
            return;
          }
        } else if (location.pathname.startsWith('/share/')) {
          const id = location.pathname.replace('/share/', '').split('?')[0]; // Remove query params
          if (id && id.length > 0) {
            console.log('🎯 Redirecting to private vostcard:', `/vostcard/${id}`);
            navigate(`/vostcard/${id}`);
            return;
          }
        } else if (location.pathname.startsWith('/share-trip/')) {
          const id = location.pathname.replace('/share-trip/', '').split('?')[0]; // Remove query params
          if (id && id.length > 0) {
            console.log('🎯 Redirecting to private trip:', `/trip/${id}`);
            navigate(`/trip/${id}`);
            return;
          }
        }
      }
      
      // If user is not logged in, allow public view (no redirect)
      console.log('🔓 Anonymous user accessing shared content, showing public view:', location.pathname);
      return;
    }

    // Skip redirection if still loading
    if (loading) {
      console.log('⏳ AuthRedirect: Still loading, skipping redirect logic');
      return;
    }

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
      navigate('/');
      return;
    }

    // If authenticated but on a public route (except root and user-guide)
    if (user && isPublicRoute && location.pathname !== '/' && location.pathname !== '/user-guide') {
      console.log('🏪 AuthRedirect: Public route redirect check - userRole:', userRole, 'path:', location.pathname);
      if (userRole === 'advertiser') {
        console.log('🏪 AuthRedirect: Redirecting advertiser from public route to advertiser portal');
        navigate('/advertiser-portal');
      } else {
        console.log('🏠 AuthRedirect: Redirecting regular user from public route to home');
        navigate('/home');
      }
      return;
    }

    // Redirect authenticated users from root based on their role
    if (user && location.pathname === '/') {
      console.log('🏪 AuthRedirect: Root redirect check - userRole:', userRole);
      if (userRole === 'advertiser') {
        console.log('🏪 AuthRedirect: Redirecting advertiser from root to advertiser portal');
        navigate('/advertiser-portal');
      } else {
        console.log('🏠 AuthRedirect: Redirecting regular user from root to home');
        navigate('/home');
      }
      return;
    }

  }, [loading, user, userRole, location.pathname, navigate]);

  return null;
};

export default AuthRedirect; 