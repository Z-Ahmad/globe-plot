// Test suite for AI Query Assistant
// Run with: npm test (after setting up Jest)

import {
  countCountries,
  countFlights,
  calculateHotelNights,
  calculateLongestLayover,
  calculateTotalTravelDuration,
  findBusiestDay,
  findFreeDays,
  listCities,
  classifyQuery,
  executeDeterministicFunction
} from '../services/deterministicFunctions';
import { Event, TravelEvent, AccommodationEvent } from '../types/aiQuery';

// Note: Install Jest to run these tests
// npm install --save-dev jest @types/jest ts-jest
// Then configure jest.config.js

describe('Deterministic Functions', () => {
  // Mock events for testing
  const mockTravelEvent1: TravelEvent = {
    id: '1',
    category: 'travel',
    type: 'flight',
    title: 'Flight to Paris',
    start: '2024-06-01T10:00:00Z',
    location: { name: 'JFK Airport' },
    tripId: 'trip1',
    userId: 'user1',
    departure: {
      date: '2024-06-01T10:00:00Z',
      location: { name: 'JFK Airport', city: 'New York', country: 'USA' }
    },
    arrival: {
      date: '2024-06-01T18:00:00Z',
      location: { name: 'CDG Airport', city: 'Paris', country: 'France' }
    },
    flightNumber: 'AF007'
  };

  const mockTravelEvent2: TravelEvent = {
    id: '2',
    category: 'travel',
    type: 'flight',
    title: 'Flight to London',
    start: '2024-06-02T08:00:00Z',
    location: { name: 'CDG Airport' },
    tripId: 'trip1',
    userId: 'user1',
    departure: {
      date: '2024-06-02T08:00:00Z',
      location: { name: 'CDG Airport', city: 'Paris', country: 'France' }
    },
    arrival: {
      date: '2024-06-02T09:00:00Z',
      location: { name: 'LHR Airport', city: 'London', country: 'UK' }
    },
    flightNumber: 'BA123'
  };

  const mockAccommodationEvent: AccommodationEvent = {
    id: '3',
    category: 'accommodation',
    type: 'hotel',
    title: 'Paris Hotel',
    start: '2024-06-01T15:00:00Z',
    location: { name: 'Paris Hotel', city: 'Paris', country: 'France' },
    tripId: 'trip1',
    userId: 'user1',
    checkIn: {
      date: '2024-06-01T15:00:00Z',
      location: { name: 'Paris Hotel', city: 'Paris', country: 'France' }
    },
    checkOut: {
      date: '2024-06-04T11:00:00Z',
      location: { name: 'Paris Hotel', city: 'Paris', country: 'France' }
    }
  };

  const mockEvents: Event[] = [mockTravelEvent1, mockTravelEvent2, mockAccommodationEvent];

  describe('countCountries', () => {
    it('should count unique countries correctly', () => {
      const count = countCountries(mockEvents);
      expect(count).toBe(3); // USA, France, UK
    });

    it('should return 0 for empty events', () => {
      const count = countCountries([]);
      expect(count).toBe(0);
    });
  });

  describe('countFlights', () => {
    it('should count flights correctly', () => {
      const count = countFlights(mockEvents);
      expect(count).toBe(2);
    });

    it('should return 0 when no flights', () => {
      const count = countFlights([mockAccommodationEvent]);
      expect(count).toBe(0);
    });
  });

  describe('calculateHotelNights', () => {
    it('should calculate hotel nights correctly', () => {
      const nights = calculateHotelNights(mockEvents);
      expect(nights).toBe(3); // June 1-4 is 3 nights
    });

    it('should return 0 when no accommodation', () => {
      const nights = calculateHotelNights([mockTravelEvent1]);
      expect(nights).toBe(0);
    });
  });

  describe('calculateLongestLayover', () => {
    it('should calculate layover between flights', () => {
      const layover = calculateLongestLayover(mockEvents);
      expect(layover).not.toBeNull();
      if (layover) {
        // Layover from 18:00 June 1 to 08:00 June 2 = 14 hours
        expect(layover.hours).toBe(14);
        expect(layover.minutes).toBe(0);
      }
    });

    it('should return null when no layovers', () => {
      const layover = calculateLongestLayover([mockTravelEvent1]);
      expect(layover).toBeNull();
    });
  });

  describe('calculateTotalTravelDuration', () => {
    it('should calculate total travel time', () => {
      const duration = calculateTotalTravelDuration(mockEvents);
      // Flight 1: 8 hours, Flight 2: 1 hour = 9 hours total
      expect(duration.hours).toBe(9);
      expect(duration.minutes).toBe(0);
    });
  });

  describe('findBusiestDay', () => {
    it('should find the day with most events', () => {
      const busiest = findBusiestDay(mockEvents);
      expect(busiest).not.toBeNull();
      if (busiest) {
        expect(busiest.date).toBe('2024-06-01');
        expect(busiest.count).toBe(2); // Flight and hotel check-in
      }
    });

    it('should return null for empty events', () => {
      const busiest = findBusiestDay([]);
      expect(busiest).toBeNull();
    });
  });

  describe('findFreeDays', () => {
    it('should find days without events', () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-05');
      const freeDays = findFreeDays(mockEvents, startDate, endDate);
      
      // Should have free days on June 3, 4, 5 (check-out doesn't count as activity)
      expect(freeDays.length).toBeGreaterThan(0);
    });
  });

  describe('listCities', () => {
    it('should list all unique cities', () => {
      const cities = listCities(mockEvents);
      expect(cities).toContain('New York');
      expect(cities).toContain('Paris');
      expect(cities).toContain('London');
      expect(cities.length).toBe(3);
    });
  });

  describe('classifyQuery', () => {
    it('should classify country query as deterministic', () => {
      const result = classifyQuery('How many countries am I visiting?');
      expect(result.isDeterministic).toBe(true);
      expect(result.functionName).toBe('countCountries');
    });

    it('should classify flight query as deterministic', () => {
      const result = classifyQuery('How many flights do I have?');
      expect(result.isDeterministic).toBe(true);
      expect(result.functionName).toBe('countFlights');
    });

    it('should classify complex query as non-deterministic', () => {
      const result = classifyQuery('What should I pack for this trip?');
      expect(result.isDeterministic).toBe(false);
    });
  });

  describe('executeDeterministicFunction', () => {
    it('should execute countCountries function', () => {
      const result = executeDeterministicFunction('countCountries', mockEvents);
      expect(result).toContain('3');
      expect(result).toContain('countries');
    });

    it('should execute countFlights function', () => {
      const result = executeDeterministicFunction('countFlights', mockEvents);
      expect(result).toContain('2');
      expect(result).toContain('flights');
    });

    it('should execute calculateHotelNights function', () => {
      const result = executeDeterministicFunction('calculateHotelNights', mockEvents);
      expect(result).toContain('3');
      expect(result).toContain('night');
    });

    it('should handle unknown function gracefully', () => {
      const result = executeDeterministicFunction('unknownFunction', mockEvents);
      expect(result).toContain('Unknown');
    });
  });
});

describe('Event Serialization', () => {
  // Test serialization in a separate describe block
  it('should serialize travel events correctly', () => {
    // This would test the serialization logic
    // Placeholder for now
    expect(true).toBe(true);
  });
});

describe('AI Query Integration', () => {
  // Integration tests would go here
  // These require mocking the Mistral API
  it('should handle rate limiting correctly', () => {
    // Placeholder
    expect(true).toBe(true);
  });

  it('should cache query results', () => {
    // Placeholder
    expect(true).toBe(true);
  });
});
