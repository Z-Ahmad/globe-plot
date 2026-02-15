import {
  Event,
  SerializedEvent,
  TravelEvent,
  AccommodationEvent,
  ExperienceEvent,
  MealEvent
} from '../types/aiQuery';

/**
 * Serialize events into a flattened structure optimized for AI reasoning
 * Reduces token count and simplifies LLM comprehension
 */
export function serializeEventForAI(event: Event): SerializedEvent {
  const base: SerializedEvent = {
    id: event.id,
    category: event.category,
    type: event.type,
    title: event.title,
    start: event.start,
    end: event.end,
    metadata: {}
  };

  // Handle category-specific serialization
  switch (event.category) {
    case 'travel': {
      const travelEvent = event as TravelEvent;
      base.start = travelEvent.departure.date;
      base.end = travelEvent.arrival.date;
      base.country = travelEvent.departure.location.country || travelEvent.arrival.location.country;
      base.city = travelEvent.departure.location.city;
      base.venue = travelEvent.departure.location.name;
      base.metadata = {
        departureCity: travelEvent.departure.location.city,
        arrivalCity: travelEvent.arrival.location.city,
        departureName: travelEvent.departure.location.name,
        arrivalName: travelEvent.arrival.location.name,
        flightNumber: travelEvent.flightNumber,
        trainNumber: travelEvent.trainNumber,
        bookingReference: travelEvent.bookingReference
      };
      break;
    }

    case 'accommodation': {
      const accomEvent = event as AccommodationEvent;
      base.start = accomEvent.checkIn.date;
      base.end = accomEvent.checkOut.date;
      base.country = accomEvent.checkIn.location.country;
      base.city = accomEvent.checkIn.location.city;
      base.venue = accomEvent.placeName || accomEvent.location.name;
      base.metadata = {
        checkIn: accomEvent.checkIn.date,
        checkOut: accomEvent.checkOut.date,
        bookingReference: accomEvent.bookingReference
      };
      break;
    }

    case 'experience': {
      const expEvent = event as ExperienceEvent;
      base.start = expEvent.startDate;
      base.end = expEvent.endDate;
      base.country = expEvent.location.country;
      base.city = expEvent.location.city;
      base.venue = expEvent.location.name;
      base.metadata = {
        bookingReference: expEvent.bookingReference
      };
      break;
    }

    case 'meal': {
      const mealEvent = event as MealEvent;
      base.start = mealEvent.date;
      base.end = mealEvent.date;
      base.country = mealEvent.location.country;
      base.city = mealEvent.location.city;
      base.venue = mealEvent.location.name;
      base.metadata = {
        bookingReference: mealEvent.reservationReference
      };
      break;
    }
  }

  // Remove undefined fields to minimize token usage
  Object.keys(base.metadata || {}).forEach(key => {
    if ((base.metadata as any)[key] === undefined) {
      delete (base.metadata as any)[key];
    }
  });

  if (Object.keys(base.metadata || {}).length === 0) {
    delete base.metadata;
  }

  return base;
}

/**
 * Serialize multiple events
 */
export function serializeEventsForAI(events: Event[]): SerializedEvent[] {
  return events
    .map(serializeEventForAI)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Estimate token count for serialized data
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(data: any): number {
  const jsonString = JSON.stringify(data);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Create the complete context for AI query
 */
export function createAIContext(
  tripName: string,
  tripStartDate: string,
  tripEndDate: string,
  events: SerializedEvent[]
): any {
  return {
    trip: {
      name: tripName,
      startDate: tripStartDate,
      endDate: tripEndDate
    },
    events: events
  };
}
