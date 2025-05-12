import React, { useState, useMemo, useEffect } from 'react';
import { Event } from '@/types/trip';
import { EventList } from './EventList';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, CalendarRange, Filter, List, Map, MapPin, Loader } from 'lucide-react';
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEventStyle } from '@/styles/eventStyles';
import { useUserStore } from '@/stores/userStore';
import { enrichAndSaveEventCoordinates } from '@/lib/mapboxService';
import toast from 'react-hot-toast';
import { useTripContext } from '@/context/TripContext';

interface ItineraryProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddNew: (event: Event) => void;
  emptyState?: React.ReactNode;
  startDate?: string;
  endDate?: string;
}

type SortOption = 'chronological' | 'category' | 'location';
type ViewMode = 'list' | 'calendar' | 'map';

// Helper function to get stored value from localStorage with fallback
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return defaultValue;
  }
};

export const Itinerary: React.FC<ItineraryProps> = ({
  events,
  onEdit,
  onDelete,
  onAddNew,
  emptyState,
  startDate,
  endDate
}) => {
  const { tripId } = useTripContext();
  // Persist sort option and view mode to localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => 
    getStoredValue('itinerary-sort-option', 'chronological' as SortOption)
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => 
    getStoredValue('itinerary-view-mode', 'list' as ViewMode)
  );
  
  // Save sort option and view mode to localStorage when they change
  useEffect(() => {
    localStorage.setItem('itinerary-sort-option', JSON.stringify(sortOption));
  }, [sortOption]);
  
  useEffect(() => {
    localStorage.setItem('itinerary-view-mode', JSON.stringify(viewMode));
  }, [viewMode]);

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    // Try to get the stored month first
    const storedMonth = getStoredValue('itinerary-selected-month', null);
    if (storedMonth) {
      return new Date(storedMonth);
    }
    
    // Fallback to trip start date or current date
    const parsedDate = startDate ? parseISO(startDate) : new Date();
    return isValid(parsedDate) ? parsedDate : new Date();
  });
  
  // Save selected month to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('itinerary-selected-month', JSON.stringify(selectedMonth.toISOString()));
  }, [selectedMonth]);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedEvents, setGeocodedEvents] = useState<Event[]>(events);
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;
  
  // Update geocoded events when events prop changes
  useEffect(() => {
    setGeocodedEvents(events);
  }, [events]);
  
  // Handle map view mode selection
  useEffect(() => {
    if (viewMode === 'map') {
      if (!isAuthenticated) {
        toast.error("Please sign in to view the map");
        setViewMode('list');
        return;
      }

      // Only perform geocoding if we have a valid tripId
      if (!tripId) {
        console.log("[Itinerary] No tripId available for geocoding");
        return;
      }

      // Force update if we don't have coordinates for all events
      const eventsWithCoordinates = events.filter(event => {
        if (event.category === 'travel') {
          // Travel events need departure coordinates
          return event.departure?.location?.geolocation;
        } else if (event.category === 'accommodation') {
          // Accommodation events need check-in coordinates
          return event.checkIn?.location?.geolocation;
        } else {
          // Other events need location coordinates
          return event.location?.geolocation;
        }
      });
      
      // Force update if any events are missing coordinates
      const forceUpdate = eventsWithCoordinates.length < events.length;
      console.log(`[Itinerary] ${events.length - eventsWithCoordinates.length} events need geocoding, force update: ${forceUpdate}`);
      
      // Start geocoding process
      setIsGeocoding(true);
      enrichAndSaveEventCoordinates(tripId || '', events, forceUpdate)
        .then(enrichedEvents => {
          console.log(`[Itinerary] Geocoding completed for ${enrichedEvents.length} events`);
          
          // Count events with coordinates
          let eventsWithCoords = 0;
          enrichedEvents.forEach(event => {
            if (event.location?.geolocation || 
                (event.category === 'travel' && (event.departure?.location?.geolocation || event.arrival?.location?.geolocation)) ||
                (event.category === 'accommodation' && event.checkIn?.location?.geolocation)) {
              eventsWithCoords++;
            }
          });
          
          console.log(`[Itinerary] ${eventsWithCoords} events have coordinates`);
          setGeocodedEvents(enrichedEvents);
          toast.success(`Location coordinates updated for ${eventsWithCoords} events`);
        })
        .catch(error => {
          console.error("[Itinerary] Error geocoding events:", error);
          toast.error("Failed to get coordinates for some locations");
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    }
  }, [viewMode, events, isAuthenticated, tripId]);

  // Memoize sorted events to prevent unnecessary recalculations
  const sortedEvents = useMemo(() => {
    if (events.length === 0) return [];

    let sorted = [...events];

    switch (sortOption) {
      case 'chronological':
        sorted = sorted.sort((a, b) => {
          const aTime = a.start ? new Date(a.start).getTime() : 0;
          const bTime = b.start ? new Date(b.start).getTime() : 0;
          return aTime - bTime;
        });
        break;
      case 'category':
        sorted = sorted.sort((a, b) => {
          // Sort by category first, then chronologically within each category
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          const aTime = a.start ? new Date(a.start).getTime() : 0;
          const bTime = b.start ? new Date(b.start).getTime() : 0;
          return aTime - bTime;
        });
        break;
      case 'location':
        sorted = sorted.sort((a, b) => {
          // Sort by country and city, then chronologically
          const aCountry = a.location?.country || '';
          const bCountry = b.location?.country || '';
          
          if (aCountry !== bCountry) {
            return aCountry.localeCompare(bCountry);
          }
          
          const aCity = a.location?.city || '';
          const bCity = b.location?.city || '';
          
          if (aCity !== bCity) {
            return aCity.localeCompare(bCity);
          }
          
          const aTime = a.start ? new Date(a.start).getTime() : 0;
          const bTime = b.start ? new Date(b.start).getTime() : 0;
          return aTime - bTime;
        });
        break;
    }

    return sorted;
  }, [events, sortOption]);

  // Group events by date for calendar view
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    sortedEvents.forEach(event => {
      if (!event.start) return;
      
      try {
        const date = format(parseISO(event.start), 'yyyy-MM-dd');
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(event);
      } catch (error) {
        console.error('Invalid date format:', event.start);
      }
    });
    
    return grouped;
  }, [sortedEvents]);

  // Generate dates for the calendar view
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(selectedMonth);
    const lastDay = endOfMonth(selectedMonth);
    
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  }, [selectedMonth]);

  // Go to previous/next month in calendar view
  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  if (events.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-6">
      {/* Header with title and view options */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          
          {/* View mode controls - icons only on small screens */}
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" /> 
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'outline'} 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4" /> 
              <span className="hidden sm:inline">Calendar</span>
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'outline'} 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setViewMode('map')}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "Sign in to view map" : "View map"}
            >
              <Map className="h-4 w-4" /> 
              <span className="hidden sm:inline">Map</span>
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Sort control - only visible in list view */}
        {viewMode === 'list' && (
          <div className="pt-2 pb-4 border-b">
            <Select
              value={sortOption}
              onValueChange={(value) => setSortOption(value as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chronological" className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  <span>Date & Time</span>
                </SelectItem>
                <SelectItem value="category" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Category</span>
                </SelectItem>
                <SelectItem value="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* View content based on selected mode */}
      <div>
        {viewMode === 'list' && (
          <EventList 
            events={sortedEvents}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
            emptyState={emptyState}
          />
        )}

        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('prev')}
              >
                Previous
              </Button>
              <h3 className="text-lg font-semibold">
                {format(selectedMonth, 'MMMM yyyy')}
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('next')}
              >
                Next
              </Button>
            </div>
            
            {/* Calendar grid */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-center text-sm font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, i) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate[dateKey] || [];
                  const hasEvents = dayEvents.length > 0;
                  
                  return (
                    <div 
                      key={dateKey} 
                      className={cn(
                        "min-h-[100px] border-b border-r p-1 relative group",
                        i % 7 === 6 ? "border-r-0" : "",
                        i >= calendarDays.length - 7 ? "border-b-0" : ""
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full ${hasEvents ? "bg-primary text-primary-foreground" : ""}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-1 mt-1 max-h-[70px] overflow-y-auto">
                        {dayEvents.slice(0, 3).map((event) => {
                          const { color, icon: Icon } = getEventStyle(event);
                          return (
                            <div
                              key={event.id}
                              onClick={() => onEdit(event)}
                              className={`text-xs truncate flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-muted/50 ${color}`}
                            >
                              <Icon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{event.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-4">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="relative h-[400px] border border-dashed rounded-lg bg-muted/50">
            {isGeocoding && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Updating location coordinates...</p>
              </div>
            )}
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Map className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Map view coming soon</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {geocodedEvents.filter(e => {
                    if (e.category === 'travel') {
                      return e.departure?.location?.geolocation || e.arrival?.location?.geolocation;
                    } else if (e.category === 'accommodation') {
                      return e.checkIn?.location?.geolocation;
                    } else {
                      return e.location?.geolocation;
                    }
                  }).length} of {events.length} events have coordinates
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setViewMode('list')}
                >
                  Return to list view
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 