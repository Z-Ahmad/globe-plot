// Event categories (broad)
export type EventCategory = 'travel' | 'accommodation' | 'experience' | 'meal';

// Event types (specific)
export type EventType =
  | 'flight'
  | 'train'
  | 'car'
  | 'boat'
  | 'bus'
  | 'hotel'
  | 'hostel'
  | 'airbnb'
  | 'activity'
  | 'tour'
  | 'museum'
  | 'concert'
  | 'restaurant'
  | 'other';

// Reusable Location type
export interface Location {
  name: string;
  city?: string;
  country?: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
}

// Base event interface with common properties
export interface BaseEvent {
  id: string;
  category: EventCategory;
  type: EventType;
  title: string;
  start: string;
  end?: string;
  location: Location;
  notes?: string;
}

// Accommodation event (hotel, hostel, airbnb, other)
export interface AccommodationEvent extends BaseEvent {
  category: 'accommodation';
  type: 'hotel' | 'hostel' | 'airbnb' | 'other';
  placeName?: string;
  checkIn: {
    time: string;
    location: Location;
  };
  checkOut: {
    time: string;
    location: Location;
  };
  roomNumber?: string;
  bookingReference?: string;
}

// Travel event (flight, train, car, boat, bus, etc.)
export interface TravelEvent extends BaseEvent {
  category: 'travel';
  type: 'flight' | 'train' | 'car' | 'boat' | 'bus' | 'other';
  departure: {
    time: string;
    location: Location;
  };
  arrival: {
    time: string;
    location: Location;
  };
  airline?: string;
  flightNumber?: string;
  trainNumber?: string;
  seat?: string;
  bookingReference?: string;
  car?: string; // For train car number
  class?: string; // For travel class (economy, business, etc.)
}

// Experience event (activity, tour, museum, concert, etc.)
export interface ExperienceEvent extends BaseEvent {
  category: 'experience';
  type: 'activity' | 'tour' | 'museum' | 'concert' | 'other';
  startTime: string;
  endTime: string;
  bookingReference?: string;
}

// Meal event (restaurant, etc.)
export interface MealEvent extends BaseEvent {
  category: 'meal';
  type: 'restaurant' | 'other';
  time: string;
  reservationReference?: string;
}

// Union type for all events
export type Event = AccommodationEvent | TravelEvent | ExperienceEvent | MealEvent;

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'email' | 'image';
  url: string;
  associatedEvents: string[]; // Event IDs
}

export interface Trip {
  id: string;
  name: string;
  dateRange: string; // or startDate/endDate
  events: Event[];
  documents: Document[];
}

// Event styling for UI
export interface EventStyle {
  icon: React.ComponentType<any>;
  color: string; // Tailwind color class
  bgColor: string; // Tailwind background color class
  borderColor: string; // Tailwind border color class
} 