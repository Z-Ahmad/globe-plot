import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Event categories (broad)
export type EventCategory = 'travel' | 'accommodation' | 'experience' | 'meal';

// Event types (specific)
export type EventType =
  | 'flight'
  | 'train'
  | 'car'
  | 'boat'
  | 'bus'
  | 'hotel'
  | 'hostel'
  | 'airbnb'
  | 'activity'
  | 'tour'
  | 'museum'
  | 'concert'
  | 'restaurant'
  | 'other';

export interface Event {
  id: string;
  category: EventCategory;
  type: EventType;
  title: string;
  start: string; // ISO date
  end?: string;  // ISO date, optional
  city: string;
  country: string;
  locationName?: string;
  address?: string;
  notes?: string;
  // type-specific fields (e.g., flightNumber, bookingReference, etc.)
  [key: string]: any;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'email' | 'image';
  url: string;
  associatedEvents: string[]; // Event IDs
}

export interface Trip {
  id: string;
  name: string;
  dateRange: string; // or startDate/endDate
  events: Event[];
  documents: Document[];
}

interface TripState {
  trips: Trip[];
  addTrip: (trip: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, trip: Partial<Trip>) => void;
  addEvent: (tripId: string, event: Event) => void;
  removeEvent: (tripId: string, eventId: string) => void;
  updateEvent: (tripId: string, eventId: string, event: Partial<Event>) => void;
  addDocument: (tripId: string, document: Document) => void;
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
      addEvent: (tripId, event) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, events: [...trip.events, event] }
            : trip
        )
      })),
      removeEvent: (tripId, eventId) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, events: trip.events.filter(event => event.id !== eventId) }
            : trip
        )
      })),
      updateEvent: (tripId, eventId, updatedEvent) => set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                events: trip.events.map(event =>
                  event.id === eventId 
                    ? { ...event, ...updatedEvent } as Event 
                    : event
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
