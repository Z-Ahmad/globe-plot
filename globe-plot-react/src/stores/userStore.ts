import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOut, signInWithEmail, registerWithEmail } from '../lib/firebaseService';

interface UserState {
  user: User | null;
  loading: boolean;
  initialized: boolean; // true after onAuthStateChanged fires at least once
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      initialized: false,
      error: null,
      
      signIn: async () => {
        set({ loading: true, error: null });
        try {
          const user = await signInWithGoogle();
          set({ user, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign in',
            loading: false
          });
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const user = await signInWithEmail(email, password);
          set({ user, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sign in',
            loading: false,
          });
          throw error;
        }
      },

      registerWithEmail: async (email: string, password: string, displayName?: string) => {
        set({ loading: true, error: null });
        try {
          const user = await registerWithEmail(email, password, displayName);
          set({ user, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to register',
            loading: false,
          });
          throw error;
        }
      },
      
      logout: async () => {
        set({ loading: true, error: null });
        try {
          // Sign out from Firebase
          await signOut();
          
          // Clear all localStorage
          localStorage.clear();
          
          // Reset state
          set({ user: null, loading: false });
          
          // Redirect to home page
          window.location.href = '/';
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign out',
            loading: false
          });
        }
      },
      
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user }), // Only persist the user data
    }
  )
); 