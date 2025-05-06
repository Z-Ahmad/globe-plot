import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';
import { Event } from '../stores/tripStore';
import { Trash2 } from 'lucide-react';
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

// Format date range to be more readable
const formatDateRange = (dateRange: string): string => {
  const parts = dateRange.split(' - ');
  if (parts.length !== 2) return dateRange;
  try {
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
  } catch (e) {
    return dateRange;
  }
};

// Group events by country and city for preview
function groupEventsByCountryCity(events: Event[]): Record<string, Record<string, Event[]>> {
  const groups: Record<string, Record<string, Event[]>> = {};
  events.forEach((event: Event) => {
    if (!groups[event.country]) groups[event.country] = {};
    if (!groups[event.country][event.city]) groups[event.country][event.city] = [];
    groups[event.country][event.city].push(event);
  });
  return groups;
}

interface PreviewEvent {
  country: string;
  city: string;
  event: Event;
}

export const Dashboard = () => {
  const { trips, removeTrip } = useTripStore();
  const navigate = useNavigate();
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  const confirmDelete = (tripId: string) => {
    removeTrip(tripId);
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
                <Link 
                  to={`/trip/${trip.id}`}
                  className="block bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{trip.name}</h2>
                    <p className="text-muted-foreground text-sm flex items-center">
                      <span className="mr-2">📅</span> {formatDateRange(trip.dateRange)}
                    </p>
                    <div className="mt-4 flex items-center text-sm text-muted-foreground">
                      <span className="mr-4 flex items-center">
                        <span className="mr-1">🗓️</span> {trip.events.length} events
                      </span>
                    </div>
                    {previewEvents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Itinerary Preview</p>
                        <div className="space-y-2">
                          {previewEvents.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 text-xs">
                                {idx + 1}
                              </div>
                              <div className="truncate">
                                <span className="font-medium">{item.city}, {item.country}</span>: {item.event.title}
                              </div>
                            </div>
                          ))}
                          {previewEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground ml-7">
                              + {previewEvents.length - 3} more locations
                            </div>
                          )}
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
                        This action cannot be undone. This will permanently delete your trip
                        and remove all its data from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => confirmDelete(trip.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
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
