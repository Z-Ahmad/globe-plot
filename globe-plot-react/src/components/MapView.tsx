import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString, GeoJSON, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/map.css';
import { Event } from '@/types/trip';
import { getEventStyle } from '@/styles/eventStyles';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Globe, Pin, RefreshCw } from 'lucide-react';
import { useTripContext } from '@/context/TripContext';
import { enrichAndSaveEventCoordinates } from '@/lib/mapboxService';
import toast from 'react-hot-toast';

// You'll need to set your public Mapbox token in environment variables
// For development, create a .env.local file with VITE_MAPBOX_TOKEN=your_token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Custom style URL that includes our uploaded sprite icons
const CUSTOM_STYLE_URL = 'mapbox://styles/zaki-ahmad/cmaqtn8yr00fx01r25vdp46c4';

// Default map options
const DEFAULT_CENTER = [-74.5, 40]; // Roughly center of US
const DEFAULT_ZOOM = 1;

interface MapViewProps {
  className?: string;
  onRefreshCoordinates?: () => Promise<void>;
}

export const MapView: React.FC<MapViewProps> = ({ className = "", onRefreshCoordinates }) => {
  const { events, focusedEventId, tripId, setFocusedEventId } = useTripContext();
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState<number | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [currentMapBounds, setCurrentMapBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Store sorted events with dates
  const sortedEvents = events
    .filter(event => {
      // Check if this event has coordinates
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
  
  // Update the current event index when focusEventId changes
  useEffect(() => {
    if (focusedEventId && sortedEvents.length > 0) {
      // Find the index of the focused event in our sorted events
      const index = sortedEvents.findIndex(event => event.id === focusedEventId);
      
      if (index >= 0) {
        // Found the event - update our current index
        setCurrentEventIndex(index);
        console.log(`Focused on event index ${index} (${sortedEvents[index].title})`);
      } else {
        console.log(`Event with ID ${focusedEventId} not found in sorted events or lacks coordinates`);
      }
    }
  }, [focusedEventId, sortedEvents]);

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
      
      // Initialize the map with the custom style that contains our sprites
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: CUSTOM_STYLE_URL, // Using our custom style with sprites
        center: DEFAULT_CENTER as [number, number],
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        maxZoom: 17, // Allow higher zoom for detail
        minZoom: 1, // Minimum zoom level
        localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif",
        fadeDuration: 100, // Faster fade for smoother transitions
        renderWorldCopies: true, // Better experience when zooming out
      });

      // Add navigation controls (zoom, rotate)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Wait for map to load before adding markers
      map.current.on('load', () => {
        console.log('Map style loaded');
        
        // Check available images for debugging
        const availableImages = map.current?.listImages() || [];
        console.log(`Map loaded with ${availableImages.length} built-in sprites`);
        
        // Add a source for route lines
        map.current!.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        // Add a source for event markers
        map.current!.addSource('events', {
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
        
        // Add a layer for event markers using sprite images
        map.current!.addLayer({
          id: 'event-markers',
          type: 'symbol',
          source: 'events',
          layout: {
            // Using direct sprite names without the 'styled-' prefix
            // Use the spriteId property which matches our sprite naming format
            'icon-image': ['get', 'spriteId'],
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
            'text-optional': true
          }
        });
        
        // Add click event to show popups when clicking on markers
        map.current!.on('click', 'event-markers', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const props = feature.properties;
          if (!props) return;
          
          // Get coordinates for the clicked marker
          const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number];
          
          // Create HTML content for the popup
          const popupContent = `
            <div style="padding:4px 0;">
              <h3 style="font-weight:bold;margin-bottom:6px;font-size:16px;">${props.title}</h3>
              <p style="margin-bottom:4px;font-weight:500;">${props.locationName}</p>
              ${props.city && props.country ? 
                `<p style="margin-bottom:8px;font-size:13px;">${props.city}, ${props.country}</p>` : ''}
              
              <div style="display:flex;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
                <span style="font-size:12px;color:#666;text-transform:capitalize;padding:2px 6px;background:#f5f5f5;border-radius:4px;margin-right:8px;">
                  ${props.category} / ${props.type}
                </span>
                
                ${props.start ? `
                <span style="font-size:12px;color:#666;">
                  ${new Date(props.start).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>` : ''}
              </div>
            </div>
          `;
          
          // Close existing popup if one is open
          if (popupRef.current) {
            popupRef.current.remove();
          }
          
          // Create and display the popup
          popupRef.current = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            maxWidth: '300px'
          })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current!);
        });
        
        // Change cursor to pointer when hovering over marker
        map.current!.on('mouseenter', 'event-markers', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });
        
        // Change cursor back when not hovering over marker
        map.current!.on('mouseleave', 'event-markers', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });

        // Handle missing sprites - at this point map.current is guaranteed to exist
        map.current!.on('styleimagemissing', (e) => {
          const id = e.id; // missing image id
          console.log(`Loading missing sprite: ${id}`);
          
          // Try to load the sprite from our local SVGs folder
          fetch(`/svgs/${id}.svg`)
            .then(response => {
              if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
              return response.text();
            })
            .then(svgText => {
              // Create an image from the SVG
              const img = new Image();
              img.onload = () => {
                if (!map.current) return;
                
                // Create a canvas to draw the image
                const canvas = document.createElement('canvas');
                canvas.width = 34;
                canvas.height = 34;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                  // Draw the image on the canvas
                  ctx.drawImage(img, 0, 0, 34, 34);
                  
                  // Add the image to the map
                  const imageData = ctx.getImageData(0, 0, 34, 34);
                  map.current.addImage(id, { 
                    width: 34, 
                    height: 34, 
                    data: new Uint8Array(imageData.data.buffer) 
                  });
                }
              };
              
              // Create a data URL from the SVG
              img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
            })
            .catch(error => {
              console.warn(`Could not load missing sprite ${id}, using fallback circle`, error);
              createFallbackCircle(id);
            });
        });

        console.log('Map loaded and ready for markers');
        
        setLoading(false);
        
        // Add markers immediately after the map is loaded
        addMarkersToMap();
        
        // Preload all necessary sprites
        preloadSprites();
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
    
    // Store valid coordinates for bounds calculation
    const validCoordinates: [number, number][] = [];
    const validEvents: { id: string; coordinates: [number, number]; category: string }[] = [];

    // Create GeoJSON features for each event
    const features: Feature<Point>[] = [];
    
    // Add markers for each event with coordinates
    events.forEach(event => {
      let coordinates: [number, number] | null = null;
      let locationName = '';
      let city = '';
      let country = '';
      
      // Extract coordinates and name based on event category
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

      // If we have coordinates, add a GeoJSON feature
      if (coordinates && coordinates[0] && coordinates[1]) {
        // Valid coordinates for bounds calculation
        validCoordinates.push(coordinates);
        validEvents.push({
          id: event.id,
          coordinates: coordinates,
          category: event.category
        });

        // Create GeoJSON feature for this event
        features.push({
          type: 'Feature',
          id: event.id,
          properties: {
            id: event.id,
            title: event.title,
            category: event.category,
            type: event.type,
            sprite: `${event.category}/${event.type}`, // Full sprite path for matching
            spriteId: `styled-${event.category}-${event.type}`, // Matches styled- prefix in Mapbox Studio
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

    // Update the events source with our GeoJSON features
    if (map.current.getSource('events')) {
      (map.current.getSource('events') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: features
      });
    }

    // Draw route lines between events
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
      
      // Update the routes source
      if (map.current.getSource('routes')) {
        (map.current.getSource('routes') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: lineFeatures
        });
      }
    }

    // Fit map to bounds if we have coordinates and we're not focusing on a specific event
    if (validCoordinates.length > 0 && !focusedEventId) {
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
  
  // Initial focus handling - when map first loads and we already have a focusedEventId
  useEffect(() => {
    // When the map has loaded and is no longer in loading state
    if (!loading && !error && map.current && focusedEventId && sortedEvents.length > 0) {
      // Find the event in sorted events
      const event = sortedEvents.find(e => e.id === focusedEventId);
      if (event) {
        // Find the index of the event
        const index = sortedEvents.findIndex(e => e.id === focusedEventId);
        setCurrentEventIndex(index); 
        
        // Slight delay to ensure the map has fully initialized
        setTimeout(() => {
          navigateToEvent(event);
        }, 300);
      }
    }
  }, [loading, error, focusedEventId, sortedEvents]);
  
  // Add markers and routes when events change or map loads
  useEffect(() => {
    if (map.current && !loading && !error) {
      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        addMarkersToMap();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [events, loading, error, focusedEventId]); // Include focusedEventId so we don't reset view during focus

  // Effect to fly to a specific event when focusEventId changes
  useEffect(() => {
    if (!map.current || loading || error || !focusedEventId) return;
    
    // Find the event with the matching ID
    const event = events.find(e => e.id === focusedEventId);
    if (event) {
      let coordinates: [number, number] | null = null;
      
      // Extract coordinates based on event category
      if (event.category === 'travel' && event.departure?.location?.geolocation) {
        coordinates = [
          event.departure.location.geolocation.lng,
          event.departure.location.geolocation.lat
        ];
      } else if (event.category === 'accommodation' && event.checkIn?.location?.geolocation) {
        coordinates = [
          event.checkIn.location.geolocation.lng,
          event.checkIn.location.geolocation.lat
        ];
      } else if (event.location?.geolocation) {
        coordinates = [
          event.location.geolocation.lng,
          event.location.geolocation.lat
        ];
      }
      
      if (coordinates) {
        // Make sure we don't reset the view after focusing
        console.log('Focusing on event:', event.title);
        
        // Close any existing popup first
        if (popupRef.current) {
          popupRef.current.remove();
        }
        
        // Fly to the marker location with smooth animation
        map.current.flyTo({
          center: coordinates,
          zoom: 14,
          speed: 2.0, // Faster, smoother animation
          curve: 1.5, // Natural curve
          essential: true
        });
        
        // Create HTML content for the popup
        const locationName = 
          (event.category === 'travel' && event.departure?.location?.name) ? 
            event.departure.location.name : 
          (event.category === 'accommodation' && event.checkIn?.location?.name) ?
            (event.placeName || event.checkIn.location.name) :
            (event.location?.name || '');
            
        const city = 
          (event.category === 'travel' && event.departure?.location?.city) ? 
            event.departure.location.city : 
          (event.category === 'accommodation' && event.checkIn?.location?.city) ?
            event.checkIn.location.city :
            (event.location?.city || '');
            
        const country = 
          (event.category === 'travel' && event.departure?.location?.country) ? 
            event.departure.location.country : 
          (event.category === 'accommodation' && event.checkIn?.location?.country) ?
            event.checkIn.location.country :
            (event.location?.country || '');
            
        // Create popup content
        const popupContent = `
          <div style="padding:4px 0;">
            <h3 style="font-weight:bold;margin-bottom:6px;font-size:16px;">${event.title}</h3>
            <p style="margin-bottom:4px;font-weight:500;">${locationName}</p>
            ${city && country ? 
              `<p style="margin-bottom:8px;font-size:13px;">${city}, ${country}</p>` : ''}
            
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
        `;
        
        // Create and show the popup only when flying is complete
        map.current.once('moveend', () => {
          // Create popup after the animation is complete
          popupRef.current = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            maxWidth: '300px',
            className: 'event-focus-popup' // Add a custom class to identify this popup
          })
            .setLngLat(coordinates as [number, number])
            .setHTML(popupContent)
            .addTo(map.current!);
        });
      }
    }
  }, [focusedEventId, loading, error, events]);
  
  // Function to navigate to the next event
  const goToNextEvent = () => {
    if (sortedEvents.length === 0) return;
    
    let eventToNavigateTo: Event;
    
    if (currentEventIndex === null) {
      // Start at the first event
      setCurrentEventIndex(0);
      eventToNavigateTo = sortedEvents[0];
    } else {
      // Go to the next event
      const nextIndex = (currentEventIndex + 1) % sortedEvents.length;
      setCurrentEventIndex(nextIndex);
      eventToNavigateTo = sortedEvents[nextIndex];
    }
    
    // Update the focused event ID in the context
    if (eventToNavigateTo && eventToNavigateTo.id) {
      setFocusedEventId(eventToNavigateTo.id);
    }
    
    // Navigate to the selected event
    navigateToEvent(eventToNavigateTo);
  };
  
  // Function to navigate to the previous event
  const goToPrevEvent = () => {
    if (sortedEvents.length === 0) return;
    
    let eventToNavigateTo: Event;
    
    if (currentEventIndex === null) {
      // Start at the last event
      setCurrentEventIndex(sortedEvents.length - 1);
      eventToNavigateTo = sortedEvents[sortedEvents.length - 1];
    } else {
      // Go to the previous event
      const prevIndex = (currentEventIndex - 1 + sortedEvents.length) % sortedEvents.length;
      setCurrentEventIndex(prevIndex);
      eventToNavigateTo = sortedEvents[prevIndex];
    }
    
    // Update the focused event ID in the context
    if (eventToNavigateTo && eventToNavigateTo.id) {
      setFocusedEventId(eventToNavigateTo.id);
    }
    
    // Navigate to the selected event
    navigateToEvent(eventToNavigateTo);
  };
  
  // Helper function to navigate to an event
  const navigateToEvent = (event: Event) => {
    if (!map.current) return;
    
    let coordinates: [number, number] | null = null;
    
    // Extract coordinates based on event category
    if (event.category === 'travel' && event.departure?.location?.geolocation) {
      coordinates = [
        event.departure.location.geolocation.lng,
        event.departure.location.geolocation.lat
      ];
    } else if (event.category === 'accommodation' && event.checkIn?.location?.geolocation) {
      coordinates = [
        event.checkIn.location.geolocation.lng,
        event.checkIn.location.geolocation.lat
      ];
    } else if (event.location?.geolocation) {
      coordinates = [
        event.location.geolocation.lng,
        event.location.geolocation.lat
      ];
    }
    
    if (coordinates) {
      // Close any existing popup
      if (popupRef.current) {
        popupRef.current.remove();
      }
      
      // Fly to the event location with smooth animation
      map.current.flyTo({
        center: coordinates,
        zoom: 14,
        speed: 2.0, // Faster for smoother experience
        curve: 1.5, // Natural curve
        essential: true
      });
      
      // Create HTML content for the popup
      const locationName = 
        (event.category === 'travel' && event.departure?.location?.name) ? 
          event.departure.location.name : 
        (event.category === 'accommodation' && event.checkIn?.location?.name) ?
          (event.placeName || event.checkIn.location.name) :
          (event.location?.name || '');
          
      const city = 
        (event.category === 'travel' && event.departure?.location?.city) ? 
          event.departure.location.city : 
        (event.category === 'accommodation' && event.checkIn?.location?.city) ?
          event.checkIn.location.city :
          (event.location?.city || '');
            
      const country = 
        (event.category === 'travel' && event.departure?.location?.country) ? 
          event.departure.location.country : 
        (event.category === 'accommodation' && event.checkIn?.location?.country) ?
          event.checkIn.location.country :
          (event.location?.country || '');
      
      // Create popup content
      const popupContent = `
        <div style="padding:4px 0;">
          <h3 style="font-weight:bold;margin-bottom:6px;font-size:16px;">${event.title}</h3>
          <p style="margin-bottom:4px;font-weight:500;">${locationName}</p>
          ${city && country ? 
            `<p style="margin-bottom:8px;font-size:13px;">${city}, ${country}</p>` : ''}
          
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
      `;
      
      // Create and show the popup only when flying is complete
      map.current.once('moveend', () => {
        // Create popup after the animation is complete
        popupRef.current = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          maxWidth: '300px',
          className: 'event-focus-popup' // Add a custom class to identify this popup
        })
          .setLngLat(coordinates as [number, number])
          .setHTML(popupContent)
          .addTo(map.current!);
      });
    }
  };

  // Function to preload all necessary sprites
  const preloadSprites = () => {
    if (!map.current) return;
    
    // List of all possible sprite combinations we might need
    const sprites = [
      // Travel category sprites
      'styled-travel-flight',
      'styled-travel-train',
      'styled-travel-car',
      'styled-travel-boat',
      'styled-travel-bus',
      'styled-travel-other',
      // Accommodation category sprites
      'styled-accommodation-hotel',
      'styled-accommodation-hostel',
      'styled-accommodation-airbnb',
      'styled-accommodation-other',
      // Experience category sprites
      'styled-experience-activity',
      'styled-experience-tour',
      'styled-experience-museum',
      'styled-experience-concert',
      'styled-experience-other',
      // Meal category sprites
      'styled-meal-restaurant',
      'styled-meal-other',
      // Category fallbacks
      'styled-travel',
      'styled-accommodation',
      'styled-experience',
      'styled-meal',
      'styled-default'
    ];
    
    // Check which sprites are already loaded
    const existingImages = map.current.listImages();
    const missingSprites = sprites.filter(sprite => !existingImages.includes(sprite));
    
    // If no sprites are missing, we're done
    if (missingSprites.length === 0) {
      console.log('All sprites already loaded in the map');
      return;
    }
    
    console.log(`Loading ${missingSprites.length} custom map sprites`);
    
    // Load each missing sprite from local SVGs
    missingSprites.forEach(sprite => {
      // Load the sprite from SVG file in public/svgs directory
      fetch(`/svgs/${sprite}.svg`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
          return response.text();
        })
        .then(svgText => {
          // Create an image from the SVG
          const img = new Image();
          img.onload = () => {
            if (!map.current) return;
            
            // Create a canvas to draw the image
            const canvas = document.createElement('canvas');
            canvas.width = 34;
            canvas.height = 34;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Draw the image on the canvas
              ctx.drawImage(img, 0, 0, 34, 34);
              
              // Add the image to the map
              const imageData = ctx.getImageData(0, 0, 34, 34);
              map.current.addImage(sprite, { 
                width: 34, 
                height: 34, 
                data: new Uint8Array(imageData.data.buffer) 
              });
            }
          };
          
          // Create a data URL from the SVG
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
        })
        .catch(error => {
          console.warn(`Could not load sprite ${sprite}, falling back to default circle`, error);
          createFallbackCircle(sprite);
        });
    });
  };
  
  // Function to create a fallback circle for a specific sprite ID
  const createFallbackCircle = (id: string) => {
    if (!map.current) return;
    
    // Don't recreate existing images
    if (map.current.hasImage(id)) return;
    
    // Create a fallback colored circle as a canvas
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw a circle with category-based color
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
      
      // Set fill color based on category
      if (id.includes('travel')) {
        ctx.fillStyle = '#e0f2fe'; // Light blue
        ctx.strokeStyle = '#0369a1'; // Darker blue
      } else if (id.includes('accommodation')) {
        ctx.fillStyle = '#fae8ff'; // Light purple
        ctx.strokeStyle = '#be123c'; // Red/purple
      } else if (id.includes('experience')) {
        ctx.fillStyle = '#ecfdf5'; // Light green
        ctx.strokeStyle = '#15803d'; // Dark green
      } else if (id.includes('meal')) {
        ctx.fillStyle = '#ffedd5'; // Light orange
        ctx.strokeStyle = '#ea580c'; // Dark orange
      } else {
        ctx.fillStyle = '#f9fafb'; // Light gray
        ctx.strokeStyle = '#374151'; // Dark gray
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add the image to the map
      const imageData = ctx.getImageData(0, 0, size, size);
      map.current.addImage(id, { 
        width: size, 
        height: size, 
        data: new Uint8Array(imageData.data.buffer) 
      });
      console.log(`Created fallback circle for: ${id}`);
    }
  };

  // Function to refresh all coordinates
  const refreshCoordinates = async () => {
    if (onRefreshCoordinates) {
      // Use the function passed from Itinerary
      await onRefreshCoordinates();
      return;
    }
    
    // Fallback to local implementation
    if (!tripId) {
      toast.error("No trip ID available");
      return;
    }
    
    setIsRefreshing(true);
    try {
      // Force update coordinates
      const updatedEvents = await enrichAndSaveEventCoordinates(tripId, events, true);
      toast.success(`Updated coordinates for ${updatedEvents.length} events`);
      
      // Reload map after a short delay
      setTimeout(() => {
        // Reset the map to fit all markers
        if (map.current) {
          // Re-initialize the map to reflect the updated events
          initializeMap();
        }
        setIsRefreshing(false);
      }, 500);
    } catch (error) {
      console.error("Error refreshing coordinates:", error);
      toast.error("Failed to refresh coordinates");
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
    <div className={`relative h-[400px] overflow-hidden rounded-lg border ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg map-container">
        {/* Navigation controls - placed inside the map container to be part of fullscreen */}
        {!loading && sortedEvents.length > 0 && (
          <div className="map-navigation-controls absolute bottom-10 right-4 z-50 flex space-x-2">
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={goToPrevEvent}
              className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
              title="Previous location"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                // Reset map to show all markers
                if (map.current) {
                  // Get all features from the events source
                  const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
                  const data = source._data as GeoJSON.FeatureCollection<Point>;
                  
                  if (data && data.features && data.features.length > 0) {
                    // Extract coordinates from features
                    const coordinates = data.features.map(f => f.geometry.coordinates as [number, number]);
                    
                    // Calculate bounds
                    const bounds = coordinates.reduce(
                      (acc, coord) => acc.extend(coord as mapboxgl.LngLatLike),
                      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
                    );
                    
                    // Fit map to bounds
                    map.current.fitBounds(bounds, {
                      padding: 50,
                      maxZoom: 13,
                      duration: 1000
                    });
                  }
                  
                  // Close any open popup
                  if (popupRef.current) {
                    popupRef.current.remove();
                    popupRef.current = null;
                  }
                  
                  // Reset current event index
                  setCurrentEventIndex(null);
                  
                  // Clear focused event in the context
                  setFocusedEventId(null);
                }
              }}
              className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
              title="View all locations"
            >
              <Globe className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="secondary" 
              size="icon"
              onClick={goToNextEvent}
              className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
              title="Next location"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="secondary" 
              size="icon"
              onClick={refreshCoordinates}
              disabled={isRefreshing}
              className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white disabled:opacity-50"
              title="Refresh all coordinates"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>
      
      {(loading || isRefreshing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-sm font-medium">
            {isRefreshing ? "Refreshing coordinates..." : "Loading map..."}
          </span>
        </div>
      )}
    </div>
  );
}; 