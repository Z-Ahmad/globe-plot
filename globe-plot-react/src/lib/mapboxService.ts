import { Event, Location, TravelEvent, AccommodationEvent } from "@/types/trip";
import axios from 'axios';
import { updateEventCoordinates, batchUpdateEventCoordinates } from './firebaseService';

// API base URL - adjust based on your configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Interface for geocoding response
 */
interface GeocodingResult {
  lat: number;
  lng: number;
  placeName?: string;
  city?: string;
  country?: string;
  formattedAddress?: string;
}

/**
 * Determines if an event should be saved to Firestore
 * 
 * Checks several conditions:
 * 1. Event must have an ID
 * 2. Event ID must match Firestore's format (at least 20 chars)
 * 3. For saving coordinates, the event must already exist in Firestore
 */
function shouldSaveEventToFirestore(eventId?: string): boolean {
  // Must have an ID
  if (!eventId) return false;
  
  // Firebase auto-generated IDs are typically 20 characters long
  // Client-generated UUIDs (used for temporary events) are 36 characters with hyphens
  // Client-generated IDs with uuidv4 are 36 chars with hyphens
  if (eventId.includes('-')) return false;
  
  // Firestore IDs are typically at least 20 characters
  if (eventId.length < 20) return false;
  
  return true;
}

/**
 * Geocodes a location using city and country information
 */
export async function geocodeLocation(location: Partial<Location>, eventId?: string, tripId?: string, locationType?: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location'): Promise<GeocodingResult | null> {
  // Skip geocoding if we already have coordinates
  if (location.geolocation?.lat && location.geolocation?.lng) {
    return {
      lat: location.geolocation.lat,
      lng: location.geolocation.lng,
      city: location.city,
      country: location.country,
      placeName: location.name
    };
  }

  if (!location.city && !location.country && !location.name) {
    return null;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}geocode`, {
      name: location.name,
      city: location.city,
      country: location.country
    });

    if (response.status === 200 && response.data) {
      const result = {
        lat: response.data.lat,
        lng: response.data.lng,
        placeName: response.data.placeName,
        city: response.data.city || location.city,
        country: response.data.country || location.country,
        formattedAddress: response.data.formattedAddress
      };

      // Only save to Firestore if we have a valid Firestore ID
      if (eventId && locationType && shouldSaveEventToFirestore(eventId)) {
        try {
          await updateEventCoordinates(
            eventId,
            { lat: result.lat, lng: result.lng },
            locationType
          );
          console.log(`Saved coordinates for ${eventId} (${locationType}) to Firestore`);
        } catch (err) {
          console.error('Failed to save coordinates to Firestore:', err);
          // Continue with the function even if Firestore update fails
        }
      } else if (eventId && !shouldSaveEventToFirestore(eventId)) {
        console.log(`Skipping Firestore update for event with temporary ID: ${eventId}`);
      }
      
      return result;
    }
    
    return null;
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}

/**
 * Batch geocode multiple locations
 */
export async function batchGeocodeLocations(locations: Array<{
  id: string;
  location: Partial<Location>;
}>): Promise<Array<{
  id: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  city?: string;
  country?: string;
  formattedAddress?: string;
  error?: string;
}>> {
  if (locations.length === 0) {
    return [];
  }

  // Skip locations that already have coordinates
  const locationsToGeocode = locations.filter(
    ({ location }) => !(location.geolocation?.lat && location.geolocation?.lng)
  );
  
  // Immediately return locations that already have coordinates
  const preGeocoded = locations
    .filter(({ location }) => !!(location.geolocation?.lat && location.geolocation?.lng))
    .map(({ id, location }) => ({
      id,
      lat: location.geolocation?.lat,
      lng: location.geolocation?.lng,
      city: location.city,
      country: location.country,
      placeName: location.name
    }));

  // If all locations already have coordinates, return them
  if (locationsToGeocode.length === 0) {
    return preGeocoded;
  }

  try {
    const requestData = locationsToGeocode.map(({ id, location }) => ({
      id,
      name: location.name,
      city: location.city,
      country: location.country
    }));

    const response = await axios.post(`${API_BASE_URL}geocode/batch`, requestData);

    if (response.status === 200 && Array.isArray(response.data)) {
      // Combine pre-geocoded locations with new results
      return [...preGeocoded, ...response.data];
    }
    
    return [
      ...preGeocoded,
      ...locationsToGeocode.map(({ id }) => ({ id, error: 'Failed to geocode' }))
    ];
  } catch (error) {
    console.error("Error batch geocoding locations:", error);
    return [
      ...preGeocoded,
      ...locationsToGeocode.map(({ id }) => ({ id, error: 'Failed to geocode' }))
    ];
  }
}

/**
 * Extracts location from an event depending on its category
 */
export function getLocationFromEvent(event: Event): Partial<Location> {
  switch (event.category) {
    case 'travel':
      return event.departure?.location || {};
    case 'accommodation':
      return event.checkIn?.location || {};
    default:
      return event.location || {};
  }
}

/**
 * Processes all events and enriches them with geolocation data
 */
export async function enrichEventsWithGeolocations(events: Event[]): Promise<Event[]> {
  console.log(`[mapboxService] Enriching ${events.length} events with geolocations`);
  
  const enrichedEvents = [...events];
  const locationsToGeocode: Array<{
    id: string;
    event: Event;
    locationPath: string; // Path to the location in the event object
    location: Partial<Location>;
  }> = [];
  
  // Collect all locations that need geocoding
  for (const event of enrichedEvents) {
    if (event.category === 'travel') {
      if (event.departure?.location && !event.departure.location.geolocation) {
        console.log(`[mapboxService] Travel event ${event.id} needs departure location geocoding`);
        locationsToGeocode.push({
          id: `${event.id}-departure`,
          event,
          locationPath: 'departure.location',
          location: event.departure.location
        });
      }
      
      if (event.arrival?.location && !event.arrival.location.geolocation) {
        console.log(`[mapboxService] Travel event ${event.id} needs arrival location geocoding`);
        locationsToGeocode.push({
          id: `${event.id}-arrival`,
          event,
          locationPath: 'arrival.location',
          location: event.arrival.location
        });
      }
    } else if (event.category === 'accommodation') {
      if (event.checkIn?.location && !event.checkIn.location.geolocation) {
        console.log(`[mapboxService] Accommodation event ${event.id} needs checkIn location geocoding`);
        locationsToGeocode.push({
          id: `${event.id}-checkin`,
          event,
          locationPath: 'checkIn.location',
          location: event.checkIn.location
        });
      }
      
      if (event.checkOut?.location && !event.checkOut.location.geolocation) {
        console.log(`[mapboxService] Accommodation event ${event.id} needs checkOut location geocoding`);
        locationsToGeocode.push({
          id: `${event.id}-checkout`,
          event,
          locationPath: 'checkOut.location',
          location: event.checkOut.location
        });
      }
    } else {
      if (event.location && !event.location.geolocation) {
        console.log(`[mapboxService] ${event.category} event ${event.id} needs location geocoding`);
        locationsToGeocode.push({
          id: event.id,
          event,
          locationPath: 'location',
          location: event.location
        });
      }
    }
  }
  
  console.log(`[mapboxService] Found ${locationsToGeocode.length} locations that need geocoding`);
  
  // If there are locations to geocode, do it in a batch
  if (locationsToGeocode.length > 0) {
    console.log('[mapboxService] Calling batchGeocodeLocations API');
    const geocodeResults = await batchGeocodeLocations(
      locationsToGeocode.map(({ id, location }) => ({ id, location }))
    );
    
    console.log(`[mapboxService] Received ${geocodeResults.length} results from geocoding API`);
    
    // Count successful geocodings
    const successfulResults = geocodeResults.filter(result => result.lat && result.lng);
    console.log(`[mapboxService] ${successfulResults.length} locations were successfully geocoded`);
    
    // Update the events with the geocoding results
    for (const result of geocodeResults) {
      if (result.lat && result.lng) {
        const locationInfo = locationsToGeocode.find(loc => loc.id === result.id);
        if (locationInfo) {
          console.log(`[mapboxService] Updating ${locationInfo.locationPath} for event ${locationInfo.event.id} with coordinates: ${result.lat}, ${result.lng}`);
          
          // Update the location with geolocation data
          // This uses path notation to update nested properties
          const pathParts = locationInfo.locationPath.split('.');
          let currentObj: any = locationInfo.event;
          
          // Navigate to the parent object of the location
          for (let i = 0; i < pathParts.length - 1; i++) {
            currentObj = currentObj[pathParts[i]];
          }
          
          // Update the location's geolocation property
          if (currentObj && currentObj[pathParts[pathParts.length - 1]]) {
            currentObj[pathParts[pathParts.length - 1]].geolocation = {
              lat: result.lat,
              lng: result.lng
            };
            
            // Update city/country if available and not already set
            if (result.city && !currentObj[pathParts[pathParts.length - 1]].city) {
              console.log(`[mapboxService] Updating city to: ${result.city}`);
              currentObj[pathParts[pathParts.length - 1]].city = result.city;
            }
            
            if (result.country && !currentObj[pathParts[pathParts.length - 1]].country) {
              console.log(`[mapboxService] Updating country to: ${result.country}`);
              currentObj[pathParts[pathParts.length - 1]].country = result.country;
            }
          } else {
            console.log(`[mapboxService] Could not access ${pathParts[pathParts.length - 1]} in event object`);
          }
        } else {
          console.log(`[mapboxService] Could not find location info for result ID: ${result.id}`);
        }
      } else if (result.error) {
        console.log(`[mapboxService] Geocoding error for ${result.id}: ${result.error}`);
      }
    }
  } else {
    console.log('[mapboxService] All locations already have coordinates, skipping geocoding');
  }
  
  return enrichedEvents;
}

/**
 * Gets all unique locations with geolocation data from events
 */
export function getUniqueLocationsFromEvents(events: Event[]): { 
  location: Partial<Location>; 
  events: Event[] 
}[] {
  const locationMap = new Map<string, { location: Partial<Location>; events: Event[] }>();
  
  events.forEach(event => {
    let locations: Partial<Location>[] = [];
    
    if (event.category === 'travel') {
      if (event.departure?.location) locations.push(event.departure.location);
      if (event.arrival?.location) locations.push(event.arrival.location);
    } else if (event.category === 'accommodation') {
      if (event.checkIn?.location) locations.push(event.checkIn.location);
    } else {
      if (event.location) locations.push(event.location);
    }
    
    locations.forEach(location => {
      if (!location || !location.geolocation) return;
      
      const key = `${location.city || ''}:${location.country || ''}`;
      
      if (!locationMap.has(key)) {
        locationMap.set(key, { location, events: [event] });
      } else {
        locationMap.get(key)?.events.push(event);
      }
    });
  });
  
  return Array.from(locationMap.values());
}

/**
 * Updates location coordinates in Firestore
 */
export async function updateEventLocationCoordinates(
  tripId: string,
  eventId: string,
  coordinates: { lat: number; lng: number },
  locationType: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location'
): Promise<void> {
  try {
    // Use the updateEventCoordinates function from firebaseService
    await updateEventCoordinates(eventId, coordinates, locationType);
    console.log(`Updated coordinates for ${eventId}, location: ${locationType}`);
  } catch (error) {
    console.error('Error updating event coordinates:', error);
    throw error;
  }
}

/**
 * Process all events in a trip and update missing coordinates in Firestore
 */
export async function enrichAndSaveEventCoordinates(
  tripId: string,
  events: Event[],
  forceUpdate: boolean = false
): Promise<Event[]> {
  console.log(`[mapboxService] Starting enrichAndSaveEventCoordinates for trip ${tripId} with ${events.length} events${forceUpdate ? ' (force update)' : ''}`);

  // First enrich all events with coordinates (even those with temporary IDs)
  // This ensures UI shows coordinates for all events, even if they're not saved to Firestore yet
  const enrichedEvents = await enrichEventsWithGeolocations(events);
  
  // Filter events that can be saved to Firestore
  const validEvents = events.filter(event => {
    const isValid = shouldSaveEventToFirestore(event.id);
    if (!isValid) {
      console.log(`[mapboxService] Skipping Firestore update for event "${event.title}" (ID: ${event.id}) - temporary ID format`);
    }
    return isValid;
  });
  
  if (validEvents.length < events.length) {
    console.log(`[mapboxService] Filtered out ${events.length - validEvents.length} events with temporary IDs from Firestore updates`);
  }
  
  // Only proceed with Firestore updates for valid events
  if (validEvents.length > 0) {
    console.log(`[mapboxService] Preparing Firestore updates for ${validEvents.length} valid events`);
    
    // Collect updates for batch processing
    const updates: Array<{
      eventId: string;
      coordinates: { lat: number; lng: number };
      locationType: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location';
    }> = [];
    
    // For each enriched event with valid ID, prepare updates if coordinates were added
    for (const originalEvent of validEvents) {
      // Find the corresponding enriched event
      const enrichedEvent = enrichedEvents.find(e => e.id === originalEvent.id);
      if (!enrichedEvent) {
        console.log(`[mapboxService] Could not find enriched event for ${originalEvent.id}`);
        continue;
      }
      
      console.log(`[mapboxService] Checking event ${originalEvent.id} (${originalEvent.title}) for coordinate updates`);
      
      // Check each location type and collect updates if coordinates were added
      if (originalEvent.category === 'travel') {
        const travelEnriched = enrichedEvent as TravelEvent;
        
        // Check departure location
        if (travelEnriched.departure?.location?.geolocation) {
          if (forceUpdate || !hasCoordinatesInFirestore(originalEvent, 'departure.location')) {
            console.log(`[mapboxService] Adding departure location update for travel event "${originalEvent.title}"`);
            updates.push({
              eventId: originalEvent.id,
              coordinates: travelEnriched.departure.location.geolocation,
              locationType: 'departure.location'
            });
          } else {
            console.log(`[mapboxService] Travel event "${originalEvent.title}" already has departure coordinates in Firestore`);
          }
        }
        
        // Check arrival location
        if (travelEnriched.arrival?.location?.geolocation) {
          if (forceUpdate || !hasCoordinatesInFirestore(originalEvent, 'arrival.location')) {
            console.log(`[mapboxService] Adding arrival location update for travel event "${originalEvent.title}"`);
            updates.push({
              eventId: originalEvent.id,
              coordinates: travelEnriched.arrival.location.geolocation,
              locationType: 'arrival.location'
            });
          } else {
            console.log(`[mapboxService] Travel event "${originalEvent.title}" already has arrival coordinates in Firestore`);
          }
        }
      } else if (originalEvent.category === 'accommodation') {
        const accomEnriched = enrichedEvent as AccommodationEvent;
        
        // Check check-in location
        if (accomEnriched.checkIn?.location?.geolocation) {
          if (forceUpdate || !hasCoordinatesInFirestore(originalEvent, 'checkIn.location')) {
            console.log(`[mapboxService] Adding checkIn location update for accommodation event "${originalEvent.title}"`);
            updates.push({
              eventId: originalEvent.id,
              coordinates: accomEnriched.checkIn.location.geolocation,
              locationType: 'checkIn.location'
            });
          } else {
            console.log(`[mapboxService] Accommodation event "${originalEvent.title}" already has checkIn coordinates in Firestore`);
          }
        }
        
        // Check check-out location
        if (accomEnriched.checkOut?.location?.geolocation) {
          if (forceUpdate || !hasCoordinatesInFirestore(originalEvent, 'checkOut.location')) {
            console.log(`[mapboxService] Adding checkOut location update for accommodation event "${originalEvent.title}"`);
            updates.push({
              eventId: originalEvent.id,
              coordinates: accomEnriched.checkOut.location.geolocation,
              locationType: 'checkOut.location'
            });
          } else {
            console.log(`[mapboxService] Accommodation event "${originalEvent.title}" already has checkOut coordinates in Firestore`);
          }
        }
      } else {
        // Check main location for Experience or Meal events
        if (enrichedEvent.location?.geolocation) {
          if (forceUpdate || !hasCoordinatesInFirestore(originalEvent, 'location')) {
            console.log(`[mapboxService] Adding location update for ${originalEvent.category} event "${originalEvent.title}"`);
            updates.push({
              eventId: originalEvent.id,
              coordinates: enrichedEvent.location.geolocation,
              locationType: 'location'
            });
          } else {
            console.log(`[mapboxService] ${originalEvent.category} event "${originalEvent.title}" already has coordinates in Firestore`);
          }
        }
      }
    }
    
    console.log(`[mapboxService] Collected ${updates.length} updates for Firestore`);
    
    // Batch update all collected coordinates
    if (updates.length > 0) {
      try {
        await batchUpdateEventCoordinates(updates);
        console.log(`[mapboxService] Batch updated ${updates.length} locations with coordinates in Firestore`);
      } catch (error) {
        console.error('[mapboxService] Error saving coordinates to Firestore:', error);
        // Continue with the function even if Firestore update fails
      }
    } else {
      console.log('[mapboxService] No updates needed - all events already have coordinates in Firestore');
    }
  } else {
    console.log('[mapboxService] No valid events for Firestore updates - all events have temporary IDs');
  }
  
  return enrichedEvents;
}

/**
 * Helper function to check if an event already has coordinates in Firestore
 * This is different from checking if it has coordinates in memory
 */
function hasCoordinatesInFirestore(event: Event, locationType: string): boolean {
  // Get the object at the specified path
  const pathParts = locationType.split('.');
  let currentObj: any = event;
  
  // Navigate to the location object
  for (const part of pathParts) {
    if (!currentObj || !currentObj[part]) {
      return false;
    }
    currentObj = currentObj[part];
  }
  
  // If the location has a _firestoreCoordinates flag, use that
  if (currentObj._firestoreCoordinates === true) {
    console.log(`[mapboxService] Event ${event.id} has _firestoreCoordinates flag for ${locationType}`);
    return true;
  }
  
  // Otherwise, check if it has geolocation data
  // If it does, we'll assume it's from Firestore since we're checking
  // the original event (before enrichment)
  if (currentObj.geolocation && 
      typeof currentObj.geolocation.lat === 'number' && 
      typeof currentObj.geolocation.lng === 'number') {
    console.log(`[mapboxService] Event ${event.id} already has coordinates for ${locationType}: ${currentObj.geolocation.lat}, ${currentObj.geolocation.lng}`);
    return true;
  }
  
  // No coordinates found
  return false;
} 