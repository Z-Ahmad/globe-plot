import { ReactNode, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useUserStore } from '../stores/userStore';
import { useTripStore } from '../stores/tripStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setError, user } = useUserStore();
  const { setTrips, fetchTrips, _isHydrated, lastSync } = useTripStore();
  
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;

      setLoading(true);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in. The Dashboard will handle fetching.
        // We don't need to do anything here regarding trips.
        console.log(`AuthProvider: User ${firebaseUser.uid} signed in.`);
      } else {
        // User is signed out. Clear local data to prevent "ghost" trips.
        console.log("AuthProvider: User signed out. Clearing local trip data.");
        setTrips([]); 
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setUser, setLoading, setError, setTrips]);
  
  return <>{children}</>;
} 