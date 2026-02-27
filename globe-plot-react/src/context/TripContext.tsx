import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Event, Trip } from '@/types/trip';
import { useTripStore } from '@/stores/tripStore';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ItineraryViewMode = 'list' | 'calendar' | 'map';

interface TripContextValue {
  tripId: string | null;
  trip: Trip | null;
  events: Event[];
  loading: boolean;
  viewMode: ItineraryViewMode;
  setViewMode: (mode: ItineraryViewMode) => void;
  focusedEventId: string | null;
  setFocusedEventId: (id: string | null) => void;
  updateEvent: (eventId: string, eventData: Partial<Event>) => Promise<void>;
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
    updateEvent: storeUpdateEvent, 
    addEvent: storeAddEvent, 
    removeEvent: storeRemoveEvent,
    setEventsForTrip: storeSetEventsForTrip
  } = useTripStore();
  
  const [tripData, setTripData] = useState<Omit<Trip, 'events' | 'documents'> | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ItineraryViewMode>('list');
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTripData(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listener for the trip document itself
    const tripUnsubscribe = onSnapshot(doc(db, 'trips', tripId), (tripDoc) => {
      if (tripDoc.exists()) {
        const data = tripDoc.data();
        setTripData({
          ...data,
          id: tripDoc.id,
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate,
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate,
        } as Omit<Trip, 'events' | 'documents'>);
      } else {
        console.error(`Trip with id ${tripId} not found.`);
        setTripData(null);
        setEvents([]);
        setLoading(false);
      }
    });

    // Listener for the events of the trip
    const eventsQuery = query(collection(db, 'events'), where('tripId', '==', tripId));
    const eventsUnsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const eventData = doc.data();
        return {
          ...eventData,
          id: doc.id,
          start: eventData.start instanceof Timestamp ? eventData.start.toDate().toISOString() : eventData.start,
          end: eventData.end instanceof Timestamp ? eventData.end.toDate().toISOString() : eventData.end,
        } as Event;
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => {
      tripUnsubscribe();
      eventsUnsubscribe();
    };
  }, [tripId]);

  // Memoize the full trip object
  const trip = useMemo(() => {
    return tripData ? { ...tripData, events, documents: [] } : null; // Documents are handled separately
  }, [tripData, events]);

  // Wrap event update functions to provide stability
  const updateEventHandler = useCallback(async (eventId: string, eventData: Partial<Event>) => {
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
    loading,
    viewMode,
    setViewMode,
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
    loading,
    viewMode,
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

export const useTripContext = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
}; 