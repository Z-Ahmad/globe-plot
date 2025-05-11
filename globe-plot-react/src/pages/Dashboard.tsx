import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';
import { Event, BaseEvent, TravelEvent, AccommodationEvent, ExperienceEvent, MealEvent } from '../types/trip';
import { CalendarDays, Map, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateRange } from '@/lib/utils';
import { deleteTrip as firebaseDeleteTrip } from '@/lib/firebaseService';


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

// Group events by country and city for preview
function groupEventsByCountryCity(events: Event[]): Record<string, Record<string, Event[]>> {
  const groups: Record<string, Record<string, Event[]>> = {};
  events.forEach((event: Event) => {
    const { city, country } = getLocationInfo(event);
    
    if (!country) return; // Skip events without country
    if (!groups[country]) groups[country] = {};
    
    const cityKey = city || 'Unknown';
    if (!groups[country][cityKey]) groups[country][cityKey] = [];
    groups[country][cityKey].push(event);
  });
  return groups;
}

interface PreviewEvent {
  country: string;
  city: string;
  event: Event;
}

export const Dashboard = () => {
  const { trips, removeTrip, error } = useTripStore();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const confirmDelete = async (tripId: string) => {
    // Find the trip name for the toast message
    const tripToDelete = trips.find(trip => trip.id === tripId);
    const tripName = tripToDelete?.name || 'Trip';
    
    // Custom toast styling for trip deletion
    const customToastStyle = {
      background: 'rgb(219, 234, 254)', // Lighter blue background (blue-100)
      color: 'rgb(30, 58, 138)',       // Dark blue text
      border: '1px solid rgb(191, 219, 254)', // Lighter border (blue-200)
      borderRadius: '8px',
      padding: '12px 16px',
    };
    
    // Create promise toast with custom styling
    toast.promise(
      (async () => {
        try {
          console.log(`Dashboard: confirming delete for trip ${tripId}`);
          setDeleteError('');
          setIsDeleting(true);
          setDeletingTripId(tripId);
          
          try {
            // First try the regular store method
            await removeTrip(tripId);
            
            // Check if the store has an error after deletion attempt
            const storeError = useTripStore.getState().error;
            if (storeError) {
              console.log('Store reported an error, will try direct firebase delete');
              throw new Error(storeError);
            }
          } catch (storeError) {
            // If the store method fails, try the direct Firebase method
            console.log('First delete attempt failed, trying alternative method');
            await firebaseDeleteTrip(tripId);
            
            // If we get here, the direct method worked, so update the store state
            // to reflect the deletion (the trip is actually gone from Firestore)
            const currentTrips = useTripStore.getState().trips;
            useTripStore.getState().setTrips(currentTrips.filter(t => t.id !== tripId));
          }
        } catch (err) {
          console.error('Error in Dashboard delete handler:', err);
          setDeleteError(err instanceof Error ? err.message : 'Failed to delete trip');
          throw err; // Re-throw to trigger toast error
        } finally {
          setIsDeleting(false);
          setDeletingTripId(null);
        }
      })(),
      {
        loading: `Deleting "${tripName}"...`,
        success: `"${tripName}" has been successfully deleted`,
        error: `Failed to delete "${tripName}"`,
      },
      {
        style: customToastStyle,
        success: {
          duration: 4000,
          icon: <Trash2 color="rgb(30, 58, 138)" size={22} />,
        },
        error: {
          style: {
            background: 'rgb(254, 226, 226)', // Light red for errors
            color: 'rgb(185, 28, 28)',
            border: '1px solid rgb(254, 202, 202)',
          },
        },
      }
    );
  };

  return (
    <main className='max-w-7xl mx-auto p-6'>
      <div className="flex justify-between items-center mb-8">
        <h1 className='text-2xl font-bold'>My Trips</h1>
        <Link 
          to="/trip/new" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
        >
          + New Trip
        </Link>
      </div>

      {deleteError && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 mb-4 rounded-md">
          <p className="font-medium">Error deleting trip: {deleteError}</p>
          <p className="text-sm mt-1">Please try again or refresh the page.</p>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary text-2xl">✈️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">No trips planned yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start by creating your first trip and adding destinations to plan your perfect journey.
          </p>
          <button 
            onClick={() => navigate('/trip/new')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => {
            // Group events for preview
            const grouped = groupEventsByCountryCity(trip.events);
            // Flatten preview: country > city > first event in each city
            const previewEvents: PreviewEvent[] = [];
            Object.entries(grouped).forEach(([country, cities]) => {
              Object.entries(cities).forEach(([city, events]) => {
                if (events.length > 0) {
                  previewEvents.push({
                    country,
                    city,
                    event: events[0]
                  });
                }
              });
            });
            return (
              <div key={trip.id} className="relative">
                <Link to={`/trip/${trip.id}`} className="block bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{trip.name}</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      <CalendarDays size={16} />

                      <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                    </p>
                    <div className="mt-4 flex items-center text-sm text-chart-2">
                      <span className="mr-4 flex items-center gap-2">
                        <Map size={16} />
                        <span className="mr-1">{trip.events.length} events</span>
                      </span>
                    </div>
                    {previewEvents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Itinerary Preview</p>
                        <div className="space-y-2">
                          {previewEvents.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 text-xs">{idx + 1}</div>
                              <div className="truncate">
                                <span className="font-medium">
                                  {item.city}, {item.country}
                                </span>
                                : {item.event.title}
                              </div>
                            </div>
                          ))}
                          {previewEvents.length > 3 && <div className="text-xs text-muted-foreground ml-7">+ {previewEvents.length - 3} more locations</div>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="h-2 bg-gradient-to-r from-primary to-accent"></div>
                </Link>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="absolute top-2 right-2 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full 
                                flex items-center justify-center text-muted-foreground hover:text-destructive
                                hover:bg-background transition-colors z-10"
                      aria-label={`Delete ${trip.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 size={16} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to delete this trip?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your trip and remove all its data from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => confirmDelete(trip.id)} 
                        className="bg-destructive text-white hover:bg-destructive/90"
                        disabled={isDeleting && deletingTripId === trip.id}
                      >
                        {isDeleting && deletingTripId === trip.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
