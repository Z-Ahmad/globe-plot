import { ReactNode, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useUserStore } from '../stores/userStore';
import { useTripStore } from '../stores/tripStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setInitialized, setError } = useUserStore();
  const { setTrips } = useTripStore();
  
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;

      setLoading(true);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        console.log(`AuthProvider: User ${firebaseUser.uid} signed in.`);
      } else {
        console.log("AuthProvider: User signed out. Clearing local trip data.");
        setTrips([]);
      }

      setLoading(false);
      // Mark auth as initialized after the first Firebase response — this
      // prevents RequireAuth from redirecting before we know the auth state.
      setInitialized(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setUser, setLoading, setInitialized, setError, setTrips]);
  
  return <>{children}</>;
} 