import { Event, TravelEvent, AccommodationEvent } from '../types/aiQuery';

/**
 * Deterministic functions for common trip queries
 * These provide accurate, fast, free answers without needing LLM inference
 */

/**
 * Calculate the number of unique countries in a trip
 */
export function countCountries(events: Event[]): number {
  const countries = new Set<string>();
  
  events.forEach(event => {
    if (event.category === 'travel') {
      const travelEvent = event as TravelEvent;
      if (travelEvent.departure.location.country) {
        countries.add(travelEvent.departure.location.country);
      }
      if (travelEvent.arrival.location.country) {
        countries.add(travelEvent.arrival.location.country);
      }
    } else if (event.category === 'accommodation') {
      const accomEvent = event as AccommodationEvent;
      if (accomEvent.checkIn.location.country) {
        countries.add(accomEvent.checkIn.location.country);
      }
    } else {
      if (event.location.country) {
        countries.add(event.location.country);
      }
    }
  });
  
  return countries.size;
}

/**
 * Count the number of flights
 */
export function countFlights(events: Event[]): number {
  return events.filter(e => e.category === 'travel' && e.type === 'flight').length;
}

/**
 * Count total number of events
 */
export function countEvents(events: Event[]): number {
  return events.length;
}

/**
 * Count events by category
 */
export function countEventsByCategory(events: Event[]): Record<string, number> {
  const counts: Record<string, number> = {
    travel: 0,
    accommodation: 0,
    experience: 0,
    meal: 0
  };
  
  events.forEach(event => {
    counts[event.category]++;
  });
  
  return counts;
}

/**
 * Calculate total hotel/accommodation nights
 */
export function calculateHotelNights(events: Event[]): number {
  let totalNights = 0;
  
  events
    .filter(e => e.category === 'accommodation')
    .forEach(event => {
      const accomEvent = event as AccommodationEvent;
      const checkIn = new Date(accomEvent.checkIn.date);
      const checkOut = new Date(accomEvent.checkOut.date);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      totalNights += nights;
    });
  
  return totalNights;
}

/**
 * Calculate longest layover between consecutive flights
 */
export function calculateLongestLayover(events: Event[]): { hours: number; minutes: number } | null {
  const travelEvents = events
    .filter(e => e.category === 'travel')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) as TravelEvent[];
  
  let maxLayoverMs = 0;
  
  for (let i = 0; i < travelEvents.length - 1; i++) {
    const currentArrival = new Date(travelEvents[i].arrival.date);
    const nextDeparture = new Date(travelEvents[i + 1].departure.date);
    const layoverMs = nextDeparture.getTime() - currentArrival.getTime();
    
    if (layoverMs > 0 && layoverMs < 1000 * 60 * 60 * 48) { // Less than 48 hours (reasonable layover)
      maxLayoverMs = Math.max(maxLayoverMs, layoverMs);
    }
  }
  
  if (maxLayoverMs === 0) return null;
  
  const hours = Math.floor(maxLayoverMs / (1000 * 60 * 60));
  const minutes = Math.floor((maxLayoverMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}

/**
 * Calculate total travel duration (sum of all travel event durations)
 */
export function calculateTotalTravelDuration(events: Event[]): { hours: number; minutes: number } {
  let totalMs = 0;
  
  events
    .filter(e => e.category === 'travel')
    .forEach(event => {
      const travelEvent = event as TravelEvent;
      const departure = new Date(travelEvent.departure.date);
      const arrival = new Date(travelEvent.arrival.date);
      totalMs += arrival.getTime() - departure.getTime();
    });
  
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}

/**
 * Find the busiest day (most events)
 */
export function findBusiestDay(events: Event[]): { date: string; count: number } | null {
  const dayCount: Record<string, number> = {};
  
  events.forEach(event => {
    const dateStr = event.start.split('T')[0]; // Get YYYY-MM-DD
    dayCount[dateStr] = (dayCount[dateStr] || 0) + 1;
  });
  
  let busiestDate = '';
  let maxCount = 0;
  
  Object.entries(dayCount).forEach(([date, count]) => {
    if (count > maxCount) {
      maxCount = count;
      busiestDate = date;
    }
  });
  
  if (maxCount === 0) return null;
  
  return { date: busiestDate, count: maxCount };
}

/**
 * Find days with no events
 */
export function findFreeDays(events: Event[], startDate: Date, endDate: Date): string[] {
  const eventDates = new Set<string>();
  
  events.forEach(event => {
    const dateStr = event.start.split('T')[0];
    eventDates.add(dateStr);
  });
  
  const freeDays: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (!eventDates.has(dateStr)) {
      freeDays.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return freeDays;
}

/**
 * Get earliest event
 */
export function getEarliestEvent(events: Event[]): Event | null {
  if (events.length === 0) return null;
  return events.reduce((earliest, event) => 
    new Date(event.start) < new Date(earliest.start) ? event : earliest
  );
}

/**
 * Get latest event
 */
export function getLatestEvent(events: Event[]): Event | null {
  if (events.length === 0) return null;
  return events.reduce((latest, event) => {
    const eventEnd = event.end || event.start;
    const latestEnd = latest.end || latest.start;
    return new Date(eventEnd) > new Date(latestEnd) ? event : latest;
  });
}

/**
 * List all unique cities visited
 */
export function listCities(events: Event[]): string[] {
  const cities = new Set<string>();
  
  events.forEach(event => {
    if (event.category === 'travel') {
      const travelEvent = event as TravelEvent;
      if (travelEvent.departure.location.city) {
        cities.add(travelEvent.departure.location.city);
      }
      if (travelEvent.arrival.location.city) {
        cities.add(travelEvent.arrival.location.city);
      }
    } else if (event.category === 'accommodation') {
      const accomEvent = event as AccommodationEvent;
      if (accomEvent.checkIn.location.city) {
        cities.add(accomEvent.checkIn.location.city);
      }
    } else {
      if (event.location.city) {
        cities.add(event.location.city);
      }
    }
  });
  
  return Array.from(cities);
}

/**
 * Calculate trip duration in days
 */
export function calculateTripDuration(tripStartDate: Date, tripEndDate: Date): number {
  const diffMs = tripEndDate.getTime() - tripStartDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Count unique countries from list of cities
 */
export function listCountries(events: Event[]): string[] {
  const countries = new Set<string>();
  
  events.forEach(event => {
    if (event.category === 'travel') {
      const travelEvent = event as TravelEvent;
      if (travelEvent.departure.location.country) {
        countries.add(travelEvent.departure.location.country);
      }
      if (travelEvent.arrival.location.country) {
        countries.add(travelEvent.arrival.location.country);
      }
    } else if (event.category === 'accommodation') {
      const accomEvent = event as AccommodationEvent;
      if (accomEvent.checkIn.location.country) {
        countries.add(accomEvent.checkIn.location.country);
      }
    } else {
      if (event.location.country) {
        countries.add(event.location.country);
      }
    }
  });
  
  return Array.from(countries);
}

/**
 * Query classifier - determines if query can be handled deterministically
 */
export function classifyQuery(question: string): {
  isDeterministic: boolean;
  functionName?: string;
} {
  const q = question.toLowerCase().trim();
  
  // Pattern matching for deterministic queries
  const patterns = [
    { patterns: ['how many countries', 'number of countries', 'count countries', 'countries visiting', 'countries am i', 'list countries', 'which countries'], fn: 'listCountries' },
    { patterns: ['how many flights', 'number of flights', 'count flights', 'total flights'], fn: 'countFlights' },
    { patterns: ['how many events', 'number of events', 'total events', 'count events'], fn: 'countEvents' },
    { patterns: ['hotel nights', 'accommodation nights', 'nights staying', 'how many nights', 'number of nights'], fn: 'calculateHotelNights' },
    { patterns: ['longest layover', 'biggest layover', 'maximum layover', 'worst layover'], fn: 'calculateLongestLayover' },
    { patterns: ['total travel time', 'total travel duration', 'time traveling', 'hours traveling', 'travel duration'], fn: 'calculateTotalTravelDuration' },
    { patterns: ['busiest day', 'most events', 'most busy day', 'busiest date'], fn: 'findBusiestDay' },
    { patterns: ['free days', 'days with no events', 'days without events', 'empty days', 'no scheduled'], fn: 'findFreeDays' },
    { patterns: ['what cities', 'which cities', 'list cities', 'cities visiting', 'cities am i'], fn: 'listCities' },
    { patterns: [ 'trip duration', 'length of trip', 'days traveling', 'duration of trip', 'total days'], fn: 'calculateTripDuration' },
  ];
  
  for (const { patterns: patternList, fn } of patterns) {
    if (patternList.some(pattern => q.includes(pattern))) {
      return { isDeterministic: true, functionName: fn };
    }
  }
  
  return { isDeterministic: false };
}

/**
 * Execute deterministic function by name
 */
export function executeDeterministicFunction(
  functionName: string,
  events: Event[],
  tripStartDate?: Date,
  tripEndDate?: Date
): string {
  switch (functionName) {
    case 'countCountries': {
      const count = countCountries(events);
      return `You are visiting ${count} ${count === 1 ? 'country' : 'countries'}.`;
    }
    case 'countFlights': {
      const count = countFlights(events);
      return `You have ${count} ${count === 1 ? 'flight' : 'flights'}.`;
    }
    case 'countEvents': {
      const count = countEvents(events);
      return `Your trip has ${count} ${count === 1 ? 'event' : 'events'}.`;
    }
    case 'calculateHotelNights': {
      const nights = calculateHotelNights(events);
      return `You have ${nights} ${nights === 1 ? 'night' : 'nights'} of accommodation.`;
    }
    case 'calculateLongestLayover': {
      const layover = calculateLongestLayover(events);
      if (!layover) {
        return 'No layovers found between consecutive travel events.';
      }
      if (layover.hours === 0) {
        return `Your longest layover is ${layover.minutes} minutes.`;
      }
      return `Your longest layover is ${layover.hours} hours and ${layover.minutes} minutes.`;
    }
    case 'calculateTotalTravelDuration': {
      const duration = calculateTotalTravelDuration(events);
      return `Your total travel time is ${duration.hours} hours and ${duration.minutes} minutes.`;
    }
    case 'findBusiestDay': {
      const busiest = findBusiestDay(events);
      if (!busiest) {
        return 'No events found.';
      }
      return `Your busiest day is ${busiest.date} with ${busiest.count} ${busiest.count === 1 ? 'event' : 'events'}.`;
    }
    case 'findFreeDays': {
      if (!tripStartDate || !tripEndDate) {
        return 'Cannot determine free days without trip start and end dates.';
      }
      const freeDays = findFreeDays(events, tripStartDate, tripEndDate);
      if (freeDays.length === 0) {
        return 'You have no free days - every day has at least one event!';
      }
      return `You have ${freeDays.length} free ${freeDays.length === 1 ? 'day' : 'days'}: ${freeDays.slice(0, 5).join(', ')}${freeDays.length > 5 ? '...' : ''}.`;
    }
    case 'listCities': {
      const cities = listCities(events);
      if (cities.length === 0) {
        return 'No cities found in your itinerary.';
      }
      return `You are visiting ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}: ${cities.join(', ')}.`;
    }
    case 'listCountries': {
      const countries = listCountries(events);
      if (countries.length === 0) {
        return 'No countries found in your itinerary.';
      }
      return `You are visiting ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}: ${countries.join(', ')}.`;
    }
    case 'calculateTripDuration': {
      if (!tripStartDate || !tripEndDate) {
        return 'Cannot determine trip duration without start and end dates.';
      }
      const days = calculateTripDuration(tripStartDate, tripEndDate);
      return `Your trip is ${days} ${days === 1 ? 'day' : 'days'} long.`;
    }
    default:
      return 'Unknown deterministic function.';
  }
}
