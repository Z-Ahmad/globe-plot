import React, { useMemo } from 'react';
import { Event } from '@/types/trip';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EventCard } from './EventCard';
import { useTripContext } from '@/context/TripContext';
import { motion, AnimatePresence } from 'framer-motion';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddNew: () => void;
  emptyState?: React.ReactNode;
  onViewOnMap?: (eventId: string) => void;
  hideAddButton?: boolean;
  animate?: boolean;
}

export const EventList: React.FC<EventListProps> = ({ 
  events,
  onEdit,
  onDelete,
  onAddNew,
  emptyState,
  onViewOnMap,
  hideAddButton = false,
  animate = false
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

  // Animation variants for streamed events
  const eventAnimVariants = {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { 
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 25 }
    },
    exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
  };

  const dateHeaderVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
  };
  
  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {sortedDates.map(date => (
          <motion.div
            key={date}
            className="space-y-4"
            layout={animate}
            {...(animate ? {
              initial: dateHeaderVariants.initial,
              animate: dateHeaderVariants.animate,
            } : {})}
          >
            <h3 className="text-lg font-semibold sticky top-0 bg-accent/80 backdrop-blur-sm p-2 z-40 rounded-lg">
              {formatDateHeader(date)}
            </h3>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {eventsByDate[date].map(event => (
                  <motion.div
                    key={event.id}
                    layout={animate}
                    {...(animate ? {
                      initial: eventAnimVariants.initial,
                      animate: eventAnimVariants.animate,
                      exit: eventAnimVariants.exit,
                    } : {})}
                  >
                    <EventCard 
                      event={event}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onViewOnMap={onViewOnMap}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Add new button - only show if not hidden */}
      {!hideAddButton && (
        <div className="pt-4 pb-8 flex justify-center">
          <Button 
            variant="outline" 
            onClick={onAddNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Event</span>
          </Button>
        </div>
      )}
    </div>
  );
}; 