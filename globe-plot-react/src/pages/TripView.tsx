import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';
import { Event, TravelEvent, AccommodationEvent, ExperienceEvent, MealEvent } from '../types/trip';
import { format, parseISO, addDays, isSameDay, isBefore, isWithinInterval } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getEventStyle } from '../styles/eventStyles';
import { EventEditor } from '@/components/EventEditor';
import { 
  CalendarDays, 
  MapPinPlusInside, 
  Plus, 
  MapPin,
  ArrowRight,
  CalendarClock,
  ListTodo,
  Map as MapIcon,
  MapPinned
} from 'lucide-react';
import { formatDateRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Itinerary } from '@/components/Itinerary';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Helper function to ensure all events have the required location property
const normalizeEvent = (event: Event): Event => {
  const updatedEvent = {...event};
  
  // Ensure location exists for all event types
  if (!updatedEvent.location) {
    updatedEvent.location = { name: '' };
    
    // For travel events, use departure location
    if (updatedEvent.category === 'travel' && (updatedEvent as TravelEvent).departure?.location) {
      updatedEvent.location = {...(updatedEvent as TravelEvent).departure.location};
    }
    
    // For accommodation events, use checkIn location
    if (updatedEvent.category === 'accommodation' && (updatedEvent as AccommodationEvent).checkIn?.location) {
      updatedEvent.location = {...(updatedEvent as AccommodationEvent).checkIn.location};
    }
  }
  
  return updatedEvent;
};

// Helper function to get city and country from event
const getLocationInfo = (event: Event): { city?: string; country?: string } => {
  if (event.category === 'travel') {
    const travelEvent = event as TravelEvent;
    return {
      city: travelEvent.departure?.location?.city,
      country: travelEvent.departure?.location?.country
    };
  } else if (event.category === 'accommodation') {
    const accomEvent = event as AccommodationEvent;
    return {
      city: accomEvent.checkIn?.location?.city,
      country: accomEvent.checkIn?.location?.country
    };
  } else {
    // For experience and meal events
    return {
      city: event.location?.city,
      country: event.location?.country
    };
  }
};

// Helper: group and sort events by country and city by earliest event date
function groupAndSortEventsByCountryCity(events: Event[]) {
  // Group events by country/city and track earliest date
  const groups: Record<string, { earliest: number, cities: Record<string, { earliest: number, events: Event[] }> }> = {};

  events.forEach(event => {
    const eventTime = event.start ? new Date(event.start).getTime() : 0;
    const { city, country } = getLocationInfo(event);
    
    if (!country) return; // Skip events without country
    const cityKey = city || 'Unknown';
    
    if (!groups[country]) {
      groups[country] = { earliest: eventTime, cities: {} };
    } else {
      groups[country].earliest = Math.min(groups[country].earliest, eventTime);
    }
    
    if (!groups[country].cities[cityKey]) {
      groups[country].cities[cityKey] = { earliest: eventTime, events: [] };
    } else {
      groups[country].cities[cityKey].earliest = Math.min(groups[country].cities[cityKey].earliest, eventTime);
    }
    
    groups[country].cities[cityKey].events.push(event);
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

// Helper: format time
const formatTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return dateStr;
  }
};

// Get events for today and upcoming days
function getUpcomingEvents(events: Event[], tripStartDate: string, dayCount: number = 30) {
  if (!events.length) return [];
  
  // Sort events chronologically
  const sorted = sortEventsByStart(events);
  
  try {
    // Get today's date at the start of the day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find events that are today or later
    const upcomingEvents = sorted.filter(event => {
      if (!event.start) return false;
      
      try {
        const eventDate = parseISO(event.start);
        return eventDate >= today;
      } catch {
        return false;
      }
    });
    
    // If we're in the middle of the trip or it's started, show upcoming events
    if (upcomingEvents.length > 0) {
      return upcomingEvents.slice(0, 5);
    }
    
    // If the trip hasn't started yet, show the first events
    return sorted.slice(0, 5);
  } catch (error) {
    console.error('Date parsing error:', error);
    return sorted.slice(0, 5); // Fallback to first few events
  }
}

export const TripView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips, removeEvent, updateEvent, updateTrip, addEvent } = useTripStore();
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary");

  const trip = trips.find(trip => trip.id === id);
  
  // Initialize with empty array for main accordion
  const [expandedCountries, setExpandedCountries] = useState<string[]>([]);
  // Initialize with empty object for nested city accordions
  const [expandedCities, setExpandedCities] = useState<Record<string, string[]>>({});

  // Check and normalize events on component mount
  useEffect(() => {
    if (trip) {
      // Check if any events need normalization
      const needsNormalization = trip.events.some(event => !event.location);
      
      if (needsNormalization) {
        // Normalize all events
        const normalizedEvents = trip.events.map(normalizeEvent);
        
        // Update the trip with normalized events
        updateTrip(trip.id, { 
          events: normalizedEvents 
        });
      }
    }
  }, [trip?.id]);

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
  const upcomingEvents = getUpcomingEvents(trip.events, trip.startDate);
  
  // Get the unique countries visited
  const uniqueCountries = new Set<string>();
  trip.events.forEach(event => {
    const { country } = getLocationInfo(event);
    if (country) uniqueCountries.add(country);
  });

  // Get unique cities
  const uniqueCities = new Set<string>();
  trip.events.forEach(event => {
    const { city } = getLocationInfo(event);
    if (city) uniqueCities.add(city);
  });

  // Determine summary text based on hierarchy
  let tripSummary = "";
  if (uniqueCountries.size > 1) {
    tripSummary = `${uniqueCountries.size} ${uniqueCountries.size === 1 ? 'country' : 'countries'}`;
  } else if (uniqueCities.size > 1) {
    tripSummary = `${uniqueCities.size} ${uniqueCities.size === 1 ? 'city' : 'cities'}`;
  } else {
    tripSummary = `${trip.events.length} ${trip.events.length === 1 ? 'event' : 'events'}`;
  }

  // Handlers for event actions
  const handleEditEvent = (event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  };

  const handleSaveEventEdit = async (updatedEvent: Event) => {
    if (id) {
      try {
        // Check if this is a new event (doesn't exist in the trip yet)
        const isNewEvent = !trip.events.some(e => e.id === updatedEvent.id);
        
        if (isNewEvent) {
          // Use addEvent instead of updateTrip to ensure proper Firestore sync
          await addEvent(id, updatedEvent);
          console.log(`Added new event "${updatedEvent.title}" to trip ${id}`);
        } else {
          // Update existing event
          await updateEvent(id, updatedEvent.id, updatedEvent);
          console.log(`Updated event "${updatedEvent.title}"`);
        }
        
      setShowEventEditor(false);
      setCurrentEditingEvent(null);
      } catch (error) {
        console.error('Error saving event:', error);
        // Could add error handling UI here
      }
    }
  };

  const handleCloseEventEditor = () => {
    setShowEventEditor(false);
    setCurrentEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (id) {
      try {
        await removeEvent(id, eventId);
      } catch (error) {
        console.error('Error deleting event:', error);
        // Could add error handling UI here
      }
    }
  };

  // Create a new blank event
  const createNewEvent = (event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  };

  // Updated accordion handlers
  const handleCountryAccordionChange = (value: string[]) => {
    setExpandedCountries(value);
  };

  const handleCityAccordionChange = (country: string, value: string[]) => {
    setExpandedCities(prev => ({
      ...prev,
      [country]: value
    }));
  };

  // Empty state to display when there are no events
  const emptyState = (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-primary text-2xl">🗓️</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">No events added yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add your first event to start planning your trip itinerary.
      </p>
      <Button onClick={() => createNewEvent({
        id: uuidv4(),
        category: 'experience',
        type: 'activity',
        title: 'New Event',
        start: '',
        location: {
          name: '',
          city: '',
          country: ''
        }
      } as any)} className="flex items-center gap-2">
        <Plus size={16} />
        <span>Add Your First Event</span>
      </Button>
    </div>
  );

  // Reusable content sections
  const ComingUpSection = () => (
    <section className="bg-card border border-border shadow-sm rounded-lg p-6 h-full overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <span>Coming Up</span>
        </h2>
        <span className="text-xs text-muted-foreground">{upcomingEvents.length} upcoming events</span>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p>No upcoming events in the next few days</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.map(event => {
            const { color, bgColor, icon: Icon, hoverBgColor } = getEventStyle(event);
  return (
              <div 
                key={event.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${bgColor} ${hoverBgColor}`}
                onClick={() => handleEditEvent(event)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      <span>{formatDate(event.start)}</span>
                      <span>•</span>
                      <span>{formatTime(event.start)}</span>
                    </div>
                    <div className="mt-1 text-sm flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {event.location?.name || event.location?.city || 'Location not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-6 text-center">
        <Button variant="outline" className="w-full" onClick={() => navigate('/calendar')}>
          <span>View Full Calendar</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );

  const ItinerarySection = () => (
    <section className="bg-card border border-border shadow-sm rounded-lg p-6 h-full overflow-auto">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Itinerary</h2>
      </div>

      <Itinerary 
        events={trip.events}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onAddNew={createNewEvent}
        emptyState={emptyState}
        startDate={trip.startDate}
        endDate={trip.endDate}
        tripId={id || ''}
      />
    </section>
  );

  const LocationsSection = () => (
    <div className="bg-primary text-primary-foreground border border-primary/20 shadow-sm rounded-lg overflow-hidden h-auto">
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-white" />
          <h3 className="font-semibold">Locations</h3>

        </div>
        <span className="text-xs font-medium bg-white/20 rounded-full px-2 py-0.5">
          <span>
            {tripSummary}
          </span>
            </span>
          </div>
      <div className="p-3 bg-white text-foreground overflow-auto" style={{ minHeight: '200px' }}>
        <Accordion 
          type="multiple" 
          value={expandedCountries} 
          onValueChange={handleCountryAccordionChange} 
          className="w-full"
        >
              {groupedSorted.map(([country, cities]) => (
            <AccordionItem key={country} value={country} className="border-b border-border last:border-0">
              <AccordionTrigger className="font-semibold text-base py-3 hover:bg-muted/40 transition-colors px-2 rounded-md">
                    {country}
                  </AccordionTrigger>
              <AccordionContent className="pb-1">
                <Accordion 
                  type="multiple" 
                  value={expandedCities[country] || []} 
                  onValueChange={(value) => handleCityAccordionChange(country, value)} 
                  className="w-full pl-2"
                >
                      {cities.map(([city, events]) => (
                    <AccordionItem key={city} value={city} className="border-b border-border/50 last:border-0">
                      <AccordionTrigger className="text-sm font-medium py-2 hover:bg-muted/30 transition-colors px-2 rounded-md">
                        <div className="flex items-center">
                          <span>{city}</span>
                          <span className="ml-2 text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">
                            {events.length}
                          </span>
                        </div>
                          </AccordionTrigger>
                      <AccordionContent className="pb-1 pl-2">
                        <ul className="space-y-2 py-1">
                              {sortEventsByStart(events).map(event => {
                            const { icon, color, bgColor } = getEventStyle(event);
                                return (
                              <li key={event.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                                <div className={`${bgColor} p-1 rounded-md flex-shrink-0`}>
                                  {React.createElement(icon, { size: 14, className: color })}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <button 
                                    onClick={() => handleEditEvent(event)}
                                    className="hover:underline text-left font-medium text-xs truncate block w-full"
                                  >
                                    {event.title}
                                  </button>
                                  <span className="text-xs text-muted-foreground">{formatDate(event.start)}</span>
                                </div>
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
  );

  return (
    <div className="max-w-full mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center">
            <span className="">
            { trip.name}
            </span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>

          </p>
        </div>
        <Button onClick={() => createNewEvent({
          id: uuidv4(),
          category: 'experience',
          type: 'activity',
          title: 'New Event',
          start: '',
          location: {
            name: '',
            city: '',
            country: ''
          }
        } as any)} className="flex items-center gap-2">
          <MapPinPlusInside size={20} />
          <span>Add Event</span>
        </Button>
      </div>

      {/* Mobile Tabs View */}
      <div className="block md:hidden mb-6">
        <Tabs defaultValue="itinerary" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="itinerary" className="flex items-center gap-1">
              <ListTodo className="h-4 w-4" />
              <span>Itinerary</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              <span>Coming Up</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1">
              <MapPinned className="h-4 w-4" />
              <span>Locations</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="itinerary" className="mt-4">
            <ItinerarySection />
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-4">
            <ComingUpSection />
          </TabsContent>
          
          <TabsContent value="locations" className="mt-4">
            <LocationsSection />
          </TabsContent>
        </Tabs>
              </div>

      {/* Desktop layout - hidden on mobile, optimized for different screen sizes */}
      <div className="hidden md:grid md:grid-cols-12 lg:grid-cols-24 gap-4 md:gap-5 lg:gap-6 min-h-[80vh]">
        {/* Left panel: Coming Up section */}
        <div className="md:col-span-3 lg:col-span-5 xl:col-span-6">
          <ComingUpSection />
            </div>
        
        {/* Middle panel: Full Itinerary */}
        <div className="md:col-span-6 lg:col-span-12 xl:col-span-12">
          <ItinerarySection />
        </div>
        
        {/* Right panel: Locations */}
        <div className="md:col-span-3 lg:col-span-7 xl:col-span-6">
          <LocationsSection />
        </div>
      </div>

      {/* Event Editor Dialog */}
      <EventEditor
        event={currentEditingEvent}
        isOpen={showEventEditor}
        onClose={handleCloseEventEditor}
        onSave={handleSaveEventEdit}
        tripId={id}
      />
    </div>
  );
}; 