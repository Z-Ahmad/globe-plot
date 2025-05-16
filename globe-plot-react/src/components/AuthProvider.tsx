import { ReactNode, useEffect, useCallback, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useUserStore } from '../stores/userStore';
import { useTripStore } from '../stores/tripStore';
import { Trip } from '@/types/trip';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setError } = useUserStore();
  const { 
    fetchTrips, 
    addTrip, 
    trips: localTrips,
    setTrips,
    setLoading: setTripsLoading, 
    setError: setTripsError 
  } = useTripStore();

  // Track if we've already synced on this auth state change
  const [hasSynced, setHasSynced] = useState(false);
  
  // Use useCallback to prevent recreation of this function on every render
  const syncLocalTripsToFirestore = useCallback(async (localTripsToSync: Trip[]) => {
    try {
      console.log(`Preparing to sync ${localTripsToSync.length} local trips to Firestore`);
      
      // First, fetch all Firestore trips for the user
      const firestoreTrips = await fetchTrips();
      console.log(`Fetched ${firestoreTrips.length} trips from Firestore`);
      
      // Create a map of lowercase trip names to detect duplicates
      const firestoreTripNameMap = new Map();
      firestoreTrips.forEach(trip => {
        firestoreTripNameMap.set(trip.name.toLowerCase().trim(), trip.id);
      });
      
      // Find trips that need to be uploaded (not already in Firestore by name)
      const tripsToUpload = localTripsToSync.filter(localTrip => 
        !firestoreTripNameMap.has(localTrip.name.toLowerCase().trim())
      );
      
      console.log(`Found ${tripsToUpload.length} unique trips to upload to Firestore`);
      
      // Upload each unique local trip to Firestore
      for (const trip of tripsToUpload) {
        await addTrip(trip);
        console.log(`Synced trip "${trip.name}" to Firestore`);
      }
      
      // After syncing, fetch ALL trips from Firestore again to get the final state
      if (tripsToUpload.length > 0) {
        const updatedFirestoreTrips = await fetchTrips();
        
        // Completely replace localStorage with Firestore data
        // This ensures we don't have any duplication issues
        setTrips(updatedFirestoreTrips);
        console.log('Replaced local trips with Firestore trips to prevent duplication');
      }
      
    } catch (error) {
      console.error('Error syncing local trips to Firestore:', error);
      setTripsError(error instanceof Error ? error.message : 'Failed to sync trips to Firestore');
    } finally {
      setHasSynced(true);
    }
  }, [addTrip, fetchTrips, setTrips, setTripsError]);
  
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
        setUser(user);
        
        if (user && !hasSynced) {
          // If user is authenticated, first save the local trips
          try {
            // Get local trips from localStorage directly, before they get overwritten
            const localStorageData = localStorage.getItem('trip-storage');
            let localTripsToSync: Trip[] = [];
            
            if (localStorageData) {
              try {
                const parsedData = JSON.parse(localStorageData);
                if (parsedData.state && Array.isArray(parsedData.state.trips)) {
                  localTripsToSync = parsedData.state.trips;
                  console.log(`Found ${localTripsToSync.length} trips in localStorage to sync`);
                }
              } catch (e) {
                console.error('Error parsing localStorage data:', e);
              }
            }
            
            // Sync local trips with Firestore and handle deduplication
            if (localTripsToSync.length > 0) {
              await syncLocalTripsToFirestore(localTripsToSync);
            } else {
              // If no local trips, just fetch from Firestore
            await fetchTrips();
              console.log('No local trips to sync, fetched from Firestore only');
              setHasSynced(true);
            }
          } catch (error) {
            console.error('Error fetching/syncing trips:', error);
            setTripsError(error instanceof Error ? error.message : 'Failed to sync trips');
            setHasSynced(true);
          }
        }
        
        if (isMounted) {
        setLoading(false);
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        if (isMounted) {
        setError(error.message);
        setLoading(false);
      }
      }
    );
    
    // Cleanup the subscription and prevent state updates after unmount
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setUser, setLoading, setError, fetchTrips, syncLocalTripsToFirestore, hasSynced]);
  
  return <>{children}</>;
} 