import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIsOnline } from "@/hooks/useIsOnline";
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

function ThemedToaster() {
  const { isDark } = useThemeStore();

  const base = isDark
    ? { background: '#1e1f2e', color: '#e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }
    : { background: '#ffffff', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

  const success = isDark
    ? { background: '#0d2818', color: '#86efac', border: '1px solid #166534' }
    : { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };

  const error = isDark
    ? { background: '#2d0f0f', color: '#fca5a5', border: '1px solid #7f1d1d' }
    : { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        style: { ...base, borderRadius: '10px' },
        duration: 4000,
        success: {
          style: { ...success, borderRadius: '10px' },
          iconTheme: { primary: isDark ? '#86efac' : '#166534', secondary: isDark ? '#0d2818' : '#dcfce7' },
        },
        error: {
          style: { ...error, borderRadius: '10px' },
          iconTheme: { primary: isDark ? '#fca5a5' : '#b91c1c', secondary: isDark ? '#2d0f0f' : '#fee2e2' },
        },
      }}
    />
  );
}

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
      <ThemedToaster />
    </AuthProvider>
  );
}

export default App;
