import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Event } from '@/types/trip';
import { EventList } from './EventList';
import { Button } from './ui/button';
import { Calendar, List, Map, LockIcon } from 'lucide-react';
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEventStyle } from '@/styles/eventStyles';
import { useUserStore } from '@/stores/userStore';
import { useTripContext } from '@/context/TripContext';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { MapView } from './MapView';
import { registerViewModeCallback, clearViewModeCallback } from '@/context/TripContext';

interface ItineraryProps {
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddNew: () => void;
  emptyState?: React.ReactNode;
  startDate?: string;
  endDate?: string;
  isTabVisible?: boolean;
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
  onEdit,
  onDelete,
  onAddNew,
  emptyState,
  startDate,
  endDate,
  isTabVisible = true,
}) => {
  const { tripId, events, setFocusedEventId } = useTripContext();
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

  // Register view mode callback to allow external control
  useEffect(() => {
    // Register the callback for external components to set view mode
    registerViewModeCallback((mode) => {
      setViewMode(mode);
    });
    
    // Clean up on unmount
    return () => {
      clearViewModeCallback();
    };
  }, []);

  // Listen for the custom focusEventOnMap event
  useEffect(() => {
    const handleFocusEventOnMap = (e: CustomEvent) => {
      const { eventId } = e.detail;
      setFocusedEventId(eventId);
    };

    // Add event listener
    window.addEventListener('focusEventOnMap', handleFocusEventOnMap as EventListener);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('focusEventOnMap', handleFocusEventOnMap as EventListener);
    };
  }, [setFocusedEventId]);

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

  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;
  
  // Update geocoded events when events prop changes
  useEffect(() => {
    // No longer needed, using events from context directly
  }, [events]);
  
  // Handle map view mode selection - REMOVED (logic moved to MapView)
  useEffect(() => {
    // This effect was for triggering geocoding from Itinerary, which is now handled by MapView
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
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  }, []);

  // Callback for "View on Map" - uses context instead of local state
  const handleViewOnMap = useCallback((eventId: string) => {
    setFocusedEventId(eventId);
    setViewMode('map');
  }, [setFocusedEventId]);

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
            
            {isAuthenticated ? (
              <Button 
                variant={viewMode === 'map' ? 'default' : 'outline'} 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4" /> 
                <span className="hidden sm:inline">Map</span>
              </Button>
            ) : (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 cursor-not-allowed opacity-70"
                  >
                    <Map className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Map</span>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="flex space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted px-2">
                      <LockIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Authentication Required</h4>
                      <p className="text-sm text-muted-foreground">
                        Please sign in to view the map.
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
            
            <span className="text-xs text-muted-foreground ml-auto">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      
      </div>

      {/* View content based on selected mode */}
      <div>
        <div style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
          <EventList 
            events={sortedEvents}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
            emptyState={emptyState}
            onViewOnMap={handleViewOnMap}
          />
        </div>

        <div style={{ display: viewMode === 'calendar' ? 'block' : 'none' }}>
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
        </div>

        {/* MapView is now always rendered but visibility is controlled by parent div */}
        <div 
          className="relative h-[500px] lg:h-[70vh] border rounded-lg bg-muted/50 overflow-hidden"
          style={{ display: viewMode === 'map' ? 'block' : 'none' }}
        >
          <MapView 
            className="w-full h-full"
            isVisible={viewMode === 'map' && isTabVisible}
            onEditEventRequest={onEdit}
          />
        </div>
      </div>
    </div>
  );
}; 