import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOut } from '../lib/firebaseService';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
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
      
      logout: async () => {
        set({ loading: true, error: null });
        try {
          await signOut();
          set({ user: null, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign out',
            loading: false
          });
        }
      },
      
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user }), // Only persist the user data
    }
  )
); 