import React, { useState } from 'react';
import { Event, TravelEvent, AccommodationEvent, ExperienceEvent, MealEvent } from '../types/trip';
import { format, parseISO } from 'date-fns';
import { getEventStyle } from '../styles/eventStyles';
import { PencilIcon, Trash2Icon, MapPinIcon } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import toast from 'react-hot-toast';

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
  onViewOnMap?: (id: string) => void;
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
  onDelete,
  onViewOnMap
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { bgColor, borderColor, color, icon, hoverBgColor } = getEventStyle(event);
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  const handleEdit = (event: Event) => {
    // Check authentication for map features
    if (!isAuthenticated && event.location?.geolocation) {
      toast.error("Please sign in to edit locations with coordinates");
      return;
    }
    
    if (onEdit) {
      onEdit(event);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        setIsDeleting(true);
        setDeleteError('');
        await onDelete(event.id);
        setShowDeleteDialog(false);
      } catch (err) {
        console.error('Error deleting event:', err);
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete event');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={`p-5 border rounded-lg shadow-sm ${borderColor} ${bgColor} relative overflow-hidden ${hoverBgColor}`}>
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
            
            {showEditControls && (
              <div className="flex gap-1 ml-2">
                {onEdit && (
                  <button onClick={() => handleEdit(event)} className="text-xs hover:bg-blue-400/20 text-secondary-foreground p-1 rounded-full">
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => setShowDeleteDialog(true)} className="text-xs hover:bg-destructive/10 text-destructive p-1 rounded-full">
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                )}
                {onViewOnMap && (event.location?.geolocation || 
                  (event.category === 'travel' && event.departure?.location?.geolocation) || 
                  (event.category === 'accommodation' && event.checkIn?.location?.geolocation)) && (
                  <button 
                    onClick={() => onViewOnMap(event.id)} 
                    className="text-xs hover:bg-primary/10 text-primary p-1 rounded-full"
                    title="View on map"
                  >
                    <MapPinIcon className="w-3.5 h-3.5" />
                  </button>
                )}
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
            {deleteError && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-3 my-3 rounded-md text-sm">
                <p className="font-medium">Error: {deleteError}</p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="text-sm text-muted-foreground mb-1">
          {event.category === 'travel' 
            ? `${event.departure?.location?.city || ''}, ${event.departure?.location?.country || ''}`
            : event.category === 'accommodation'
              ? `${event.checkIn?.location?.city || ''}, ${event.checkIn?.location?.country || ''}`
              : `${event.location?.city || ''}, ${event.location?.country || ''}`
          }
        </div>
        {(event.category === 'travel' 
          ? event.departure?.location?.name 
          : event.category === 'accommodation'
            ? event.placeName || event.checkIn?.location?.name
            : event.location?.name) && (
          <div className="text-sm mb-1">
            {
              event.category === 'travel' 
                ? event.departure?.location?.name 
                : event.category === 'accommodation'
                  ? event.placeName || event.checkIn?.location?.name
                  : event.location?.name
            }
          </div>
        )}
        
        {/* Travel Events (flight, train, car, boat, bus, other) */}
        {event.category === 'travel' && (
          <div className="mt-2 text-xs">
            {event.type === 'flight' && (
              <>
                <div>{event.flightNumber ? `Flight: ${event.flightNumber} ${event.airline && `(${event.airline})`}` : 'Flight'}</div>
                {event.departure && (
                  <div>Departure: {event.departure.location?.name} {event.departure.date && `@ ${formatDate(event.departure.date)} ${formatTime(event.departure.date)}`}</div>
                )}
                {event.arrival && (
                  <div>Arrival: {event.arrival.location?.name} {event.arrival.date && `@ ${formatDate(event.arrival.date)} ${formatTime(event.arrival.date)}`}</div>
                )}
                {event.trainNumber && <div>Train: {event.trainNumber}</div>}
                {event.seat && <div>Seat {event.seat}</div>}
                {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
              </>
            )}
            {['train', 'car', 'boat', 'bus', 'other'].includes(event.type) && (
              <>
                {/* <div>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div> */}
                {event.departure && (
                  <div>Departure: {event.departure.location?.name} {event.departure.date && `@ ${formatDate(event.departure.date)} ${formatTime(event.departure.date)}`}</div>
                )}
                {event.arrival && (
                  <div>Arrival: {event.arrival.location?.name} {event.arrival.date && `@ ${formatDate(event.arrival.date)} ${formatTime(event.arrival.date)}`}</div>
                )}
                <div className="flex gap-1">
                  {event.trainNumber && <div>Train {event.trainNumber}, </div>}
                  {event.seat && <div>Seat {event.seat}</div>}
                </div>
                {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
              </>
            )}
          </div>
        )}
        {/* Accommodation Events (hotel, hostel, airbnb, other) */}
        {event.category === 'accommodation' && (
          <div className="mt-2 text-xs">
            {/* <div>{event.placeName}</div> */}
            {event.checkIn && (
              <div>Check-in: {event.checkIn.location?.name} {event.checkIn.date && `@ ${formatDate(event.checkIn.date)} ${formatTime(event.checkIn.date)}`}</div>
            )}
            {event.checkOut && (
              <div>Check-out: {event.checkOut.location?.name} {event.checkOut.date && `@ ${formatDate(event.checkOut.date)} ${formatTime(event.checkOut.date)}`}</div>
            )}
            {event.roomNumber && <div>Room: {event.roomNumber}</div>}
            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
          </div>
        )}
        {/* Experience Events (activity, tour, museum, concert, other) */}
        {event.category === 'experience' && (
          <div className="mt-2 text-xs">
            {/* <div>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div> */}
            {/* {event.location && <div>Location: {event.location.name}</div>} */}
            {event.startDate && <div>Start: {formatDate(event.startDate)} {formatTime(event.startDate)}</div>}
            {event.endDate && <div>End: {formatDate(event.endDate)} {formatTime(event.endDate)}</div>}
            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
          </div>
        )}
        {/* Meal Events (restaurant, other) */}
        {event.category === 'meal' && (
          <div className="mt-2 text-xs">
            {/* <div>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div> */}
            {/* {event.location && <div>Location: {event.location.name}</div>} */}
            {event.date && <div>Time: {formatDate(event.date)} {formatTime(event.date)}</div>}
            {event.reservationReference && <div>Reservation Ref: {event.reservationReference}</div>}
          </div>
        )}
      </div>
    </div>
  );
}; 