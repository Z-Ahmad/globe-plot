import { ReactNode, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useUserStore } from '../stores/userStore';
import { useTripStore } from '../stores/tripStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setError } = useUserStore();
  const { fetchTrips } = useTripStore();
  
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        setUser(user);
        
        if (user) {
          // If user is authenticated, fetch their trips
          try {
            await fetchTrips();
          } catch (error) {
            console.error('Error fetching trips:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch trips');
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      }
    );
    
    // Cleanup the subscription
    return () => unsubscribe();
  }, [setUser, setLoading, setError, fetchTrips]);
  
  return <>{children}</>;
} 