import { EventStyle } from '../types/trip';
import { Plane, Train, Car, Sailboat, Bus, Hotel, BedSingle, Music, Calendar, Utensils, UtensilsCrossed, Binoculars, LandPlot, Palette, Drama, House, Building, Ticket, BaggageClaim, CookingPot, HousePlus } from 'lucide-react';

// Tailwind v4 exposes colors as --color-{name}-{shade} CSS variables
const lightCssVarMap: Record<string, string> = {
  'text-blue-700':    'var(--color-blue-700)',
  'text-purple-700':  'var(--color-purple-700)',
  'text-orange-700':  'var(--color-orange-700)',
  'text-emerald-700': 'var(--color-emerald-700)',
  'text-sky-700':     'var(--color-sky-700)',
  'text-indigo-700':  'var(--color-indigo-700)',
  'text-amber-700':   'var(--color-amber-700)',
  'text-cyan-700':    'var(--color-cyan-700)',
  'text-green-700':   'var(--color-green-700)',
  'text-fuchsia-700': 'var(--color-fuchsia-700)',
  'text-rose-700':    'var(--color-rose-700)',
  'text-pink-700':    'var(--color-pink-700)',
  'text-teal-700':    'var(--color-teal-700)',
  'text-violet-700':  'var(--color-violet-700)',
  'text-red-700':     'var(--color-red-700)',
  'text-lime-700':    'var(--color-lime-700)',
  'text-yellow-700':  'var(--color-yellow-700)',
  'text-gray-700':    'var(--color-gray-700)',

  'bg-blue-50':    'var(--color-blue-50)',
  'bg-purple-50':  'var(--color-purple-50)',
  'bg-orange-50':  'var(--color-orange-50)',
  'bg-emerald-50': 'var(--color-emerald-50)',
  'bg-sky-50':     'var(--color-sky-50)',
  'bg-indigo-50':  'var(--color-indigo-50)',
  'bg-amber-50':   'var(--color-amber-50)',
  'bg-cyan-50':    'var(--color-cyan-50)',
  'bg-green-50':   'var(--color-green-50)',
  'bg-fuchsia-50': 'var(--color-fuchsia-50)',
  'bg-rose-50':    'var(--color-rose-50)',
  'bg-pink-50':    'var(--color-pink-50)',
  'bg-teal-50':    'var(--color-teal-50)',
  'bg-violet-50':  'var(--color-violet-50)',
  'bg-red-50':     'var(--color-red-50)',
  'bg-lime-50':    'var(--color-lime-50)',
  'bg-yellow-50':  'var(--color-yellow-50)',
  'bg-gray-50':    'var(--color-gray-50)',
};

// Dark mode counterpart CSS variables
const darkCssVarMap: Record<string, string> = {
  'text-blue-300':    'var(--color-blue-300)',
  'text-purple-300':  'var(--color-purple-300)',
  'text-orange-300':  'var(--color-orange-300)',
  'text-emerald-300': 'var(--color-emerald-300)',
  'text-sky-300':     'var(--color-sky-300)',
  'text-indigo-300':  'var(--color-indigo-300)',
  'text-amber-300':   'var(--color-amber-300)',
  'text-cyan-300':    'var(--color-cyan-300)',
  'text-green-300':   'var(--color-green-300)',
  'text-fuchsia-300': 'var(--color-fuchsia-300)',
  'text-rose-300':    'var(--color-rose-300)',
  'text-pink-300':    'var(--color-pink-300)',
  'text-teal-300':    'var(--color-teal-300)',
  'text-violet-300':  'var(--color-violet-300)',
  'text-red-300':     'var(--color-red-300)',
  'text-lime-300':    'var(--color-lime-300)',
  'text-yellow-300':  'var(--color-yellow-300)',
  'text-gray-300':    'var(--color-gray-300)',

  'bg-blue-950':    'var(--color-blue-950)',
  'bg-purple-950':  'var(--color-purple-950)',
  'bg-orange-950':  'var(--color-orange-950)',
  'bg-emerald-950': 'var(--color-emerald-950)',
  'bg-sky-950':     'var(--color-sky-950)',
  'bg-indigo-950':  'var(--color-indigo-950)',
  'bg-amber-950':   'var(--color-amber-950)',
  'bg-cyan-950':    'var(--color-cyan-950)',
  'bg-green-950':   'var(--color-green-950)',
  'bg-fuchsia-950': 'var(--color-fuchsia-950)',
  'bg-rose-950':    'var(--color-rose-950)',
  'bg-pink-950':    'var(--color-pink-950)',
  'bg-teal-950':    'var(--color-teal-950)',
  'bg-violet-950':  'var(--color-violet-950)',
  'bg-red-950':     'var(--color-red-950)',
  'bg-lime-950':    'var(--color-lime-950)',
  'bg-yellow-950':  'var(--color-yellow-950)',
  'bg-gray-900':    'var(--color-gray-900)',
};

// Extract the base (non-dark) class and the dark-variant class from a combined string
function splitDarkClass(combined: string): { base: string; dark: string } {
  const parts = combined.split(' ');
  const base = parts.find((c) => !c.startsWith('dark:')) ?? '';
  const dark = (parts.find((c) => c.startsWith('dark:')) ?? '').replace('dark:', '');
  return { base, dark };
}

// Category to icon and color mapping
export const categoryStyleMap: Record<string, EventStyle> = {
  'travel': {
    icon: BaggageClaim,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    hoverBgColor: 'hover:bg-blue-100 dark:hover:bg-blue-900',
    svgPath: '/svgs/styled-travel.svg'
  },
  'accommodation': {
    icon: Building,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
    hoverBgColor: 'hover:bg-purple-100 dark:hover:bg-purple-900',
    svgPath: '/svgs/styled-accommodation.svg'
  },
  'meal': {
    icon: CookingPot,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    borderColor: 'border-orange-200 dark:border-orange-800',
    hoverBgColor: 'hover:bg-orange-100 dark:hover:bg-orange-900',
    svgPath: '/svgs/styled-meal.svg'
  },
  'experience': {
    icon: Ticket,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    hoverBgColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900',
    svgPath: '/svgs/styled-experience.svg'
  },
};

// Event category/type to icon and color mapping
export const eventStyleMap: Record<string, EventStyle> = {
  // Travel
  'travel/flight': {
    icon: Plane,
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-50 dark:bg-sky-950/50',
    borderColor: 'border-sky-200 dark:border-sky-800',
    hoverBgColor: 'hover:bg-sky-100 dark:hover:bg-sky-900',
    svgPath: '/svgs/styled-travel-flight.svg'
  },
  'travel/train': {
    icon: Train,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    hoverBgColor: 'hover:bg-indigo-100 dark:hover:bg-indigo-900',
    svgPath: '/svgs/styled-travel-train.svg'
  },
  'travel/car': {
    icon: Car,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    hoverBgColor: 'hover:bg-amber-100 dark:hover:bg-amber-900',
    svgPath: '/svgs/styled-travel-car.svg'
  },
  'travel/boat': {
    icon: Sailboat,
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    hoverBgColor: 'hover:bg-cyan-100 dark:hover:bg-cyan-900',
    svgPath: '/svgs/styled-travel-boat.svg'
  },
  'travel/bus': {
    icon: Bus,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    borderColor: 'border-green-200 dark:border-green-800',
    hoverBgColor: 'hover:bg-green-100 dark:hover:bg-green-900',
    svgPath: '/svgs/styled-travel-bus.svg'
  },
  'travel/other': {
    icon: Car,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    hoverBgColor: 'hover:bg-blue-100 dark:hover:bg-blue-900',
    svgPath: '/svgs/styled-travel-other.svg'
  },

  // Accommodation
  'accommodation/hotel': {
    icon: Hotel,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
    hoverBgColor: 'hover:bg-purple-100 dark:hover:bg-purple-900',
    svgPath: '/svgs/styled-accommodation-hotel.svg'
  },
  'accommodation/hostel': {
    icon: BedSingle,
    color: 'text-fuchsia-700 dark:text-fuchsia-300',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800',
    hoverBgColor: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900',
    svgPath: '/svgs/styled-accommodation-hostel.svg'
  },
  'accommodation/airbnb': {
    icon: HousePlus,
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    borderColor: 'border-rose-200 dark:border-rose-800',
    hoverBgColor: 'hover:bg-rose-100 dark:hover:bg-rose-900',
    svgPath: '/svgs/styled-accommodation-airbnb.svg'
  },
  'accommodation/other': {
    icon: House,
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-50 dark:bg-pink-950/50',
    borderColor: 'border-pink-200 dark:border-pink-800',
    hoverBgColor: 'hover:bg-pink-100 dark:hover:bg-pink-900',
    svgPath: '/svgs/styled-accommodation-other.svg'
  },

  // Experience
  'experience/activity': {
    icon: LandPlot,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    hoverBgColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900',
    svgPath: '/svgs/styled-experience-activity.svg'
  },
  'experience/tour': {
    icon: Binoculars,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
    hoverBgColor: 'hover:bg-teal-100 dark:hover:bg-teal-900',
    svgPath: '/svgs/styled-experience-tour.svg'
  },
  'experience/museum': {
    icon: Palette,
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-50 dark:bg-violet-950/50',
    borderColor: 'border-violet-200 dark:border-violet-800',
    hoverBgColor: 'hover:bg-violet-100 dark:hover:bg-violet-900',
    svgPath: '/svgs/styled-experience-museum.svg'
  },
  'experience/concert': {
    icon: Music,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    borderColor: 'border-red-200 dark:border-red-800',
    hoverBgColor: 'hover:bg-red-100 dark:hover:bg-red-900',
    svgPath: '/svgs/styled-experience-concert.svg'
  },
  'experience/other': {
    icon: Drama,
    color: 'text-lime-700 dark:text-lime-300',
    bgColor: 'bg-lime-50 dark:bg-lime-950/50',
    borderColor: 'border-lime-200 dark:border-lime-800',
    hoverBgColor: 'hover:bg-lime-100 dark:hover:bg-lime-900',
    svgPath: '/svgs/styled-experience-other.svg'
  },

  // Meal
  'meal/restaurant': {
    icon: Utensils,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    borderColor: 'border-orange-200 dark:border-orange-800',
    hoverBgColor: 'hover:bg-orange-100 dark:hover:bg-orange-900',
    svgPath: '/svgs/styled-meal-restaurant.svg'
  },
  'meal/other': {
    icon: UtensilsCrossed,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    hoverBgColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900',
    svgPath: '/svgs/styled-meal-other.svg'
  }
};

// Default style if no mapping is found
export const defaultEventStyle: EventStyle = {
  icon: Calendar,
  color: 'text-gray-700 dark:text-gray-300',
  bgColor: 'bg-gray-50 dark:bg-gray-900',
  borderColor: 'border-gray-200 dark:border-gray-700',
  hoverBgColor: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  cssColor: lightCssVarMap['text-gray-700'],
  cssBgColor: lightCssVarMap['bg-gray-50'],
  cssDarkColor: darkCssVarMap['text-gray-300'],
  cssDarkBgColor: darkCssVarMap['bg-gray-900'],
  svgPath: '/svgs/styled-default.svg',
};

function resolveStyle(style: EventStyle): EventStyle {
  const colorParts = splitDarkClass(style.color);
  const bgParts = splitDarkClass(style.bgColor);

  // For map popup: always use solid (opaque) background — strip /50 if present
  // so popups stay readable over the map and don't inherit card translucency
  const popupBgLookup = bgParts.dark?.replace(/\/\d+$/, '') ?? 'bg-gray-900';

  // Include backdrop-blur in bgColor so it applies wherever bgColor is used (cards, dialogs, dropdowns)
  const bgColorWithBlur = `${style.bgColor} dark:backdrop-blur-md`;

  return {
    ...style,
    bgColor: bgColorWithBlur,
    cssColor: lightCssVarMap[colorParts.base] ?? defaultEventStyle.cssColor,
    cssBgColor: lightCssVarMap[bgParts.base] ?? defaultEventStyle.cssBgColor,
    cssDarkColor: darkCssVarMap[colorParts.dark] ?? defaultEventStyle.cssDarkColor,
    cssDarkBgColor: darkCssVarMap[popupBgLookup] ?? defaultEventStyle.cssDarkBgColor,
  };
}

// Helper function to get event style
export function getEventStyle(event: { category: string; type: string }): EventStyle {
  const key = `${event.category}/${event.type}`;
  const style = eventStyleMap[key] || categoryStyleMap[event.category] || defaultEventStyle;
  return resolveStyle(style);
}

// Helper function to get category style
export function getCategoryStyle(category: string): EventStyle {
  const style = categoryStyleMap[category] || defaultEventStyle;
  return resolveStyle(style);
}
