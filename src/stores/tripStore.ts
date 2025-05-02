import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Trip {
  id: string;
  name: string;
  dateRange: string;
  stops: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  dateRange: string;
  events: Event[];
}

export interface Event {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'meal' | 'transit';
  title: string;
  time: string;
  notes: string;
}

interface TripState {
  trips: Trip[];
  addTrip: (trip: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, trip: Partial<Trip>) => void;
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
    }),
    {
      name: 'trip-storage',
    }
  )
);
