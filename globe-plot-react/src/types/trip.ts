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

// Accommodation event (hotel, hostel, airbnb, other)
export interface AccommodationEvent {
  id: string;
  category: 'accommodation';
  type: 'hotel' | 'hostel' | 'airbnb' | 'other';
  title: string;
  start: string;
  end?: string;
  city: string;
  country: string;
  /**
   * Name of the accommodation (hotel, hostel, airbnb, friend's house, etc.)
   * Use for all accommodation types.
   */
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
  notes?: string;
  [key: string]: any;
}

// Travel event (flight, train, car, boat, bus, etc.)
export interface TravelEvent {
  id: string;
  category: 'travel';
  type: 'flight' | 'train' | 'car' | 'boat' | 'bus' | 'other';
  title: string;
  start: string;
  end?: string;
  city: string;
  country: string;
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
  seat?: string;
  bookingReference?: string;
  notes?: string;
  [key: string]: any;
}

// Experience event (activity, tour, museum, concert, etc.)
export interface ExperienceEvent {
  id: string;
  category: 'experience';
  type: 'activity' | 'tour' | 'museum' | 'concert' | 'other';
  title: string;
  start: string;
  end?: string;
  city: string;
  country: string;
  startTime: string;
  endTime: string;
  location: Location;
  bookingReference?: string;
  notes?: string;
  [key: string]: any;
}

// Meal event (restaurant, etc.)
export interface MealEvent {
  id: string;
  category: 'meal';
  type: 'restaurant' | 'other';
  title: string;
  start: string;
  end?: string;
  city: string;
  country: string;
  time: string;
  location: Location;
  reservationReference?: string;
  notes?: string;
  [key: string]: any;
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