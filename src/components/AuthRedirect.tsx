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
    // ✅ COMPLETELY bypass authentication for shared content
    const sharedContentRoutes = ['/share/', '/share-quickcard/', '/email/', '/public-map'];
    const isSharedContentRoute = sharedContentRoutes.some(prefix => location.pathname.startsWith(prefix));
    
    if (isSharedContentRoute) {
      console.log('🔓 Bypassing authentication for shared content route:', location.pathname);
      return; // No authentication logic at all - both logged-in and anonymous users see same experience
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
      if (userRole === 'advertiser') {
        navigate('/advertiser-portal');
      } else {
        navigate('/home');
      }
      return;
    }

    // Allow both authenticated and unauthenticated users to access root view
    // Commenting out auto-redirect from root so users can stay on RootView
    // if (user && location.pathname === '/') {
    //   if (userRole === 'advertiser') {
    //     navigate('/advertiser-portal');
    //   } else {
    //     navigate('/home');
    //   }
    //   return;
    // }

  }, [loading, user, userRole, location.pathname, navigate]);

  return null;
};

export default AuthRedirect; 