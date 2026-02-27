import { Event } from '@/types/trip';

export const hasMappableCoordinates = (event: Event): boolean => {
  return Boolean(
    (event.category === 'travel' && event.departure?.location?.geolocation) ||
      (event.category === 'accommodation' && event.checkIn?.location?.geolocation) ||
      event.location?.geolocation
  );
};

export const getMappableCoordinates = (event: Event): [number, number] | null => {
  if (event.category === 'travel' && event.departure?.location?.geolocation) {
    return [event.departure.location.geolocation.lng, event.departure.location.geolocation.lat];
  }

  if (event.category === 'accommodation' && event.checkIn?.location?.geolocation) {
    return [event.checkIn.location.geolocation.lng, event.checkIn.location.geolocation.lat];
  }

  if (event.location?.geolocation) {
    return [event.location.geolocation.lng, event.location.geolocation.lat];
  }

  return null;
};

export const countEventsMissingCoordinates = (events: Event[]): number => {
  return events.filter((event) => {
    if (event.category === 'travel') return !event.departure?.location?.geolocation;
    if (event.category === 'accommodation') return !event.checkIn?.location?.geolocation;
    if (event.category === 'experience' || event.category === 'meal') return !event.location?.geolocation;
    return false;
  }).length;
};

