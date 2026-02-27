import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { useEffect } from "react";
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
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeInitializer />
      <Router>
        <Routes>
          {/* Main layout wraps all routes that need the navbar */}
          <Route element={<MainLayout />}>
            {/* Landing page route */}
            <Route path="/" element={<Landing />} />

            {/* Dashboard route */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* New trip route */}
            <Route path="/trip/new" element={<NewTrip />} />

            {/* Individual trip route */}
            <Route path="/trip/:id" element={<TripView />} />

            {/* Demo route */}
            <Route path="/demo" element={<Demo />} />

            {/* Privacy Policy route */}
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />

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
