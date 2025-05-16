import React, { useMemo } from 'react';
import { Event } from '@/types/trip';
import { format, parseISO } from 'date-fns';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { EventCard } from './EventCard';
import { useTripContext } from '@/context/TripContext';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddNew: (event: Event) => void;
  emptyState?: React.ReactNode;
  onViewOnMap?: (eventId: string) => void;
}

export const EventList: React.FC<EventListProps> = ({ 
  events,
  onEdit,
  onDelete,
  onAddNew,
  emptyState,
  onViewOnMap
}) => {
  // Group events by date for display
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    // Sort events chronologically first
    const sortedEvents = [...events].sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });
    
    // Group by date
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
  }, [events]);
  
  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };
  
  if (events.length === 0) {
    return <>{emptyState}</>;
  }
  
  // Convert grouped events to sorted array of [date, events] pairs
  const sortedDates = Object.keys(eventsByDate).sort();
  
  return (
    <div className="space-y-8">
      {sortedDates.map(date => (
        <div key={date} className="space-y-4">
          <h3 className="text-lg font-semibold sticky top-0 bg-accent/60 backdrop-blur-sm p-2 z-10 rounded-lg">
            {formatDateHeader(date)}
          </h3>
          
          <div className="space-y-3">
            {eventsByDate[date].map(event => (
              <EventCard 
                key={event.id}
                event={event}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewOnMap={onViewOnMap}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Add new button */}
      <div className="pt-4 pb-8 flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => onAddNew({
            // Don't generate id - let Firebase do it
            category: 'experience',
            type: 'activity',
            title: 'New Event',
            start: '',
            location: {
              name: '',
              city: '',
              country: ''
            }
          } as any)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Event</span>
        </Button>
      </div>
    </div>
  );
}; 