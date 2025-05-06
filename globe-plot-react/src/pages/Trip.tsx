import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore, Event } from '../stores/tripStore';
import { format, parseISO } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getEventStyle } from '../styles/eventStyles';

// Helper: group and sort events by country and city by earliest event date
function groupAndSortEventsByCountryCity(events: Event[]) {
  // Group events by country/city and track earliest date
  const groups: Record<string, { earliest: number, cities: Record<string, { earliest: number, events: Event[] }> }> = {};

  events.forEach(event => {
    const eventTime = event.start ? new Date(event.start).getTime() : 0;
    if (!groups[event.country]) {
      groups[event.country] = { earliest: eventTime, cities: {} };
    } else {
      groups[event.country].earliest = Math.min(groups[event.country].earliest, eventTime);
    }
    if (!groups[event.country].cities[event.city]) {
      groups[event.country].cities[event.city] = { earliest: eventTime, events: [] };
    } else {
      groups[event.country].cities[event.city].earliest = Math.min(groups[event.country].cities[event.city].earliest, eventTime);
    }
    groups[event.country].cities[event.city].events.push(event);
  });

  // Sort countries by earliest event
  const sortedCountries = Object.entries(groups).sort((a, b) => a[1].earliest - b[1].earliest);

  // For each country, sort cities by earliest event
  const result: [string, [string, Event[]][]][] = sortedCountries.map(([country, { cities }]) => {
    const sortedCities = Object.entries(cities)
      .sort((a, b) => a[1].earliest - b[1].earliest)
      .map(([city, { events }]) => [city, events] as [string, Event[]]);
    return [country, sortedCities];
  });

  return result; // [ [country, [ [city, events[]], ... ] ], ... ]
}

// Helper: sort events chronologically by start date
function sortEventsByStart(events: Event[]) {
  return [...events].sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0;
    const bTime = b.start ? new Date(b.start).getTime() : 0;
    return aTime - bTime;
  });
}

// Helper: format date/time
const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};
const formatTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return dateStr;
  }
};

export const Trip = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips } = useTripStore();

  const trip = trips.find(trip => trip.id === id);
  const [expanded, setExpanded] = useState<string[]>([]);

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Trip Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The trip you're looking for couldn't be found.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Group and sort events for sidebar
  const groupedSorted = groupAndSortEventsByCountryCity(trip.events);

  // For main content: show all events chronologically
  const sortedEvents = sortEventsByStart(trip.events);
  console.log(sortedEvents);

  // Sidebar expand/collapse logic
  const handleAccordionChange = (value: string[]) => setExpanded(value);

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
      {/* Sidebar: Countries > Cities > Events */}
      <aside className="col-span-3">
        <div className="sticky top-6 bg-sidebar border border-sidebar-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-sidebar-primary text-sidebar-primary-foreground flex justify-between items-center">
            <h3 className="font-semibold">Itinerary</h3>
            <span className="text-xs font-medium bg-sidebar-primary-foreground/20 rounded-full px-2 py-0.5">
              {trip.events.length} events
            </span>
          </div>
          <div className="p-3">
            <Accordion type="multiple" value={expanded} onValueChange={handleAccordionChange} className="w-full">
              {groupedSorted.map(([country, cities]) => (
                <AccordionItem key={country} value={country}>
                  <AccordionTrigger className="font-semibold text-base">
                    {country}
                  </AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="w-full">
                      {cities.map(([city, events]) => (
                        <AccordionItem key={city} value={city}>
                          <AccordionTrigger className="text-sm font-medium">
                            {city} <span className="ml-2 text-xs text-muted-foreground">({events.length})</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="pl-2 space-y-1">
                              {sortEventsByStart(events).map(event => {
                                const { emoji } = getEventStyle(event);
                                return (
                                  <li key={event.id} className="truncate text-xs">
                                    <span className="mr-1">{emoji}</span>
                                    <span className="font-semibold">{event.title}</span>
                                    <span className="ml-1 text-muted-foreground">{formatDate(event.start)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </aside>

      {/* Main Content: Chronological event list */}
      <section className="col-span-9 bg-gradient-to-b from-card to-card/98 border border-border rounded-lg shadow-sm p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <p className="text-muted-foreground flex items-center">
            <span className="mr-2">📅</span> {trip.dateRange}
            <span className="mx-2 text-border">•</span>
            <span>{trip.events.length} events</span>
          </p>
        </div>
        <div className="space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-2xl">🗓️</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">No events added yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add your first event to start planning your trip itinerary.
              </p>
            </div>
          ) : (
            sortedEvents.map(event => {
              const { emoji, bgColor, borderColor, color } = getEventStyle(event);
              return (
                <div 
                  key={event.id} 
                  className={`p-5 border rounded-lg shadow-sm ${borderColor} ${bgColor}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl mr-2">{emoji}</span>
                      <span className={`font-semibold text-lg ${color}`}>{event.title}</span>
                      <span className="text-xs bg-white/70 text-muted-foreground px-2 py-0.5 rounded-full">
                        {event.category} / {event.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDate(event.start)} {formatTime(event.start)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {event.city}, {event.country}
                  </div>
                  {event.locationName && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Location:</span> {event.locationName}
                    </div>
                  )}
                  {event.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{event.notes}</div>
                  )}
                  {/* Travel Events (flight, train, car, boat, bus, other) */}
                  {event.category === 'travel' && (
                    <div className="mt-2 text-xs">
                      {event.type === 'flight' && (
                        <>
                          <div>Flight: {event.flightNumber} {event.airline && `(${event.airline})`}</div>
                          {event.departure && (
                            <div>Departure: {event.departure.location?.name} {event.departure.time && `@ ${formatDate(event.departure.time)} ${formatTime(event.departure.time)}`}</div>
                          )}
                          {event.arrival && (
                            <div>Arrival: {event.arrival.location?.name} {event.arrival.time && `@ ${formatDate(event.arrival.time)} ${formatTime(event.arrival.time)}`}</div>
                          )}
                          {event.seat && <div>Seat: {event.seat}</div>}
                          {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                        </>
                      )}
                      {['train', 'car', 'boat', 'bus', 'other'].includes(event.type) && (
                        <>
                          <div>{event.type.charAt(0).toUpperCase() + event.type.slice(1)} transit</div>
                          {event.departure && (
                            <div>Departure: {event.departure.location?.name} {event.departure.time && `@ ${formatDate(event.departure.time)} ${formatTime(event.departure.time)}`}</div>
                          )}
                          {event.arrival && (
                            <div>Arrival: {event.arrival.location?.name} {event.arrival.time && `@ ${formatDate(event.arrival.time)} ${formatTime(event.arrival.time)}`}</div>
                          )}
                          {event.seat && <div>Seat: {event.seat}</div>}
                          {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                        </>
                      )}
                    </div>
                  )}
                  {/* Accommodation Events (hotel, hostel, airbnb, other) */}
                  {event.category === 'accommodation' && (
                    <div className="mt-2 text-xs">
                      <div>Place: {event.placeName}</div>
                      {event.checkIn && (
                        <div>Check-in: {event.checkIn.location?.name} {event.checkIn.time && `@ ${formatDate(event.checkIn.time)} ${formatTime(event.checkIn.time)}`}</div>
                      )}
                      {event.checkOut && (
                        <div>Check-out: {event.checkOut.location?.name} {event.checkOut.time && `@ ${formatDate(event.checkOut.time)} ${formatTime(event.checkOut.time)}`}</div>
                      )}
                      {event.roomNumber && <div>Room: {event.roomNumber}</div>}
                      {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                      {event.notes && <div>{event.notes}</div>}
                    </div>
                  )}
                  {/* Experience Events (activity, tour, museum, concert, other) */}
                  {event.category === 'experience' && (
                    <div className="mt-2 text-xs">
                      <div>Type: {event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div>
                      {event.location && <div>Location: {event.location.name}</div>}
                      {event.startTime && <div>Start: {formatDate(event.startTime)} {formatTime(event.startTime)}</div>}
                      {event.endTime && <div>End: {formatDate(event.endTime)} {formatTime(event.endTime)}</div>}
                      {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                      {event.notes && <div>Notes: {event.notes}</div>}
                    </div>
                  )}
                  {/* Meal Events (restaurant, other) */}
                  {event.category === 'meal' && (
                    <div className="mt-2 text-xs">
                      <div>Type: {event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div>
                      {event.location && <div>Location: {event.location.name}</div>}
                      {event.time && <div>Time: {formatDate(event.time)} {formatTime(event.time)}</div>}
                      {event.reservationReference && <div>Reservation Ref: {event.reservationReference}</div>}
                      {event.notes && <div>Notes: {event.notes}</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}; 