import React from 'react';
import { Event } from '@/types/trip';
import { getEventStyle } from '@/styles/eventStyles';
import { format } from 'date-fns';

export interface EventPopupContentProps {
  event: Event;
  onEditRequest?: (event: Event) => void;
}

export const EventPopupContent: React.FC<EventPopupContentProps> = ({ event, onEditRequest }) => {
  const { icon: Icon, color, bgColor } = getEventStyle(event);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent map click or other underlying handlers
    if (onEditRequest) {
      onEditRequest(event);
    }
  };

  let locationDisplay = event.location?.name || '';
  if (!locationDisplay && event.location?.city) {
    locationDisplay = event.location.city;
    if (event.location.country) {
      locationDisplay += `, ${event.location.country}`;
    }
  } else if (!locationDisplay && event.location?.country) {
    locationDisplay = event.location.country;
  }

  if (event.category === 'travel') {
    const departureName = event.departure?.location?.name || event.departure?.location?.city || 'N/A';
    const arrivalName = event.arrival?.location?.name || event.arrival?.location?.city || 'N/A';
    locationDisplay = `${departureName} → ${arrivalName}`;
  } else if (event.category === 'accommodation') {
    locationDisplay = event.placeName || event.checkIn?.location?.name || event.checkIn?.location?.city || 'N/A';
  }

  return (
    <div className={`p-0`}> 
      <div className={`p-3 rounded-lg ${bgColor} text-sm shadow-md event-popup-card`}>
        <div className="flex items-start gap-3">
          <div className={`p-1 rounded-full mt-1 ${getEventStyle(event).bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex-grow min-w-0">
            <h3 
              className={`font-semibold text-base mb-1 ${color} ${onEditRequest ? 'cursor-pointer hover:underline' : ''}`}
              onClick={onEditRequest ? handleEditClick : undefined}
              title={onEditRequest ? "Edit this event" : event.title}
            >
              {event.title}
            </h3>
            {locationDisplay && <p className="text-gray-700 dark:text-gray-300 mb-1 truncate" title={locationDisplay}>{locationDisplay}</p>}
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
              <p>
                <span className="capitalize font-medium">{event.category}</span> ({event.type})
              </p>
              {event.start && (
                <p>
                  {format(new Date(event.start), 'MMM d, yyyy, h:mm a')}
                  {event.end && event.end !== event.start ? ` - ${format(new Date(event.end), 'h:mm a')}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 