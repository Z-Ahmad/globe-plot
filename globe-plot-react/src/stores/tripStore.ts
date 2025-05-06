import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Event,
  Trip,
  Document
} from '../types/trip';

// Re-export types for backward compatibility
export * from '../types/trip';

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
