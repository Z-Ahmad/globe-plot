import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BottomNavigation } from "./components/BottomNavigation";
import { Landing } from "./pages/Landing";
import { Demo } from "./pages/Demo";
import { Dashboard } from "./pages/Dashboard";
import { NewTrip } from "./pages/NewTrip";
import { TripView } from "./pages/TripView";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Login } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { AuthProvider } from "./components/AuthProvider";
import { Toaster } from "react-hot-toast";
import { useThemeStore } from "./stores/themeStore";
import { useUserStore } from "./stores/userStore";
import { Loader2 } from "lucide-react";

// Guards protected routes — waits for Firebase auth to initialise before deciding
function RequireAuth() {
  const { user, initialized } = useUserStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}

function useIsOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true
  );
}

function OfflineBanner() {
  const isOnline = useIsOnline();
  const [visible, setVisible] = useState(!isOnline);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setFading(false);
    } else if (visible) {
      // Keep "back online" visible briefly, then fade out
      setFading(true);
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"} ${isOnline ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700" : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700"}`}
    >
      {isOnline ? (
        <span>Back online</span>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline — viewing cached data</span>
        </>
      )}
    </div>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      // Poll for updates every 60 seconds so installed PWAs don't wait indefinitely
      setInterval(() => r?.update(), 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm font-medium text-foreground">
      <RefreshCw className="w-4 h-4 text-primary shrink-0" />
      <span>New version available</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="ml-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        Reload
      </button>
    </div>
  );
}

function ThemeInitializer() {
  const { isDark, setDark } = useThemeStore();
  useEffect(() => {
    setDark(isDark);
  }, []);
  return null;
}

// Layout component that includes the Navbar and renders child routes
function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow pt-16 pb-20 md:pb-0">
        <Outlet />
      </div>
      <Footer />
      <BottomNavigation />
      <OfflineBanner />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeInitializer />
      <UpdatePrompt />
      <Router>
        <Routes>
          {/* Main layout wraps all routes that need the navbar */}
          <Route element={<MainLayout />}>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trip/new" element={<NewTrip />} />
              <Route path="/trip/:id" element={<TripView />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Not found route */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-background flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-primary mb-4">Page Not Found</h1>
                    <p className="text-muted-foreground mb-6">The page you are looking for doesn't exist or has been moved.</p>
                    <a href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded-full">
                      Go Home
                    </a>
                  </div>
                </div>
              }
            />
          </Route>
        </Routes>
      </Router>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Global toast styling (will be overridden by custom styles)
          style: {
            borderRadius: '8px',
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
          // Individual toast type styling (for non-custom toasts)
          success: {
            style: {
              background: 'rgb(220, 252, 231)', // Light green background
              color: 'rgb(22, 101, 52)',       // Dark green text
              border: '1px solid rgb(187, 247, 208)' // Light green border
            },
            iconTheme: {
              primary: 'rgb(22, 101, 52)',
              secondary: 'rgb(220, 252, 231)',
            },
          },
          error: {
            style: {
              background: 'rgb(254, 226, 226)', // Light red background
              color: 'rgb(185, 28, 28)',       // Dark red text
              border: '1px solid rgb(254, 202, 202)' // Light red border
            },
          },
          // We can customize duration globally
          duration: 4000,
        }}
      />
    </AuthProvider>
  );
}

export default App;
