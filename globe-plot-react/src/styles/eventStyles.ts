import { EventStyle } from '../types/trip';

// Event category/type to emoji and color mapping
export const eventStyleMap: Record<string, EventStyle> = {
  // Travel
  'travel/flight': {
    emoji: '✈️',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200'
  },
  'travel/train': {
    emoji: '🚅',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  'travel/car': {
    emoji: '🚗',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  'travel/boat': {
    emoji: '⛵',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200'
  },
  'travel/bus': {
    emoji: '🚌',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'travel/other': {
    emoji: '🚐',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  
  // Accommodation
  'accommodation/hotel': {
    emoji: '🏨',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'accommodation/hostel': {
    emoji: '🛏️',
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200'
  },
  'accommodation/airbnb': {
    emoji: '🏠',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  'accommodation/other': {
    emoji: '🏡',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  
  // Experience
  'experience/activity': {
    emoji: '🏄',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  'experience/tour': {
    emoji: '🏟️',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  'experience/museum': {
    emoji: '🏛️',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200'
  },
  'experience/concert': {
    emoji: '🎵',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  'experience/other': {
    emoji: '🎪',
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200'
  },
  
  // Meal
  'meal/restaurant': {
    emoji: '🍽️',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  'meal/other': {
    emoji: '🍲',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  }
};

// Default style if no mapping is found
export const defaultEventStyle: EventStyle = {
  emoji: '📆',
  color: 'text-gray-700',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200'
};

// Helper function to get event style
export function getEventStyle(event: { category: string; type: string }): EventStyle {
  const key = `${event.category}/${event.type}`;
  return eventStyleMap[key] || defaultEventStyle;
} 