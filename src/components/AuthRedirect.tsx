import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginRedirectTimerRef = useRef<number | null>(null);

  // Add this debug logging (keep list in sync with publicRoutes below)
  const debugPublicRoutes = ['/', '/login', '/register', '/landing', '/user-guide', '/public-map', '/all-posted-vostcards'];
  console.log('🔍 AuthRedirect Debug:', {
    loading,
    user: !!user,
    userRole,
    currentPath: location.pathname,
    isPublicRoute: debugPublicRoutes.includes(location.pathname)
  });

  useEffect(() => {
    // 🎯 SMART ROUTING: Handle shared content based on authentication status
    const sharedContentRoutes = ['/share/', '/share-quickcard/', '/share-trip/', '/shared-trip/', '/share-itinerary/', '/email/', '/public-map', '/public-trip-map'];
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
            const target = `/quickcard/${id}`;
            console.log('🎯 Redirecting to private quickcard:', target);
            if (location.pathname !== target) navigate(target);
            return;
          }
        } else if (location.pathname.startsWith('/share/')) {
          const id = location.pathname.replace('/share/', '').split('?')[0]; // Remove query params
          if (id && id.length > 0) {
            const target = `/vostcard/${id}`;
            console.log('🎯 Redirecting to private vostcard:', target);
            if (location.pathname !== target) navigate(target);
            return;
          }
        } else if (location.pathname.startsWith('/share-trip/')) {
          const id = location.pathname.replace('/share-trip/', '').split('?')[0]; // Remove query params
          if (id && id.length > 0) {
            const target = `/trip/${id}`;
            console.log('🎯 Redirecting to private trip:', target);
            if (location.pathname !== target) navigate(target);
            return;
          }
        } else if (location.pathname.startsWith('/shared-trip/')) {
          const id = location.pathname.replace('/shared-trip/', '').split('?')[0]; // Remove query params  
          if (id && id.length > 0) {
            const target = `/tour/${id}`;
            console.log('🎯 Redirecting to private tour:', target);
            if (location.pathname !== target) navigate(target);
            return;
          }
        } else if (location.pathname.startsWith('/share-itinerary/')) {
          const link = location.pathname.replace('/share-itinerary/', '').split('?')[0];
          if (link && link.length > 0) {
            const target = `/itinerary/${link}`;
            console.log('🎯 Redirecting to private itinerary:', target);
            if (location.pathname !== target) navigate(target);
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

    // Routes allowed without auth (public experience)
    const publicRoutes = ['/', '/login', '/register', '/landing', '/user-guide', '/all-posted-vostcards'];
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
      // Grace delay before redirecting to login to avoid brief null-user windows
      if (loginRedirectTimerRef.current === null) {
        loginRedirectTimerRef.current = window.setTimeout(() => {
          // If still no user after the delay, navigate to login
          if (!user) {
            const returnTo = location.pathname + (location.search || '');
            const target = `/login?returnTo=${encodeURIComponent(returnTo)}`;
            if (!location.pathname.startsWith('/login')) navigate(target);
          }
          if (loginRedirectTimerRef.current) {
            clearTimeout(loginRedirectTimerRef.current);
            loginRedirectTimerRef.current = null;
          }
        }, 500); // short grace period for Firebase auth to resolve
      }
      return;
    } else {
      // If user exists or route is public, cancel any pending login redirect
      if (loginRedirectTimerRef.current) {
        clearTimeout(loginRedirectTimerRef.current);
        loginRedirectTimerRef.current = null;
      }
    }

    // If authenticated but on a public route (except root, user-guide, and all-posted-vostcards)
    if (user && isPublicRoute && !['/', '/user-guide', '/all-posted-vostcards'].includes(location.pathname)) {
      console.log('🏪 AuthRedirect: Public route redirect check - userRole:', userRole, 'path:', location.pathname);
      if (userRole === 'advertiser') {
        console.log('🏪 AuthRedirect: Redirecting advertiser from public route to advertiser portal');
        if (location.pathname !== '/advertiser-portal') navigate('/advertiser-portal');
      } else {
        console.log('🏠 AuthRedirect: Redirecting regular user from public route to home');
        if (location.pathname !== '/home') navigate('/home');
      }
      return;
    }

    // Redirect authenticated users from root based on their role
    if (user && location.pathname === '/') {
      console.log('🏪 AuthRedirect: Root redirect check - userRole:', userRole);
      if (userRole === 'advertiser') {
        console.log('🏪 AuthRedirect: Redirecting advertiser from root to advertiser portal');
        if (location.pathname !== '/advertiser-portal') navigate('/advertiser-portal');
      } else {
        console.log('🏠 AuthRedirect: Redirecting regular user from root to home');
        if (location.pathname !== '/home') navigate('/home');
      }
      return;
    }

  }, [loading, user, userRole, location.pathname, navigate]);

  return null;
};

export default AuthRedirect; 