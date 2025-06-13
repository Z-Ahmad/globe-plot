import { Link } from "react-router-dom";
import { LoginButton } from "./LoginButton";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Logo } from "./Logo";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

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
          ? "bg-white/90 shadow-lg backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-2 flex justify-between items-center px-6 py-3">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo className="w-10 h-10 transition-transform duration-500 group-hover:[transform:rotateY(180deg)]" />
          <span className="text-2xl font-bold text-slate-800">
            Globeplot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/dashboard"
            className="text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm"
          >
            My Trips
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/trip/new"
              className="group relative px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full overflow-hidden shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Trip</span>
            </Link>
            <LoginButton />
          </div>
        </nav>

        <div className="md:hidden">
          <LoginButton />
        </div>
      </div>
    </header>
  );
} 