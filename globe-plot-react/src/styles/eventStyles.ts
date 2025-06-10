import { EventStyle } from '../types/trip';
import { Plane, Train, Car, Sailboat, Bus, Hotel, BedSingle, Music, Calendar, Utensils, UtensilsCrossed, Binoculars, LandPlot, Palette, Drama, House, Building, Ticket, BaggageClaim, CookingPot, HousePlus } from 'lucide-react';

// New: Mapping Tailwind color classes to CSS variables
const tailwindToCssVarMap: Record<string, string> = {
  // Text colors
  'text-blue-700': 'var(--blue-700)',
  'text-purple-700': 'var(--purple-700)',
  'text-orange-700': 'var(--orange-700)',
  'text-emerald-700': 'var(--emerald-700)',
  'text-sky-700': 'var(--sky-700)',
  'text-indigo-700': 'var(--indigo-700)',
  'text-amber-700': 'var(--amber-700)',
  'text-cyan-700': 'var(--cyan-700)',
  'text-green-700': 'var(--green-700)',
  'text-fuchsia-700': 'var(--fuchsia-700)',
  'text-rose-700': 'var(--rose-700)',
  'text-pink-700': 'var(--pink-700)',
  'text-teal-700': 'var(--teal-700)',
  'text-violet-700': 'var(--violet-700)',
  'text-red-700': 'var(--red-700)',
  'text-lime-700': 'var(--lime-700)',
  'text-yellow-700': 'var(--yellow-700)',
  'text-gray-700': 'var(--gray-700)',

  // Background colors
  'bg-blue-50': 'var(--blue-50)',
  'bg-purple-50': 'var(--purple-50)',
  'bg-orange-50': 'var(--orange-50)',
  'bg-emerald-50': 'var(--emerald-50)',
  'bg-sky-50': 'var(--sky-50)',
  'bg-indigo-50': 'var(--indigo-50)',
  'bg-amber-50': 'var(--amber-50)',
  'bg-cyan-50': 'var(--cyan-50)',
  'bg-green-50': 'var(--green-50)',
  'bg-fuchsia-50': 'var(--fuchsia-50)',
  'bg-rose-50': 'var(--rose-50)',
  'bg-pink-50': 'var(--pink-50)',
  'bg-teal-50': 'var(--teal-50)',
  'bg-violet-50': 'var(--violet-50)',
  'bg-red-50': 'var(--red-50)',
  'bg-lime-50': 'var(--lime-50)',
  'bg-yellow-50': 'var(--yellow-50)',
  'bg-gray-50': 'var(--gray-50)',
};

// Category to icon and color mapping
export const categoryStyleMap: Record<string, EventStyle> = {
  'travel': {
    icon: BaggageClaim,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100',
    svgPath: '/svgs/styled-travel.svg'
  },
  'accommodation': {
    icon: Building,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBgColor: 'hover:bg-purple-100',
    svgPath: '/svgs/styled-accommodation.svg'
  },
  'meal': {
    icon: CookingPot,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBgColor: 'hover:bg-orange-100',
    svgPath: '/svgs/styled-meal.svg'
  },
  'experience': {
    icon: Ticket,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBgColor: 'hover:bg-emerald-100',
    svgPath: '/svgs/styled-experience.svg'
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
    hoverBgColor: 'hover:bg-sky-100',
    svgPath: '/svgs/styled-travel-flight.svg'
  },
  'travel/train': {
    icon: Train,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    hoverBgColor: 'hover:bg-indigo-100',
    svgPath: '/svgs/styled-travel-train.svg'
  },
  'travel/car': {
    icon: Car,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverBgColor: 'hover:bg-amber-100',
    svgPath: '/svgs/styled-travel-car.svg'
  },
  'travel/boat': {
    icon: Sailboat,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverBgColor: 'hover:bg-cyan-100',
    svgPath: '/svgs/styled-travel-boat.svg'
  },
  'travel/bus': {
    icon: Bus,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBgColor: 'hover:bg-green-100',
    svgPath: '/svgs/styled-travel-bus.svg'
  },
  'travel/other': {
    icon: Car,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100',
    svgPath: '/svgs/styled-travel-other.svg'
  },
  
  // Accommodation
  'accommodation/hotel': {
    icon: Hotel,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBgColor: 'hover:bg-purple-100',
    svgPath: '/svgs/styled-accommodation-hotel.svg'
  },
  'accommodation/hostel': {
    icon: BedSingle,
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200',
    hoverBgColor: 'hover:bg-fuchsia-100',
    svgPath: '/svgs/styled-accommodation-hostel.svg'
  },
  'accommodation/airbnb': {
    icon: HousePlus,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    hoverBgColor: 'hover:bg-rose-100',
    svgPath: '/svgs/styled-accommodation-airbnb.svg'
  },
  'accommodation/other': {
    icon: House,
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    hoverBgColor: 'hover:bg-pink-100',
    svgPath: '/svgs/styled-accommodation-other.svg'
  },
  
  // Experience
  'experience/activity': {
    icon: LandPlot,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBgColor: 'hover:bg-emerald-100',
    svgPath: '/svgs/styled-experience-activity.svg'
  },
  'experience/tour': {
    icon: Binoculars,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    hoverBgColor: 'hover:bg-teal-100',
    svgPath: '/svgs/styled-experience-tour.svg'
  },
  'experience/museum': {
    icon: Palette,
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    hoverBgColor: 'hover:bg-violet-100',
    svgPath: '/svgs/styled-experience-museum.svg'
  },
  'experience/concert': {
    icon: Music,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverBgColor: 'hover:bg-red-100',
    svgPath: '/svgs/styled-experience-concert.svg'
  },
  'experience/other': {
    icon: Drama,
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200',
    hoverBgColor: 'hover:bg-lime-100',
    svgPath: '/svgs/styled-experience-other.svg'
  },
  
  // Meal
  'meal/restaurant': {
    icon: Utensils,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBgColor: 'hover:bg-orange-100',
    svgPath: '/svgs/styled-meal-restaurant.svg'
  },
  'meal/other': {
    icon: UtensilsCrossed,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    hoverBgColor: 'hover:bg-yellow-100',
    svgPath: '/svgs/styled-meal-other.svg'
  }
};

// Default style if no mapping is found
export const defaultEventStyle: EventStyle = {
  icon: Calendar,
  color: 'text-gray-700',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200',
  hoverBgColor: 'hover:bg-gray-100',
  cssColor: tailwindToCssVarMap['text-gray-700'],
  cssBgColor: tailwindToCssVarMap['bg-gray-50'],
  svgPath: '/svgs/styled-default.svg',
};

// Helper function to get event style
export function getEventStyle(event: { category: string; type: string }): EventStyle {
  const key = `${event.category}/${event.type}`;
  const style = eventStyleMap[key] || categoryStyleMap[event.category] || defaultEventStyle;
  return {
    ...style,
    cssColor: tailwindToCssVarMap[style.color] || tailwindToCssVarMap[defaultEventStyle.color],
    cssBgColor: tailwindToCssVarMap[style.bgColor] || tailwindToCssVarMap[defaultEventStyle.bgColor],
    svgPath: style.svgPath || defaultEventStyle.svgPath,
  };
}

// Helper function to get category style
export function getCategoryStyle(category: string): EventStyle {
  const style = categoryStyleMap[category] || defaultEventStyle;
  return {
    ...style,
    cssColor: tailwindToCssVarMap[style.color] || tailwindToCssVarMap[defaultEventStyle.color],
    cssBgColor: tailwindToCssVarMap[style.bgColor] || tailwindToCssVarMap[defaultEventStyle.bgColor],
    svgPath: style.svgPath || defaultEventStyle.svgPath,
  };
} 