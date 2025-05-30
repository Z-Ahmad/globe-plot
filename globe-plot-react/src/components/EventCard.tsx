import React, { useState } from 'react';
import { Event, AccommodationEvent, TravelEvent } from '@/types/trip';
import { format, parseISO } from 'date-fns';
import { getEventStyle } from '@/styles/eventStyles';
import { MoreHorizontal, Map, Pencil, Trash2, Loader } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { geocodeEventForMap, waitForEventUpdateAndFocus } from '@/lib/mapboxService';
import { useTripContext } from '@/context/TripContext';
import { focusEventOnMap } from '@/context/TripContext';
import toast from 'react-hot-toast';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
  onViewOnMap?: (id: string) => void;
}

// Helper functions for date/time formatting
const formatTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return ''; // Return empty string or some placeholder for invalid dates
  }
};

// New helper for formatting date as "MMM d"
const formatDisplayDate = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return 'Invalid Date';
  }
};

// Helper function to extract city/country for display
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

// Helper function to format city/country display
const formatCityCountry = (city?: string, country?: string): string => {
  if (city && country) {
    return `${city}, ${country}`;
  } else if (city) {
    return city;
  } else if (country) {
    return country;
  }
  return '';
};

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onEdit,
  onDelete,
  onViewOnMap
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { updateEvent, setFocusedEventId, events } = useTripContext();
  const { icon: Icon, color, bgColor, borderColor, hoverBgColor } = getEventStyle(event);

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

  const handleViewOnMap = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if event already has coordinates
    const hasCoordinates = !!(
      (event.category === 'travel' && event.departure?.location?.geolocation) ||
      (event.category === 'accommodation' && event.checkIn?.location?.geolocation) ||
      (event.location?.geolocation)
    );

    if (hasCoordinates) {
      // Event already has coordinates, just focus on map
      if (onViewOnMap) {
        onViewOnMap(event.id);
      } else {
        // Fallback to context-based approach
        setFocusedEventId(event.id);
        focusEventOnMap(event.id);
      }
      return;
    }

    // Event doesn't have coordinates, need to geocode first
    setIsGeocoding(true);
    try {
      // Create a wrapper function that matches the expected signature
      const updateEventWrapper = async (updatedEvent: Event) => {
        await updateEvent(updatedEvent.id, updatedEvent);
      };

      const result = await geocodeEventForMap(event, updateEventWrapper);
      
      if (result.success && result.event) {
        toast.success('Location coordinates found!');
        
        // Wait for the event to be updated in the context before focusing
        if (onViewOnMap) {
          await waitForEventUpdateAndFocus(
            result.event.id,
            events,
            setFocusedEventId,
            focusEventOnMap,
            2000
          );
          onViewOnMap(result.event.id);
        } else {
          // Fallback to context-based approach
          await waitForEventUpdateAndFocus(
            result.event.id,
            events,
            setFocusedEventId,
            focusEventOnMap,
            2000
          );
        }
      } else {
        toast.error(result.error || 'Could not find coordinates for this location');
      }
    } catch (error) {
      console.error('Error geocoding event:', error);
      toast.error('Failed to find location coordinates');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <>
      <div
        className={`p-4 border ${borderColor} rounded-lg ${bgColor} hover:${hoverBgColor} transition-colors cursor-pointer`}
        onClick={() => onEdit && onEdit(event)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>

          <div className="flex-1 min-w-0 ">
            <div className="flex justify-between items-start">
              <h4 className="font-medium truncate pb-0 mb-0">{event.title}</h4>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={getEventStyle(event).bgColor}>
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEdit(event);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}

                  {onViewOnMap && (
                    <DropdownMenuItem onClick={handleViewOnMap} disabled={isGeocoding}>
                      {isGeocoding ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Map className="mr-2 h-4 w-4" />}
                      <span>{isGeocoding ? "Finding location..." : "View on Map"}</span>
                    </DropdownMenuItem>
                  )}

                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 1. City/Country display - more prominent */}
            {(() => {
              const { city, country } = getLocationInfo(event);
              const locationDisplay = formatCityCountry(city, country);

              if (locationDisplay) {
                return <div className="text-sm text-muted-foreground font-medium mt-1">{locationDisplay}</div>;
              }
              return null;
            })()}

            {/* 2. Time display */}
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mt-1">
              {event.category === "accommodation" ? (
                (() => {
                  const accommodationEvent = event as AccommodationEvent;
                  const checkInDisplay = formatDisplayDate(accommodationEvent.checkIn?.date);
                  const checkOutDisplay = formatDisplayDate(accommodationEvent.checkOut?.date);

                  if (checkInDisplay && checkOutDisplay) {
                    if (checkInDisplay === checkOutDisplay) {
                      return <span>{checkInDisplay}</span>;
                    }
                    return (
                      <span>
                        {checkInDisplay} - {checkOutDisplay}
                      </span>
                    );
                  } else if (checkInDisplay) {
                    // Fallback if only check-in is available, though both should be for Accomm.
                    return <span>Check-in: {checkInDisplay}</span>;
                  }
                  return <span>Date not available</span>;
                })()
              ) : (
                <>
                  <span>{formatTime(event.start)}</span>
                  {event.end && formatTime(event.start) !== formatTime(event.end) && (
                    <>
                      <span className="mx-1">-</span>
                      <span>{formatTime(event.end)}</span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* 3. Specific location details */}
            <div className="mt-2 text-sm">
              {event.category === "travel" ? (
                <div className="flex items-center text-muted-foreground">
                  <span>{(event as TravelEvent).departure?.location?.name || (event as TravelEvent).departure?.location?.city || "N/A"}</span>
                  <span className="mx-1">→</span>
                  <span>{(event as TravelEvent).arrival?.location?.name || (event as TravelEvent).arrival?.location?.city || "N/A"}</span>
                </div>
              ) : event.category === "accommodation" ? (
                <div className="text-muted-foreground">
                  {(event as AccommodationEvent).placeName ||
                    (event as AccommodationEvent).checkIn?.location?.name ||
                    (event as AccommodationEvent).checkIn?.location?.city ||
                    "No location specified"}
                </div>
              ) : (
                /* For Experience and Meal events */
                <div className="text-muted-foreground">{event.location?.name || event.location?.city || "No location specified"}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>Are you sure you want to delete "{event.title}"? This action cannot be undone.</AlertDialogDescription>
          {deleteError && (
            <div className="bg-destructive/10 border border-destructive text-destructive p-3 my-3 rounded-md text-sm">
              <p className="font-medium">Error: {deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 