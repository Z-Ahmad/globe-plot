import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { Button } from './ui/button';
import { LogIn, LogOut } from 'lucide-react';

export function LoginButton() {
  const { user, signIn, logout, loading } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await logout();
      } else {
        await signIn();
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      variant={user ? "outline" : "default"}
      size="sm"
      onClick={handleAuth}
      disabled={isLoading || loading}
    >
      {isLoading ? (
        <span className="flex items-center">
          <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {user ? 'Signing out...' : 'Signing in...'}
        </span>
      ) : (
        <span className="flex items-center">
          {user ? (
            <>
              <span className="text-sm font-medium mr-2">Sign Out</span>
              <LogOut className="h-4 w-4" />
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </>
          )}
        </span>
      )}
    </Button>
  );
} 