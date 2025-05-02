import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Landing } from "./pages/Landing";
import { Demo } from "./pages/Demo";

// Layout component that includes the Navbar and renders child routes
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
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
          <Route path="/dashboard" element={
            <div className="min-h-screen bg-background">
              <div className="max-w-7xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                {/* Form will go here */}
              </div>
            </div>
            } />
          
          {/* New trip route */}
          <Route path="/trip/new" element={
            <div className="min-h-screen bg-background">
              <div className="max-w-7xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Create New Trip</h1>
                {/* Form will go here */}
              </div>
            </div>
          } />

          {/* Demo route */}
          <Route path="/demo" element={<Demo />} />
          
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
