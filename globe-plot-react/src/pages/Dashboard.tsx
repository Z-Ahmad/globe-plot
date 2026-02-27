import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';
import { Event, TravelEvent, AccommodationEvent, Trip, ShareInvitation } from '../types/trip';
import { CalendarDays, Map, Trash2, Share2, UserPlus, MapPin } from 'lucide-react';
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
import { Button } from "@/components/ui/button";
import { formatDateRange } from '@/lib/utils';
import {
  deleteTrip as firebaseDeleteTrip,
  listenForPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from '@/lib/firebaseService';
import { useUserStore } from '@/stores/userStore';
import { ShareTripModal } from '@/components/ShareTripModal';

const ACCENT_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-cyan-600',
];

function getAccentGradient(id: string): string {
  const n = id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return ACCENT_GRADIENTS[n % ACCENT_GRADIENTS.length];
}

type TripStatus = 'upcoming' | 'ongoing' | 'past';

function getTripStatus(trip: Trip): TripStatus {
  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (end < now) return 'past';
  if (start <= now) return 'ongoing';
  return 'upcoming';
}

const getLocationCity = (event: Event): string | undefined => {
  if (event.category === 'travel') {
    return (event as TravelEvent).departure?.location?.city;
  } else if (event.category === 'accommodation') {
    return (event as AccommodationEvent).checkIn?.location?.city;
  }
  return event.location?.city;
};

function getUniqueCities(events: Event[]): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const event of events) {
    const city = getLocationCity(event);
    if (city && !seen.has(city)) {
      seen.add(city);
      cities.push(city);
    }
  }
  return cities;
}

function TripCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="h-1.5 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 bg-muted rounded-full w-16" />
          <div className="h-6 bg-muted rounded-full w-20" />
          <div className="h-6 bg-muted rounded-full w-14" />
        </div>
        <div className="h-px bg-border mt-2" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    </div>
  );
}

interface TripCardProps {
  trip: Trip;
  isOwner: boolean;
  onDelete: (tripId: string) => void;
  onShare: (trip: Trip) => void;
}

const TripCard = ({ trip, isOwner, onDelete, onShare }: TripCardProps) => {
  const gradient = getAccentGradient(trip.id);
  const cities = getUniqueCities(trip.events);
  const visibleCities = cities.slice(0, 4);
  const extraCities = cities.length - visibleCities.length;

  return (
    <div className="relative group">
      <Link
        to={`/trip/${trip.id}`}
        className="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
        <div className="p-5">
          <h2 className="text-base font-semibold pr-16 leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {trip.name}
          </h2>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1.5">
            <CalendarDays size={14} />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          </p>

          {visibleCities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {visibleCities.map((city) => (
                <span
                  key={city}
                  className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                >
                  {city}
                </span>
              ))}
              {extraCities > 0 && (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                  +{extraCities} more
                </span>
              )}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Map size={12} />
              {trip.events.length} {trip.events.length === 1 ? 'event' : 'events'}
            </span>
            {cities.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {cities.length} {cities.length === 1 ? 'city' : 'cities'}
              </span>
            )}
          </div>
        </div>
      </Link>

      {isOwner && (
        <div className="absolute top-3.5 right-3 flex gap-1">
          <button
            className="w-7 h-7 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background transition-colors"
            aria-label={`Share ${trip.name}`}
            onClick={(e) => { e.preventDefault(); onShare(trip); }}
          >
            <Share2 size={13} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="w-7 h-7 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background transition-colors"
                aria-label={`Delete ${trip.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 size={13} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{' '}
                  <span className="font-semibold text-foreground">"{trip.name}"</span>{' '}
                  and all its events. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(trip.id)}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

function SectionHeading({
  label,
  count,
  icon,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="font-semibold text-foreground">{label}</h2>
      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium">
        {count}
      </span>
    </div>
  );
}

export const Dashboard = () => {
  const { trips, removeTrip, fetchTrips, lastSync, _isHydrated, loading } = useTripStore();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<ShareInvitation[]>([]);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (user && _isHydrated && !lastSync) {
      fetchTrips();
    }
  }, [user, _isHydrated, lastSync, fetchTrips]);

  useEffect(() => {
    if (user) {
      const unsubscribe = listenForPendingInvitations((pending) => {
        setInvitations(pending);
      });
      return () => unsubscribe();
    } else {
      setInvitations([]);
    }
  }, [user]);

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      toast.success("Invitation accepted!");
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      fetchTrips();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation.");
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineInvitation(invitationId);
      toast.success("Invitation declined.");
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline invitation.");
    }
  };

  const openShareModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setShareModalOpen(true);
  };

  const confirmDelete = async (tripId: string) => {
    const tripToDelete = trips.find((t) => t.id === tripId);
    const tripName = tripToDelete?.name ?? 'Trip';

    toast.promise(
      (async () => {
        setDeleteError('');
        setIsDeleting(true);
        setDeletingTripId(tripId);
        try {
          try {
            await removeTrip(tripId);
            const storeError = useTripStore.getState().error;
            if (storeError) throw new Error(storeError);
          } catch {
            await firebaseDeleteTrip(tripId);
            const current = useTripStore.getState().trips;
            useTripStore.getState().setTrips(current.filter((t) => t.id !== tripId));
          }
        } catch (err) {
          setDeleteError(err instanceof Error ? err.message : 'Failed to delete trip');
          throw err;
        } finally {
          setIsDeleting(false);
          setDeletingTripId(null);
        }
      })(),
      {
        loading: `Deleting "${tripName}"...`,
        success: `"${tripName}" deleted`,
        error: `Failed to delete "${tripName}"`,
      },
      {
        success: { duration: 3000 },
        error: {
          style: {
            background: 'rgb(254,226,226)',
            color: 'rgb(185,28,28)',
            border: '1px solid rgb(254,202,202)',
          },
        },
      }
    );
  };

  const ownedTrips = user ? trips.filter((t) => t.userId === user.uid) : [];
  const sharedTrips = user ? trips.filter((t) => t.userId !== user.uid) : [];

  const ongoingTrips = ownedTrips.filter((t) => getTripStatus(t) === 'ongoing');
  const upcomingTrips = ownedTrips.filter((t) => getTripStatus(t) === 'upcoming');
  const pastTrips = ownedTrips.filter((t) => getTripStatus(t) === 'past');

  // Show skeletons before store hydrates or during the initial fetch with no cached data
  const isLoading = !_isHydrated || (loading && trips.length === 0);

  return (
    <main className="max-w-7xl mx-auto p-6 pt-8">
      <ShareTripModal
        trip={selectedTrip}
        open={isShareModalOpen}
        onOpenChange={setShareModalOpen}
      />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Link
          to="/trip/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          + New Trip
        </Link>
      </div>

      {deleteError && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 mb-6 rounded-lg text-sm">
          Error deleting trip: {deleteError}
        </div>
      )}

      {invitations.length > 0 && (
        <div className="mb-10">
          <SectionHeading
            label="Trip Invitations"
            count={invitations.length}
            icon={<UserPlus size={16} className="text-primary" />}
          />
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-card border border-border p-4 rounded-xl flex justify-between items-center gap-4"
              >
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{inv.ownerEmail}</span> invited you to{' '}
                    <span className="font-bold text-primary">{inv.tripName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(inv.createdAt.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => handleAccept(inv.id)} size="sm">Accept</Button>
                  <Button onClick={() => handleDecline(inv.id)} variant="outline" size="sm">Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✈️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">No trips planned yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
            Start by creating your first trip and adding destinations to plan your perfect journey.
          </p>
          <button
            onClick={() => navigate('/trip/new')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {ongoingTrips.length > 0 && (
            <section>
              <SectionHeading
                label="Active Now"
                count={ongoingTrips.length}
                icon={<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ongoingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isOwner={true}
                    onDelete={confirmDelete}
                    onShare={openShareModal}
                  />
                ))}
              </div>
            </section>
          )}

          {upcomingTrips.length > 0 && (
            <section>
              <SectionHeading
                label="Upcoming"
                count={upcomingTrips.length}
                icon={<CalendarDays size={16} className="text-primary" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isOwner={true}
                    onDelete={confirmDelete}
                    onShare={openShareModal}
                  />
                ))}
              </div>
            </section>
          )}

          {pastTrips.length > 0 && (
            <section>
              <SectionHeading
                label="Past Trips"
                count={pastTrips.length}
                icon={<Map size={16} className="text-muted-foreground" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70">
                {pastTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isOwner={true}
                    onDelete={confirmDelete}
                    onShare={openShareModal}
                  />
                ))}
              </div>
            </section>
          )}

          {sharedTrips.length > 0 && (
            <section>
              <SectionHeading
                label="Shared With Me"
                count={sharedTrips.length}
                icon={<UserPlus size={16} className="text-indigo-500" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sharedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isOwner={false}
                    onDelete={() => {}}
                    onShare={() => {}}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};
