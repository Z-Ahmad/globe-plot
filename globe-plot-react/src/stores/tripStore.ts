import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Location {
  id: string;
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BaseEvent {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'meal' | 'transit';
  title: string;
  notes?: string;
}

export interface FlightEvent extends BaseEvent {
  type: 'flight';
  flightNumber: string;
  airline: string;
  departure: {
    location: Location;
    time: string;
    terminal?: string;
  };
  arrival: {
    location: Location;
    time: string;
    terminal?: string;
  };
  bookingReference?: string;
  seat?: string;
}

export interface HotelEvent extends BaseEvent {
  type: 'hotel';
  hotelName: string;
  checkIn: {
    time: string;
    location: Location;
  };
  checkOut: {
    time: string;
    location: Location;
  };
  bookingReference?: string;
  roomNumber?: string;
}

export interface TransitEvent extends BaseEvent {
  type: 'transit';
  mode: 'train' | 'bus' | 'ferry' | 'car';
  departure: {
    location: Location;
    time: string;
  };
  arrival: {
    location: Location;
    time: string;
  };
  bookingReference?: string;
  seat?: string;
}

export interface ActivityEvent extends BaseEvent {
  type: 'activity';
  startTime: string;
  endTime: string;
  location: Location;
  bookingReference?: string;
}

export interface MealEvent extends BaseEvent {
  type: 'meal';
  time: string;
  location: Location;
  reservationReference?: string;
}

export type Event = FlightEvent | HotelEvent | TransitEvent | ActivityEvent | MealEvent;

export interface Stop {
  id: string;
  name: string;
  dateRange: string;
  location: Location;
  events: Event[];
}

export interface Trip {
  id: string;
  name: string;
  dateRange: string;
  stops: Stop[];
  documents: {
    id: string;
    name: string;
    type: 'pdf' | 'email' | 'image';
    url: string;
    associatedEvents: string[]; // Event IDs
  }[];
}

interface TripState {
  trips: Trip[];
  addTrip: (trip: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, trip: Partial<Trip>) => void;
  addStop: (tripId: string, stop: Stop) => void;
  removeStop: (tripId: string, stopId: string) => void;
  updateStop: (tripId: string, stopId: string, stop: Partial<Stop>) => void;
  addEvent: (tripId: string, stopId: string, event: Event) => void;
  removeEvent: (tripId: string, stopId: string, eventId: string) => void;
  updateEvent: (tripId: string, stopId: string, eventId: string, event: Partial<Event>) => void;
  addDocument: (tripId: string, document: Trip['documents'][0]) => void;
  removeDocument: (tripId: string, documentId: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [],
      addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] })),
      removeTrip: (id) => set((state) => ({ trips: state.trips.filter(trip => trip.id !== id) })),
      updateTrip: (id, updatedTrip) => set((state) => ({
        trips: state.trips.map(trip => 
          trip.id === id ? { ...trip, ...updatedTrip } : trip
        )
      })),
      addStop: (tripId, stop) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, stops: [...trip.stops, stop] }
            : trip
        )
      })),
      removeStop: (tripId, stopId) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, stops: trip.stops.filter(stop => stop.id !== stopId) }
            : trip
        )
      })),
      updateStop: (tripId, stopId, updatedStop) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                stops: trip.stops.map(stop =>
                  stop.id === stopId ? { ...stop, ...updatedStop } : stop
                )
              }
            : trip
        )
      })),
      addEvent: (tripId, stopId, event) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                stops: trip.stops.map(stop =>
                  stop.id === stopId
                    ? { ...stop, events: [...stop.events, event] }
                    : stop
                )
              }
            : trip
        )
      })),
      removeEvent: (tripId, stopId, eventId) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                stops: trip.stops.map(stop =>
                  stop.id === stopId
                    ? { ...stop, events: stop.events.filter(event => event.id !== eventId) }
                    : stop
                )
              }
            : trip
        )
      })),
      updateEvent: (tripId, stopId, eventId, updatedEvent) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                stops: trip.stops.map(stop =>
                  stop.id === stopId
                    ? {
                        ...stop,
                        events: stop.events.map(event =>
                          event.id === eventId 
                            ? { ...event, ...updatedEvent } as Event 
                            : event
                        )
                      }
                    : stop
                )
              }
            : trip
        )
      })),
      addDocument: (tripId, document) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, documents: [...trip.documents, document] }
            : trip
        )
      })),
      removeDocument: (tripId, documentId) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, documents: trip.documents.filter(doc => doc.id !== documentId) }
            : trip
        )
      })),
    }),
    {
      name: 'trip-storage',
    }
  )
);
