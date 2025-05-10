import { EventStyle } from '../types/trip';
import { Plane, Train, Car, Sailboat, Bus, Hotel, BedSingle, Music, Calendar, Utensils, UtensilsCrossed, Binoculars, LandPlot, Palette, Drama, House, Building, Ticket, BaggageClaim, CookingPot, HousePlus } from 'lucide-react';

// Category to icon and color mapping
export const categoryStyleMap: Record<string, EventStyle> = {
  'travel': {
    icon: BaggageClaim,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100'
  },
  'accommodation': {
    icon: Building,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBgColor: 'hover:bg-purple-100'
  },
  'meal': {
    icon: CookingPot,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBgColor: 'hover:bg-orange-100'
  },
  'experience': {
    icon: Ticket,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBgColor: 'hover:bg-emerald-100'
  },
};

// Event category/type to emoji and color mapping
export const eventStyleMap: Record<string, EventStyle> = {
  // Travel
  'travel/flight': {
    icon: Plane,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    hoverBgColor: 'hover:bg-sky-100'
  },
  'travel/train': {
    icon: Train,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    hoverBgColor: 'hover:bg-indigo-100'
  },
  'travel/car': {
    icon: Car,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverBgColor: 'hover:bg-amber-100'
  },
  'travel/boat': {
    icon: Sailboat,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverBgColor: 'hover:bg-cyan-100'
  },
  'travel/bus': {
    icon: Bus,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBgColor: 'hover:bg-green-100'
  },
  'travel/other': {
    icon: Car,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100'
  },
  
  // Accommodation
  'accommodation/hotel': {
    icon: Hotel,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBgColor: 'hover:bg-purple-100'
  },
  'accommodation/hostel': {
    icon: BedSingle,
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200',
    hoverBgColor: 'hover:bg-fuchsia-100'
  },
  'accommodation/airbnb': {
    icon: HousePlus,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    hoverBgColor: 'hover:bg-rose-100'
  },
  'accommodation/other': {
    icon: House,
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    hoverBgColor: 'hover:bg-pink-100'
  },
  
  // Experience
  'experience/activity': {
    icon: LandPlot,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBgColor: 'hover:bg-emerald-100'
  },
  'experience/tour': {
    icon: Binoculars,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    hoverBgColor: 'hover:bg-teal-100'
  },
  'experience/museum': {
    icon: Palette,
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    hoverBgColor: 'hover:bg-violet-100'
  },
  'experience/concert': {
    icon: Music,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverBgColor: 'hover:bg-red-100'
  },
  'experience/other': {
    icon: Drama,
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200',
    hoverBgColor: 'hover:bg-lime-100'
  },
  
  // Meal
  'meal/restaurant': {
    icon: Utensils,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBgColor: 'hover:bg-orange-100'
  },
  'meal/other': {
    icon: UtensilsCrossed,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    hoverBgColor: 'hover:bg-yellow-100'
  }
};

// Default style if no mapping is found
export const defaultEventStyle: EventStyle = {
  icon: Calendar,
  color: 'text-gray-700',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200',
  hoverBgColor: 'hover:bg-gray-100'
};

// Helper function to get event style
export function getEventStyle(event: { category: string; type: string }): EventStyle {
  const key = `${event.category}/${event.type}`;
  return eventStyleMap[key] || defaultEventStyle;
}

// Helper function to get category style
export function getCategoryStyle(category: string): EventStyle {
  return categoryStyleMap[category] || defaultEventStyle;
} 