import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Landing } from "./pages/Landing";
import { Demo } from "./pages/Demo";
import { Dashboard } from "./pages/Dashboard";
import { NewTrip } from "./pages/NewTrip";
import { Trip } from "./pages/Trip";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";

// Layout component that includes the Navbar and renders child routes
function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
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
          <Route path="/trip/:id" element={<Trip />} />

          {/* Demo route */}
          <Route path="/demo" element={<Demo />} />
          
          {/* Privacy Policy route */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* Not found route */}
          <Route path="*" element={
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary mb-4">Page Not Found</h1>
                <p className="text-muted-foreground mb-6">
                  The page you are looking for doesn't exist or has been moved.
                </p>
                <a href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded-full">
                  Go Home
                </a>
              </div>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
