import { Feature, LineString, Point } from 'geojson';
import { Event } from '@/types/trip';
import { getMappableCoordinates } from './mapEventUtils';

type EventCoordinateSeed = {
  event: Event;
  baseCoordinates: [number, number];
  locationName: string;
  city: string;
  country: string;
};

type RouteSeed = {
  id: string;
  coordinates: [number, number];
  category: string;
  start?: string;
};

export interface MarkerDataIndex {
  coordinatesByEventId: Record<string, [number, number]>;
  clusteredEventIds: Set<string>;
  allCoordinates: [number, number][];
}

export interface BuiltMapFeatureData {
  eventFeatures: Feature<Point>[];
  routeFeatures: Feature<LineString>[];
  markerDataIndex: MarkerDataIndex;
}

export const buildMapFeatureData = (events: Event[]): BuiltMapFeatureData => {
  const eventFeatures: Feature<Point>[] = [];
  const routeSeed: RouteSeed[] = [];
  const allCoordinates: [number, number][] = [];
  const coordinatesByEventId: Record<string, [number, number]> = {};
  const clusteredEventIds = new Set<string>();

  const eventsWithCoords: EventCoordinateSeed[] = [];

  for (const event of events) {
    if (!event.id) continue;

    const coordinates = getMappableCoordinates(event);
    if (!coordinates) continue;

    // Keep valid zero coordinates (e.g. equator/prime meridian).
    if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) continue;

    let locationName = '';
    let city = '';
    let country = '';

    if (event.category === 'travel') {
      locationName =
        event.departure?.location?.name ||
        `${event.departure?.location?.city || ''}, ${event.departure?.location?.country || ''}`;
      city = event.departure?.location?.city || '';
      country = event.departure?.location?.country || '';
    } else if (event.category === 'accommodation') {
      locationName = event.placeName || event.checkIn?.location?.name || '';
      city = event.checkIn?.location?.city || '';
      country = event.checkIn?.location?.country || '';
    } else {
      locationName = event.location?.name || '';
      city = event.location?.city || '';
      country = event.location?.country || '';
    }

    eventsWithCoords.push({
      event,
      baseCoordinates: coordinates,
      locationName,
      city,
      country,
    });
  }

  const coordinateGroups = new Map<string, EventCoordinateSeed[]>();
  for (const item of eventsWithCoords) {
    const key = `${item.baseCoordinates[0].toFixed(6)},${item.baseCoordinates[1].toFixed(6)}`;
    if (!coordinateGroups.has(key)) coordinateGroups.set(key, []);
    coordinateGroups.get(key)!.push(item);
  }

  coordinateGroups.forEach((group) => {
    if (group.length > 1) {
      group.forEach((item) => {
        clusteredEventIds.add(item.event.id);
      });
    }

    if (group.length === 1) {
      const item = group[0];
      const coordinates = item.baseCoordinates;
      allCoordinates.push(coordinates);
      coordinatesByEventId[item.event.id] = coordinates;

      routeSeed.push({
        id: item.event.id,
        coordinates,
        category: item.event.category,
        start: item.event.start,
      });

      eventFeatures.push({
        type: 'Feature',
        id: item.event.id,
        properties: {
          id: item.event.id,
          title: item.event.title,
          category: item.event.category,
          type: item.event.type,
          sprite: `${item.event.category}/${item.event.type}`,
          spriteId: `styled-${item.event.category}-${item.event.type}`,
          locationName: item.locationName,
          city: item.city,
          country: item.country,
          start: item.event.start,
          end: item.event.end,
        },
        geometry: {
          type: 'Point',
          coordinates,
        },
      });

      return;
    }

    const baseCoords = group[0].baseCoordinates;
    const offsetRadius = 0.0001;
    group.forEach((item, index) => {
      const angle = (index * 2 * Math.PI) / group.length;
      const offsetCoordinates: [number, number] = [
        baseCoords[0] + offsetRadius * Math.cos(angle),
        baseCoords[1] + offsetRadius * Math.sin(angle),
      ];

      allCoordinates.push(offsetCoordinates);
      coordinatesByEventId[item.event.id] = offsetCoordinates;

      routeSeed.push({
        id: item.event.id,
        coordinates: offsetCoordinates,
        category: item.event.category,
        start: item.event.start,
      });

      eventFeatures.push({
        type: 'Feature',
        id: item.event.id,
        properties: {
          id: item.event.id,
          title: item.event.title,
          category: item.event.category,
          type: item.event.type,
          sprite: `${item.event.category}/${item.event.type}`,
          spriteId: `styled-${item.event.category}-${item.event.type}`,
          locationName: item.locationName,
          city: item.city,
          country: item.country,
          start: item.event.start,
          end: item.event.end,
        },
        geometry: {
          type: 'Point',
          coordinates: offsetCoordinates,
        },
      });
    });
  });

  const sortedRouteSeed = routeSeed
    .filter((item) => item.start)
    .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());

  const routeFeatures: Feature<LineString>[] = [];
  for (let i = 0; i < sortedRouteSeed.length - 1; i++) {
    const from = sortedRouteSeed[i];
    const to = sortedRouteSeed[i + 1];
    routeFeatures.push({
      type: 'Feature',
      properties: { category: from.category },
      geometry: {
        type: 'LineString',
        coordinates: [from.coordinates, to.coordinates],
      },
    } as Feature<LineString>);
  }

  return {
    eventFeatures,
    routeFeatures,
    markerDataIndex: {
      coordinatesByEventId,
      clusteredEventIds,
      allCoordinates,
    },
  };
};

