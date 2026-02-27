import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Moon, Sun, LogIn, LogOut, User } from "lucide-react";
import { Logo } from "./Logo";
import { useThemeStore } from "../stores/themeStore";
import { useUserStore } from "../stores/userStore";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";

function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isDark ? "bg-indigo-900" : "bg-amber-100"
      }`}
    >
      <motion.div
        className={`absolute flex items-center justify-center w-6 h-6 rounded-full shadow-md ${
          isDark ? "bg-indigo-500 text-indigo-100" : "bg-amber-400 text-amber-800"
        }`}
        animate={{ x: isDark ? 30 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      >
        {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </motion.div>
    </button>
  );
}

function ProfileButton() {
  const { user, logout, loading } = useUserStore();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => navigate("/login")}
        disabled={loading}
        className="flex items-center gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    );
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-primary text-primary-foreground font-semibold text-sm ring-2 ring-primary/20 hover:ring-primary/50 transition-all focus:outline-none"
          aria-label="Open profile menu"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? "Profile"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <div className="px-2 py-1.5 mb-1 border-b border-border">
          <p className="text-sm font-medium truncate">{user.displayName ?? "Traveller"}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <User className="h-4 w-4" />
          View Profile
        </button>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          {isLoggingOut ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {isLoggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 shadow-lg backdrop-blur-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-full mx-2 flex justify-between items-center px-6 py-3">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo className="w-10 h-10 transition-transform duration-500 group-hover:[transform:rotateY(180deg)]" />
          <span className="text-2xl font-bold text-foreground">
            Globeplot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">

          {user && (
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm"
            >
              My Trips
            </Link>
          )}
          <div className="flex items-center gap-3">
            {user && (
              <Link
                to="/trip/new"
                className="group relative px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full overflow-hidden shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Trip</span>
              </Link>
            )}
            <ThemeToggle />
            <ProfileButton />
          </div>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
