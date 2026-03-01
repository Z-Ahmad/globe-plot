import { v4 as uuidv4 } from 'uuid';

const EMPTY_LOCATION = { name: '', city: '', country: '' };

function ensureLocation(loc: any): { name: string; city?: string; country?: string; geolocation?: { lat: number; lng: number } } {
  if (!loc || typeof loc !== 'object') return { ...EMPTY_LOCATION };
  const result: any = {
    name: loc.name ?? '',
    city: loc.city ?? '',
    country: loc.country ?? '',
  };
  if (loc.geolocation && typeof loc.geolocation === 'object' && typeof loc.geolocation.lat === 'number' && typeof loc.geolocation.lng === 'number') {
    result.geolocation = { lat: loc.geolocation.lat, lng: loc.geolocation.lng };
  }
  return result;
}

/**
 * Normalize event to match the format in globe-plot-react/src/types/trip.ts.
 * Sets top-level start/end from category-specific fields, ensures location objects exist,
 * and strips unknown fields.
 */
export function normalizeEvent(event: any) {
  let start = '';
  let end = '';

  // Always set placeName for accommodation events
  if (event.category === 'accommodation') {
    event.placeName = event.placeName || event.hotelName || event.hostelName || event.airbnbName || '';
  }

  // Ensure location and nested locations exist
  event.location = ensureLocation(event.location);
  if (event.departure?.location) {
    event.departure.location = ensureLocation(event.departure.location);
  }
  if (event.arrival?.location) {
    event.arrival.location = ensureLocation(event.arrival.location);
  }
  if (event.checkIn?.location) {
    event.checkIn.location = ensureLocation(event.checkIn.location);
  }
  if (event.checkOut?.location) {
    event.checkOut.location = ensureLocation(event.checkOut.location);
  }

  // Determine start/end times based on category
  switch (event.category) {
    case 'accommodation':
      start = event.checkIn?.date || '';
      end = event.checkOut?.date || '';
      break;
    case 'travel':
      start = event.departure?.date || '';
      end = event.arrival?.date || '';
      break;
    case 'experience':
      start = event.startDate || '';
      end = event.endDate || '';
      break;
    case 'meal':
      start = event.date || '';
      end = event.date || '';
      break;
    default:
      start = event.start || '';
      end = event.end || '';
  }

  // Handle non-standard fields by moving them to notes
  const knownFields: Record<string, boolean> = {
    id: true, category: true, type: true, title: true, start: true, end: true,
    location: true, notes: true,
    departure: true, arrival: true, airline: true, flightNumber: true,
    trainNumber: true, seat: true, car: true, class: true, bookingReference: true,
    placeName: true, checkIn: true, checkOut: true, roomNumber: true,
    startDate: true, endDate: true,
    date: true, reservationReference: true,
  };

  const unknownFields: string[] = [];
  for (const key in event) {
    if (!knownFields[key] && event[key] !== undefined && event[key] !== null) {
      unknownFields.push(`${key}: ${JSON.stringify(event[key])}`);
    }
  }

  let notes = event.notes || '';
  if (unknownFields.length > 0) {
    if (notes) notes += '\n\n';
    notes += 'Additional information:\n' + unknownFields.join('\n');
  }

  const normalizedEvent = {
    ...event,
    start,
    end,
    notes,
    id: event.id || uuidv4(),
  };

  // Remove unknown fields (iterate over snapshot to avoid mutation during iteration)
  Object.keys(normalizedEvent).forEach((key) => {
    if (!knownFields[key]) {
      delete normalizedEvent[key];
    }
  });

  return normalizedEvent;
}

/**
 * Validate that event has required fields for its category.
 */
export function validateEvent(event: any): boolean {
  switch (event.category) {
    case 'accommodation':
      return !!(event.checkIn?.date && event.checkOut?.date);
    case 'travel':
      return !!(event.departure?.date && event.arrival?.date);
    case 'experience':
      return !!(event.startDate && event.endDate);
    case 'meal':
      return !!event.date;
    default:
      return false;
  }
}
