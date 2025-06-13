import { Link, useLocation } from "react-router-dom";
import { Home, Map, Plus, User } from "lucide-react";
import { useUserStore } from "../stores/userStore";

export function BottomNavigation() {
  const location = useLocation();
  const { user } = useUserStore();

  const navItems = [
    {
      to: "/",
      icon: Home,
      label: "Home",
      active: location.pathname === "/"
    },
    {
      to: "/dashboard",
      icon: Map,
      label: "Trips",
      active: location.pathname === "/dashboard" || location.pathname.startsWith("/trip/")
    },
    {
      to: "/trip/new",
      icon: Plus,
      label: "New",
      active: location.pathname === "/trip/new",
      isSpecial: true
    },
    // {
    //   to: user ? "/profile" : "/login",
    //   icon: User,
    //   label: user ? "Profile" : "Login",
    //   active: location.pathname === "/profile" || location.pathname === "/login"
    // }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
              item.isSpecial
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                : item.active
                ? "text-blue-600 bg-blue-50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.isSpecial ? "text-white" : ""}`} />
            <span className={`text-xs font-medium ${item.isSpecial ? "text-white" : ""}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      {/* Safe area padding for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </nav>
  );
} 