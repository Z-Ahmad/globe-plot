import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event } from '@/types/trip';
import { hasMappableCoordinates } from '../mapEventUtils';

interface UseNavigableEventNavigationArgs {
  events: Event[];
  focusedEventId: string | null;
  setFocusedEventId: (eventId: string | null) => void;
}

export const useNavigableEventNavigation = ({
  events,
  focusedEventId,
  setFocusedEventId,
}: UseNavigableEventNavigationArgs) => {
  const [activeNavigableEventIndex, setActiveNavigableEventIndex] = useState<number | null>(null);

  const navigableEvents = useMemo(() => {
    return [...events]
      .filter(hasMappableCoordinates)
      .sort((a, b) => {
        if (!a.start || !b.start) return 0;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [events]);

  useEffect(() => {
    if (navigableEvents.length === 0) {
      setActiveNavigableEventIndex(null);
      return;
    }

    if (focusedEventId) {
      const index = navigableEvents.findIndex((event) => event.id === focusedEventId);
      if (index >= 0) {
        setActiveNavigableEventIndex(index);
        return;
      }
    }

    if (activeNavigableEventIndex !== null && activeNavigableEventIndex >= navigableEvents.length) {
      setActiveNavigableEventIndex(null);
      return;
    }

    if (activeNavigableEventIndex !== null && !navigableEvents[activeNavigableEventIndex]) {
      setActiveNavigableEventIndex(null);
    }
  }, [focusedEventId, navigableEvents]);

  const goToNextEvent = useCallback(() => {
    if (navigableEvents.length === 0) return;

    const nextIndex =
      activeNavigableEventIndex === null
        ? 0
        : (activeNavigableEventIndex + 1) % navigableEvents.length;
    const nextEvent = navigableEvents[nextIndex];
    if (nextEvent?.id) setFocusedEventId(nextEvent.id);
  }, [activeNavigableEventIndex, navigableEvents, setFocusedEventId]);

  const goToPrevEvent = useCallback(() => {
    if (navigableEvents.length === 0) return;

    const prevIndex =
      activeNavigableEventIndex === null
        ? navigableEvents.length - 1
        : (activeNavigableEventIndex - 1 + navigableEvents.length) % navigableEvents.length;
    const prevEvent = navigableEvents[prevIndex];
    if (prevEvent?.id) setFocusedEventId(prevEvent.id);
  }, [activeNavigableEventIndex, navigableEvents, setFocusedEventId]);

  return {
    navigableEvents,
    activeNavigableEventIndex,
    goToNextEvent,
    goToPrevEvent,
  };
};

