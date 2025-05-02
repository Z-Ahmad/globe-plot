import { Link } from "react-router-dom";

interface NavbarProps {
  children?: React.ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  return (
    <header className="bg-primary text-primary-foreground py-3 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            {/* Logo */}
            <div className="flex items-center justify-center bg-white rounded-full w-8 h-8 overflow-hidden">
              <div className="text-primary text-xl" style={{ marginTop: '-2px' }}>🌍</div>
            </div>
            <span className="text-xl font-bold">Globeplot</span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/dashboard" className="text-primary-foreground/90 hover:text-primary-foreground transition-colors text-sm font-medium">
            My Trips
          </Link>
          <Link to="/explore" className="text-primary-foreground/90 hover:text-primary-foreground transition-colors text-sm font-medium">
            Explore
          </Link>
          <Link to="/help" className="text-primary-foreground/90 hover:text-primary-foreground transition-colors text-sm font-medium">
            Help
          </Link>
          
          <div className="pl-2 flex items-center space-x-3">
            <Link 
              to="/trip/new" 
              className="bg-white text-primary hover:bg-primary-foreground/90 transition-colors px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm"
            >
              <span className="text-xs">+</span>
              <span>New Trip</span>
            </Link>
            
            <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center font-medium shadow-sm">
              <span className="text-sm">ZK</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Optional children for extra content */}
      {children}
    </header>
  );
} 