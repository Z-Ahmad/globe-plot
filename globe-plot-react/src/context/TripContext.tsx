import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Event, Trip } from '@/types/trip';
import { useTripStore } from '@/stores/tripStore';

interface TripContextValue {
  tripId: string | null;
  trip: Trip | null;
  events: Event[];
  focusedEventId: string | null;
  setFocusedEventId: (id: string | null) => void;
  updateEvent: (eventId: string, eventData: Event) => Promise<void>;
  addEvent: (event: Event) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  setTripEvents: (newEvents: Event[]) => void;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export const TripProvider: React.FC<{
  children: React.ReactNode;
  tripId: string | null;
}> = ({ children, tripId }) => {
  const { 
    trips, 
    updateEvent: storeUpdateEvent, 
    addEvent: storeAddEvent, 
    removeEvent: storeRemoveEvent,
    setEventsForTrip: storeSetEventsForTrip
  } = useTripStore();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  
  // Memoize trip data to avoid unnecessary re-renders
  const trip = useMemo(() => {
    return tripId ? trips.find(t => t.id === tripId) || null : null;
  }, [tripId, trips]);
  
  // Memoize events data to maintain reference stability
  const events = useMemo(() => {
    return trip?.events || [];
  }, [trip?.events]);

  // Wrap event update functions to provide stability
  const updateEventHandler = useCallback(async (eventId: string, eventData: Event) => {
    if (!tripId) return;
    await storeUpdateEvent(tripId, eventId, eventData);
  }, [tripId, storeUpdateEvent]);

  const addEventHandler = useCallback(async (event: Event) => {
    if (!tripId) return;
    await storeAddEvent(tripId, event);
  }, [tripId, storeAddEvent]);

  const removeEventHandler = useCallback(async (eventId: string) => {
    if (!tripId) return;
    await storeRemoveEvent(tripId, eventId);
  }, [tripId, storeRemoveEvent]);

  const setTripEventsHandler = useCallback((newEvents: Event[]) => {
    if (!tripId) return;
    storeSetEventsForTrip(tripId, newEvents);
  }, [tripId, storeSetEventsForTrip]);

  // Create stable context value
  const contextValue = useMemo(() => ({
    tripId,
    trip,
    events,
    focusedEventId,
    setFocusedEventId,
    updateEvent: updateEventHandler,
    addEvent: addEventHandler,
    removeEvent: removeEventHandler,
    setTripEvents: setTripEventsHandler,
  }), [
    tripId, 
    trip, 
    events, 
    focusedEventId, 
    updateEventHandler, 
    addEventHandler, 
    removeEventHandler,
    setTripEventsHandler
  ]);

  return (
    <TripContext.Provider value={contextValue}>
      {children}
    </TripContext.Provider>
  );
};

// Global map view state
// This is outside the context to allow components to control Itinerary's view mode
let globalViewModeCallback: ((mode: 'map') => void) | null = null;

// Register a callback to control the Itinerary view mode
export const registerViewModeCallback = (callback: (mode: 'map') => void) => {
  globalViewModeCallback = callback;
};

// Clear the callback when component unmounts
export const clearViewModeCallback = () => {
  globalViewModeCallback = null;
};

// Function to focus on an event and switch to map view
export const focusEventOnMap = (eventId: string | null) => {
  // Switch to map mode
  if (globalViewModeCallback) {
    globalViewModeCallback('map');
  }
  
  // We'll use a custom event to communicate between components
  // This is necessary because we can't directly modify the context from here
  const event = new CustomEvent('focusEventOnMap', { 
    detail: { eventId } 
  });
  window.dispatchEvent(event);
};

export const useTripContext = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
}; 