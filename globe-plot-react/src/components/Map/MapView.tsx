import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/map.css';
import { Event } from '@/types/trip';
// import { Button } from './ui/button'; // Button is used by MapInteractionControls, not directly here anymore
// import { ArrowLeft, ArrowRight, Globe, RefreshCw } from 'lucide-react'; // Icons are used by MapInteractionControls
import { useTripContext } from '@/context/TripContext';
import { enrichAndSaveEventCoordinates } from '@/lib/mapboxService';
import toast from 'react-hot-toast';
import { useUserStore } from '@/stores/userStore';
import { getUserLastRefreshTimestamp, updateUserLastRefreshTimestamp } from '@/lib/firebaseService';
import { MapInteractionControls } from './MapInteractionControls'; // Import the new component
import { buildMapFeatureData, MarkerDataIndex } from './mapFeatureBuilder';
import { useNavigableEventNavigation } from './hooks/useNavigableEventNavigation';
import { useMapPopup } from './hooks/useMapPopup';
import { useMapSprites } from './hooks/useMapSprites';
import { countEventsMissingCoordinates, getMappableCoordinates, hasMappableCoordinates } from './mapEventUtils';

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
  const markerDataIndexRef = useRef<MarkerDataIndex>({
    coordinatesByEventId: {},
    clusteredEventIds: new Set<string>(),
    allCoordinates: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialFitDone, setIsInitialFitDone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoGeocoding, setIsAutoGeocoding] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isRefreshOnCooldown, setIsRefreshOnCooldown] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<string>('');

  const { navigableEvents, goToNextEvent, goToPrevEvent } = useNavigableEventNavigation({
    events,
    focusedEventId,
    setFocusedEventId,
  });
  const { closeCurrentPopup, showPopupForEvent, getPopupState } = useMapPopup({
    mapRef: map,
    onEditEventRequest,
    setFocusedEventId,
  });
  const { preloadSprites, registerStyleImageMissingHandler } = useMapSprites(map);
  
  const isEventInCluster = useCallback((eventId: string): boolean => {
    return markerDataIndexRef.current.clusteredEventIds.has(eventId);
  }, []);

  const getMarkerCoordinatesForEvent = useCallback((eventId: string): [number, number] | null => {
    return markerDataIndexRef.current.coordinatesByEventId[eventId] || null;
  }, []);

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

        registerStyleImageMissingHandler();

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
    const builtData = buildMapFeatureData(events);
    markerDataIndexRef.current = builtData.markerDataIndex;

    if (map.current.getSource('events')) {
      (map.current.getSource('events') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: builtData.eventFeatures
      });
    }

    if (map.current.getSource('routes')) {
      (map.current.getSource('routes') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: builtData.routeFeatures
      });
    }

    if (builtData.markerDataIndex.allCoordinates.length > 0 && !isInitialFitDone && !focusedEventId) {
      const bounds = builtData.markerDataIndex.allCoordinates.reduce(
        (bounds, coord) => bounds.extend(coord as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(
          builtData.markerDataIndex.allCoordinates[0],
          builtData.markerDataIndex.allCoordinates[0]
        )
      );

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        duration: 800
      });
      setIsInitialFitDone(true);
    } else if (builtData.markerDataIndex.allCoordinates.length > 0 && !isInitialFitDone && focusedEventId) {
      // If there's a focused event, skip initial fit but mark as done to prevent future conflicts
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
    if (map.current && !loading && !error) {
      const timer = setTimeout(() => {
        addMarkersToMap();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [events, loading, error, focusedEventId]);

  useEffect(() => {
    if (!isVisible || !mapInitialized || !map.current) {
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

    // Get the actual marker coordinates (which may be offset due to clustering)
    const currentEventCoordinates = getMarkerCoordinatesForEvent(focusedEventId);

    // Fall back to original event coordinates if marker coordinates aren't available yet
    let coordinatesToUse: [number, number] | null = currentEventCoordinates;
    
    if (!coordinatesToUse) {
      coordinatesToUse = getMappableCoordinates(targetEvent);
    }

    if (!coordinatesToUse) {
      closeCurrentPopup();
      return;
    }

    // Check if this event is part of a cluster to determine appropriate zoom level
    // Only do cluster detection if we have the actual marker coordinates
    const isInCluster = currentEventCoordinates ? isEventInCluster(focusedEventId) : false;
    const DESIRED_FOCUS_ZOOM = isInCluster ? 18 : 14; // Higher zoom for clustered events

    // Check if we need to close an existing popup for a different event
    const popupState = getPopupState();
    if (popupState.isOpen) {
      if (popupState.eventId !== focusedEventId) {
        closeCurrentPopup();
      } else if (
        popupState.coordinates[0] === coordinatesToUse[0] &&
        popupState.coordinates[1] === coordinatesToUse[1]
      ) {
        return;
      } else {
        closeCurrentPopup();
      }
    }
    
    if (!isMapPositionedForEvent(map.current, coordinatesToUse, DESIRED_FOCUS_ZOOM)) {
      setIsFlying(true);
      map.current.flyTo({
        center: coordinatesToUse as [number, number],
        zoom: DESIRED_FOCUS_ZOOM,
        speed: 2.5,
        essential: true
      });

      const onMoveEnd = () => {
        setIsFlying(false);
        if (map.current && focusedEventId === targetEvent.id) {
          // Always show popup after map movement, regardless of current popup state
          showPopupForEvent(targetEvent, coordinatesToUse as [number, number]);
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
      // Map is already positioned correctly - show popup immediately
      // Use a small timeout to ensure any previous popup close operations have completed
      setTimeout(() => {
        if (focusedEventId === targetEvent.id) {
          showPopupForEvent(targetEvent, coordinatesToUse as [number, number]);
        }
      }, 10);
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
    getPopupState,
    setFocusedEventId,
    getMarkerCoordinatesForEvent,
    isEventInCluster,
    isMapPositionedForEvent
  ]);

  useEffect(() => {
    if (!isVisible || !mapInitialized || !map.current) return;

    const autoGeocodeEvents = async () => {
      if (!tripId || !events || events.length === 0) {
        return;
      }

      const missingCoordsCount = countEventsMissingCoordinates(events);

      if (missingCoordsCount > 0) {
        console.log(`[MapView] ${missingCoordsCount} events require initial automatic geocoding.`);
        setIsAutoGeocoding(true);
        try {
          await enrichAndSaveEventCoordinates(tripId, events, false);
          toast.success(`Successfully geocoded ${missingCoordsCount} locations.`);
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
        if (!stillFocusedEvent || !hasMappableCoordinates(stillFocusedEvent)) {
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
                const coordinates = markerDataIndexRef.current.allCoordinates;

                if (coordinates.length > 0) {
                  const bounds = coordinates.reduce(
                    (acc, coord) => acc.extend(coord as mapboxgl.LngLatLike),
                    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
                  );
                  map.current.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
                } else {
                  map.current.flyTo({
                    center: DEFAULT_CENTER as [number, number],
                    zoom: DEFAULT_ZOOM,
                    duration: 800
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