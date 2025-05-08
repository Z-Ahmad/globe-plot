import React, { useState } from 'react';
import { Event } from '../stores/tripStore';
import { format, parseISO } from 'date-fns';
import { getEventStyle } from '../styles/eventStyles';
import { PencilIcon, Trash2Icon } from 'lucide-react';

import { 
  AlertDialog,
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface EventCardProps {
  event: Event;
  showEditControls?: boolean;
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
}

// Helper functions for date/time formatting
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

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  showEditControls = false,
  onEdit,
  onDelete
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { bgColor, borderColor, color, icon } = getEventStyle(event);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(event.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className={`p-5 border rounded-lg shadow-sm ${borderColor} ${bgColor} relative overflow-hidden`}>
      {/* Large background icon */}
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 flex items-center justify-center opacity-8 pointer-events-none" style={{ height: '140%' }}>
        {React.createElement(icon, { className: `${color}`, size: 160 })}
      </div>
      
      {/* Event content */}
      <div className="relative z-10">
        {/* Title and controls on the first row - responsive layout */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-lg ${color}`}>{event.title}</span>
            
            {showEditControls && onEdit && onDelete && (
              <div className="flex gap-1 ml-2">
                <button onClick={() => onEdit(event)} className="text-xs hover:bg-secondary/20 text-secondary-foreground p-1 rounded-full">
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowDeleteDialog(true)} className="text-xs hover:bg-destructive/10 text-destructive p-1 rounded-full">
                  <Trash2Icon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Date/time shown below title on small screens, next to title on medium/large screens */}
          <span className="text-sm font-semibold mt-1 md:mt-0">
            {formatDate(event.start)} {event.start && formatTime(event.start)}
          </span>
        </div>
        
        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
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
          </div>
        )}
        {/* Meal Events (restaurant, other) */}
        {event.category === 'meal' && (
          <div className="mt-2 text-xs">
            <div>Type: {event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div>
            {event.location && <div>Location: {event.location.name}</div>}
            {event.time && <div>Time: {formatDate(event.time)} {formatTime(event.time)}</div>}
            {event.reservationReference && <div>Reservation Ref: {event.reservationReference}</div>}
          </div>
        )}
      </div>
    </div>
  );
}; 