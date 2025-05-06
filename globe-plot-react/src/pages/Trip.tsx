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
import { EventCard } from '@/components/EventCard';
import { EventEditor } from '@/components/EventEditor';

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
  const { trips, removeEvent, updateEvent } = useTripStore();
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);

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

  // Handlers for event actions
  const handleEditEvent = (event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  };

  const handleSaveEventEdit = (updatedEvent: Event) => {
    if (id) {
      updateEvent(id, updatedEvent.id, updatedEvent);
      setShowEventEditor(false);
      setCurrentEditingEvent(null);
    }
  };

  const handleCloseEventEditor = () => {
    setShowEventEditor(false);
    setCurrentEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (id) {
      removeEvent(id, eventId);
    }
  };

  // Sidebar expand/collapse logic
  const handleAccordionChange = (value: string[]) => setExpanded(value);

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
      {/* Sidebar: Countries > Cities > Events */}
      <aside className="col-span-3 hidden md:block">
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
                                const { icon, color } = getEventStyle(event);
                                return (
                                  <li key={event.id} className="truncate text-xs flex items-center">
                                    <span className={`${color} mr-1`}>{React.createElement(icon, { size: 14 })}</span>
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
      <section className="col-span-12 md:col-span-9 bg-gradient-to-b from-card to-card/98 border border-border rounded-lg shadow-sm p-6">
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
            sortedEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                showEditControls={true}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            ))
          )}
        </div>
      </section>

      {/* Event Editor Dialog */}
      <EventEditor
        event={currentEditingEvent}
        isOpen={showEventEditor}
        onClose={handleCloseEventEditor}
        onSave={handleSaveEventEdit}
      />
    </div>
  );
}; 