// Debug script for vostcard Q1ZCNyC1oN9PavJjd2el
// Run this in browser console on the vostcard page

console.log('🔍 DEBUG: Checking vostcard Q1ZCNyC1oN9PavJjd2el');

// Check current URL and component
console.log('Current URL:', window.location.href);
console.log('Current pathname:', window.location.pathname);

// Check if we're in PublicVostcardView or VostcardDetailView
const isPublicView = document.querySelector('[data-testid="public-vostcard-view"]') || 
                    document.title.includes('Public') ||
                    !document.querySelector('[data-testid="vostcard-detail-view"]');

console.log('🎯 Current view type:', isPublicView ? 'PublicVostcardView' : 'VostcardDetailView');

// Check authentication status
const authState = {
  user: !!window.firebase?.auth?.currentUser,
  userEmail: window.firebase?.auth?.currentUser?.email,
  userUID: window.firebase?.auth?.currentUser?.uid
};
console.log('🔐 Auth state:', authState);

// Try to access the vostcard data from React DevTools or global state
if (window.React) {
  console.log('⚛️ React detected');
}

// Check for any error messages in console
console.log('📋 Console errors (check above for any Firebase/audio/photo errors)');

// Check if audio detection is working
setTimeout(() => {
  const audioButtons = document.querySelectorAll('button');
  const audioButton = Array.from(audioButtons).find(btn => 
    btn.textContent.includes('Play Audio') || btn.textContent.includes('🎵')
  );
  
  console.log('🎵 Audio button found:', !!audioButton);
  if (audioButton) {
    console.log('🎵 Audio button text:', audioButton.textContent);
  }
  
  // Check for photo elements
  const photos = document.querySelectorAll('img');
  console.log('🖼️ Images found:', photos.length);
  
  const photoContainers = document.querySelectorAll('[style*="background-image"]');
  console.log('🖼️ Background images found:', photoContainers.length);
  
}, 2000);

console.log('🔍 Debug complete - check logs above');
