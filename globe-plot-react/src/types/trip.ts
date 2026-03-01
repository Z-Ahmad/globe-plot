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
    date: string;
    location: Location;
  };
  checkOut: {
    date: string;
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
    date: string;
    location: Location;
  };
  arrival: {
    date: string;
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
  startDate: string;
  endDate: string;
  bookingReference?: string;
}

// Meal event (restaurant, etc.)
export interface MealEvent extends BaseEvent {
  category: 'meal';
  type: 'restaurant' | 'other';
  date: string;
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
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  events: Event[];
  documents: Document[];
  sharedWith?: { [uid: string]: 'editor' | 'viewer' };
  createdAt?: any;
  updatedAt?: any;
}

// Event styling for UI
export interface EventStyle {
  icon: React.ComponentType<any>;
  color: string; // Tailwind color class (may include dark: variant)
  bgColor: string; // Tailwind background color class (may include dark: variant)
  borderColor: string; // Tailwind border color class
  hoverBgColor: string; // Tailwind hover background color class
  cssColor?: string; // Resolved CSS variable for light mode (e.g., 'var(--color-sky-700)')
  cssBgColor?: string; // Resolved CSS variable for light mode bg (e.g., 'var(--color-sky-50)')
  cssDarkColor?: string; // Resolved CSS variable for dark mode (e.g., 'var(--color-sky-300)')
  cssDarkBgColor?: string; // Resolved CSS variable for dark mode bg (e.g., 'var(--color-sky-950)')
  svgPath?: string; // Path to the custom styled SVG file
}

// AI Agent types
export type AgentActionType = 'create_event' | 'edit_event' | 'delete_event';

export interface AgentAction {
  id: string;
  type: AgentActionType;
  event: Partial<Event> & { id: string; title: string };
  reason?: string;
  status: 'proposed' | 'confirmed' | 'rejected';
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
}

export interface AgentChatResponse {
  reply: string;
  actions: AgentAction[];
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface GenerateItineraryResponse {
  events: Partial<Event>[];
  reply: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface ItineraryStreamEvent {
  event?: Partial<Event>;
  done?: boolean;
  reply?: string;
  tokensUsed?: number;
  eventCount?: number;
  error?: string;
}

export interface ShareInvitation {
  id: string;
  tripId: string;
  tripName: string;
  ownerId: string;
  ownerEmail: string;
  inviteeEmail: string;
  inviteeUid?: string; // UID of the user who accepted the invitation
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any; // Firestore Timestamp
} 