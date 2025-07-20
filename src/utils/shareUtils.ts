/**
 * Generate enhanced share links with context
 */
export const generateShareLink = (
  contentId: string, 
  contentType: 'vostcard' | 'quickcard',
  user?: any,
  isAuthenticated?: boolean
) => {
  const baseUrl = window.location.origin;
  
  if (isAuthenticated && user) {
    // Authenticated users get enhanced shared links
    const params = new URLSearchParams({
      from: user.displayName || user.email?.split('@')[0] || 'someone',
      sharedAt: new Date().toISOString(),
      token: generateShareToken() // You can implement secure token generation
    });
    
    return `${baseUrl}/shared/${contentType}/${contentId}?${params}`;
  } else {
    // Anonymous users get public links
    return contentType === 'vostcard' 
      ? `${baseUrl}/share/${contentId}`
      : `${baseUrl}/share-quickcard/${contentId}`;
  }
};

const generateShareToken = (): string => {
  // Simple token generation - you might want something more secure
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Smart routing for shared content based on user auth state
 */
export const handleSharedContentNavigation = (
  contentId: string,
  contentType: 'vostcard' | 'quickcard', 
  navigate: any,
  user?: any
) => {
  if (user) {
    // Authenticated users go to enhanced shared view
    navigate(`/shared/${contentType}/${contentId}`);
  } else {
    // Anonymous users go to public view
    const route = contentType === 'vostcard' ? `/share/${contentId}` : `/share-quickcard/${contentId}`;
    navigate(route);
  }
}; 