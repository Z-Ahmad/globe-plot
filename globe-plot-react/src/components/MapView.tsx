import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString, GeoJSON, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/map.css';
import { Event } from '@/types/trip';
import { getEventStyle } from '@/styles/eventStyles';
// import { Button } from './ui/button'; // Button is used by MapInteractionControls, not directly here anymore
// import { ArrowLeft, ArrowRight, Globe, RefreshCw } from 'lucide-react'; // Icons are used by MapInteractionControls
import { useTripContext } from '@/context/TripContext';
import { enrichAndSaveEventCoordinates } from '@/lib/mapboxService';
import toast from 'react-hot-toast';
import { useUserStore } from '@/stores/userStore';
import { getUserLastRefreshTimestamp, updateUserLastRefreshTimestamp } from '@/lib/firebaseService';
import { createRoot, Root } from 'react-dom/client';
import { format } from 'date-fns';
import { MapInteractionControls } from './MapInteractionControls'; // Import the new component
import { EventPopupContent } from './EventPopupContent'; // Import the new component

// You'll need to set your public Mapbox token in environment variables
// For development, create a .env.local file with VITE_MAPBOX_TOKEN=your_token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Custom style URL that includes our uploaded sprite icons
const CUSTOM_STYLE_URL = 'mapbox://styles/zaki-ahmad/cmaqtn8yr00fx01r25vdp46c4';

// Default map options
const DEFAULT_CENTER = [-74.5, 40]; // Roughly center of US
const DEFAULT_ZOOM = 1;
const REFRESH_COOLDOWN_PERIOD = 2 * 60 * 1000; // 2 minutes in milliseconds

// Helper to check if map is already reasonably focused on an event
const isMapPositionedForEvent = (
  mapInstance: mapboxgl.Map | null,
  eventCoords: [number, number] | null,
  targetZoom: number,
  zoomThreshold = 0.5, // How close the zoom needs to be
  distanceThreshold = 100 // How close the center needs to be (in meters)
): boolean => {
  if (!mapInstance || !eventCoords) return false;

  const currentCenter = mapInstance.getCenter();
  const currentZoom = mapInstance.getZoom();
  const eventLngLat = new mapboxgl.LngLat(eventCoords[0], eventCoords[1]);

  const distance = currentCenter.distanceTo(eventLngLat);
  
  return (
    distance < distanceThreshold &&
    Math.abs(currentZoom - targetZoom) < zoomThreshold
  );
};

// Interface for our popup with custom properties
interface MapboxPopupWithListeners extends mapboxgl.Popup {
  _associatedEventId?: string;
  _customMapboxCloseListener?: () => void;
  _customTitleClickListener?: (e: MouseEvent) => void;
  _customTitleClickElement?: HTMLElement;
}

interface MapViewProps {
  className?: string;
  isVisible: boolean;
  onEditEventRequest: (event: Event) => void;
}

export const MapView: React.FC<MapViewProps> = ({ className = "", isVisible, onEditEventRequest }) => {
  const { 
    events, 
    focusedEventId, 
    tripId, 
    setFocusedEventId, 
    setTripEvents
  } = useTripContext();
  const user = useUserStore((state) => state.user);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<MapboxPopupWithListeners | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNavigableEventIndex, setActiveNavigableEventIndex] = useState<number | null>(null);
  const [currentMapBounds, setCurrentMapBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const [isInitialFitDone, setIsInitialFitDone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoGeocoding, setIsAutoGeocoding] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isRefreshOnCooldown, setIsRefreshOnCooldown] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<string>('');
  
  const closeCurrentPopup = useCallback(() => {
    if (popupRef.current) {
      const popupToClose = popupRef.current;
      popupRef.current = null;

      // Remove custom title click listener
      if (popupToClose._customTitleClickListener && popupToClose._customTitleClickElement) {
        popupToClose._customTitleClickElement.removeEventListener('click', popupToClose._customTitleClickListener);
        popupToClose._customTitleClickElement = undefined;
        popupToClose._customTitleClickListener = undefined;
      }

      // Remove Mapbox 'close' event listener 
      if (popupToClose._customMapboxCloseListener) {
        popupToClose.off('close', popupToClose._customMapboxCloseListener);
        popupToClose._customMapboxCloseListener = undefined;
      }
      
      popupToClose.remove();
    }
  }, []);
  
  const showPopupForEvent = useCallback((event: Event, coordinates: [number, number]) => {
    if (!map.current || !event.id) return;

    closeCurrentPopup();

    const style = getEventStyle(event);
    // Use cssColor and cssBgColor from the style object for inline styling
    const cssColor = style.cssColor || 'var(--gray-700)'; // Fallback to default gray
    const cssBgColor = style.cssBgColor || 'var(--gray-50)'; // Fallback to default gray

    let locationDisplay = event.location?.name || '';
    if (!locationDisplay && event.location?.city) {
      locationDisplay = event.location.city;
      if (event.location.country) {
        locationDisplay += `, ${event.location.country}`;
      }
    } else if (!locationDisplay && event.location?.country) {
      locationDisplay = event.location.country;
    }
    if (event.category === 'travel') {
      const departureName = event.departure?.location?.name || event.departure?.location?.city || 'N/A';
      const arrivalName = event.arrival?.location?.name || event.arrival?.location?.city || 'N/A';
      locationDisplay = `${departureName} → ${arrivalName}`;
    } else if (event.category === 'accommodation') {
      locationDisplay = event.placeName || event.checkIn?.location?.name || event.checkIn?.location?.city || 'N/A';
    }

    const startDateFormatted = event.start ? format(new Date(event.start), 'MMM d, yyyy, h:mm a') : '';
    const endDateFormatted = event.start && event.end && event.end !== event.start ? format(new Date(event.end), 'h:mm a') : '';
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    const popupHTML = `
      <div class="event-popup-card" style="background-color: ${cssBgColor}; padding: 10px; border-radius: 8px; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: ${isMobile ? '90vw' : 'auto'}; min-width: ${isMobile ? 'none' : '260px'}; max-width: ${isMobile ? '280px' : '320px'};">
        <div style="display: flex; align-items: flex-start; gap: 8px;"> 
          <div style="flex-grow: 1; min-width: 0;">
            <h3 
              class="popup-event-title-button" 
              style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: ${cssColor}; cursor: pointer;"
              title="Edit this event"
            >
              ${event.title}
            </h3>
            ${locationDisplay ? `<p style="color: var(--gray-700); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${locationDisplay}">${locationDisplay}</p>` : ''}
            <div style="font-size: 12px; color: var(--gray-600); line-height: 1.4;">
              <p>
                <span style="text-transform: capitalize; font-weight: 500; color: ${cssColor};">${event.category}</span> (${event.type})
              </p>
              ${startDateFormatted ? 
                `<p>
                  ${startDateFormatted}
                  ${endDateFormatted ? ` - ${endDateFormatted}` : ''}
                </p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    const newPopup = new mapboxgl.Popup({ 
      closeButton: true, 
      closeOnClick: true, 
      offset: 25, 
      className: 'event-details-popup',
      maxWidth: '350px', // General upper limit for the popup instance
      anchor: isMobile ? 'bottom' : undefined // Default anchor for desktop, 'bottom' for mobile
    }) as MapboxPopupWithListeners;

    newPopup.setLngLat(coordinates)
      .setHTML(popupHTML)
      .addTo(map.current);

    newPopup._associatedEventId = event.id;

    // Add click listener for the title AFTER popup is added and element exists
    const popupElement = newPopup.getElement();
    const titleElement = popupElement?.querySelector('.popup-event-title-button') as HTMLElement | null;

    if (titleElement) {
      const titleClickListener = (e: MouseEvent) => {
        e.stopPropagation();
        if (onEditEventRequest) {
          onEditEventRequest(event);
        }
        setFocusedEventId(null); // Close popup
      };
      titleElement.addEventListener('click', titleClickListener);
      newPopup._customTitleClickListener = titleClickListener;
      newPopup._customTitleClickElement = titleElement;
    }

    const handleMapboxPopupClose = () => {
      setFocusedEventId(null);
      newPopup._customMapboxCloseListener = undefined; 
    };

    newPopup.on('close', handleMapboxPopupClose);
    newPopup._customMapboxCloseListener = handleMapboxPopupClose;
    
    popupRef.current = newPopup;
  }, [closeCurrentPopup, onEditEventRequest, setFocusedEventId, map]); // map added to deps

  const navigableEvents = useMemo(() => {
    const filtered = events
      .filter(event => {
        return (
          (event.category === 'travel' && event.departure?.location?.geolocation) ||
          (event.category === 'accommodation' && event.checkIn?.location?.geolocation) ||
          (event.location?.geolocation)
        );
      })
      .sort((a, b) => {
        if (!a.start || !b.start) return 0;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    
    // Only log when the number of navigable events changes significantly
    if (filtered.length !== events.filter(e => 
      (e.category === 'travel' && e.departure?.location?.geolocation) ||
      (e.category === 'accommodation' && e.checkIn?.location?.geolocation) ||
      (e.location?.geolocation)
    ).length) {
      console.log(`[MapView] navigableEvents updated: ${filtered.length} events with coordinates`);
    }
    
    return filtered;
  }, [events]);
  
  // Effect to manage the activeNavigableEventIndex based on focusedEventId and available navigableEvents
  useEffect(() => {
    if (navigableEvents.length === 0) {
      setActiveNavigableEventIndex(null); // No navigable events, no index
      return;
    }

    if (focusedEventId) {
      const index = navigableEvents.findIndex(event => event.id === focusedEventId);
      if (index >= 0) {
        setActiveNavigableEventIndex(index); // Event is focused and navigable, update index
      } else {
        // focusedEventId is set, but the event isn't in navigableEvents (e.g. lost coords / filtered out)
        // Keep activeNavigableEventIndex as is, unless it's now out of bounds for the new navigableEvents list.
        if (activeNavigableEventIndex !== null && activeNavigableEventIndex >= navigableEvents.length) {
          setActiveNavigableEventIndex(null); // Was out of bounds, reset
        }
      }
    } else {
      // focusedEventId is null (popup closed). 
      // Check if activeNavigableEventIndex is still valid for the current navigableEvents array
      if (activeNavigableEventIndex !== null) {
        if (activeNavigableEventIndex >= navigableEvents.length) {
          // Index is out of bounds, reset to null
          setActiveNavigableEventIndex(null);
        } else {
          // Index is still valid, but let's verify the event at that index still exists
          // This handles cases where the navigableEvents array changed due to new events being geocoded
          const eventAtIndex = navigableEvents[activeNavigableEventIndex];
          if (!eventAtIndex) {
            // Event at index doesn't exist, reset
            console.warn(`[MapView] No event found at activeNavigableEventIndex ${activeNavigableEventIndex}, resetting to null`);
            setActiveNavigableEventIndex(null);
          }
          // If event exists at the index, keep the current activeNavigableEventIndex
          // This maintains navigation state even when new events are added
        }
      }
    }
  }, [focusedEventId, navigableEvents]); // activeNavigableEventIndex is NOT in deps, it's what this effect SETS.

  const initializeMap = () => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    
    if (!mapContainer.current) return;
    
    if (!MAPBOX_TOKEN) {
      setError('Mapbox API token is missing. Please set the VITE_MAPBOX_TOKEN environment variable.');
      setLoading(false);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      setLoading(true);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: CUSTOM_STYLE_URL,
        center: DEFAULT_CENTER as [number, number],
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        maxZoom: 17,
        minZoom: 1,
        localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif",
        fadeDuration: 100,
        renderWorldCopies: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map style loaded');
        
        const availableImages = map.current?.listImages() || [];
        console.log(`Map loaded with ${availableImages.length} built-in sprites`);
        
        map.current!.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        map.current!.addSource('events', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        map.current!.addLayer({
          id: 'routes',
          type: 'line',
          source: 'routes',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'category'],
              'travel', '#1d4ed8',
              'accommodation', '#7e22ce',
              'experience', '#047857',
              'meal', '#c2410c',
              '#374151'
            ],
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [2, 1]
          }
        });
        
        map.current!.addLayer({
          id: 'event-markers',
          type: 'symbol',
          source: 'events',
          layout: {
            'icon-image': ['get', 'spriteId'],
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
            'text-optional': true
          }
        });
        
        map.current!.on('click', 'event-markers', (e) => {
          if (isFlying) return;

          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          if (!feature.properties || !feature.properties.id) return;
          
          const clickedEventId = feature.properties.id as string;
          setFocusedEventId(clickedEventId); 
        });
        
        map.current!.on('mouseenter', 'event-markers', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });
        
        map.current!.on('mouseleave', 'event-markers', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });

        map.current!.on('styleimagemissing', (e) => {
          const id = e.id;
          console.log(`Loading missing sprite: ${id}`);
          
          fetch(`/svgs/${id}.svg`)
            .then(response => {
              if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
              return response.text();
            })
            .then(svgText => {
              const img = new Image();
              img.onload = () => {
                if (!map.current) return;
                
                const canvas = document.createElement('canvas');
                canvas.width = 34;
                canvas.height = 34;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                  ctx.drawImage(img, 0, 0, 34, 34);
                  
                  const imageData = ctx.getImageData(0, 0, 34, 34);
                  map.current.addImage(id, { 
                    width: 34, 
                    height: 34, 
                    data: new Uint8Array(imageData.data.buffer) 
                  });
                }
              };
              
              img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
            })
            .catch(error => {
              console.warn(`Could not load missing sprite ${id}, using fallback circle`, error);
              createFallbackCircle(id);
            });
        });

        console.log('Map loaded and ready for markers');
        
        setLoading(false);
        
        addMarkersToMap();
        
        preloadSprites();
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please try again later.');
      setLoading(false);
    }
  };
  
  const addMarkersToMap = () => {
    if (!map.current || loading || error) return;
    
    console.log('Adding markers to map...');
    
    const validCoordinates: [number, number][] = [];
    const validEvents: { id: string; coordinates: [number, number]; category: string }[] = [];

    const features: Feature<Point>[] = [];
    
    events.forEach(event => {
      let coordinates: [number, number] | null = null;
      let locationName = '';
      let city = '';
      let country = '';
      
      if (event.category === 'travel' && event.departure?.location?.geolocation) {
        coordinates = [
          event.departure.location.geolocation.lng,
          event.departure.location.geolocation.lat
        ];
        locationName = event.departure.location.name || `${event.departure.location.city}, ${event.departure.location.country}`;
        city = event.departure.location.city || '';
        country = event.departure.location.country || '';
      } else if (event.category === 'accommodation' && event.checkIn?.location?.geolocation) {
        coordinates = [
          event.checkIn.location.geolocation.lng,
          event.checkIn.location.geolocation.lat
        ];
        locationName = event.placeName || event.checkIn.location.name || '';
        city = event.checkIn.location.city || '';
        country = event.checkIn.location.country || '';
      } else if (event.location?.geolocation) {
        coordinates = [
          event.location.geolocation.lng,
          event.location.geolocation.lat
        ];
        locationName = event.location.name || '';
        city = event.location.city || '';
        country = event.location.country || '';
      }

      if (coordinates && coordinates[0] && coordinates[1]) {
        validCoordinates.push(coordinates);
        validEvents.push({
          id: event.id,
          coordinates: coordinates,
          category: event.category
        });

        features.push({
          type: 'Feature',
          id: event.id,
          properties: {
            id: event.id,
            title: event.title,
            category: event.category,
            type: event.type,
            sprite: `${event.category}/${event.type}`,
            spriteId: `styled-${event.category}-${event.type}`,
            locationName: locationName,
            city: city,
            country: country,
            start: event.start,
            end: event.end
          },
          geometry: {
            type: 'Point',
            coordinates: coordinates
          }
        });
      }
    });

    if (map.current.getSource('events')) {
      (map.current.getSource('events') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: features
      });
    }

    if (validEvents.length > 1 && map.current) {
      const sortedEvents = validEvents
        .map(event => ({ 
          ...event, 
          start: events.find(e => e.id === event.id)?.start || '' 
        }))
        .filter(event => event.start)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      const lineFeatures: Feature<LineString>[] = [];
      
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const from = sortedEvents[i];
        const to = sortedEvents[i + 1];
        
        lineFeatures.push({
          type: 'Feature',
          properties: {
            category: from.category
          },
          geometry: {
            type: 'LineString',
            coordinates: [from.coordinates, to.coordinates]
          }
        } as Feature<LineString>);
      }
      
      if (map.current.getSource('routes')) {
        (map.current.getSource('routes') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: lineFeatures
        });
      }
    }

    if (validCoordinates.length > 0 && !isInitialFitDone) {
      const bounds = validCoordinates.reduce(
        (bounds, coord) => bounds.extend(coord as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(validCoordinates[0], validCoordinates[0])
      );

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        duration: 1000
      });
      setIsInitialFitDone(true);
    }
  };
  
  useEffect(() => {
    if (isVisible && !mapInitialized && mapContainer.current) {
      initializeMap();
      setMapInitialized(true);
    }
  }, [isVisible, mapInitialized, initializeMap]);

  useEffect(() => {
    if (isVisible && map.current) {
      const timer = setTimeout(() => {
        map.current?.resize();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isVisible, map]);

  useEffect(() => {
    if (!loading && !error && map.current && focusedEventId && navigableEvents.length > 0 && activeNavigableEventIndex !== null) {
    }
  }, [loading, error, focusedEventId, navigableEvents, activeNavigableEventIndex, map]);
  
  useEffect(() => {
    if (map.current && !loading && !error) {
      const timer = setTimeout(() => {
        addMarkersToMap();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [events, loading, error]);

  useEffect(() => {
    if (!isVisible || !mapInitialized || !map.current || loading || error) {
      return;
    }

    if (!focusedEventId) {
      closeCurrentPopup();
      return;
    }

    const targetEvent = events.find(e => e.id === focusedEventId);

    if (!targetEvent) {
      closeCurrentPopup();
      return;
    }

    let currentEventCoordinates: [number, number] | null = null;
    if (targetEvent.category === 'travel' && targetEvent.departure?.location?.geolocation) {
      currentEventCoordinates = [targetEvent.departure.location.geolocation.lng, targetEvent.departure.location.geolocation.lat];
    } else if (targetEvent.category === 'accommodation' && targetEvent.checkIn?.location?.geolocation) {
      currentEventCoordinates = [targetEvent.checkIn.location.geolocation.lng, targetEvent.checkIn.location.geolocation.lat];
    } else if (targetEvent.location?.geolocation) {
      currentEventCoordinates = [targetEvent.location.geolocation.lng, targetEvent.location.geolocation.lat];
    }

    if (!currentEventCoordinates) {
      closeCurrentPopup();
      return;
    }

    if (
      popupRef.current &&
      popupRef.current.isOpen() &&
      popupRef.current._associatedEventId === focusedEventId
    ) {
      const popupLngLat = popupRef.current.getLngLat();
      if (popupLngLat.lng === currentEventCoordinates[0] && popupLngLat.lat === currentEventCoordinates[1]) {
        return;
      }
      closeCurrentPopup(); 
    } else if (popupRef.current && popupRef.current.isOpen()) {
      closeCurrentPopup();
    }
    
    const DESIRED_FOCUS_ZOOM = 14;
    if (!isMapPositionedForEvent(map.current, currentEventCoordinates, DESIRED_FOCUS_ZOOM)) {
      setIsFlying(true);
      map.current.flyTo({
        center: currentEventCoordinates as [number, number],
        zoom: DESIRED_FOCUS_ZOOM,
        speed: 1.5, 
        curve: 1,
        essential: true
      });

      const onMoveEnd = () => {
        setIsFlying(false);
        if (map.current && focusedEventId === targetEvent.id) {
          if (!popupRef.current || !popupRef.current.isOpen() || popupRef.current._associatedEventId !== targetEvent.id) {
            showPopupForEvent(targetEvent, currentEventCoordinates as [number, number]);
          }
        }
      };
      map.current.once('moveend', onMoveEnd);

      return () => {
        if (map.current) {
          map.current.off('moveend', onMoveEnd);
        }
        setIsFlying(false);
      };
    } else {
      setIsFlying(false); 
      if (!popupRef.current || !popupRef.current.isOpen() || popupRef.current._associatedEventId !== targetEvent.id) {
         showPopupForEvent(targetEvent, currentEventCoordinates as [number, number]);
      }
    }
  }, [
    focusedEventId, 
    events,
    isVisible, 
    mapInitialized, 
    map, 
    loading, 
    error, 
    closeCurrentPopup, 
    showPopupForEvent,
    setFocusedEventId
  ]);

  const goToNextEvent = () => {
    if (navigableEvents.length === 0) return;
    
    let nextIndex;
    if (activeNavigableEventIndex === null) {
      nextIndex = 0; // If no current navigation point, start from the beginning
    } else {
      nextIndex = (activeNavigableEventIndex + 1) % navigableEvents.length;
    }
    
    const nextEvent = navigableEvents[nextIndex];
    if (nextEvent && nextEvent.id) {
      // Setting focusedEventId will trigger the useEffect above to update activeNavigableEventIndex
      setFocusedEventId(nextEvent.id);
    }
  };
  
  const goToPrevEvent = () => {
    if (navigableEvents.length === 0) return;

    let prevIndex;
    if (activeNavigableEventIndex === null) {
      prevIndex = navigableEvents.length - 1; // If no current navigation point, go to the end
    } else {
      prevIndex = (activeNavigableEventIndex - 1 + navigableEvents.length) % navigableEvents.length;
    }
      
    const prevEvent = navigableEvents[prevIndex];
    if (prevEvent && prevEvent.id) {
      setFocusedEventId(prevEvent.id);
    }
  };
  
  const preloadSprites = () => {
    if (!map.current) return;
    
    const sprites = [
      'styled-travel-flight',
      'styled-travel-train',
      'styled-travel-car',
      'styled-travel-boat',
      'styled-travel-bus',
      'styled-travel-other',
      'styled-accommodation-hotel',
      'styled-accommodation-hostel',
      'styled-accommodation-airbnb',
      'styled-accommodation-other',
      'styled-experience-activity',
      'styled-experience-tour',
      'styled-experience-museum',
      'styled-experience-concert',
      'styled-experience-other',
      'styled-meal-restaurant',
      'styled-meal-other',
      'styled-travel',
      'styled-accommodation',
      'styled-experience',
      'styled-meal',
      'styled-default'
    ];
    
    const existingImages = map.current.listImages();
    const missingSprites = sprites.filter(sprite => !existingImages.includes(sprite));
    
    if (missingSprites.length === 0) {
      console.log('All sprites already loaded in the map');
      return;
    }
    
    console.log(`Loading ${missingSprites.length} custom map sprites`);
    
    missingSprites.forEach(sprite => {
      fetch(`/svgs/${sprite}.svg`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
          return response.text();
        })
        .then(svgText => {
          const img = new Image();
          img.onload = () => {
            if (!map.current) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = 34;
            canvas.height = 34;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(img, 0, 0, 34, 34);
              
              const imageData = ctx.getImageData(0, 0, 34, 34);
              map.current.addImage(sprite, { 
                width: 34, 
                height: 34, 
                data: new Uint8Array(imageData.data.buffer) 
              });
            }
          };
          
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
        })
        .catch(error => {
          console.warn(`Could not load sprite ${sprite}, falling back to default circle`, error);
          createFallbackCircle(sprite);
        });
    });
  };
  
  const createFallbackCircle = (id: string) => {
    if (!map.current) return;
    
    if (map.current.hasImage(id)) return;
    
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
      
      if (id.includes('travel')) {
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0369a1';
      } else if (id.includes('accommodation')) {
        ctx.fillStyle = '#fae8ff';
        ctx.strokeStyle = '#be123c';
      } else if (id.includes('experience')) {
        ctx.fillStyle = '#ecfdf5';
        ctx.strokeStyle = '#15803d';
      } else if (id.includes('meal')) {
        ctx.fillStyle = '#ffedd5';
        ctx.strokeStyle = '#ea580c';
      } else {
        ctx.fillStyle = '#f9fafb';
        ctx.strokeStyle = '#374151';
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      
      const imageData = ctx.getImageData(0, 0, size, size);
      map.current.addImage(id, { 
        width: size, 
        height: size, 
        data: new Uint8Array(imageData.data.buffer) 
      });
      console.log(`Created fallback circle for: ${id}`);
    }
  };

  useEffect(() => {
    if (!isVisible || !mapInitialized || !map.current) return;

    const autoGeocodeEvents = async () => {
      if (!tripId || !events || events.length === 0) {
        return;
      }

      const eventsMissingCoords = events.filter(event => {
        if (event.category === 'travel') {
          return !event.departure?.location?.geolocation;
        } else if (event.category === 'accommodation') {
          return !event.checkIn?.location?.geolocation;
        } else if (event.category === 'experience' || event.category === 'meal') {
          return !event.location?.geolocation;
        }
        return false;
      });

      if (eventsMissingCoords.length > 0) {
        console.log(`[MapView] ${eventsMissingCoords.length} events require initial automatic geocoding.`);
        setIsAutoGeocoding(true);
        try {
          await enrichAndSaveEventCoordinates(tripId, events, false);
          toast.success(`Successfully geocoded ${eventsMissingCoords.length} locations.`);
        } catch (error) {
          console.error("[MapView] Error during automatic geocoding:", error);
          toast.error("Failed to automatically geocode some locations.");
        } finally {
          setIsAutoGeocoding(false);
        }
      } else {
        console.log("[MapView] Automatic geocoding skipped, all relevant events have coordinates.");
      }
    };

    autoGeocodeEvents();
  }, [tripId, events]);

  const checkRefreshCooldown = useCallback(async (currentUserId?: string) => {
    if (!currentUserId) {
      setIsRefreshOnCooldown(false);
      setCooldownEndTime(null);
      setCooldownRemaining('');
      return false;
    }

    const lastRefresh = await getUserLastRefreshTimestamp(currentUserId);
    if (lastRefresh) {
      const now = Date.now();
      const endTime = lastRefresh + REFRESH_COOLDOWN_PERIOD;
      if (now < endTime) {
        setIsRefreshOnCooldown(true);
        setCooldownEndTime(endTime);
        return true;
      }
    }
    setIsRefreshOnCooldown(false);
    setCooldownEndTime(null);
    setCooldownRemaining('');
    return false;
  }, []);

  useEffect(() => {
    if (isVisible && mapInitialized && user?.uid) {
      checkRefreshCooldown(user.uid);
    }
  }, [isVisible, mapInitialized, user, checkRefreshCooldown]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isRefreshOnCooldown && cooldownEndTime) {
      const updateRemaining = () => {
        const now = Date.now();
        const remainingMs = Math.max(0, cooldownEndTime - now);
        if (remainingMs === 0) {
          setIsRefreshOnCooldown(false);
          setCooldownEndTime(null);
          setCooldownRemaining('');
          if (intervalId) clearInterval(intervalId);
          return;
        }
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setCooldownRemaining(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
      };
      updateRemaining();
      intervalId = setInterval(updateRemaining, 1000);
    } else {
      setCooldownRemaining('');
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRefreshOnCooldown, cooldownEndTime]);

  const refreshCoordinates = async () => {
    if (!user || !user.uid) {
      toast.error("You must be signed in to refresh coordinates.");
      return;
    }
    if (!tripId) {
      toast.error("No trip ID available for refreshing coordinates.");
      return;
    }

    const isOnCooldown = await checkRefreshCooldown(user.uid);
    if (isOnCooldown && cooldownEndTime) {
      const now = Date.now();
      const remainingMs = Math.max(0, cooldownEndTime - now);
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      toast.error(`Please wait ${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s before refreshing again.`);
      return;
    }
    
    console.log("[MapView] Refresh button clicked, forcing coordinate update for all events.");
    setIsRefreshing(true);
    try {
      const locallyUpdatedEvents = await enrichAndSaveEventCoordinates(tripId, events, true);
      
      setTripEvents(locallyUpdatedEvents);
      toast.success(`Coordinates refreshed for ${locallyUpdatedEvents.length} events.`);

      if (map.current) {
        addMarkersToMap(); 
      }

      if (focusedEventId) {
        const stillFocusedEvent = locallyUpdatedEvents.find(e => e.id === focusedEventId);
        if (!stillFocusedEvent || 
            (!(stillFocusedEvent.location?.geolocation) && 
             !(stillFocusedEvent.category === 'travel' && stillFocusedEvent.departure?.location?.geolocation) && 
             !(stillFocusedEvent.category === 'accommodation' && stillFocusedEvent.checkIn?.location?.geolocation)) ) {
          setFocusedEventId(null);
        }
      }

    } catch (error) {
      console.error("[MapView] Error refreshing coordinates:", error);
      toast.error("Failed to refresh coordinates for all locations.");
    } finally {
      await updateUserLastRefreshTimestamp(user.uid);
      await checkRefreshCooldown(user.uid); 
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-[400px] bg-muted ${className}`}>
        <p className="text-destructive font-medium mb-2">{error}</p>
        
        {error.includes('API token') && (
          <div className="max-w-md text-sm text-muted-foreground mb-4 px-6 text-center">
            <p className="mb-2">To use the map feature, please create a <code className="px-1 py-0.5 bg-muted-foreground/10 rounded">.env.local</code> file in the project root with your Mapbox API token:</p>
            <pre className="bg-muted-foreground/10 p-2 rounded text-xs overflow-x-auto whitespace-pre">
              VITE_MAPBOX_TOKEN=your_mapbox_token_here
            </pre>
            <p className="mt-2">
              Get your free token at{' '}
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg map-container">
        {!loading && events.length > 0 && (
          <MapInteractionControls 
            onPrevEvent={goToPrevEvent}
            onNextEvent={goToNextEvent}
            onViewAllLocations={() => {
              if (map.current) {
                closeCurrentPopup();
                setFocusedEventId(null);

                const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
                if (source && typeof source.setData === 'function') {
                    const data = source._data as GeoJSON.FeatureCollection<Point>;
                    if (data && data.features && data.features.length > 0) {
                        const coordinates = data.features
                            .map(f => f.geometry && f.geometry.type === 'Point' ? f.geometry.coordinates as [number, number] : null)
                            .filter(c => c !== null) as [number, number][];
                        
                        if (coordinates.length > 0) {
                            const bounds = coordinates.reduce(
                                (acc, coord) => acc.extend(coord as mapboxgl.LngLatLike),
                                new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
                            );
                            map.current.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1000 });
                        } else {
                            map.current.flyTo({
                                center: DEFAULT_CENTER as [number, number],
                                zoom: DEFAULT_ZOOM,
                                duration: 1000
                            });
                        }
                    } else {
                        map.current.flyTo({
                            center: DEFAULT_CENTER as [number, number],
                            zoom: DEFAULT_ZOOM,
                            duration: 1000
                        });
                    }
                } else {
                    map.current.flyTo({
                        center: DEFAULT_CENTER as [number, number],
                        zoom: DEFAULT_ZOOM,
                        duration: 1000
                    });
                }
              }
            }}
            onRefreshCoordinates={refreshCoordinates}
            isNavigationDisabled={navigableEvents.length === 0}
            isRefreshing={isRefreshing || isAutoGeocoding}
            isRefreshOnCooldown={isRefreshOnCooldown}
            cooldownRemaining={cooldownRemaining}
          />
        )}
      </div>
      
      {(loading || isRefreshing || isAutoGeocoding) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-sm font-medium">
            {isRefreshing 
              ? "Refreshing all coordinates..." 
              : isAutoGeocoding 
                ? "Geocoding locations..."
                : isFlying 
                  ? "Moving to location..."
                  : "Loading map..."}
          </span>
        </div>
      )}
    </div>
  );
}; 