import React, { useState } from 'react';
import { Event, ExperienceEvent } from '@/types/trip';
import { EventCard } from './EventCard';
import { MapPinPlusInside, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddNew: (event: Event) => void;
  emptyState?: React.ReactNode;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  onEdit,
  onDelete,
  onAddNew,
  emptyState
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Create a new event at a specific position
  const handleCreateEvent = (index: number) => {
    // Create a new blank event
    const newEvent: ExperienceEvent = {
      id: uuidv4(),
      category: 'experience',
      type: 'activity',
      title: 'New Event',
      start: '',
      location: {
        name: '',
        city: '',
        country: ''
      },
      startDate: '',
      endDate: '',
      notes: ''
    };

    // If we have events and it's not at the end, try to infer start date
    if (events.length > 0 && index < events.length) {
      // Create event with start time inferred from position (in between current and next)
      if (index > 0 && events[index - 1].start && events[index].start) {
        // Try to set a time in between the previous and next events
        const prevTime = new Date(events[index - 1].start || '').getTime();
        const nextTime = new Date(events[index].start || '').getTime();
        if (prevTime && nextTime) {
          const midTime = new Date(prevTime + (nextTime - prevTime) / 2);
          newEvent.start = midTime.toISOString();
          newEvent.startDate = midTime.toISOString();
          newEvent.endDate = midTime.toISOString();
        }
        else if (prevTime) {
          newEvent.start = new Date(prevTime).toISOString();
          newEvent.startDate = new Date(prevTime).toISOString();
          newEvent.endDate = new Date(prevTime).toISOString();
        }
      }
    }

    onAddNew(newEvent);
  };

  // If there are no events, show empty state
  if (events.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-1">
      {events.map((event, index) => (
        <React.Fragment key={event.id}>
          {/* Insert drop area above each event (except the first one) */}
          {index > 0 && (
            <div 
              className="h-8 -mt-4 mb-1 group relative cursor-pointer"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => handleCreateEvent(index)}
            >
              {hoverIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center">
                    <Plus size={16} className="text-primary" />
                  </div>
                  <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
            </div>
          )}

          {/* Event card */}
          <EventCard 
            event={event} 
            showEditControls={true}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </React.Fragment>
      ))}

      {/* Add a drop area at the bottom for adding after the last event */}
      <div 
        className="h-12 mt-2 group relative cursor-pointer rounded-md border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
        onMouseEnter={() => setHoverIndex(events.length)}
        onMouseLeave={() => setHoverIndex(null)}
        onClick={() => handleCreateEvent(events.length)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${hoverIndex === events.length ? 'bg-primary/20' : 'bg-primary/5'} rounded-full w-8 h-8 flex items-center justify-center transition-colors`}>
            <MapPinPlusInside size={16} className="text-primary" />
          </div>
          <span className="ml-2 text-sm text-primary/70">Add Event</span>
        </div>
      </div>
    </div>
  );
}; 