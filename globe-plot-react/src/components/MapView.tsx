import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString, GeoJSON } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/map.css';
import { Event } from '@/types/trip';
import { getEventStyle } from '@/styles/eventStyles';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Globe, Pin } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

// You'll need to set your public Mapbox token in environment variables
// For development, create a .env.local file with VITE_MAPBOX_TOKEN=your_token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Default map options
const DEFAULT_CENTER = [-74.5, 40]; // Roughly center of US
const DEFAULT_ZOOM = 1;

interface MapViewProps {
  events: Event[];
  className?: string;
  focusEventId?: string; // ID of event to focus on
}

export const MapView: React.FC<MapViewProps> = ({ events, className = "", focusEventId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState<number | null>(null);
  
  // Sort the events chronologically
  const sortedEvents = React.useMemo(() => {
    return [...events]
      .filter(event => event.start && 
        ((event.category === 'travel' && event.departure?.location?.geolocation) ||
         (event.category === 'accommodation' && event.checkIn?.location?.geolocation) ||
         event.location?.geolocation))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return aTime - bTime;
      });
  }, [events]);
  
  // Update the current event index when focusEventId changes
  useEffect(() => {
    if (focusEventId && sortedEvents.length > 0) {
      const index = sortedEvents.findIndex(event => event.id === focusEventId);
      if (index >= 0) {
        setCurrentEventIndex(index);
      }
    }
  }, [focusEventId, sortedEvents]);

  // Function to reload the map if needed
  const initializeMap = () => {
    // Clean up existing map first
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    
    if (!mapContainer.current) return;
    
    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      setError('Mapbox API token is missing. Please set the VITE_MAPBOX_TOKEN environment variable.');
      setLoading(false);
      return;
    }

    // Set the Mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      setLoading(true);
      
      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // You can use different styles
        center: DEFAULT_CENTER as [number, number], // Type assertion to ensure correct type
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
      });

      // Add navigation controls (zoom, rotate)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Wait for map to load before adding markers
      map.current.on('load', () => {
        // Add a source for route lines
        map.current!.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        // Add a layer for route lines
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
              '#374151' // default
            ],
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [2, 1]
          }
        });

        console.log('Map loaded and ready for markers');
        
        setLoading(false);
        
        // Add markers immediately after the map is loaded
        addMarkersToMap();
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please try again later.');
      setLoading(false);
    }
  };
  
  // Function to add markers to the map
  const addMarkersToMap = () => {
    if (!map.current || loading || error) return;
    
    console.log('Adding markers to map...');
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Store valid coordinates for bounds calculation
    const validCoordinates: [number, number][] = [];
    const validEvents: { id: string; coordinates: [number, number]; category: string }[] = [];

    // Add markers for each event with coordinates
    events.forEach(event => {
      let coordinates: [number, number] | null = null;
      let locationName = '';
      
      // Extract coordinates and name based on event category
      if (event.category === 'travel' && event.departure?.location?.geolocation) {
        coordinates = [
          event.departure.location.geolocation.lng,
          event.departure.location.geolocation.lat
        ];
        locationName = event.departure.location.name || `${event.departure.location.city}, ${event.departure.location.country}`;
      } else if (event.category === 'accommodation' && event.checkIn?.location?.geolocation) {
        coordinates = [
          event.checkIn.location.geolocation.lng,
          event.checkIn.location.geolocation.lat
        ];
        locationName = event.placeName || event.checkIn.location.name || '';
      } else if (event.location?.geolocation) {
        coordinates = [
          event.location.geolocation.lng,
          event.location.geolocation.lat
        ];
        locationName = event.location.name || '';
      }

      // If we have coordinates, add a marker
      if (coordinates && coordinates[0] && coordinates[1]) {
        // Valid coordinates for bounds calculation
        validCoordinates.push(coordinates);
        validEvents.push({
          id: event.id,
          coordinates: coordinates,
          category: event.category
        });

        // Log coordinates being used for debugging
        console.log(`Creating marker for ${event.title}:`, {
          id: event.id,
          coordinates,
          lng: coordinates[0],
          lat: coordinates[1]
        });
        
        // Extract color and icon information
        const { color, icon: IconComponent, bgColor } = getEventStyle(event);
        const iconColorValue = color.replace('text-', '');
        const bgColorValue = bgColor.replace('bg-', '');
         
        // Create a custom HTML element for the marker
        const el = document.createElement('div');
        el.className = 'event-marker';
        el.id = `marker-${event.id}`;
        
        // Apply inline styles to marker
        el.style.backgroundColor = `var(--${bgColorValue})`;
        el.style.border = `2px solid var(--${iconColorValue})`;
        
        // Use the Lucide icon directly
        const iconSvg = ReactDOMServer.renderToString(
          <IconComponent 
            size={18} 
            color={`var(--${iconColorValue})`} 
            strokeWidth={2}
          />
        );
        
        // Set the icon as innerHTML
        el.innerHTML = iconSvg;
        
        // First clear any existing marker at this position
        if (markersRef.current[event.id]) {
          markersRef.current[event.id].remove();
        }
        
        try {
          // Create a simple marker with minimal customization
          const marker = new mapboxgl.Marker(el)
            .setLngLat(coordinates)
            .setPopup(
              new mapboxgl.Popup({ 
                offset: 25,
                closeButton: false,
                maxWidth: '300px'
              })
                .setHTML(`
                  <div style="padding:4px 0;">
                    <h3 style="font-weight:bold;margin-bottom:6px;font-size:16px;">${event.title}</h3>
                    <p style="margin-bottom:4px;font-weight:500;">${locationName}</p>
                    ${event.location?.city && event.location?.country ? 
                      `<p style="margin-bottom:8px;font-size:13px;">${event.location.city}, ${event.location.country}</p>` : ''}
                    
                    <div style="display:flex;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
                      <span style="font-size:12px;color:#666;text-transform:capitalize;padding:2px 6px;background:#f5f5f5;border-radius:4px;margin-right:8px;">
                        ${event.category} / ${event.type}
                      </span>
                      
                      ${event.start ? `
                      <span style="font-size:12px;color:#666;">
                        ${new Date(event.start).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>` : ''}
                    </div>
                  </div>
                `)
            );
          
          // Now add the marker to the map
          marker.addTo(map.current!);
          
          // Verify the marker position in the console
          const position = marker.getLngLat();
          console.log(`Marker position verified: ${position.lng}, ${position.lat}`);
          
          // Store reference to marker by event ID for later use
          markersRef.current[event.id] = marker;
        } catch (err) {
          console.error('Error creating marker:', err);
        }
      }
    });

    // Draw arcs between events
    if (validEvents.length > 1 && map.current) {
      // Filter out events with valid chronological order
      const sortedEvents = validEvents
        .map(event => ({ 
          ...event, 
          start: events.find(e => e.id === event.id)?.start || '' 
        }))
        .filter(event => event.start)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      // Create features for the route lines
      const features: Feature<LineString>[] = [];
      
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const from = sortedEvents[i];
        const to = sortedEvents[i + 1];
        
        features.push({
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
      
      // Update the routes source
      if (map.current.getSource('routes')) {
        (map.current.getSource('routes') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: features
        });
      }
    }

    // Fit map to bounds if we have coordinates
    if (validCoordinates.length > 0) {
      const bounds = validCoordinates.reduce(
        (bounds, coord) => bounds.extend(coord as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(validCoordinates[0], validCoordinates[0])
      );

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        duration: 1000
      });
    }
  };
  
  // Initialize map on component mount
  useEffect(() => {
    initializeMap();
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  // Add markers and routes when events change or map loads
  useEffect(() => {
    if (map.current && !loading && !error) {
      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        addMarkersToMap();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [events, loading, error]);

  // Effect to fly to a specific event when focusEventId changes
  useEffect(() => {
    if (!map.current || loading || error || !focusEventId) return;
    
    // Find the marker for the event
    const marker = markersRef.current[focusEventId];
    if (marker) {
      // Get the marker position
      const position = marker.getLngLat();
      
      // Fly to the marker
      map.current.flyTo({
        center: position,
        zoom: 14,
        speed: 1.5,
        curve: 1.5,
        essential: true
      });
      
      // Open the popup
      setTimeout(() => {
        marker.togglePopup();
      }, 1000);
    }
  }, [focusEventId, loading, error]);
  
  // Function to navigate to the next event
  const goToNextEvent = () => {
    if (sortedEvents.length === 0) return;
    
    if (currentEventIndex === null) {
      // Start at the first event
      setCurrentEventIndex(0);
      const eventId = sortedEvents[0].id;
      const marker = markersRef.current[eventId];
      if (marker && map.current) {
        const position = marker.getLngLat();
        map.current.flyTo({
          center: position,
          zoom: 14,
          speed: 1.5
        });
        
        // Safe toggle of the popup
        const eventId = sortedEvents[0].id;
        setTimeout(() => {
          try {
            if (markersRef.current[eventId]) {
              markersRef.current[eventId].togglePopup();
            }
          } catch (e) {
            console.log('Error toggling popup:', e);
          }
        }, 1000);
      }
    } else {
      // Go to the next event
      const nextIndex = (currentEventIndex + 1) % sortedEvents.length;
      setCurrentEventIndex(nextIndex);
      const eventId = sortedEvents[nextIndex].id;
      const marker = markersRef.current[eventId];
      
      if (marker && map.current) {
        // Close current popup if any
        if (sortedEvents[currentEventIndex]) {
          try {
            const currentEventId = sortedEvents[currentEventIndex].id;
            const currentMarker = markersRef.current[currentEventId];
            if (currentMarker?.getPopup?.()?.isOpen?.()) {
              currentMarker.togglePopup();
            }
          } catch (e) {
            console.log('Error closing popup:', e);
          }
        }
        
        const position = marker.getLngLat();
        map.current.flyTo({
          center: position,
          zoom: 14,
          speed: 1.5
        });
        setTimeout(() => {
          if (marker && marker.togglePopup) {
            marker.togglePopup();
          }
        }, 1000);
      }
    }
  };
  
  // Function to navigate to the previous event
  const goToPrevEvent = () => {
    if (sortedEvents.length === 0) return;
    
    if (currentEventIndex === null) {
      // Start at the last event
      setCurrentEventIndex(sortedEvents.length - 1);
      const eventId = sortedEvents[sortedEvents.length - 1].id;
      const marker = markersRef.current[eventId];
      if (marker && map.current) {
        const position = marker.getLngLat();
        map.current.flyTo({
          center: position,
          zoom: 14,
          speed: 1.5
        });
        setTimeout(() => {
          if (marker && marker.togglePopup) {
            marker.togglePopup();
          }
        }, 1000);
      }
    } else {
      // Go to the previous event
      const prevIndex = (currentEventIndex - 1 + sortedEvents.length) % sortedEvents.length;
      setCurrentEventIndex(prevIndex);
      const eventId = sortedEvents[prevIndex].id;
      const marker = markersRef.current[eventId];
      
      if (marker && map.current) {
        // Close current popup if any
        if (sortedEvents[currentEventIndex]) {
          const currentEventId = sortedEvents[currentEventIndex].id;
          const currentMarker = markersRef.current[currentEventId];
          if (currentMarker?.getPopup?.()?.isOpen?.()) {
            currentMarker.togglePopup();
          }
        }
        
        const position = marker.getLngLat();
        map.current.flyTo({
          center: position,
          zoom: 14,
          speed: 1.5
        });
        setTimeout(() => {
          if (marker && marker.togglePopup) {
            marker.togglePopup();
          }
        }, 1000);
      }
    }
  };

  // Helper function to force reload markers
  const forceReloadMarkers = () => {
    if (map.current) {
      console.log("Force reloading markers...");
      addMarkersToMap();
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
    <div className={`relative h-[400px] overflow-hidden rounded-lg border ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-sm font-medium">Loading map...</span>
        </div>
      )}
      
      {/* Navigation controls */}
      {!loading && sortedEvents.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 flex space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPrevEvent}
            className="rounded-full h-10 w-10"
            title="Previous location"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // Reset map to show all markers
              if (map.current) {
                // Get all valid coordinates from markers
                const allCoordinates: [number, number][] = [];
                Object.values(markersRef.current).forEach(marker => {
                  const lngLat = marker.getLngLat();
                  allCoordinates.push([lngLat.lng, lngLat.lat]);
                });
                
                if (allCoordinates.length > 0) {
                  const bounds = allCoordinates.reduce(
                    (acc: mapboxgl.LngLatBounds, coord: [number, number]) => 
                      acc.extend(coord as mapboxgl.LngLatLike),
                    new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0])
                  );
                  
                  map.current.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 13,
                    duration: 1000
                  });
                }
                
                // Close any open popups
                if (currentEventIndex !== null && sortedEvents[currentEventIndex]) {
                  try {
                    const currentEventId = sortedEvents[currentEventIndex].id;
                    const currentMarker = markersRef.current[currentEventId];
                    if (currentMarker?.getPopup?.()?.isOpen?.()) {
                      currentMarker.togglePopup();
                    }
                  } catch (e) {
                    console.log('Error closing popup:', e);
                  }
                }
              }
            }}
            className="rounded-full h-10 w-10"
            title="View all locations"
          >
            <Pin className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={goToNextEvent}
            className="rounded-full h-10 w-10"
            title="Next location"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}; 