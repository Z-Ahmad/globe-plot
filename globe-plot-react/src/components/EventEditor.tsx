import React, { useState, ChangeEvent } from 'react';
import { Event, EventCategory } from '@/stores/tripStore';
import { useUserStore } from '@/stores/userStore';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getEventStyle, eventStyleMap, categoryStyleMap } from '@/styles/eventStyles';
import { 
  EventType, 
  TravelEvent, 
  AccommodationEvent, 
  ExperienceEvent, 
  MealEvent 
} from '@/types/trip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Loader, Map } from 'lucide-react';
import { geocodeLocation } from '@/lib/mapboxService';
import toast from 'react-hot-toast';

interface EventEditorProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Event) => void;
  tripId?: string;
}

// Shared event form component to reduce duplication
interface EventFormProps {
  editingEvent: Event;
  setEditingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  containerStyle?: string; // Optional style for the container
  tripId?: string;
}

const EventForm: React.FC<EventFormProps> = ({
  editingEvent,
  setEditingEvent,
  tripId,
}) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  // Available categories
  const categories: EventCategory[] = ['travel', 'accommodation', 'experience', 'meal'];
  
  // Get available types based on the current category
  const getTypesForCategory = (category: string): EventType[] => {
    switch (category) {
      case 'travel':
        return ['flight', 'train', 'car', 'boat', 'bus', 'other'];
      case 'accommodation':
        return ['hotel', 'hostel', 'airbnb', 'other'];
      case 'experience':
        return ['activity', 'tour', 'museum', 'concert', 'other'];
      case 'meal':
        return ['restaurant', 'other'];
      default:
        return ['other'];
    }
  };

  // Handler for category change
  const handleCategoryChange = (newCategory: string) => {
    // Get the first available type for the new category
    const availableTypes = getTypesForCategory(newCategory as EventCategory);
    const defaultType = availableTypes[0];
    
    // Create a base event with common fields
    const baseUpdatedEvent = {
      ...editingEvent,
      category: newCategory as EventCategory,
      type: defaultType,
      title: editingEvent.title,
      start: editingEvent.start,
      end: editingEvent.end,
      notes: editingEvent.notes,
      id: editingEvent.id,
      location: editingEvent.location || { name: '' }
    };
    
    // Add category-specific fields
    let updatedEvent: Event;
    
    if (newCategory === 'travel') {
      // Keep travel-specific fields if we're already a travel event
      const travelEvent = editingEvent.category === 'travel' 
        ? editingEvent as TravelEvent
        : null;
        
      updatedEvent = {
        ...baseUpdatedEvent,
        departure: travelEvent?.departure || { date: '', location: { name: '' } },
        arrival: travelEvent?.arrival || { date: '', location: { name: '' } },
        airline: travelEvent?.airline,
        flightNumber: travelEvent?.flightNumber,
        trainNumber: travelEvent?.trainNumber,
        seat: travelEvent?.seat,
        bookingReference: travelEvent?.bookingReference,
        category: 'travel'
      } as TravelEvent;
    } 
    else if (newCategory === 'accommodation') {
      // Keep accommodation-specific fields if we're already an accommodation event
      const accomEvent = editingEvent.category === 'accommodation' 
        ? editingEvent as AccommodationEvent
        : null;
        
      updatedEvent = {
        ...baseUpdatedEvent,
        checkIn: accomEvent?.checkIn || { date: '', location: { name: '' } },
        checkOut: accomEvent?.checkOut || { date: '', location: { name: '' } },
        placeName: accomEvent?.placeName || '',
        roomNumber: accomEvent?.roomNumber,
        bookingReference: accomEvent?.bookingReference,
        category: 'accommodation'
      } as AccommodationEvent;
    }
    else if (newCategory === 'experience') {
      // Keep experience-specific fields if we're already an experience event
      const expEvent = editingEvent.category === 'experience' 
        ? editingEvent as ExperienceEvent
        : null;
        
      updatedEvent = {
        ...baseUpdatedEvent,
        startDate: expEvent?.startDate || '',
        endDate: expEvent?.endDate || '',
        bookingReference: expEvent?.bookingReference,
        category: 'experience'
      } as ExperienceEvent;
    }
    else { // meal
      // Keep meal-specific fields if we're already a meal event
      const mealEvent = editingEvent.category === 'meal' 
        ? editingEvent as MealEvent
        : null;
        
      updatedEvent = {
        ...baseUpdatedEvent,
        date: mealEvent?.date || '',
        reservationReference: mealEvent?.reservationReference,
        category: 'meal'
      } as MealEvent;
    }
    
    setEditingEvent(updatedEvent);
  };

  // Handler for type change
  const handleTypeChange = (newType: string) => {
    setEditingEvent({
      ...editingEvent,
      type: newType
    } as Event);
  };
  
  // Get available types for the current category
  const availableTypes = getTypesForCategory(editingEvent.category);

  // Function to get the current location data based on event type
  const getCurrentLocationData = () => {
    if (editingEvent.category === 'travel') {
      return {
        name: editingEvent.departure?.location?.name || '',
        city: editingEvent.departure?.location?.city || '',
        country: editingEvent.departure?.location?.country || '',
      };
    } else if (editingEvent.category === 'accommodation') {
      return {
        name: editingEvent.checkIn?.location?.name || '',
        city: editingEvent.checkIn?.location?.city || '',
        country: editingEvent.checkIn?.location?.country || '',
      };
    } else {
      return {
        name: editingEvent.location?.name || '',
        city: editingEvent.location?.city || '',
        country: editingEvent.location?.country || '',
      };
    }
  };

  // Handler for finding coordinates
  const handleFindCoordinates = async () => {
    const locationData = getCurrentLocationData();
    
    // Check if we have enough location data
    if (!locationData.city && !locationData.country && !locationData.name) {
      toast.error('Please enter a location name, city, or country first');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please sign in to use location services');
      return;
    }

    setIsGeocoding(true);
    try {
      // Determine the location type based on event category
      let locationType: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location';
      
      if (editingEvent.category === 'travel') {
        locationType = 'departure.location';
      } else if (editingEvent.category === 'accommodation') {
        locationType = 'checkIn.location';
      } else {
        locationType = 'location';
      }
      
      // Check if this is a temporary event (UUID format) that hasn't been saved to Firestore yet
      const isTemporaryEvent = editingEvent.id && editingEvent.id.includes('-');
      
      const result = await geocodeLocation(
        locationData, 
        editingEvent.id, 
        tripId, 
        locationType
      );
      
      if (result) {
        // Update the event with coordinates and potentially improved location data
        if (editingEvent.category === 'travel') {
          setEditingEvent({
            ...editingEvent,
            departure: {
              ...editingEvent.departure,
              location: {
                ...(editingEvent.departure?.location || {}),
                geolocation: {
                  lat: result.lat,
                  lng: result.lng
                },
                // Update city/country if they were missing
                city: editingEvent.departure?.location?.city || result.city,
                country: editingEvent.departure?.location?.country || result.country,
              }
            }
          });
        } else if (editingEvent.category === 'accommodation') {
          setEditingEvent({
            ...editingEvent,
            checkIn: {
              ...editingEvent.checkIn,
              location: {
                ...(editingEvent.checkIn?.location || {}),
                geolocation: {
                  lat: result.lat,
                  lng: result.lng
                },
                city: editingEvent.checkIn?.location?.city || result.city,
                country: editingEvent.checkIn?.location?.country || result.country,
              }
            }
          });
        } else {
          setEditingEvent({
            ...editingEvent,
            location: {
              ...(editingEvent.location || {}),
              geolocation: {
                lat: result.lat,
                lng: result.lng
              },
              city: editingEvent.location?.city || result.city,
              country: editingEvent.location?.country || result.country,
            }
          });
        }
        
        // Show different toast messages based on whether this is a temporary or saved event
        if (isTemporaryEvent) {
          toast.success('Location coordinates found. They will be saved when you save this event.');
        } else {
          toast.success('Location coordinates found and saved');
        }
      } else {
        toast.error('Could not find coordinates for this location');
      }
    } catch (error) {
      console.error('Error finding coordinates:', error);
      toast.error('Error finding coordinates');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input 
          id="title"
          value={editingEvent.title} 
          onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} 
        />
      </div>

      {/* Category and Type selectors in a 2-column grid on all screen sizes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Category selector */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={editingEvent.category} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className={getEventStyle(editingEvent).bgColor}>
              {categories.map((category) => {
                const style = categoryStyleMap[category] || { icon: null, color: "text-gray-700" };
                const Icon = style.icon;

                return (
                  <SelectItem key={category} value={category} className="flex items-center">
                    {Icon && <Icon className={`mr-2 h-4 w-4 ${style.color}`} />}
                    <span className="capitalize">{category}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Type selector */}
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={editingEvent.type} onValueChange={handleTypeChange}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className={getEventStyle(editingEvent).bgColor}>
              {availableTypes.map((type) => {
                const styleKey = `${editingEvent.category}/${type}`;
                const style = eventStyleMap[styleKey] || { icon: null, color: "text-gray-700" };
                const Icon = style.icon;

                return (
                  <SelectItem key={type} value={type} className="flex items-center">
                    {Icon && <Icon className={`mr-2 h-4 w-4 ${style.color}`} />}
                    <span className="capitalize">{type}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="country">Country</Label>
            {editingEvent.category === "travel" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className={`w-80 text-sm ${getEventStyle(editingEvent).bgColor}`}>
                  <p>
                    For travel events, use the country of the <strong>departure</strong> location for best results.
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Input
            id="country"
            value={
              editingEvent.category === "travel"
                ? editingEvent.departure?.location?.country || ""
                : editingEvent.category === "accommodation"
                ? editingEvent.checkIn?.location?.country || ""
                : editingEvent.location?.country || ""
            }
            onChange={(e) => {
              if (editingEvent.category === "travel") {
                setEditingEvent({
                  ...editingEvent,
                  departure: {
                    ...editingEvent.departure,
                    location: {
                      ...(editingEvent.departure?.location || {}),
                      country: e.target.value
                    }
                  }
                });
              } else if (editingEvent.category === "accommodation") {
                setEditingEvent({
                  ...editingEvent,
                  checkIn: {
                    ...editingEvent.checkIn,
                    location: {
                      ...(editingEvent.checkIn?.location || {}),
                      country: e.target.value
                    }
                  },
                  checkOut: {
                    ...editingEvent.checkOut,
                    location: {
                      ...(editingEvent.checkOut?.location || {}),
                      country: e.target.value
                    }
                  },
                  location: {
                    ...(editingEvent.location || {}),
                    country: e.target.value
                  }
                });
              } else {
                setEditingEvent({
                  ...editingEvent,
                  location: {
                    ...(editingEvent.location || {}),
                    country: e.target.value
                  }
                });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="city">City</Label>
            {editingEvent.category === "travel" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className={`w-80 text-sm ${getEventStyle(editingEvent).bgColor}`}>
                  <p>
                    For travel events, use the city of the <strong>departure</strong> location for best results.
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Input
            id="city"
            value={
              editingEvent.category === "travel"
                ? editingEvent.departure?.location?.city || ""
                : editingEvent.category === "accommodation"
                ? editingEvent.checkIn?.location?.city || ""
                : editingEvent.location?.city || ""
            }
            onChange={(e) => {
              if (editingEvent.category === "travel") {
                setEditingEvent({
                  ...editingEvent,
                  departure: {
                    ...editingEvent.departure,
                    location: {
                      ...(editingEvent.departure?.location || {}),
                      city: e.target.value
                    }
                  }
                });
              } else if (editingEvent.category === "accommodation") {
                setEditingEvent({
                  ...editingEvent,
                  checkIn: {
                    ...editingEvent.checkIn,
                    location: {
                      ...(editingEvent.checkIn?.location || {}),
                      city: e.target.value
                    }
                  },
                  checkOut: {
                    ...editingEvent.checkOut,
                    location: {
                      ...(editingEvent.checkOut?.location || {}),
                      city: e.target.value
                    }
                  },
                  location: {
                    ...(editingEvent.location || {}),
                    city: e.target.value
                  }
                });
              } else {
                setEditingEvent({
                  ...editingEvent,
                  location: {
                    ...(editingEvent.location || {}),
                    city: e.target.value
                  }
                });
              }
            }}
          />
        </div>
      </div>

      {/* Add the "Find Coordinates" button after the country and city fields */}
      <div className="flex justify-end mt-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleFindCoordinates}
          disabled={isGeocoding}
          className="flex items-center gap-2"
        >
          {isGeocoding ? (
            <>
              <Loader className="h-3 w-3 animate-spin" />
              <span>Finding coordinates...</span>
            </>
          ) : (
            <>
              <Map className="h-3 w-3" />
              <span>Find coordinates</span>
            </>
          )}
        </Button>
      </div>

      {/* Display coordinates if they exist */}
      {((editingEvent.category === 'travel' && editingEvent.departure?.location?.geolocation) ||
        (editingEvent.category === 'accommodation' && editingEvent.checkIn?.location?.geolocation) ||
        (editingEvent.location?.geolocation)) && (
        <div className="text-xs text-muted-foreground">
          Coordinates found: {editingEvent.category === 'travel' 
            ? `${editingEvent.departure?.location?.geolocation?.lat.toFixed(6)}, ${editingEvent.departure?.location?.geolocation?.lng.toFixed(6)}`
            : editingEvent.category === 'accommodation' 
              ? `${editingEvent.checkIn?.location?.geolocation?.lat.toFixed(6)}, ${editingEvent.checkIn?.location?.geolocation?.lng.toFixed(6)}`
              : `${editingEvent.location?.geolocation?.lat.toFixed(6)}, ${editingEvent.location?.geolocation?.lng.toFixed(6)}`
          }
        </div>
      )}

      {/* Location name field - hide for travel and accommodation events */}
      {editingEvent.category !== "travel" && editingEvent.category !== "accommodation" && (
        <div className="space-y-2">
          <Label htmlFor="location-name">Location Name</Label>
          <Input
            id="location-name"
            placeholder="e.g., Conference Center, Restaurant Name, etc."
            value={editingEvent.location?.name || ""}
            onChange={(e) =>
              setEditingEvent({
                ...editingEvent,
                location: {
                  ...(editingEvent.location || {}),
                  name: e.target.value
                }
              })
            }
          />
        </div>
      )}

      {/* Category-specific fields */}
      {editingEvent.category === "travel" && (
        <>
          {/* Departure and Arrival sections */}
          {/* Departure location and time - stacked on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-2">
              <Label htmlFor="departure-location">Departure Location</Label>
              <Input
                id="departure-location"
                className="w-full"
                placeholder="e.g., JFK Airport, New York"
                value={editingEvent.departure?.location?.name || ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    departure: {
                      ...editingEvent.departure,
                      location: {
                        ...(editingEvent.departure?.location || {}),
                        name: e.target.value
                      }
                    }
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure-date">Departure Date</Label>
              <Input
                id="departure-date"
                className="w-full"
                type="datetime-local"
                value={editingEvent.departure?.date ? editingEvent.departure.date.slice(0, 16) : ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    departure: {
                      ...editingEvent.departure,
                      date: e.target.value
                    },
                    start: e.target.value
                  })
                }
              />
            </div>
          </div>

          {/* Arrival location and time - stacked on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="arrival-location">Arrival Location</Label>
              <Input
                id="arrival-location"
                className="w-full"
                placeholder="e.g., Heathrow Airport, London"
                value={editingEvent.arrival?.location?.name || ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    arrival: {
                      ...editingEvent.arrival,
                      location: {
                        ...(editingEvent.arrival?.location || {}),
                        name: e.target.value
                      }
                    }
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival-date">Arrival Date</Label>
              <Input
                id="arrival-date"
                className="w-full"
                type="datetime-local"
                value={editingEvent.arrival?.date ? editingEvent.arrival.date.slice(0, 16) : ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    arrival: {
                      ...editingEvent.arrival,
                      date: e.target.value
                    },
                    end: e.target.value
                  })
                }
              />
            </div>
          </div>

          {/* Flight-specific fields */}
          {editingEvent.type === "flight" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="airline">Airline</Label>
                <Input 
                  id="airline"
                  value={editingEvent.airline || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, airline: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flight-number">Flight Number</Label>
                <Input 
                  id="flight-number"
                  value={editingEvent.flightNumber || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, flightNumber: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Additional flight details (seat, class) */}
          {editingEvent.type === "flight" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="seat">Seat</Label>
                <Input 
                  id="seat"
                  value={editingEvent.seat || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, seat: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input 
                  id="class"
                  placeholder="Economy, Business, First, etc."
                  value={editingEvent.class || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, class: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Additional fields based on travel type */}
          {editingEvent.type === "train" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="train-number">Train Number</Label>
                <Input 
                  id="train-number"
                  value={editingEvent.trainNumber || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, trainNumber: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seat">Seat</Label>
                <Input 
                  id="seat"
                  value={editingEvent.seat || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, seat: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Additional train details (car, class, booking reference) */}
          {editingEvent.type === "train" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="car">Car/Coach</Label>
                <Input 
                  id="car"
                  value={editingEvent.car || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, car: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input 
                  id="class"
                  value={editingEvent.class || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, class: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Booking reference for travel */}
          {(editingEvent.type === "flight" || editingEvent.type === "train" || editingEvent.type === "bus") && (
            <div className="space-y-2">
              <Label htmlFor="booking-reference">Booking Reference</Label>
              <Input 
                id="booking-reference"
                value={editingEvent.bookingReference || ""} 
                onChange={(e) => setEditingEvent({ ...editingEvent, bookingReference: e.target.value })} 
              />
            </div>
          )}

          {/* Bus specific fields */}
          {editingEvent.type === "bus" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seat">Seat</Label>
                <Input 
                  id="seat"
                  value={editingEvent.seat || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, seat: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input 
                  id="class"
                  value={editingEvent.class || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, class: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Boat specific fields */}
          {editingEvent.type === "boat" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cabin-seat">Cabin/Seat</Label>
                <Input 
                  id="cabin-seat"
                  value={editingEvent.seat || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, seat: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input 
                  id="class"
                  value={editingEvent.class || ""} 
                  onChange={(e) => setEditingEvent({ ...editingEvent, class: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Car specific fields */}
          {editingEvent.type === "car" && (
            <div className="space-y-2">
              <Label htmlFor="rental-vehicle-info">Rental/Vehicle Info</Label>
              <Input 
                id="rental-vehicle-info"
                placeholder="E.g., Hertz Compact Car, Tesla Model 3, etc."
                value={editingEvent.car || ""} 
                onChange={(e) => setEditingEvent({ ...editingEvent, car: e.target.value })} 
              />
            </div>
          )}
        </>
      )}

      {editingEvent.category === "accommodation" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="place-name">Place Name</Label>
            <Input 
              id="place-name"
              value={editingEvent.placeName || ""} 
              onChange={(e) => {
                const newPlaceName = e.target.value;
                // Update both placeName and all location name fields to stay in sync
                setEditingEvent({
                  ...editingEvent,
                  placeName: newPlaceName,
                  // Update top-level location name
                  location: {
                    ...(editingEvent.location || {}),
                    name: newPlaceName
                  },
                  // Update check-in location name 
                  checkIn: {
                    ...editingEvent.checkIn,
                    location: {
                      ...(editingEvent.checkIn?.location || {}),
                      name: newPlaceName
                    }
                  },
                  // Update check-out location name
                  checkOut: {
                    ...editingEvent.checkOut,
                    location: {
                      ...(editingEvent.checkOut?.location || {}),
                      name: newPlaceName
                    }
                  }
                });
              }} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in-date">Check-in Date</Label>
              <Input
                id="check-in-date"
                type="datetime-local"
                value={editingEvent.checkIn?.date ? editingEvent.checkIn.date.slice(0, 16) : ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    checkIn: {
                      ...editingEvent.checkIn,
                      date: e.target.value
                    },
                    start: e.target.value
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out-date">Check-out Date</Label>
              <Input
                id="check-out-date"
                type="datetime-local"
                value={editingEvent.checkOut?.date ? editingEvent.checkOut.date.slice(0, 16) : ""}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    checkOut: {
                      ...editingEvent.checkOut,
                      date: e.target.value
                    },
                    end: e.target.value
                  })
                }
              />
            </div>
          </div>

          {/* Room number for hotel/hostel */}
          {(editingEvent.type === "hotel" || editingEvent.type === "hostel") && (
            <div className="space-y-2">
              <Label htmlFor="room-number">Room Number</Label>
              <Input 
                id="room-number"
                value={editingEvent.roomNumber || ""} 
                onChange={(e) => setEditingEvent({ ...editingEvent, roomNumber: e.target.value })} 
              />
            </div>
          )}

          {/* Booking reference for accommodation */}
          <div className="space-y-2">
            <Label htmlFor="booking-reference">Booking Reference</Label>
            <Input 
              id="booking-reference"
              value={editingEvent.bookingReference || ""} 
              onChange={(e) => setEditingEvent({ ...editingEvent, bookingReference: e.target.value })} 
              placeholder="Reservation/confirmation number"
            />
          </div>
        </>
      )}

      {/* Experience Events */}
      {editingEvent.category === "experience" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={(editingEvent as ExperienceEvent).startDate ? (editingEvent as ExperienceEvent).startDate.slice(0, 16) : ""}
                onChange={(e) => {
                  const updatedEvent = { ...editingEvent as ExperienceEvent } as ExperienceEvent;
                  updatedEvent.startDate = e.target.value;
                  updatedEvent.start = e.target.value;
                  setEditingEvent(updatedEvent);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={(editingEvent as ExperienceEvent).endDate ? (editingEvent as ExperienceEvent).endDate.slice(0, 16) : ""}
                onChange={(e) => {
                  const updatedEvent = { ...editingEvent as ExperienceEvent } as ExperienceEvent;
                  updatedEvent.endDate = e.target.value;
                  updatedEvent.end = e.target.value;
                  setEditingEvent(updatedEvent);
                }}
              />
            </div>
          </div>

          {/* Booking reference field */}
          <div className="space-y-2">
            <Label htmlFor="booking-reference">Booking Reference</Label>
            <Input 
              id="booking-reference"
              value={(editingEvent as ExperienceEvent).bookingReference || ""}
              onChange={(e) => {
                const updatedEvent = { ...editingEvent as ExperienceEvent } as ExperienceEvent;
                updatedEvent.bookingReference = e.target.value;
                setEditingEvent(updatedEvent);
              }}
              placeholder="Ticket/confirmation number"
            />
          </div>
        </>
      )}

      {/* Meal Events */}
      {editingEvent.category === "meal" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={(editingEvent as MealEvent).date ? 
                    (editingEvent as MealEvent).date.slice(0, 16) : ""}
              onChange={(e) => {
                // Convert to MealEvent and update
                const updatedEvent = { 
                  ...editingEvent as MealEvent,
                } as MealEvent;
                
                // Set date first to ensure it's defined
                updatedEvent.date = e.target.value;
                
                // Update start/end as well for consistency
                updatedEvent.start = e.target.value;
                updatedEvent.end = e.target.value;
                
                setEditingEvent(updatedEvent);
              }}
            />
          </div>

          {/* Reservation reference for restaurants */}
          {editingEvent.type === "restaurant" && (
            <div className="space-y-2">
              <Label htmlFor="reservation-reference">Reservation Reference</Label>
              <Input
                id="reservation-reference"
                value={(editingEvent as MealEvent).reservationReference || ""}
                onChange={(e) => {
                  const updatedEvent = { ...editingEvent as MealEvent } as MealEvent;
                  updatedEvent.reservationReference = e.target.value;
                  setEditingEvent(updatedEvent);
                }}
                placeholder="Reservation confirmation"
              />
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={editingEvent.notes || ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
        />
      </div>
    </div>
  );
};

export const EventEditor: React.FC<EventEditorProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
  tripId,
}) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(event);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isNewEvent = event && !event.start; // Check if it's a new event based on missing start time

  // Update local state when the event prop changes
  React.useEffect(() => {
    setEditingEvent(event);
  }, [event]);

  if (!editingEvent) return null;

  // Get style for current event type
  const { bgColor } = getEventStyle(editingEvent);

  const handleSave = () => {
    if (editingEvent) {
      // Create updated event with proper start/end times
      let updatedEvent = {...editingEvent};
      
      // Update the start/end time based on category
      if (updatedEvent.category === 'accommodation') {
        // Update start time from check-in time
        if (updatedEvent.checkIn?.date) {
          updatedEvent.start = updatedEvent.checkIn.date;
        }
        // Update end time from check-out time
        if (updatedEvent.checkOut?.date) {
          updatedEvent.end = updatedEvent.checkOut.date;
        }
        // Ensure top-level location and checkOut location match checkIn location
        if (updatedEvent.checkIn?.location) {
          updatedEvent.location = {...updatedEvent.checkIn.location};
          
          // If checkOut exists, also update its location
          if (updatedEvent.checkOut) {
            updatedEvent.checkOut.location = {...updatedEvent.checkIn.location};
          }
        }
        
        // Ensure placeName and location.name are in sync
        if (updatedEvent.placeName) {
          // Update location name if it exists
          if (updatedEvent.location) {
            updatedEvent.location.name = updatedEvent.placeName;
          }
          
          // Update checkIn/checkOut location names
          if (updatedEvent.checkIn?.location) {
            updatedEvent.checkIn.location.name = updatedEvent.placeName;
          }
          if (updatedEvent.checkOut?.location) {
            updatedEvent.checkOut.location.name = updatedEvent.placeName;
          }
        }
      } else if (updatedEvent.category === 'travel') {
        // Update start time from departure time
        if (updatedEvent.departure?.date) {
          updatedEvent.start = updatedEvent.departure.date;
        }
        // Update end time from arrival time
        if (updatedEvent.arrival?.date) {
          updatedEvent.end = updatedEvent.arrival.date;
        }
        // Ensure top-level location is populated from departure.location
        if (updatedEvent.departure?.location) {
          updatedEvent.location = {...updatedEvent.departure.location};
        }
      } else if (updatedEvent.category === 'experience') {
        // Update start time from startDate
        const expEvent = updatedEvent as ExperienceEvent;
        if (expEvent.startDate) {
          updatedEvent.start = expEvent.startDate;
        }
        // Update end time from endDate
        if (expEvent.endDate) {
          updatedEvent.end = expEvent.endDate;
        }
      } else if (updatedEvent.category === 'meal') {
        // For meals, use the same time for both start and end
        const mealEvent = updatedEvent as MealEvent;
        if (mealEvent.date) {
          updatedEvent.start = mealEvent.date;
          updatedEvent.end = mealEvent.date;
        }
      }
      
      // Make sure we have at least an empty location object if none exists
      if (!updatedEvent.location) {
        updatedEvent.location = { name: '' };
      }
      
      onSave(updatedEvent);
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${bgColor}`}>
          <DialogHeader>
            <DialogTitle>{isNewEvent ? 'Add New Event' : `Edit ${editingEvent.title}`}</DialogTitle>
            <DialogDescription>
              {isNewEvent 
                ? 'Create a new event for your trip and click Save when you\'re done.' 
                : 'Make changes to this event and click Save when you\'re done.'}
            </DialogDescription>
          </DialogHeader>

          {/* Use the shared EventForm component */}
          <EventForm 
            editingEvent={editingEvent} 
            setEditingEvent={setEditingEvent}
            tripId={tripId}
          />
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>{isNewEvent ? 'Create Event' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  } 
  
  // Mobile view
  else {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`${bgColor}`}>
          <DrawerHeader>
            <DrawerTitle>{isNewEvent ? 'Add New Event' : `Edit ${editingEvent.title}`}</DrawerTitle>
            <DrawerDescription>
              {isNewEvent 
                ? 'Create a new event for your trip and click Save when you\'re done.' 
                : 'Make changes to this event and click Save when you\'re done.'}
            </DrawerDescription>
          </DrawerHeader>
          
          {/* Make the content area scrollable with proper height */}
          <div className="flex-1 overflow-y-auto px-4" style={{ maxHeight: 'calc(80vh - 160px)' }}>
            {/* Use the shared EventForm component */}
            <EventForm 
              editingEvent={editingEvent} 
              setEditingEvent={setEditingEvent}
              tripId={tripId}
            />
          </div>
          
          {/* Fix the footer at the bottom with proper styling */}
          <DrawerFooter className="flex-row justify-end gap-2 border-t mt-auto">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={handleSave}>{isNewEvent ? 'Create Event' : 'Save Changes'}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
}; 