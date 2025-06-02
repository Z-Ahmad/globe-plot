import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { EventList } from '@/components/EventList';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TripProvider, useTripContext } from '@/context/TripContext';
import { toast } from 'react-hot-toast';
import { apiGet } from '@/lib/apiClient';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { uploadDocument, updateDocumentAssociatedEvents } from '@/lib/firebaseService';
import { useUserStore } from '../stores/userStore';
import { Loader2 } from 'lucide-react';

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

// Extracted ComingUpSection component
const ComingUpSection = React.memo(({ onEditEvent }: { onEditEvent: (event: Event) => void }) => {
  const navigate = useNavigate();
  const { events, trip } = useTripContext();
  
  const upcomingEvents = useMemo(() => 
    getUpcomingEvents(events, trip?.startDate || ''),
    [events, trip?.startDate]
  );

  return (
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
                onClick={() => onEditEvent(event)}
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
});

ComingUpSection.displayName = 'ComingUpSection';

// Extracted LocationsSection component
const LocationsSection = React.memo(({ onEditEvent }: { onEditEvent: (event: Event) => void }) => {
  const [expandedCountries, setExpandedCountries] = useState<string[]>([]);
  const [expandedCities, setExpandedCities] = useState<Record<string, string[]>>({});
  const { events } = useTripContext();
  const [countryFlags, setCountryFlags] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchCountryFlags = async () => {
      try {
        // Check cache first (cache for 24 hours)
        const cachedKey = 'countries-cache';
        const cachedTimestampKey = 'countries-cache-timestamp';
        const cached = localStorage.getItem(cachedKey);
        const cacheTimestamp = localStorage.getItem(cachedTimestampKey);
        
        const now = Date.now();
        const cacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp) : Infinity;
        const cacheValidDuration = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cached && cacheAge < cacheValidDuration) {
          console.log('Using cached countries data for flags');
          const cachedCountries = JSON.parse(cached);
          const flagsMap: Record<string, string> = {};
          cachedCountries.forEach((country: any) => {
            flagsMap[country.name] = country.flag;
          });
          setCountryFlags(flagsMap);
          return;
        }
        
        // Use the new API client that handles 429 errors automatically
        const response = await apiGet<Array<{ name: string; code: string; flag: string; phonecode: string }>>('countries');
        
        if (response.status === 200 && Array.isArray(response.data)) {
          const flagsMap: Record<string, string> = {};
          response.data.forEach(country => {
            flagsMap[country.name] = country.flag;
          });
          setCountryFlags(flagsMap);
          
          // Cache the results
          localStorage.setItem(cachedKey, JSON.stringify(response.data));
          localStorage.setItem(cachedTimestampKey, now.toString());
          console.log('Cached countries data for flags for 24 hours');
        }
      } catch (error) {
        console.error("Error fetching country flags:", error);
        // Note: Rate limiting errors (429) are already handled by the API client with toast messages
        // Optionally, set an error state or show a toast for other errors
      }
    };

    fetchCountryFlags();
  }, []);

  // Group and sort events for sidebar
  const groupedSorted = useMemo(() => 
    groupAndSortEventsByCountryCity(events),
    [events]
  );
  
  // Get the unique countries visited - memoize this calculation
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    events.forEach(event => {
      const { country } = getLocationInfo(event);
      if (country) countries.add(country);
    });
    return countries;
  }, [events]);

  // Get unique cities - memoize this calculation
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    events.forEach(event => {
      const { city } = getLocationInfo(event);
      if (city) cities.add(city);
    });
    return cities;
  }, [events]);

  // Determine summary text based on hierarchy
  const tripSummary = useMemo(() => {
    if (uniqueCountries.size > 1) {
      return `${uniqueCountries.size} ${uniqueCountries.size === 1 ? 'country' : 'countries'}`;
    } else if (uniqueCities.size > 1) {
      return `${uniqueCities.size} ${uniqueCities.size === 1 ? 'city' : 'cities'}`;
    } else {
      return `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
    }
  }, [uniqueCountries.size, uniqueCities.size, events.length]);

  // Updated accordion handlers
  const handleCountryAccordionChange = useCallback((value: string[]) => {
    setExpandedCountries(value);
  }, []);

  const handleCityAccordionChange = useCallback((country: string, value: string[]) => {
    setExpandedCities(prev => ({
      ...prev,
      [country]: value
    }));
  }, []);

  return (
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
                <div className="flex items-center gap-2">
                  {countryFlags[country] && <span className="text-lg">{countryFlags[country]}</span>}
                  <span>{country}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <Accordion 
                  type="multiple" 
                  value={expandedCities[country] || []} 
                  onValueChange={(value) => handleCityAccordionChange(country, value)} 
                  className="w-full pl-2"
                >
                  {cities.map(([city, cityEvents]) => (
                    <AccordionItem key={city} value={city} className="border-b border-border/50 last:border-0">
                      <AccordionTrigger className="text-sm font-medium py-2 hover:bg-muted/30 transition-colors px-2 rounded-md">
                        <div className="flex items-center">
                          <span>{city}</span>
                          <span className="ml-2 text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">
                            {cityEvents.length}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1 pl-2">
                        <ul className="space-y-2 py-1">
                          {sortEventsByStart(cityEvents).map(event => {
                            const { icon, color, bgColor } = getEventStyle(event);
                            return (
                              <li 
                                key={event.id} 
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors"
                                onClick={() => onEditEvent(event)}
                              >
                                <div className={`${bgColor} p-1 rounded-md flex-shrink-0`}>
                                  {React.createElement(icon, { size: 14, className: color })}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div 
                                    className="hover:underline text-left font-medium text-xs truncate block w-full"
                                  >
                                    {event.title}
                                  </div>
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
});

LocationsSection.displayName = 'LocationsSection';

// Extracted ItinerarySection component
const ItinerarySection = React.memo(({ 
  onEditEvent, 
  onDeleteEvent, 
  onAddNew,
  emptyState 
}: { 
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddNew: () => void;
  emptyState: React.ReactNode;
}) => {
  const { trip } = useTripContext();

  return (
    <section className="bg-card border border-border shadow-sm rounded-lg p-6 h-full">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Itinerary</h2>
      </div>

      <Itinerary 
        onEdit={onEditEvent}
        onDelete={onDeleteEvent}
        onAddNew={onAddNew}
        emptyState={emptyState}
        startDate={trip?.startDate}
        endDate={trip?.endDate}
      />
    </section>
  );
});

ItinerarySection.displayName = 'ItinerarySection';

// Custom hook to provide consistent handlers across components
function useEventHandlers() {
  const { updateEvent, addEvent, removeEvent, tripId } = useTripContext();
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [pendingExtractedEvents, setPendingExtractedEvents] = useState<Event[]>([]);
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [showMultiEventReview, setShowMultiEventReview] = useState(false);
  const [reviewingEvents, setReviewingEvents] = useState<Event[]>([]);
  const [isSavingMultipleEvents, setIsSavingMultipleEvents] = useState(false);
  const user = useUserStore((state) => state.user);

  // Handlers for event actions - move these to callbacks
  const handleEditEvent = useCallback((event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  }, []);

  const handleSaveEventEdit = useCallback(async (updatedEvent: Event) => {
    try {
      // Check if this is a new event (doesn't have an ID or ID includes hyphens which means it's a client-generated UUID)
      const isNewEvent = !updatedEvent.id || (updatedEvent.id && updatedEvent.id.includes('-'));
      
      if (isNewEvent) {
        // Check if we're in multi-event review mode
        if (showMultiEventReview) {
          // Update the event in the reviewing list
          setReviewingEvents(prev => 
            prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
          );
          setShowEventEditor(false);
          setCurrentEditingEvent(null);
          return;
        }
        
        // Single event flow - add to trip and upload document
        await addEvent(updatedEvent);
        console.log(`Added new event "${updatedEvent.title}"`);
        toast.success(`Event "${updatedEvent.title}" added to your trip!`);
        
        // If we have a pending document file, upload it and associate with the new event
        if (pendingDocumentFile && user && tripId) {
          try {
            // Upload the document directly with the event ID we have
            setTimeout(async () => {
              try {
                console.log('Uploading document for newly created event:', updatedEvent.id);
                await uploadDocument(pendingDocumentFile, tripId, [updatedEvent.id]);
                // toast.success('Document uploaded and associated with event');
              } catch (docError) {
                console.error('Error uploading document:', docError);
                toast.error('Event saved but failed to upload document');
              }
              
              // Clean up pending state
              setPendingDocumentFile(null);
              setPendingExtractedEvents([]);
            }, 100); // Small delay to ensure context is updated
          } catch (docError) {
            console.error('Error in document upload flow:', docError);
            // Event was still saved, so don't show error for event saving
          }
        }
      } else {
        // Update existing event using context
        await updateEvent(updatedEvent.id, updatedEvent);
        console.log(`Updated event "${updatedEvent.title}"`);
      }
      
      setShowEventEditor(false);
      setCurrentEditingEvent(null);
      
      // Clean up any pending document state if not a new event and not in review mode
      if (!isNewEvent && !showMultiEventReview) {
        setPendingDocumentFile(null);
        setPendingExtractedEvents([]);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [addEvent, updateEvent, pendingDocumentFile, user, tripId, showMultiEventReview]);

  const handleCloseEventEditor = useCallback(() => {
    setShowEventEditor(false);
    setCurrentEditingEvent(null);
    // Don't clean up pending document state if we're in multi-event review mode
    if (!showMultiEventReview) {
      setPendingDocumentFile(null);
      setPendingExtractedEvents([]);
    }
  }, [showMultiEventReview]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      if (showMultiEventReview) {
        // Remove from reviewing events list
        setReviewingEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        // Delete from trip
        await removeEvent(eventId);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      // Could add error handling UI here
    }
  }, [removeEvent, showMultiEventReview]);

  // Handle saving all events from multi-event review
  const handleSaveAllReviewedEvents = useCallback(async () => {
    if (reviewingEvents.length === 0) {
      toast.error('No events to save');
      return;
    }

    setIsSavingMultipleEvents(true);
    
    try {
      // Save all events to the trip
      const savedEventIds: string[] = [];
      
      for (const event of reviewingEvents) {
        await addEvent(event);
        savedEventIds.push(event.id);
        console.log(`Added event "${event.title}" to trip`);
      }
      
      // Upload the document and associate with all saved events
      if (pendingDocumentFile && user && tripId && savedEventIds.length > 0) {
        try {
          await uploadDocument(pendingDocumentFile, tripId, savedEventIds);
          console.log('Document uploaded and associated with events:', savedEventIds);
        } catch (docError) {
          console.error('Error uploading document:', docError);
          toast.error('Events saved but failed to upload document');
        }
      }
      
      // Show success message
      toast.success(`${reviewingEvents.length} event${reviewingEvents.length === 1 ? '' : 's'} added to your trip!`);
      
      // Clean up all state
      setShowMultiEventReview(false);
      setReviewingEvents([]);
      setPendingDocumentFile(null);
      setPendingExtractedEvents([]);
      
    } catch (error) {
      console.error('Error saving multiple events:', error);
      toast.error('Failed to save some events: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingMultipleEvents(false);
    }
  }, [reviewingEvents, addEvent, pendingDocumentFile, user, tripId]);

  // Handle canceling multi-event review
  const handleCancelMultiEventReview = useCallback(() => {
    setShowMultiEventReview(false);
    setReviewingEvents([]);
    setPendingDocumentFile(null);
    setPendingExtractedEvents([]);
  }, []);

  // Handle when document processing is complete
  const handleDocumentProcessingComplete = useCallback((extractedEvents: Event[], originalFile: File | null) => {
    console.log('Document processing complete:', { extractedEvents, originalFile });
    
    // Close the document upload modal
    setShowDocumentUploadModal(false);
    
    if (extractedEvents.length > 1) {
      // Multiple events - show review interface
      const eventsWithIds = extractedEvents.map(event => ({
        ...event,
        id: event.id || uuidv4() // Ensure all events have IDs
      }));
      
      setReviewingEvents(eventsWithIds);
      setPendingExtractedEvents(eventsWithIds);
      setPendingDocumentFile(originalFile);
      setShowMultiEventReview(true);
      
      toast.success(`${extractedEvents.length} events extracted. Review and edit them below, then save to add to your trip.`, {
        duration: 5000,
      });
    } else if (extractedEvents.length === 1) {
      // Single event - show event editor directly
      const firstEvent = {
        ...extractedEvents[0],
        id: extractedEvents[0].id || uuidv4() // Ensure it has an ID
      };
      
      setPendingExtractedEvents(extractedEvents);
      setPendingDocumentFile(originalFile);
      setCurrentEditingEvent(firstEvent);
      setShowEventEditor(true);
      
      toast.success(`1 event extracted. Review and save to add to your trip.`, {
        duration: 4000,
      });
    } else {
      // No events extracted, create a blank event
      const blankEvent: ExperienceEvent = {
        id: uuidv4(),
        category: 'experience',
        type: 'activity',
        title: 'New Event',
        start: '',
        startDate: '',
        endDate: '',
        location: {
          name: '',
          city: '',
          country: ''
        }
      };
      
      setPendingDocumentFile(originalFile); // Still save the document even if no events extracted
      setCurrentEditingEvent(blankEvent);
      setShowEventEditor(true);
      
      if (originalFile) {
        toast('No events found in document. Please fill in the details manually.', {
          icon: 'ℹ️',
          duration: 4000,
        });
      }
    }
  }, []);

  // Create a new event for multi-event review
  const createNewEventInReview = useCallback(() => {
    const newEvent: ExperienceEvent = {
      id: uuidv4(),
      category: 'experience',
      type: 'activity',
      title: 'New Event',
      start: '',
      startDate: '',
      endDate: '',
      location: {
        name: '',
        city: '',
        country: ''
      }
    };
    
    setCurrentEditingEvent(newEvent);
    setShowEventEditor(true);
  }, []);

  // Create a new event - now shows document upload modal first
  const createNewEvent = useCallback(() => {
    setShowDocumentUploadModal(true);
  }, []);

  // Empty state to display when there are no events
  const emptyState = useMemo(() => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-primary text-2xl">🗓️</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">No events added yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add your first event to start planning your trip itinerary.
      </p>
      <Button onClick={createNewEvent} className="flex items-center gap-2">
        <MapPinPlusInside size={16} />
        <span>Add Your First Event</span>
      </Button>
    </div>
  ), [createNewEvent]);
  
  return {
    currentEditingEvent,
    showEventEditor,
    showDocumentUploadModal,
    showMultiEventReview,
    reviewingEvents,
    isSavingMultipleEvents,
    handleEditEvent,
    handleSaveEventEdit,
    handleCloseEventEditor,
    handleDeleteEvent,
    createNewEvent,
    createNewEventInReview,
    handleDocumentProcessingComplete,
    handleSaveAllReviewedEvents,
    handleCancelMultiEventReview,
    setShowDocumentUploadModal,
    emptyState
  };
}

// Inner content component that uses TripContext
const TripContent = () => {
  const navigate = useNavigate();
  const { trip, tripId } = useTripContext();
  const [activeTab, setActiveTab] = useState("itinerary");
  const { 
    currentEditingEvent, 
    showEventEditor,
    showDocumentUploadModal,
    showMultiEventReview,
    reviewingEvents,
    isSavingMultipleEvents,
    handleEditEvent,
    handleSaveEventEdit, 
    handleCloseEventEditor,
    handleDeleteEvent,
    createNewEvent,
    createNewEventInReview,
    handleDocumentProcessingComplete,
    handleSaveAllReviewedEvents,
    handleCancelMultiEventReview,
    setShowDocumentUploadModal,
    emptyState 
  } = useEventHandlers();

  // Helper function to determine if the current event is new
  const isNewEvent = useMemo(() => {
    if (!currentEditingEvent) return false;
    // Check if this is a new event (doesn't have an ID or ID includes hyphens which means it's a client-generated UUID)
    const hasValidId = currentEditingEvent.id && typeof currentEditingEvent.id === 'string' && currentEditingEvent.id.trim() !== '';
    return !hasValidId || (hasValidId && currentEditingEvent.id.includes('-'));
  }, [currentEditingEvent]);

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
        <Button onClick={createNewEvent} className="flex items-center gap-2">
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
            <ItinerarySection 
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onAddNew={createNewEvent}
              emptyState={emptyState}
            />
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-4">
            <ComingUpSection onEditEvent={handleEditEvent} />
          </TabsContent>
          
          <TabsContent value="locations" className="mt-4">
            <LocationsSection onEditEvent={handleEditEvent} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout - hidden on mobile, optimized for different screen sizes */}
      <div className="hidden md:grid md:grid-cols-12 lg:grid-cols-24 gap-4 md:gap-5 lg:gap-6 min-h-[80vh]">
        {/* Left panel: Coming Up section */}
        <div className="md:col-span-3 lg:col-span-5 xl:col-span-6">
          <ComingUpSection onEditEvent={handleEditEvent} />
        </div>
        
        {/* Middle panel: Full Itinerary */}
        <div className="md:col-span-6 lg:col-span-12 xl:col-span-12">
          <ItinerarySection 
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            onAddNew={createNewEvent}
            emptyState={emptyState}
          />
        </div>
        
        {/* Right panel: Locations */}
        <div className="md:col-span-3 lg:col-span-7 xl:col-span-6">
          <LocationsSection onEditEvent={handleEditEvent} />
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentUploadModal}
        onClose={() => setShowDocumentUploadModal(false)}
        onProcessingComplete={handleDocumentProcessingComplete}
        tripId={tripId}
      />

      {/* Event Editor Dialog */}
      <EventEditor
        event={currentEditingEvent}
        isOpen={showEventEditor}
        onClose={handleCloseEventEditor}
        onSave={handleSaveEventEdit}
        showViewOnMap={!isNewEvent}
        shouldFetchDocuments={true}
      />

      {/* Multi-Event Review Modal */}
      {showMultiEventReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold mb-2">Review Extracted Events</h2>
              <p className="text-muted-foreground">
                {reviewingEvents.length} events were found in your document. Review and edit them below, then save to add them to your trip.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <EventList 
                events={reviewingEvents}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onAddNew={createNewEventInReview}
                hideAddButton={true}
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No events to review</p>
                    <Button onClick={createNewEventInReview} className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Add Event</span>
                    </Button>
                  </div>
                }
              />
            </div>
            
            <div className="p-6 border-t border-border flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={handleCancelMultiEventReview}
                disabled={isSavingMultipleEvents}
              >
                Cancel
              </Button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {reviewingEvents.length} event{reviewingEvents.length === 1 ? '' : 's'} ready to save
                </span>
                <Button 
                  onClick={handleSaveAllReviewedEvents}
                  disabled={isSavingMultipleEvents || reviewingEvents.length === 0}
                  className="flex items-center gap-2"
                >
                  {isSavingMultipleEvents ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Events...</span>
                    </>
                  ) : (
                    <>
                      <span>Save {reviewingEvents.length} Event{reviewingEvents.length === 1 ? '' : 's'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component - wrapper that provides TripContext
export const TripView = () => {
  const { id } = useParams<{ id: string }>();
  const { trips, updateTrip } = useTripStore();
  const trip = trips.find(trip => trip.id === id);

  
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
  }, [trip?.id, trip, updateTrip]);

  return (
    <TripProvider tripId={id || null}>
      <TripContent />
    </TripProvider>
  );
}; 