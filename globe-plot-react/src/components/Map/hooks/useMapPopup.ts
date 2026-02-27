import { RefObject, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { format } from 'date-fns';
import { Event } from '@/types/trip';
import { getEventStyle } from '@/styles/eventStyles';

interface MapboxPopupWithListeners extends mapboxgl.Popup {
  _associatedEventId?: string;
  _customMapboxCloseListener?: () => void;
  _customTitleClickListener?: (e: MouseEvent) => void;
  _customTitleClickElement?: HTMLElement;
}

interface UseMapPopupArgs {
  mapRef: RefObject<mapboxgl.Map | null>;
  onEditEventRequest: (event: Event) => void;
  setFocusedEventId: (id: string | null) => void;
}

export const useMapPopup = ({
  mapRef,
  onEditEventRequest,
  setFocusedEventId,
}: UseMapPopupArgs) => {
  const popupRef = useRef<MapboxPopupWithListeners | null>(null);

  const closeCurrentPopup = useCallback(() => {
    if (!popupRef.current) return;

    const popupToClose = popupRef.current;
    popupRef.current = null;

    if (popupToClose._customTitleClickListener && popupToClose._customTitleClickElement) {
      popupToClose._customTitleClickElement.removeEventListener(
        'click',
        popupToClose._customTitleClickListener
      );
      popupToClose._customTitleClickElement = undefined;
      popupToClose._customTitleClickListener = undefined;
    }

    if (popupToClose._customMapboxCloseListener) {
      popupToClose.off('close', popupToClose._customMapboxCloseListener);
      popupToClose._customMapboxCloseListener = undefined;
    }

    popupToClose.remove();
  }, []);

  const showPopupForEvent = useCallback(
    (event: Event, coordinates: [number, number]) => {
      if (!mapRef.current || !event.id) return;

      closeCurrentPopup();

      const style = getEventStyle(event);
      const cssColor = style.cssColor || 'var(--gray-700)';
      const cssBgColor = style.cssBgColor || 'var(--gray-50)';

      let locationDisplay = event.location?.name || '';
      if (!locationDisplay && event.location?.city) {
        locationDisplay = event.location.city;
        if (event.location.country) locationDisplay += `, ${event.location.country}`;
      } else if (!locationDisplay && event.location?.country) {
        locationDisplay = event.location.country;
      }

      if (event.category === 'travel') {
        const departureName = event.departure?.location?.name || event.departure?.location?.city || 'N/A';
        const arrivalName = event.arrival?.location?.name || event.arrival?.location?.city || 'N/A';
        locationDisplay = `${departureName} -> ${arrivalName}`;
      } else if (event.category === 'accommodation') {
        locationDisplay = event.placeName || event.checkIn?.location?.name || event.checkIn?.location?.city || 'N/A';
      }

      const startDateFormatted = event.start ? format(new Date(event.start), 'MMM d, yyyy, h:mm a') : '';
      const endDateFormatted =
        event.start && event.end && event.end !== event.start ? format(new Date(event.end), 'h:mm a') : '';
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

      const popupHTML = `
        <div class="event-popup-card" style="background-color: ${cssBgColor}; padding: 10px; border-radius: 8px; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: ${isMobile ? '90vw' : 'auto'}; min-width: ${isMobile ? 'none' : '260px'}; max-width: ${isMobile ? '280px' : '320px'};">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <div style="flex-grow: 1; min-width: 0;">
              <h3 class="popup-event-title-button" style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: ${cssColor}; cursor: pointer;" title="Edit this event">
                ${event.title}
              </h3>
              ${locationDisplay ? `<p style="color: var(--gray-700); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${locationDisplay}">${locationDisplay}</p>` : ''}
              <div style="font-size: 12px; color: var(--gray-600); line-height: 1.4;">
                <p><span style="text-transform: capitalize; font-weight: 500; color: ${cssColor};">${event.category}</span> (${event.type})</p>
                ${startDateFormatted ? `<p>${startDateFormatted}${endDateFormatted ? ` - ${endDateFormatted}` : ''}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      const newPopup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 25,
        className: 'event-details-popup',
        maxWidth: '350px',
        anchor: isMobile ? 'bottom' : undefined,
      }) as MapboxPopupWithListeners;

      newPopup.setLngLat(coordinates).setHTML(popupHTML).addTo(mapRef.current);
      newPopup._associatedEventId = event.id;

      const popupElement = newPopup.getElement();
      const titleElement = popupElement?.querySelector('.popup-event-title-button') as HTMLElement | null;

      if (titleElement) {
        const titleClickListener = (e: MouseEvent) => {
          e.stopPropagation();
          onEditEventRequest(event);
          setFocusedEventId(null);
        };
        titleElement.addEventListener('click', titleClickListener);
        newPopup._customTitleClickListener = titleClickListener;
        newPopup._customTitleClickElement = titleElement;
      }

      const handleMapboxPopupClose = () => {
        if (popupRef.current === newPopup) setFocusedEventId(null);
        newPopup._customMapboxCloseListener = undefined;
      };

      newPopup.on('close', handleMapboxPopupClose);
      newPopup._customMapboxCloseListener = handleMapboxPopupClose;
      popupRef.current = newPopup;
    },
    [closeCurrentPopup, mapRef, onEditEventRequest, setFocusedEventId]
  );

  const getPopupState = useCallback(() => {
    if (!popupRef.current || !popupRef.current.isOpen()) {
      return { isOpen: false as const };
    }

    const lngLat = popupRef.current.getLngLat();
    return {
      isOpen: true as const,
      eventId: popupRef.current._associatedEventId || null,
      coordinates: [lngLat.lng, lngLat.lat] as [number, number],
    };
  }, []);

  return {
    closeCurrentPopup,
    showPopupForEvent,
    getPopupState,
  };
};

