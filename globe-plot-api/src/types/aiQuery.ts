import { Timestamp } from 'firebase-admin/firestore';

// Event categories and types matching frontend
export type EventCategory = 'travel' | 'accommodation' | 'experience' | 'meal';

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

// Location type
export interface Location {
  name: string;
  city?: string;
  country?: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
}

// Base event interface
export interface BaseEvent {
  id: string;
  category: EventCategory;
  type: EventType;
  title: string;
  start: string;
  end?: string;
  location: Location;
  notes?: string;
  tripId: string;
  userId: string;
}

// Accommodation event
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

// Travel event
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
  car?: string;
  class?: string;
}

// Experience event
export interface ExperienceEvent extends BaseEvent {
  category: 'experience';
  type: 'activity' | 'tour' | 'museum' | 'concert' | 'other';
  startDate: string;
  endDate: string;
  bookingReference?: string;
}

// Meal event
export interface MealEvent extends BaseEvent {
  category: 'meal';
  type: 'restaurant' | 'other';
  date: string;
  reservationReference?: string;
}

// Union type for all events
export type Event = AccommodationEvent | TravelEvent | ExperienceEvent | MealEvent;

// Trip interface
export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: any; // Firestore Timestamp or string
  endDate: any;
  sharedWith?: { [uid: string]: 'editor' | 'viewer' };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Simplified event structure for AI context (flattened)
export interface SerializedEvent {
  id: string;
  category: EventCategory;
  type: EventType;
  title: string;
  start: string;
  end?: string;
  country?: string;
  city?: string;
  venue?: string;
  // Category-specific metadata
  metadata?: {
    flightNumber?: string;
    trainNumber?: string;
    bookingReference?: string;
    checkIn?: string;
    checkOut?: string;
    departureCity?: string;
    arrivalCity?: string;
    departureName?: string;
    arrivalName?: string;
  };
}

// AI Query Request/Response types
export interface TripQueryRequest {
  tripId: string;
  question: string;
}

export interface TripQueryResponse {
  answer: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  cached?: boolean;
  deterministic?: boolean;
}

// Telemetry logging
export interface QueryTelemetry {
  userId: string;
  tripId: string;
  question: string;
  answer: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  cached: boolean;
  deterministic: boolean;
  createdAt: Timestamp;
}

// Query cache entry
export interface QueryCacheEntry {
  tripId: string;
  questionHash: string;
  answer: string;
  tokensUsed: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
