import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaTimes, FaSync, FaHeart, FaRegComment, FaShare, FaUserCircle, FaFlag, FaMap, FaPlay, FaPause, FaCoffee, FaChevronDown, FaStar, FaDirections } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
// Leaflet Routing Machine will be imported dynamically
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useVostcard } from '../context/VostcardContext';
import CommentsModal from '../components/CommentsModal';
// Legacy pin import removed - using VostcardPin for all vostcards
import VostcardPin from '../assets/Vostcard_pin.png';
import GuidePin from '../assets/Guide_pin.png';
import OfferPin from '../assets/Offer_pin.png';
import { useAuth } from '../context/AuthContext';
import { VostboxService } from '../services/vostboxService';
import { LikeService } from '../services/likeService';
import { RatingService } from '../services/ratingService';
import { ItineraryService } from '../services/itineraryService';
import type { Itinerary } from '../types/ItineraryTypes';
import FriendPickerModal from '../components/FriendPickerModal';
import SharedOptionsModal from '../components/SharedOptionsModal';
import { NavigationService, NavigationStep } from '../services/navigationService';
import MultiPhotoModal from '../components/MultiPhotoModal';
import { generateShareText } from '../utils/vostcardUtils';
import TipDropdownMenu from '../components/TipDropdownMenu';

// Icons will be created in component

const VostcardDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fixBrokenSharedVostcard, loadLocalVostcard, savedVostcards, postedVostcards, refreshFirebaseStorageURLs } = useVostcard();
  const { user } = useAuth();
  
  // Navigation state from previous view
  const navigationState = location.state as any;
  const vostcardList = navigationState?.vostcardList || [];
  const currentIndex = navigationState?.currentIndex || 0;
  
  // Debug navigation state on load and scroll to top
  useEffect(() => {
    console.log('🔍 VostcardDetailView loaded:', {
      vostcardList: vostcardList.length,
      currentIndex,
      id,
      canGoToPrevious: vostcardList.length > 0 && currentIndex > 0,
      canGoToNext: vostcardList.length > 0 && currentIndex < vostcardList.length - 1
    });
    
    // Ensure page loads at top with avatar visible under banner
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]); // Only log when ID changes, not on every render
  
  const [vostcard, setVostcard] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections] = useState<NavigationStep[]>([]);
  const [showDirectionsOverlay, setShowDirectionsOverlay] = useState(false);
  const [liveNavigation, setLiveNavigation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState<number>(0);

  // Create custom icons
  const createIcons = () => {
    // Determine the correct icon based on vostcard properties
    let iconUrl = VostcardPin; // Default to vostcard pin
    
    if (vostcard?.username === 'Jay Bond') {
      iconUrl = GuidePin; // Jay Bond gets guide pin
    } else if (vostcard?.isOffer) {
      iconUrl = OfferPin; // Offers get offer pin
    } else if (vostcard?.userRole === 'guide') {
      iconUrl = GuidePin; // Other guides get guide pin
    }
    
    const vostcardIcon = new L.Icon({
      iconUrl: iconUrl,
      iconSize: [75, 75],
      iconAnchor: [37.5, 75],
      popupAnchor: [0, -75],
    });

    // Current location icon
    const currentLocationIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #5856D6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    return { vostcardIcon, currentLocationIcon };
  };

  // Import routing machine
  useEffect(() => {
    const loadRoutingMachine = async () => {
      try {
        // Import the CSS
        await import('leaflet-routing-machine/dist/leaflet-routing-machine.css');
        // Import the JS
        await import('leaflet-routing-machine');
      } catch (error) {
        console.error('Failed to load routing machine:', error);
      }
    };
    loadRoutingMachine();
  }, []);

  // Routing control component
  const RoutingMachine = ({ 
    destination,
    showDirections = true,
    onDirectionsLoaded
  }: { 
    destination: [number, number],
    showDirections?: boolean,
    onDirectionsLoaded?: (instructions: any) => void
  }) => {
    const map = useMap();
    
    useEffect(() => {
      if (!map || !showDirections) return;
      
      let routingControl: any = null;

      // Get user's current location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const { currentLocationIcon, vostcardIcon } = createIcons();
          
          // Create routing control
          routingControl = L.Routing.control({
            waypoints: [
              L.latLng(latitude, longitude),
              L.latLng(destination[0], destination[1])
            ],
            router: L.Routing.osrm({
              serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            createMarker: function(i: number, waypoint: any) {
              return L.marker(waypoint.latLng, {
                icon: i === 0 ? currentLocationIcon : vostcardIcon
              });
            },
            lineOptions: {
              styles: [{ color: '#5856D6', weight: 4 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            show: true
          });

          // Add directions callback
          if (onDirectionsLoaded) {
            routingControl.on('routesfound', function(e: any) {
              console.log('🗺️ Route found event:', e);
              
              if (e.routes && e.routes[0]) {
                const route = e.routes[0];
                console.log('📍 Route details:', route);
                
                // Try multiple ways to extract instructions
                let instructions = [];
                
                if (route.instructions && route.instructions.length > 0) {
                  console.log('✅ Found instructions in route.instructions');
                  instructions = route.instructions.map((instruction: any, index: number) => ({
                    text: instruction.text || instruction.instruction || `Step ${index + 1}`,
                    distance: instruction.distance || 0,
                    time: instruction.time || 0,
                    type: instruction.type || 'straight'
                  }));
                } else if (route.itinerary && route.itinerary.length > 0) {
                  console.log('✅ Found instructions in route.itinerary');
                  instructions = route.itinerary.map((step: any, index: number) => ({
                    text: step.text || step.instruction || `Step ${index + 1}`,
                    distance: step.distance || 0,
                    time: step.time || 0,
                    type: step.type || 'straight'
                  }));
                } else {
                  console.log('⚠️ No instructions found, creating basic directions');
                  instructions = [
                    { text: 'Start navigation to destination', distance: route.summary?.totalDistance || 0, time: 0, type: 'start' },
                    { text: 'Follow the route on the map', distance: 0, time: 0, type: 'straight' },
                    { text: 'Arrive at destination', distance: 0, time: 0, type: 'destination' }
                  ];
                }
                
                console.log('📋 Final instructions:', instructions);
                onDirectionsLoaded(instructions);
              } else {
                console.log('❌ No route found in event');
              }
            });
            
            // Fallback: If no route is found after 2 seconds, provide helpful directions
            setTimeout(() => {
              console.log('⏰ Routing timeout - providing helpful fallback directions');
              const fallbackInstructions = [
                { text: '📍 Start navigation from your current location', distance: 0, time: 0, type: 'start' },
                { text: '🗺️ Follow the route line shown on this map', distance: 0, time: 0, type: 'straight' },
                { text: '📱 For detailed turn-by-turn directions, open this location in your preferred maps app', distance: 0, time: 0, type: 'straight' },
                { text: '🎯 Arrive at your destination', distance: 0, time: 0, type: 'destination' }
              ];
              onDirectionsLoaded(fallbackInstructions);
            }, 2000);
          }

          // Add control to map
          routingControl.addTo(map);

          // Inject custom styles for the routing container after the control is added
          const style = document.createElement('style');
          style.textContent = `
            .leaflet-routing-container {
              position: absolute !important;
              top: 10px !important;
              right: 10px !important;
              margin: 0 !important;
              padding: 16px !important;
              width: 400px !important;
              background: white !important;
              border-radius: 12px !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
              z-index: 1000 !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              font-size: 16px !important;
            }
            .leaflet-routing-container h2 {
              font-size: 18px !important;
              margin: 0 0 12px 0 !important;
              padding-bottom: 8px !important;
              border-bottom: 1px solid #eee !important;
            }
            .leaflet-routing-container h3 {
              font-size: 16px !important;
              margin: 16px 0 8px 0 !important;
            }
            .leaflet-routing-alt {
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              font-size: 16px !important;
            }
            .leaflet-routing-alt table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .leaflet-routing-alt tr {
              border-bottom: 1px solid #eee !important;
            }
            .leaflet-routing-alt tr:hover {
              background-color: #f5f5f5 !important;
            }
            .leaflet-routing-alt td {
              padding: 12px 8px !important;
              font-size: 16px !important;
            }
            .leaflet-routing-alt-minimized {
              display: block !important;
            }
            .leaflet-routing-container-hide {
              display: block !important;
            }
            .leaflet-routing-collapsible {
              display: block !important;
            }
            .leaflet-routing-geocoder {
              display: none !important;
            }
          `;
          document.head.appendChild(style);

          // Add close button if showing directions
          if (showDirections) {
            setTimeout(() => {
              const container = document.querySelector('.leaflet-routing-container') as HTMLElement | null;
              if (container) {
                const header = container.querySelector('h2') as HTMLElement | null;
                if (header) {
                  const closeButton = document.createElement('button');
                  closeButton.innerHTML = '×';
                  closeButton.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #666;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 8px;
                    float: right;
                  `;
                  closeButton.onclick = () => {
                    setShowDirections(false);
                  };
                  header.appendChild(closeButton);
                }
              }
            }, 100);
          }

          // Cleanup: remove routing control and injected style when the component unmounts
          return () => {
            if (routingControl) {
              map.removeControl(routingControl);
            }
            if (style && style.parentNode) {
              style.parentNode.removeChild(style);
            }
          };
        },
        (error) => {
                    console.error('Error getting location:', error);
          alert('Could not get your current location. Please enable location services.');
        }
      );

            // Initialize routing is handled in the useEffect

    // Cleanup
    return () => {
      if (routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, destination, showDirections]);

    return null;
  };
  const [isLiked, setIsLiked] = useState(false);
  const [showSharedOptions, setShowSharedOptions] = useState(false);
  const [userRating, setUserRating] = useState(0);

  // ✅ Enhanced audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Tip dropdown state
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [tipDropdownPosition, setTipDropdownPosition] = useState({ top: 0, left: 0 });
  const tipButtonRef = useRef<HTMLButtonElement>(null);
  
  // Itinerary modal state
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [existingItineraries, setExistingItineraries] = useState<Itinerary[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [showCreateItineraryModal, setShowCreateItineraryModal] = useState(false);
  const [showSelectItineraryModal, setShowSelectItineraryModal] = useState(false);
  const [newItineraryName, setNewItineraryName] = useState('');
  const [newItineraryDescription, setNewItineraryDescription] = useState('');
  const [addingToItinerary, setAddingToItinerary] = useState(false);
  const [creatingItinerary, setCreatingItinerary] = useState(false);

  // Determine if this vostcard has a video attached
  const hasVideoMedia = Boolean(
    (vostcard as any)?.videoURL || 
    (vostcard as any)?._firebaseVideoURL || 
    (vostcard as any)?.video ||
    (vostcard as any)?.hasVideo
  );
  
  // Debug video detection
  if (vostcard) {
    console.log('🎥 Video detection for vostcard:', vostcard.id, {
      hasVideoMedia,
      videoURL: (vostcard as any)?.videoURL,
      hasVideoURL: !!(vostcard as any)?.videoURL,
      video: (vostcard as any)?.video,
      hasVideoBlob: !!(vostcard as any)?.video,
      hasVideo: (vostcard as any)?.hasVideo,
      _firebaseVideoURL: (vostcard as any)?._firebaseVideoURL,
      vostcardKeys: Object.keys(vostcard),
      has_firebaseVideoURL: !!(vostcard as any)?._firebaseVideoURL
    });
    
    // Debug YouTube and Instagram URLs
    console.log('📺📷 Social URLs for vostcard:', vostcard.id, {
      youtubeURL: vostcard.youtubeURL,
      instagramURL: vostcard.instagramURL,
      hasYouTube: !!vostcard.youtubeURL,
      hasInstagram: !!vostcard.instagramURL,
      shouldShowSocialButtons: !!(vostcard.youtubeURL || vostcard.instagramURL),
      allVostcardProperties: Object.keys(vostcard)
    });
  } else {
    console.log('❌ Vostcard is null - cannot detect video');
  }

  // Swipe gesture state for navigation
  const [touchStart, setTouchStart] = useState<{ y: number; x: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ y: number; x: number; time: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // ✅ Performance optimization - memoize photo URLs and audio detection
  const photoURLs = useMemo(() => {
    // Check both old (photoURLs) and new (_firebasePhotoURLs) formats
    const oldFormat = vostcard?.photoURLs || [];
    const newFormat = vostcard?._firebasePhotoURLs || [];
    
    // Use oldFormat if it has valid URLs, otherwise use newFormat
    // Filter out any empty/invalid URLs
    const validOldFormat = oldFormat.filter(url => url && url.trim() !== '');
    const validNewFormat = newFormat.filter(url => url && url.trim() !== '');
    
    const urls = validOldFormat.length > 0 ? validOldFormat : validNewFormat;
    
    console.log('🖼️ Photo URLs resolved:', {
      vostcardId: vostcard?.id,
      oldFormatLength: oldFormat.length,
      newFormatLength: newFormat.length,
      validOldFormatLength: validOldFormat.length,
      validNewFormatLength: validNewFormat.length,
      finalUrlsLength: urls.length,
      finalUrls: urls.slice(0, 2) // Log first 2 URLs for debugging
    });
    
    return urls;
  }, [vostcard?.photoURLs, vostcard?._firebasePhotoURLs, vostcard?.id]);
  const hasAudio = useMemo(() => {
    const audioExists = !!(
      vostcard?.audioURL || 
      vostcard?.audioURLs?.length > 0 || 
      vostcard?.audio || 
      vostcard?._firebaseAudioURL ||
      vostcard?._firebaseAudioURLs?.length > 0 ||
      vostcard?.audioFiles?.length > 0
    );
    console.log('🔍 Audio detection:', {
      audioExists,
      audioURL: vostcard?.audioURL,
      audioURLs: vostcard?.audioURLs,
      audio: vostcard?.audio,
      _firebaseAudioURL: vostcard?._firebaseAudioURL,
      _firebaseAudioURLs: vostcard?._firebaseAudioURLs,
      audioFiles: vostcard?.audioFiles
    });
    return audioExists;
  }, [vostcard?.audioURL, vostcard?.audioURLs, vostcard?.audio, vostcard?._firebaseAudioURL, vostcard?._firebaseAudioURLs, vostcard?.audioFiles]);

  // Removed redundant navigation state logging

  useEffect(() => {
    const fetchVostcard = async () => {
      if (!id) {
        setError('No vostcard ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Loading vostcard:', id);
        
        // First try to find in savedVostcards (private vostcards from IndexedDB)
        const savedVostcard = savedVostcards.find(v => v.id === id);
        if (savedVostcard) {
          console.log('📱 Found private vostcard in savedVostcards:', {
            id: savedVostcard.id,
            title: savedVostcard.title,
            hasPhotoURLs: !!savedVostcard.photoURLs,
            photoURLsLength: savedVostcard.photoURLs?.length || 0,
            has_firebasePhotoURLs: !!savedVostcard._firebasePhotoURLs,
            _firebasePhotoURLsLength: savedVostcard._firebasePhotoURLs?.length || 0,
            hasPhotos: savedVostcard.hasPhotos,
            youtubeURL: savedVostcard.youtubeURL,
            instagramURL: savedVostcard.instagramURL,
            hasYouTube: !!savedVostcard.youtubeURL,
            hasInstagram: !!savedVostcard.instagramURL,
            allKeys: Object.keys(savedVostcard).sort()
          });
          setVostcard(savedVostcard);
          setLoading(false);
          return;
        }
        
        // Then try to find in postedVostcards (from Firestore)
        const postedVostcard = postedVostcards.find(v => v.id === id);
        if (postedVostcard) {
          console.log('📱 Found posted vostcard in postedVostcards:', {
            id: postedVostcard.id,
            title: postedVostcard.title,
            hasPhotoURLs: !!postedVostcard.photoURLs,
            photoURLsLength: postedVostcard.photoURLs?.length || 0,
            has_firebasePhotoURLs: !!postedVostcard._firebasePhotoURLs,
            _firebasePhotoURLsLength: postedVostcard._firebasePhotoURLs?.length || 0,
            hasPhotos: postedVostcard.hasPhotos,
            youtubeURL: postedVostcard.youtubeURL,
            instagramURL: postedVostcard.instagramURL,
            hasYouTube: !!postedVostcard.youtubeURL,
            hasInstagram: !!postedVostcard.instagramURL,
            allKeys: Object.keys(postedVostcard).sort()
          });
          setVostcard(postedVostcard);
          setLoading(false);
          return;
        }
        
        // If not found in context, try to load from IndexedDB directly
        console.log('📱 Not found in context, trying IndexedDB...');
        try {
          await loadLocalVostcard(id);
          // loadLocalVostcard should update the context, so check again
          const updatedSavedVostcard = savedVostcards.find(v => v.id === id);
          if (updatedSavedVostcard) {
            console.log('📱 Found vostcard after loading from IndexedDB:', updatedSavedVostcard);
            setVostcard(updatedSavedVostcard);
            setLoading(false);
            return;
          }
        } catch (indexedDBError) {
          console.log('📱 Not found in IndexedDB, trying Firestore...');
        }
        
        // Finally try to load from Firestore (for posted vostcards)
        const docRef = doc(db, 'vostcards', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📱 Vostcard found in Firestore:', {
            id: data.id,
            title: data.title,
            isQuickcard: data.isQuickcard,
            hasPhotoURLs: !!data.photoURLs,
            photoURLsLength: data.photoURLs?.length || 0,
            has_firebasePhotoURLs: !!data._firebasePhotoURLs,
            _firebasePhotoURLsLength: data._firebasePhotoURLs?.length || 0,
            hasPhotos: data.hasPhotos,
            photoURLsValue: data.photoURLs,
            // Video-related fields
            hasVideo: data.hasVideo,
            videoURL: data.videoURL,
            hasVideoURL: !!data.videoURL,
            video: data.video,
            hasVideoBlob: !!data.video,
            _firebaseVideoURL: data._firebaseVideoURL,
            has_firebaseVideoURL: !!data._firebaseVideoURL,
            // Audio-related fields
            hasAudio: data.hasAudio,
            audioURL: data.audioURL,
            audioURLs: data.audioURLs,
            audioURLsLength: data.audioURLs?.length || 0,
            _firebaseAudioURL: data._firebaseAudioURL,
            _firebaseAudioURLs: data._firebaseAudioURLs,
            audio: data.audio,
            audioFiles: data.audioFiles,
            audioLabels: data.audioLabels,
            allKeys: Object.keys(data).sort()
          });
          
          // Handle both regular vostcards and quickcards in the same component
          // (Removed broken quickcard redirect since /quickcard/:id route doesn't exist)
          setVostcard(data);
          setLoading(false);
        } else {
          console.log('📱 Vostcard not found anywhere, trying to fix...');
          
          try {
            const fixed = await fixBrokenSharedVostcard(id);
            if (fixed) {
              console.log('📱 Vostcard fixed, retrying load...');
              
              const retryDocSnap = await getDoc(docRef);
              if (retryDocSnap.exists()) {
                const retryData = retryDocSnap.data();
                setVostcard(retryData);
                setLoading(false);
                return;
              }
            }
          } catch (fixError) {
            console.error('📱 Failed to fix vostcard:', fixError);
          }
          
          // Try to find by internal id field (for migrated vostcards)
          console.log('📱 Trying to find by internal ID field...');
          try {
            const q = query(
              collection(db, 'vostcards'),
              where('id', '==', id)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const data = querySnapshot.docs[0].data();
              console.log('📱 Vostcard found by internal ID:', data);
              setVostcard(data);
              setLoading(false);
              return;
            } else {
              console.log('📱 No vostcard found with internal ID:', id);
            }
          } catch (searchError) {
            console.error('❌ Error searching by internal ID:', searchError);
          }
          
          setError('Vostcard not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
      } catch (err) {
        console.error('📱 Error loading vostcard:', err);
        setError('Failed to load Vostcard. Please check your internet connection and try again.');
        setLoading(false);
      }
    };

    fetchVostcard();
  }, [id, fixBrokenSharedVostcard, loadLocalVostcard, savedVostcards, postedVostcards]);

  // Live GPS tracking for navigation
  useEffect(() => {
    let watchId: number | null = null;
    
    if (liveNavigation && directions.length > 0) {
      console.log('🧭 Starting live GPS tracking for navigation');
      
      // Watch position for live updates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(newLocation);
          
          // Calculate distance to next waypoint
          if (directions[currentStepIndex]) {
            const distance = calculateDistance(
              newLocation[0], newLocation[1],
              vostcard.latitude, vostcard.longitude
            );
            setDistanceToNext(distance);
            
            // Voice guidance when close to turns (less than 50m)
            if (distance < 0.05 && currentStepIndex < directions.length - 1) { // 50 meters
              speakDirection(directions[currentStepIndex].text);
            }
          }
        },
        (error) => {
          console.error('❌ GPS tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 1000
        }
      );
    }
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛑 Stopped GPS tracking');
      }
    };
  }, [liveNavigation, directions, currentStepIndex, vostcard?.latitude, vostcard?.longitude]);

  // Voice synthesis for turn-by-turn directions
  const speakDirection = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      utterance.pitch = 1.0;
      
      console.log('🔊 Speaking:', text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get real turn-by-turn directions
  const fetchRealDirections = async (userLocation: [number, number]) => {
    if (!vostcard) return;

    console.log('🗺️ Fetching real turn-by-turn directions...');
    setDirections([]); // Clear old directions
    
    try {
      const route = await NavigationService.getDirections(
        userLocation,
        [vostcard.latitude, vostcard.longitude]
      );

      if (route && route.steps.length > 0) {
        console.log('✅ Real directions loaded:', route.steps.length, 'steps');
        setDirections(route.steps);
        setShowDirectionsOverlay(true);
        
        // Announce first direction
        if (route.steps[0]) {
          speakDirection(`Starting navigation. ${route.steps[0].instruction}`);
        }
      } else {
        console.warn('❌ No directions received from navigation service');
      }
    } catch (error) {
      console.error('❌ Failed to fetch directions:', error);
    }
  };

  // Fetch user profile when vostcard is loaded
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!vostcard?.userID) return;
      
      try {
        const userRef = doc(db, 'users', vostcard.userID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log('🔍 VostcardDetailView Debug - Creator userRole:', userData.userRole);
          console.log('🔍 VostcardDetailView Debug - Creator buyMeACoffeeURL:', userData.buyMeACoffeeURL);
          setUserProfile(userData);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    
    if (vostcard?.userID) {
      fetchUserProfile();
    }
  }, [vostcard?.userID]);

  // Load existing like status
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!user || !vostcard?.id) return;
      
      try {
        const isLiked = await LikeService.isLiked(vostcard.id);
        setIsLiked(isLiked);
      } catch (error) {
        console.error('Failed to load like status:', error);
      }
    };
    
    loadLikeStatus();
  }, [user, vostcard?.id]);

  // Load existing rating
  useEffect(() => {
    const loadUserRating = async () => {
      if (!user || !vostcard?.id) return;
      
      try {
        const rating = await RatingService.getUserRating(vostcard.id);
        setUserRating(rating);
      } catch (error) {
        console.error('Failed to load user rating:', error);
      }
    };
    
    loadUserRating();
  }, [user, vostcard?.id]);

  // ✅ Enhanced audio player effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    const handleError = () => {
      console.error('Audio failed to load');
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [vostcard?.audioURL, vostcard?.audioURLs]);

  const handleShareClick = async () => {
    if (!vostcard) return;
    
    // Check if this is already a posted/public vostcard
    const isAlreadyPosted = vostcard.state === 'posted' || vostcard.visibility === 'public';
    
    // Only show warning for private/personal posts
    if (!isAlreadyPosted) {
      const confirmMessage = `⚠️ Attention:

This will create a public link for your post. Anyone with the link can see it.

Tap OK to continue.`;
      
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }
    
    try {
      // Generate public share URL
      const shareUrl = `${window.location.origin}/share/${vostcard.id}`;
      
      // Generate share text using utility
      const shareText = generateShareText(vostcard, shareUrl);
      
      // Use native sharing or clipboard
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      alert('Please log in to like this vostcard');
      return;
    }
    
    if (!vostcard?.id) {
      alert('Unable to like this vostcard');
      return;
    }

    try {
      const newLikedState = await LikeService.toggleLike(vostcard.id);
      setIsLiked(newLikedState);
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status. Please try again.');
    }
  }, [user, vostcard?.id]);

  const handleMapClick = useCallback(() => {
    // Check both old format (latitude/longitude) and new format (geo.latitude/geo.longitude)
    const lat = vostcard?.latitude || vostcard?.geo?.latitude;
    const lng = vostcard?.longitude || vostcard?.geo?.longitude;
    
    if (lat && lng) {
      console.log('📍 Opening vostcard location on public map for single pin view', { lat, lng });
      navigate('/public-map', {
        replace: false, // Ensure we add to history so back button works
        state: {
          singleVostcard: {
            id: vostcard.id,
            title: vostcard.title,
            description: vostcard.description,
            latitude: lat,
            longitude: lng,
            photoURLs: vostcard.photoURLs,
            username: vostcard.username,
            userRole: vostcard.userRole,
            isOffer: false,
            type: 'vostcard',
            categories: vostcard.categories,
            createdAt: vostcard.createdAt,
            visibility: 'public',
            state: 'posted'
          }
        }
      });
    } else {
      console.log('❌ No location data found:', {
        oldFormat: { latitude: vostcard?.latitude, longitude: vostcard?.longitude },
        newFormat: { geo: vostcard?.geo },
        finalValues: { lat, lng }
      });
      alert('No location data available for this vostcard');
    }
  }, [vostcard, navigate]);

  // ✅ Enhanced audio playback function - MOVED FIRST
  const handlePlayPause = useCallback(async () => {
    console.log('🎵 handlePlayPause called!', { hasAudio, isPlaying });
    
    if (!hasAudio) {
      console.log('❌ No audio detected, returning early');
      return;
    }

    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      // Create new audio element
      const audio = new Audio();
      (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

      // Get audio source - check multiple possible fields
      const audioSource = vostcard?.audioURL || 
                         vostcard?.audioURLs?.[0] || 
                         vostcard?.audio || 
                         vostcard?._firebaseAudioURL;

      if (!audioSource) {
        console.error('No audio source available');
        return;
      }

      // Set audio source
      if (audioSource instanceof Blob) {
        audio.src = URL.createObjectURL(audioSource);
      } else if (typeof audioSource === 'string') {
        audio.src = audioSource;
      } else {
        console.error('Invalid audio source type:', typeof audioSource);
        return;
      }

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
      alert('Failed to play audio. Please try again.');
    }
  }, [hasAudio, isPlaying, vostcard]);

  // ✅ Enhanced photo click handler for thumbnails (not main photo)
  const handlePhotoClick = useCallback((photoUrl: string) => {
    if (photoURLs && photoURLs.length > 1) {
      const index = photoURLs.indexOf(photoUrl);
      setSelectedPhotoIndex(index >= 0 ? index : 0);
      setShowMultiPhotoModal(true);
    } else {
      setSelectedPhoto(photoUrl);
    }
  }, [photoURLs]);

  // ✅ NEW: Thumbnail click handler - launches audio and shows slideshow
  const handleThumbnailClick = useCallback(async (photoUrl: string) => {
    console.log('🖼️ Thumbnail clicked - launching audio and showing slideshow:', photoUrl);
    
    // Find the index of the clicked photo and start slideshow from there
    const photoIndex = photoURLs.indexOf(photoUrl);
    setSelectedPhotoIndex(photoIndex >= 0 ? photoIndex : 0);
    setShowMultiPhotoModal(true);
    
    // Start audio if available - do this after setting up slideshow
    if (hasAudio) {
      // Small delay to ensure slideshow is open
      setTimeout(() => {
        handlePlayPause();
      }, 100);
    }
  }, [hasAudio, handlePlayPause, photoURLs]);

  // ✅ Main photo click handler - triggers audio and shows slideshow
  const handleMainPhotoClick = useCallback(async () => {
    console.log('🚨 CLICK DETECTED ON MAIN PHOTO! 🚨');
    console.log('🖼️ Main photo clicked - launching audio and showing slideshow');
    
    // Start slideshow from the first photo
    setSelectedPhotoIndex(0);
    setShowMultiPhotoModal(true);
    
    // Start audio if available - do this after setting up slideshow
    if (hasAudio) {
      // Small delay to ensure slideshow is open
      setTimeout(() => {
        handlePlayPause();
      }, 100);
    }
  }, [hasAudio, handlePlayPause]);

  // ✅ Auto-start audio when slideshow opens
  useEffect(() => {
    if (showMultiPhotoModal && hasAudio && !isPlaying) {
      console.log('🎵 Slideshow opened - auto-starting audio');
      handlePlayPause();
    }
  }, [showMultiPhotoModal, hasAudio, isPlaying, handlePlayPause]);

  // ✅ NEW: Enhanced audio playback functions for Intro and Detail
  const handleIntroAudioPlayback = useCallback(async () => {
    console.log('🎵 Playing intro audio');
    
    if (!hasAudio) {
      console.log('❌ No audio detected');
      return;
    }

    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      // Create new audio element
      const audio = new Audio();
      (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

      // Get intro audio source - prioritize intro-specific fields
      const introAudioSource = vostcard?.introAudioURL || 
                              vostcard?.audioURL || 
                              vostcard?.audioURLs?.[0] || 
                              vostcard?.audio || 
                              vostcard?._firebaseAudioURL;

      if (!introAudioSource) {
        console.error('No intro audio source available');
        return;
      }

      // Set audio source
      if (introAudioSource instanceof Blob) {
        audio.src = URL.createObjectURL(introAudioSource);
      } else if (typeof introAudioSource === 'string') {
        audio.src = introAudioSource;
      } else {
        console.error('Invalid audio source type:', typeof introAudioSource);
        return;
      }

      // Audio event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('🎵 Intro audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Intro audio playback error:', e);
        setIsPlaying(false);
      });

      // Play audio
      await audio.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing intro audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  }, [hasAudio, isPlaying, vostcard]);

  const handleDetailAudioPlayback = useCallback(async () => {
    console.log('🎵 Playing detail audio');
    
    try {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      // Create new audio element
      const audio = new Audio();
      (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

      // Get detail audio source
      const detailAudioSource = 
        // Check for explicit detail audio
        vostcard?.detailAudioURL ||
        // Check for labeled audio
        (vostcard?.audioLabels && vostcard.audioFiles && 
         vostcard.audioLabels.includes('detail')) ? 
         vostcard.audioFiles[vostcard.audioLabels.indexOf('detail')] :
        // Check for second audio in arrays
        vostcard?.audioURLs?.[1] || 
        vostcard?._firebaseAudioURLs?.[1] || 
        vostcard?.audioFiles?.[1] ||
        // Fallback to first audio
        vostcard?.audioURL ||
        vostcard?.audioURLs?.[0] ||
        vostcard?.audio ||
        vostcard?._firebaseAudioURL;

      if (!detailAudioSource) {
        console.error('No detail audio source available');
        return;
      }

      // Set audio source
      if (detailAudioSource instanceof Blob) {
        audio.src = URL.createObjectURL(detailAudioSource);
      } else if (typeof detailAudioSource === 'string') {
        audio.src = detailAudioSource;
      } else {
        console.error('Invalid audio source type:', typeof detailAudioSource);
        return;
      }

      // Audio event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('🎵 Detail audio playback ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Detail audio playback error:', e);
        setIsPlaying(false);
      });

      // Play audio
      await audio.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing detail audio:', error);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  }, [isPlaying, vostcard]);

  // Load user's existing itineraries
  const loadUserItineraries = async () => {
    if (!user) {
      alert('Please log in to use itineraries');
      return;
    }
    
    try {
      setLoadingItineraries(true);
      console.log('📋 Loading user itineraries...');
      const itineraries = await ItineraryService.getUserItineraries();
      setExistingItineraries(itineraries);
      console.log(`✅ Loaded ${itineraries.length} user itineraries`);
    } catch (error) {
      console.error('❌ Error loading itineraries:', error);
      
      let errorMessage = 'Failed to load itineraries. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          errorMessage = 'Permission denied. Please log out and log back in.';
        } else if (error.message.includes('Database configuration')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
        } else if (error.message.includes('not authenticated')) {
          errorMessage = 'Please log in to use itineraries.';
        }
      }
      
      alert(errorMessage);
      setShowItineraryModal(false);
    } finally {
      setLoadingItineraries(false);
    }
  };

  // Handle adding vostcard to existing itinerary
  const handleAddToExistingItinerary = async (itinerary: Itinerary) => {
    if (!vostcard) return;

    try {
      setAddingToItinerary(true);
      
      await ItineraryService.addItemToItinerary(itinerary.id, {
        vostcardID: vostcard.id,
        type: 'vostcard',
        title: vostcard.title,
        description: vostcard.description,
        photoURL: vostcard.photoURLs?.[0],
        latitude: vostcard.latitude,
        longitude: vostcard.longitude,
        username: vostcard.username
      });

      setShowSelectItineraryModal(false);
      setShowItineraryModal(false);
      alert(`Added to "${itinerary.name}" itinerary!`);
      console.log('✅ Added vostcard to existing itinerary:', itinerary.id);
    } catch (error) {
      console.error('❌ Error adding to itinerary:', error);
      alert('Failed to add to itinerary. Please try again.');
    } finally {
      setAddingToItinerary(false);
    }
  };

  // Handle creating new itinerary with this vostcard
  const handleCreateNewItinerary = async () => {
    if (!newItineraryName.trim() || !vostcard) {
      alert('Please enter an itinerary name');
      return;
    }

    try {
      setCreatingItinerary(true);
      
      const newItinerary = await ItineraryService.createItinerary({
        name: newItineraryName.trim(),
        description: newItineraryDescription.trim() || undefined,
        isPublic: true,
        firstItem: {
          vostcardID: vostcard.id,
          type: 'vostcard'
        }
      });

      // Also add the cached data for the item
      if (newItinerary.items.length > 0) {
        // The service creates the item, but we can update it with cached data
        // This is optional since the service will fetch this data when viewing
      }

      setShowCreateItineraryModal(false);
      setShowItineraryModal(false);
      setNewItineraryName('');
      setNewItineraryDescription('');
      
      alert(`Created "${newItinerary.name}" itinerary with this vostcard!`);
      console.log('✅ Created new itinerary with vostcard:', newItinerary.id);
    } catch (error) {
      console.error('❌ Error creating itinerary:', error);
      alert('Failed to create itinerary. Please try again.');
    } finally {
      setCreatingItinerary(false);
    }
  };


  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFlag = () => {
    navigate('/flag-form', {
      state: {
        vostcardId: vostcard?.id,
        vostcardTitle: vostcard?.title || 'Untitled Vōstcard',
        username: vostcard?.username || 'Anonymous'
      }
    });
  };

  const handleTipButtonClick = () => {
    if (tipButtonRef.current) {
      const rect = tipButtonRef.current.getBoundingClientRect();
      setTipDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
      setShowTipDropdown(!showTipDropdown);
    }
  };

  // Navigation functions for swipe gestures
  const canGoToPrevious = vostcardList.length > 0 && currentIndex > 0;
  const canGoToNext = vostcardList.length > 0 && currentIndex < vostcardList.length - 1;

  const handlePreviousVostcard = () => {
    // Scroll to top before navigation to show avatar under banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('🔄 handlePreviousVostcard called:', { canGoToPrevious, currentIndex, vostcardList: vostcardList.length });
    if (canGoToPrevious) {
      const previousId = vostcardList[currentIndex - 1];
      console.log('📱 Navigating to previous:', previousId, 'index:', currentIndex - 1);
      try {
        navigate(`/vostcard/${previousId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex - 1
          }
        });
        console.log('✅ Navigation to previous completed successfully');
      } catch (error) {
        console.error('🚨 ERROR during navigation to previous:', error);
      }
    } else {
      console.log('❌ Cannot navigate to previous:', { canGoToPrevious, currentIndex });
    }
  };

  const handleNextVostcard = () => {
    // Scroll to top before navigation to show avatar under banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('🔄 handleNextVostcard called:', { canGoToNext, currentIndex, vostcardList: vostcardList.length });
    if (canGoToNext) {
      const nextId = vostcardList[currentIndex + 1];
      console.log('📱 Navigating to next:', nextId, 'index:', currentIndex + 1);
      try {
        navigate(`/vostcard/${nextId}`, {
          state: {
            vostcardList,
            currentIndex: currentIndex + 1
          }
        });
        console.log('✅ Navigation to next completed successfully');
      } catch (error) {
        console.error('🚨 ERROR during navigation to next:', error);
      }
    } else {
      console.log('❌ Cannot navigate to next:', { canGoToNext, currentIndex, listLength: vostcardList.length });
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    console.log('🔍 Touch START detected:', { 
      y: touch.clientY, 
      x: touch.clientX,
      currentIndex,
      vostcardList: vostcardList.length,
      id
    });
    setTouchStart({
      y: touch.clientY,
      x: touch.clientX,
      time: Date.now()
    });
    setTouchEnd(null);
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;
    
    setTouchEnd({
      y: currentY,
      x: currentX,
      time: Date.now()
    });

    // Simplified: Let the swipe validation handle all gesture detection
    // Removed aggressive scrolling detection that was blocking swipe gestures
  };

  const handleTouchEnd = () => {
    console.log('🔍 Touch END detected:', { 
      touchStart: !!touchStart, 
      touchEnd: !!touchEnd, 
      isScrolling,
      currentIndex,
      vostcardList: vostcardList.length,
      id
    });
    
    try {
      if (!touchStart || !touchEnd || isScrolling) {
        // Reset and allow normal scrolling
        console.log('🔍 Touch END - Early return:', { 
          touchStart: !!touchStart, 
          touchEnd: !!touchEnd, 
          isScrolling,
          reason: !touchStart ? 'no touchStart' : !touchEnd ? 'no touchEnd' : 'isScrolling'
        });
        setTouchStart(null);
        setTouchEnd(null);
        setIsScrolling(false);
        return;
      }

    const distance = touchStart.y - touchEnd.y;
    const horizontalDistance = Math.abs(touchStart.x - touchEnd.x);
    const timeDiff = touchEnd.time - touchStart.time;
    
    // Device-adaptive thresholds for better mobile experience
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const verticalThreshold = 30;
    const horizontalThreshold = isMobile ? 80 : 150; // Mobile: tighter, Laptop: looser
    const timeThreshold = isMobile ? 800 : 1500; // Mobile: faster, Laptop: slower
    
    const isValidSwipe = Math.abs(distance) > verticalThreshold && 
                        horizontalDistance < horizontalThreshold && 
                        timeDiff < timeThreshold && 
                        !isScrolling;
    
    console.log('🔍 VostcardDetailView Swipe Debug:', {
      distance,
      horizontalDistance,
      timeDiff,
      isValidSwipe,
      isScrolling,
      canGoToNext,
      canGoToPrevious,
      vostcardList: vostcardList.length,
      currentIndex,
      deviceType: isMobile ? 'mobile' : 'desktop',
      thresholds: { vertical: verticalThreshold, horizontal: horizontalThreshold, time: timeThreshold }
    });
    
    if (isValidSwipe) {
      if (distance > 0) {
        // Swipe up - go to next vostcard
        console.log('📱 Swiping up to next item...', { distance, canGoToNext, currentIndex, listLength: vostcardList.length });
        if (canGoToNext) {
          handleNextVostcard();
        } else {
          console.log('❌ Cannot go to next - at end of list');
        }
      } else {
        // Swipe down - go to previous vostcard
        console.log('📱 Swiping down to previous item...', { distance, canGoToPrevious, currentIndex, listLength: vostcardList.length });
        if (canGoToPrevious) {
          handlePreviousVostcard();
        } else {
          console.log('❌ Cannot go to previous - at start of list', { currentIndex, canGoToPrevious });
        }
      }
    } else {
      console.log('❌ Invalid swipe gesture');
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
    
    } catch (error) {
      console.error('🚨 ERROR in handleTouchEnd:', error);
      console.log('🔧 Resetting touch state after error');
      setTouchStart(null);
      setTouchEnd(null);
      setIsScrolling(false);
    }
  };

  // Debug logging for audio detection
  useEffect(() => {
    if (vostcard) {
      console.log('🎵 AUDIO DEBUG - Vostcard data:', {
        id: vostcard.id,
        title: vostcard.title,
        hasAudioURL: !!vostcard.audioURL,
        hasAudioURLs: !!vostcard.audioURLs,
        audioURL: vostcard.audioURL,
        audioURLs: vostcard.audioURLs,
        hasAudioCalculated: hasAudio,
        allKeys: Object.keys(vostcard)
      });
    }
  }, [vostcard, hasAudio]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading Vostcard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: 'red', marginBottom: '16px' }}>{error}</div>
          <button 
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!vostcard) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No Vostcard data</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'system-ui, sans-serif',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        overscrollBehavior: 'contain',
        touchAction: 'manipulation'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 9px 16px',
        position: 'relative', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              marginRight: '15px'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={40} />
          </button>
        </div>
      </div>

      {/* Swipe navigation indicators */}
      {(canGoToPrevious || canGoToNext) && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          zIndex: 10,
          opacity: 0.4,
          pointerEvents: 'none'
        }}>
          {canGoToPrevious && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
          <div style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '50%'
          }} />
          {canGoToNext && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
        </div>
      )}

      {/* User Info + Map View button on right */}
      <div style={{ 
        padding: '15px 20px 5px 20px',
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16 }}>
            <div 
              style={{ 
                width: 50, 
                height: 50, 
                borderRadius: '50%', 
                overflow: 'hidden', 
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
                }
              }}
            >
              {userProfile?.avatarURL ? (
                <img 
                  src={userProfile.avatarURL} 
                  alt="User Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                />
              ) : (
                <FaUserCircle size={50} color="#ccc" />
              )}
            </div>
            {userProfile?.userRole === 'guide' && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#666', fontWeight: 600 }}>Guide</div>
            )}
          </div>
          <div 
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#333',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (vostcard?.userID) {
                navigate(`/user-profile/${vostcard.userID}`);
              }
            }}
          >
            {userProfile?.username || vostcard.username || 'Anonymous'}
        </div>
      </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ☕ Tip Button for Guides */}
          {userProfile?.userRole === 'guide' && user?.uid !== vostcard.userID && (
            <button
              ref={tipButtonRef}
              onClick={handleTipButtonClick}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px'
              }}
            >
              Leave a Tip
              <FaChevronDown size={8} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '22px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {vostcard.title || 'Untitled Vōstcard'}
        </h1>
      </div>

      {/* ✅ UPDATED: Side-by-side thumbnails (or single large photo when no video) */}
      {hasVideoMedia ? (
        <div style={{ 
          padding: '5px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          {/* Photo thumbnail */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: '125px',
              height: '125px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#f8f9fa',
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => {
              if (hasAudio) handleIntroAudioPlayback();
              if (photoURLs && photoURLs.length > 0) {
                setSelectedPhotoIndex(0);
                setShowMultiPhotoModal(true);
              }
            }}
            >
              {photoURLs && photoURLs.length > 0 ? (
                <>
                  <img
                    src={photoURLs[0]}
                    alt="Photos"
                    style={{ width: '125px', height: '125px', objectFit: 'cover', display: 'block' }}
                    loading="eager"
                    fetchPriority="high"
                    onError={async (e) => {
                      console.error('❌ Image failed to load:', {
                        src: photoURLs[0],
                        vostcardId: vostcard?.id,
                        error: e
                      });
                      // Try to refresh Firebase Storage URLs
                      if (vostcard?.id) {
                        console.log('🔄 Attempting to refresh Firebase Storage URLs...');
                        const refreshedURLs = await refreshFirebaseStorageURLs(vostcard.id);
                        if (refreshedURLs) {
                          console.log('✅ URLs refreshed, reloading page...');
                          window.location.reload();
                        }
                      }
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                  />
                  {/* Centered play overlay to signal tap-to-view */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderLeft: '12px solid white', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 3 }} />
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                  <FaMap size={28} color="#bbb" />
                </div>
              )}
              {photoURLs && photoURLs.length > 1 && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: 12, fontSize: 12, padding: '2px 6px' }}>
                  1/{photoURLs.length}
                </div>
              )}
            </div>
            <div style={{ fontSize: '18px', color: '#333', fontWeight: 600 }}>Photos</div>
          </div>

          {/* Video thumbnail */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{ 
                width: '125px',
                height: '125px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#111',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => {
                const videoUrl = (vostcard as any)?.videoURL || (vostcard as any)?._firebaseVideoURL || ((vostcard as any)?.video instanceof Blob ? URL.createObjectURL((vostcard as any).video) : null);
                console.log('🎥 Opening video:', videoUrl);
                if (videoUrl) {
                  window.open(videoUrl, '_blank');
                } else {
                  console.log('❌ No video URL available to open');
                  alert('Video not available');
                }
              }}
            >
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Video thumbnail */}
                {(() => {
                  const videoUrl = (vostcard as any)?.videoURL || (vostcard as any)?._firebaseVideoURL;
                  console.log('🎥 Video thumbnail URL:', videoUrl);
                  
                  if (videoUrl) {
                    return (
                      <video
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        preload="metadata"
                        muted
                        playsInline
                        onError={(e) => {
                          console.error('❌ Video thumbnail failed to load:', {
                            videoUrl,
                            error: e,
                            vostcardId: (vostcard as any)?.id
                          });
                        }}
                        onLoadedMetadata={() => {
                          console.log('✅ Video thumbnail loaded successfully');
                        }}
                      >
                        <source src={`${videoUrl}#t=0.5`} type="video/mp4" />
                      </video>
                    );
                  } else {
                    console.log('❌ No video URL found for thumbnail');
                    return (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '12px'
                      }}>
                        No Video
                      </div>
                    );
                  }
                })()}
                {/* Play overlay */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderLeft: '14px solid white', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 4 }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: '18px', color: '#333', fontWeight: 600 }}>Video</div>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '5px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: '200px',
              height: '200px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#f8f9fa',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => {
              if (hasAudio) handleIntroAudioPlayback();
              if (photoURLs && photoURLs.length > 0) {
                setSelectedPhotoIndex(0);
                setShowMultiPhotoModal(true);
              }
            }}
            >
              {photoURLs && photoURLs.length > 0 ? (
                <>
                  <img
                    src={photoURLs[0]}
                    alt="Photos"
                    style={{ width: '200px', height: '200px', objectFit: 'cover', display: 'block' }}
                    loading="eager"
                    fetchPriority="high"
                    onError={async (e) => {
                      console.error('❌ Large image failed to load:', {
                        src: photoURLs[0],
                        vostcardId: vostcard?.id,
                        error: e
                      });
                      // Try to refresh Firebase Storage URLs
                      if (vostcard?.id) {
                        console.log('🔄 Attempting to refresh Firebase Storage URLs...');
                        const refreshedURLs = await refreshFirebaseStorageURLs(vostcard.id);
                        if (refreshedURLs) {
                          console.log('✅ URLs refreshed, reloading page...');
                          window.location.reload();
                        }
                      }
                    }}
                    onLoad={() => {
                      // Large image loaded successfully
                    }}
                  />
                  {/* Centered play overlay to signal tap-to-view */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderLeft: '14px solid white', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 4 }} />
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                  <FaMap size={40} color="#bbb" />
                </div>
              )}
              {photoURLs && photoURLs.length > 1 && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: 12, fontSize: 14, padding: '3px 8px' }}>
                  1/{photoURLs.length}
                </div>
              )}
            </div>
            <div style={{ fontSize: '18px', color: '#333', fontWeight: 600 }}>Photos</div>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={vostcard.audioURL || vostcard.audioURLs?.[0]}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}

      {/* Intro/Detail/Map Buttons - Only show if there are recordings */}
      {(hasAudio || (vostcard?.latitude && vostcard?.longitude)) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0px',
          gap: '5px',
          flexWrap: 'wrap' // Allow wrapping if needed on smaller screens
        }}>
          {/* More Button - Show ONLY if there's a second recording (not YouTube/Instagram) */}
          {(() => {
            const hasDetailAudio = (
              // Multiple audio files exist
              (vostcard?.audioURLs && vostcard.audioURLs.length >= 2) ||
              (vostcard?._firebaseAudioURLs && vostcard._firebaseAudioURLs.length >= 2) ||
              (vostcard?.audioFiles && vostcard.audioFiles.length >= 2) ||
              (vostcard?.audioLabels && vostcard.audioLabels.includes('detail')) ||
              // Explicit detail audio field exists
              (vostcard?.detailAudioURL) ||
              // Both intro and detail audio fields exist
              (vostcard?.introAudioURL && vostcard?.detailAudioURL)
            );
            
            return hasDetailAudio;
          })() && (
            <button
              onClick={() => {
                console.log('🎵 More button clicked - playing detail audio and showing slideshow');
                // Play detail audio
                handleDetailAudioPlayback();
                // Show photo slideshow starting with first photo WITH AUTO-PLAY
                if (photoURLs && photoURLs.length > 0) {
                  setSelectedPhotoIndex(0);
                  setShowMultiPhotoModal(true);
                }
              }}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '100px',
                boxShadow: '0 2px 8px rgba(0,43,77,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
            >
              <FaPlay size={14} style={{ marginRight: '8px' }} />
              More
            </button>
          )}

        </div>
      )}

      {/* Action Icons Row - Under photo thumbnail */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '5px 40px',
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={handleLikeClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLiked ? '#ff3b30' : '#666'
          }}
        >
          <FaHeart size={22} />
        </button>

        <button
          onClick={() => setShowCommentsModal(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaRegComment size={22} />
        </button>

        {/* Directions button */}
        {vostcard?.latitude && vostcard?.longitude && (
          <button
            onClick={async () => {
              console.log('🧭 Real directions button clicked');
              setShowMapModal(true);
              
              // Get user's current location
              if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const userLocation: [number, number] = [
                      position.coords.latitude,
                      position.coords.longitude
                    ];
                    console.log('📍 User location obtained:', userLocation);
                    await fetchRealDirections(userLocation);
                  },
                  (error) => {
                    console.error('❌ Geolocation error:', error);
                    alert('Location access denied. Please enable location to get directions.');
                  },
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              } else {
                alert('Geolocation is not supported by this browser.');
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5856D6'
            }}
          >
            <FaDirections size={22} />
          </button>
        )}

        <button
          onClick={handleShareClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}
        >
          <FaShare size={22} />
        </button>



        <button
          onClick={handleFlag}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff3b30'
          }}
        >
          <FaFlag size={22} />
        </button>
      </div>

      {/* YouTube and Instagram Buttons - Above Map View */}
      {(vostcard?.youtubeURL || vostcard?.instagramURL) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          gap: '12px',
          borderBottom: '1px solid #eee'
        }}>
          {/* YouTube Button */}
          {vostcard?.youtubeURL && (
            <button
              onClick={() => {
                console.log('📺 YouTube button clicked:', vostcard.youtubeURL);
                setShowYouTubeModal(true);
              }}
              style={{
                backgroundColor: '#FF0000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(255,0,0,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CC0000'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF0000'}
            >
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaPlay size={8} style={{ color: '#FF0000', marginLeft: '1px' }} />
              </div>
              YouTube
            </button>
          )}

          {/* Instagram Button */}
          {vostcard?.instagramURL && (
            <button
              onClick={() => {
                console.log('📷 Instagram button clicked:', vostcard.instagramURL);
                setShowInstagramModal(true);
              }}
              style={{
                background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(188,24,136,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                📷
              </div>
              Instagram
            </button>
          )}
        </div>
      )}

      {/* Map View and Add to Itinerary Buttons - Under action icons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5px',
        gap: '16px',
        borderBottom: '1px solid #eee'
      }}>
        {/* Map View button */}
        {(() => {
          const hasGeo = !!(vostcard?.latitude && vostcard?.longitude) || !!(vostcard?.geo?.latitude && vostcard?.geo?.longitude);
          console.log('🔍 VostcardDetailView Geo Debug:', {
            vostcardId: vostcard?.id,
            latitude: vostcard?.latitude,
            longitude: vostcard?.longitude,
            geo: vostcard?.geo,
            hasGeo
          });
          return hasGeo;
        })() && (
          <button
            onClick={handleMapClick}
            style={{
              backgroundColor: '#002B4D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: '120px',
              boxShadow: '0 2px 8px rgba(0,43,77,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001f35'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B4D'}
          >
            <FaMap size={14} style={{ marginRight: '8px' }} />
            Map View
          </button>
        )}

        {/* Add to Itinerary button */}
        {user && (
          <button
            onClick={async () => {
              if (!user) {
                alert('Please log in to add items to itineraries');
                return;
              }
              await loadUserItineraries();
              setShowItineraryModal(true);
            }}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: '120px',
              boxShadow: '0 2px 8px rgba(76,175,80,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            Add to Itinerary
          </button>
        )}
      </div>

      {/* Description Link - Always visible and locked */}
      <div style={{ 
        padding: '5px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid #eee'
      }}>
        <div
          onClick={() => setShowDescriptionModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007aff',
            fontSize: '22px',
            fontWeight: 'bold',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            display: 'inline-block'
          }}
        >
          Description
        </div>
      </div>

      {/* Worth Seeing Rating Widget - Always visible and locked */}
      <div style={{
        textAlign: 'center',
        padding: '5px',
        borderBottom: '1px solid #eee',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '15px'
        }}>
          Worth seeing?
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={async () => {
                if (!user) {
                  alert('Please log in to rate this vostcard');
                  return;
                }
                
                if (!vostcard?.id) {
                  alert('Unable to rate this vostcard');
                  return;
                }

                const newRating = userRating === star ? 0 : star;
                
                try {
                  if (newRating > 0) {
                    await RatingService.submitRating(vostcard.id, newRating);
                  } else {
                    // Remove rating when user clicks same star
                    await RatingService.removeRating(vostcard.id);
                  }
                  setUserRating(newRating);
                } catch (error) {
                  console.error('Error submitting rating:', error);
                  alert('Failed to submit rating. Please try again.');
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: star <= userRating ? '#ffd700' : '#ccc',
                padding: '4px',
                transition: 'color 0.2s ease'
              }}
            >
              <FaStar size={24} />
            </button>
          ))}
        </div>
      </div>

      {/* Removed green Add to Itinerary button from detail view per request */}

      {/* Itinerary Modal */}
      {showItineraryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowItineraryModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              textAlign: 'center'
            }}>
              Add to Itinerary
            </h3>
            
            {loadingItineraries ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>📋</div>
                <div>Loading itineraries...</div>
              </div>
            ) : existingItineraries.length > 0 ? (
              // Show both options when there are existing itineraries
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowItineraryModal(false);
                    setShowSelectItineraryModal(true);
                  }}
                  style={{
                    backgroundColor: '#007aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  📋 Add to Existing Itinerary
                </button>
                
                <button
                  onClick={() => {
                    setShowItineraryModal(false);
                    setShowCreateItineraryModal(true);
                  }}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  ➕ Create New Itinerary
                </button>
              </div>
            ) : (
              // Show only create option when no existing itineraries
              <div>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  You don't have any itineraries yet.
                </p>
                
                <button
                  onClick={() => {
                    setShowItineraryModal(false);
                    setShowCreateItineraryModal(true);
                  }}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    width: '100%'
                  }}
                >
                  ➕ Create New Itinerary
                </button>
              </div>
            )}
            
            <button
              onClick={() => setShowItineraryModal(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '12px',
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Select Existing Itinerary Modal */}
      {showSelectItineraryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => !addingToItinerary && setShowSelectItineraryModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              maxHeight: '70vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              textAlign: 'center'
            }}>
              Select Itinerary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {existingItineraries.map((itinerary) => (
                <button
                  key={itinerary.id}
                  onClick={() => handleAddToExistingItinerary(itinerary)}
                  disabled={addingToItinerary}
                  style={{
                    backgroundColor: addingToItinerary ? '#f0f0f0' : 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: addingToItinerary ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!addingToItinerary) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!addingToItinerary) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#333',
                    marginBottom: '4px'
                  }}>
                    {itinerary.name}
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{itinerary.items.length} item{itinerary.items.length !== 1 ? 's' : ''}</span>
                    {itinerary.isPublic && (
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}>
                        Public
                      </span>
                    )}
                  </div>
                  
                  {itinerary.description && (
                    <div style={{
                      fontSize: '12px',
                      color: '#888',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {itinerary.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowSelectItineraryModal(false)}
              disabled={addingToItinerary}
              style={{
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: addingToItinerary ? 'not-allowed' : 'pointer',
                marginTop: '12px',
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create New Itinerary Modal */}
      {showCreateItineraryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => !creatingItinerary && setShowCreateItineraryModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              textAlign: 'center'
            }}>
              Create New Itinerary
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '6px'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={newItineraryName}
                onChange={(e) => setNewItineraryName(e.target.value)}
                placeholder="Enter itinerary name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                maxLength={50}
                disabled={creatingItinerary}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '6px'
              }}>
                Description (optional)
              </label>
              <textarea
                value={newItineraryDescription}
                onChange={(e) => setNewItineraryDescription(e.target.value)}
                placeholder="Enter description"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                maxLength={200}
                disabled={creatingItinerary}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateItineraryModal(false)}
                disabled={creatingItinerary}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: creatingItinerary ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleCreateNewItinerary}
                disabled={creatingItinerary || !newItineraryName.trim()}
                style={{
                  backgroundColor: creatingItinerary || !newItineraryName.trim() ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: creatingItinerary || !newItineraryName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {creatingItinerary ? 'Creating...' : 'Create & Add'}
              </button>
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '12px',
              textAlign: 'center'
            }}>
              This vostcard will be added to your new itinerary
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        vostcardID={id!}
        vostcardTitle={vostcard?.title}
      />

      {/* Printed Directions */}
      {showDirections && directions.length > 0 && (
        <div className="printed-directions" style={{ margin: '20px' }}>
          <h3>Directions to {vostcard.title}</h3>
          <ol>
            {directions.map((instruction, index) => (
              <li key={index}>
                {instruction.text} 
                {instruction.distance && ` (${(instruction.distance / 1609.34).toFixed(1)} mi)`}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Map Modal */}
      {showMapModal && vostcard?.latitude && vostcard?.longitude && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowMapModal(false);
            setShowDirections(false);
            setShowDirectionsOverlay(false);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              height: '70vh',
              maxHeight: '600px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: '#07345c',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                {showDirections ? 'Directions to Location' : 
                  vostcard?.username === 'Jay Bond' ? 'Guide Location' : 
                  vostcard?.isOffer ? 'Offer Location' : 
                  'Vostcard Location'}
              </h3>
              <button
                onClick={() => {
                  setShowMapModal(false);
                  setShowDirections(false);
                  setShowDirectionsOverlay(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ height: 'calc(100% - 68px)', width: '100%' }}>
              <MapContainer
                center={[vostcard.latitude, vostcard.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={22}
                />
                <Marker
                  position={[vostcard.latitude, vostcard.longitude]}
                  icon={createIcons().vostcardIcon}
                />
                {/* Current location marker during live navigation */}
                {liveNavigation && currentLocation && (
                  <Marker
                    position={currentLocation}
                    icon={createIcons().currentLocationIcon}
                  />
                )}
                                  {showDirections && (
                    <RoutingMachine 
                      destination={[vostcard.latitude, vostcard.longitude]}
                      showDirections={true}
                      onDirectionsLoaded={(route) => {
                        console.log('🧭 Directions loaded callback triggered:', route);
                        if (route && route.length > 0) {
                          console.log('✅ Setting directions:', route);
                          setDirections(route);
                          setShowDirectionsOverlay(true);
                        } else {
                          console.log('❌ No directions found in route, route length:', route?.length);
                        }
                      }}
                    />
                  )}
                  {showDirections && (() => console.log('🗺️ RoutingMachine should be rendering...'))()}
              </MapContainer>
            </div>
            
            {/* Turn-by-Turn Directions Overlay */}
            {showDirectionsOverlay && directions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '80px',
                  left: '20px',
                  right: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '60%',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 1001
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with dismiss button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                    {liveNavigation ? '🧭 Live Navigation' : 'Turn-by-Turn Directions'}
                  </h4>
                  {liveNavigation && distanceToNext > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      📍 {(distanceToNext * 1000).toFixed(0)}m to destination
                    </div>
                  )}
                  <button
                    onClick={() => setShowDirectionsOverlay(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: '18px',
                      padding: '4px'
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
                
                {/* Directions list */}
                <div style={{ fontSize: '14px' }}>
                  {directions.map((direction, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: index === 0 ? '#f0f8ff' : 'transparent',
                        borderRadius: '6px',
                        border: index === 0 ? '1px solid #e3f2fd' : 'none'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#5856D6',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          marginRight: '10px',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: index === 0 ? 'bold' : 'normal', color: '#333' }}>
                          {direction.instruction || direction.text}
                        </div>
                        {direction.distance && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>📏 {NavigationService.formatDistance(direction.distance)}</span>
                            {direction.duration && (
                              <span>⏱️ {NavigationService.formatDuration(direction.duration)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Navigation Controls */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {!liveNavigation ? (
                    <button
                      onClick={() => {
                        console.log('🚀 Starting live navigation');
                        setLiveNavigation(true);
                        speakDirection('Starting navigation to your destination');
                      }}
                      style={{
                        backgroundColor: '#34C759',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      🚀 Start Live Navigation
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        console.log('🛑 Stopping live navigation');
                        setLiveNavigation(false);
                        window.speechSynthesis.cancel();
                      }}
                      style={{
                        backgroundColor: '#FF3B30',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      🛑 Stop Navigation
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      const lat = vostcard.latitude;
                      const lng = vostcard.longitude;
                      const title = encodeURIComponent(vostcard.title || 'Vostcard Location');
                      
                      // Try to detect device and open appropriate maps app
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      const isAndroid = /Android/.test(navigator.userAgent);
                      
                      let mapsUrl;
                      if (isIOS) {
                        mapsUrl = `maps://maps.apple.com/?q=${title}&ll=${lat},${lng}`;
                      } else if (isAndroid) {
                        mapsUrl = `geo:${lat},${lng}?q=${lat},${lng}(${title})`;
                      } else {
                        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                      }
                      
                      console.log('🗺️ Opening maps URL:', mapsUrl);
                      window.open(mapsUrl, '_blank');
                    }}
                    style={{
                      backgroundColor: '#007AFF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    📱 External Maps
                  </button>
                </div>
              </div>
            )}
            

            
            {/* Toggle directions button (when directions are loaded but overlay is hidden) */}
            {directions.length > 0 && !showDirectionsOverlay && (
              <button
                onClick={() => setShowDirectionsOverlay(true)}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  backgroundColor: '#5856D6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 1001
                }}
              >
                <FaDirections size={14} />
                Show Directions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Description</h3>
              <button
                onClick={() => setShowDescriptionModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#555' }}>
              {(() => {
                const description = vostcard.description || 'No description available.';
                // Auto-detect URLs and make them clickable
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = description.split(urlRegex);
                
                return parts.map((part: string, index: number) => {
                  if (urlRegex.test(part)) {
                    return (
                      <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#007aff',
                          textDecoration: 'underline',
                          wordBreak: 'break-all'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(part, '_blank');
                        }}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Photo Modal - Shows first photo when thumbnails are clicked */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              // ✅ High-quality full-screen rendering
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              filter: 'contrast(1.03) saturate(1.08) brightness(1.02)', // ✅ Enhanced quality
            } as React.CSSProperties}
            draggable={false}
          />
        </div>
      )}

      {/* MultiPhotoModal with AUTO-PLAY - 7 SECOND INTERVALS */}
      {showMultiPhotoModal && (
      <MultiPhotoModal
          photos={photoURLs}
        initialIndex={selectedPhotoIndex}
        isOpen={showMultiPhotoModal}
          onClose={() => {
            setShowMultiPhotoModal(false);
            // Stop audio when slideshow is closed
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          }}
          title={vostcard?.title}
          autoPlay={true}
          autoPlayInterval={7000}
          audioDuration={vostcard?.audioDuration}
      />
      )}

      {/* Share Options Modal */}
      <SharedOptionsModal
        isOpen={showSharedOptions}
        onClose={() => setShowSharedOptions(false)}
        item={{
          id: id || '',
          title: vostcard?.title,
          description: vostcard?.description,
          type: 'vostcard'
        }}
      />

      {/* Tip Dropdown Menu */}
      <TipDropdownMenu
        userProfile={userProfile}
        isVisible={showTipDropdown}
        onClose={() => setShowTipDropdown(false)}
        position={tipDropdownPosition}
      />

      {/* YouTube Modal */}
      {showYouTubeModal && vostcard?.youtubeURL && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowYouTubeModal(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '800px',
              aspectRatio: '16/9',
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowYouTubeModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              <FaTimes />
            </button>

            {/* YouTube Embed */}
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${vostcard.youtubeURL}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Instagram Modal */}
      {showInstagramModal && vostcard?.instagramURL && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowInstagramModal(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowInstagramModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              <FaTimes />
            </button>

            {/* Instagram Embed */}
            <iframe
              width="100%"
              height="600"
              src={`https://www.instagram.com/p/${vostcard.instagramURL}/embed`}
              title="Instagram post"
              frameBorder="0"
              scrolling="no"
              allowTransparency={true}
              style={{
                width: '100%',
                minHeight: '600px',
                border: 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VostcardDetailView; 