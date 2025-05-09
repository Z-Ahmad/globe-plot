import React, { useState, ChangeEvent } from 'react';
import { Event, EventCategory } from '@/stores/tripStore';
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
import { Info } from 'lucide-react';

interface EventEditorProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Event) => void;
}

// Shared event form component to reduce duplication
interface EventFormProps {
  editingEvent: Event;
  setEditingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  containerStyle?: string; // Optional style for the container
}

const EventForm: React.FC<EventFormProps> = ({
  editingEvent,
  setEditingEvent,
}) => {
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
        departure: travelEvent?.departure || { time: '', location: { name: '' } },
        arrival: travelEvent?.arrival || { time: '', location: { name: '' } },
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
        checkIn: accomEvent?.checkIn || { time: '', location: { name: '' } },
        checkOut: accomEvent?.checkOut || { time: '', location: { name: '' } },
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
        startTime: expEvent?.startTime || '',
        endTime: expEvent?.endTime || '',
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
        time: mealEvent?.time || '',
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
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input 
          value={editingEvent.title} 
          onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
        />
      </div>
      
      {/* Category and Type selectors in a 2-column grid on all screen sizes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Category selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select 
            value={editingEvent.category} 
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => {
                const style = categoryStyleMap[category] || { icon: null, color: 'text-gray-700' };
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
          <label className="text-sm font-medium">Type</label>
          <Select 
            value={editingEvent.type} 
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((type) => {
                const styleKey = `${editingEvent.category}/${type}`;
                const style = eventStyleMap[styleKey] || { icon: null, color: 'text-gray-700' };
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
            <label className="text-sm font-medium">Country</label>
            {editingEvent.category === 'travel' && (
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
            value={editingEvent.category === 'travel' 
              ? (editingEvent.departure?.location?.country || '')
              : editingEvent.category === 'accommodation'
                ? (editingEvent.checkIn?.location?.country || '')
                : (editingEvent.location?.country || '')} 
            onChange={(e) => {
              if (editingEvent.category === 'travel') {
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
              } else if (editingEvent.category === 'accommodation') {
                setEditingEvent({
                  ...editingEvent,
                  checkIn: {
                    ...editingEvent.checkIn,
                    location: {
                      ...(editingEvent.checkIn?.location || {}),
                      country: e.target.value
                    }
                  }
                });
              } else {
                setEditingEvent({
                  ...editingEvent,
                  location: {
                    ...editingEvent.location || {},
                    country: e.target.value
                  }
                });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">City</label>
            {editingEvent.category === 'travel' && (
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
            value={editingEvent.category === 'travel' 
              ? (editingEvent.departure?.location?.city || '')
              : editingEvent.category === 'accommodation'
                ? (editingEvent.checkIn?.location?.city || '')
                : (editingEvent.location?.city || '')} 
            onChange={(e) => {
              if (editingEvent.category === 'travel') {
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
              } else if (editingEvent.category === 'accommodation') {
                setEditingEvent({
                  ...editingEvent,
                  checkIn: {
                    ...editingEvent.checkIn,
                    location: {
                      ...(editingEvent.checkIn?.location || {}),
                      city: e.target.value
                    }
                  }
                });
              } else {
                setEditingEvent({
                  ...editingEvent,
                  location: {
                    ...editingEvent.location || {},
                    city: e.target.value
                  }
                });
              }
            }}
          />
        </div>
      </div>
      
      {/* Location name field - hide for travel and accommodation events */}
      {editingEvent.category !== 'travel' && editingEvent.category !== 'accommodation' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Location Name</label>
          <Input 
            placeholder="e.g., Conference Center, Restaurant Name, etc."
            value={editingEvent.location?.name || ''} 
            onChange={(e) => setEditingEvent({
              ...editingEvent,
              location: {
                ...editingEvent.location || {},
                name: e.target.value
              }
            })}
          />
        </div>
      )}
      
      {/* Category-specific fields */}
      {editingEvent.category === 'travel' && (
        <>
          {/* Flight-specific fields */}
          {editingEvent.type === 'flight' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Airline</label>
                <Input 
                  value={editingEvent.airline || ''} 
                  onChange={(e) => setEditingEvent({...editingEvent, airline: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Flight Number</label>
                <Input 
                  value={editingEvent.flightNumber || ''} 
                  onChange={(e) => setEditingEvent({...editingEvent, flightNumber: e.target.value})}
                />
              </div>
            </div>
          )}
          
          {/* Departure and Arrival sections */}
          {/* Departure location and time - stacked on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Departure Location</label>
              <Input 
                className="w-full"
                placeholder="e.g., JFK Airport, New York"
                value={editingEvent.departure?.location?.name || ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent,
                  departure: {
                    ...editingEvent.departure,
                    location: {
                      ...(editingEvent.departure?.location || {}),
                      name: e.target.value
                    }
                  }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Departure Time</label>
              <Input 
                className="w-full"
                type="datetime-local"
                value={editingEvent.departure?.time ? editingEvent.departure.time.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent,
                  departure: {
                    ...editingEvent.departure,
                    time: e.target.value
                  },
                  start: e.target.value
                })}
              />
            </div>
          </div>
          
          {/* Arrival location and time - stacked on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Arrival Location</label>
              <Input 
                className="w-full"
                placeholder="e.g., Heathrow Airport, London"
                value={editingEvent.arrival?.location?.name || ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent,
                  arrival: {
                    ...editingEvent.arrival,
                    location: {
                      ...(editingEvent.arrival?.location || {}),
                      name: e.target.value
                    }
                  }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Arrival Time</label>
              <Input 
                className="w-full"
                type="datetime-local"
                value={editingEvent.arrival?.time ? editingEvent.arrival.time.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent,
                  arrival: {
                    ...editingEvent.arrival,
                    time: e.target.value
                  },
                  end: e.target.value
                })}
              />
            </div>
          </div>
          
          {/* Additional fields based on travel type */}
          {editingEvent.type === 'train' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Train Number</label>
                <Input 
                  value={editingEvent.trainNumber || ''} 
                  onChange={(e) => setEditingEvent({...editingEvent, trainNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seat</label>
                <Input 
                  value={editingEvent.seat || ''} 
                  onChange={(e) => setEditingEvent({...editingEvent, seat: e.target.value})}
                />
              </div>
            </div>
          )}
        </>
      )}
      
      {editingEvent.category === 'accommodation' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Place Name</label>
            <Input 
              value={editingEvent.placeName || ''} 
              onChange={(e) => setEditingEvent({...editingEvent, placeName: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-in</label>
              <Input 
                type="datetime-local"
                value={editingEvent.checkIn?.time ? editingEvent.checkIn.time.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent, 
                  checkIn: {
                    ...editingEvent.checkIn,
                    time: e.target.value
                  },
                  start: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-out</label>
              <Input 
                type="datetime-local"
                value={editingEvent.checkOut?.time ? editingEvent.checkOut.time.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent, 
                  checkOut: {
                    ...editingEvent.checkOut,
                    time: e.target.value
                  },
                  end: e.target.value
                })}
              />
            </div>
          </div>
          
          {/* Room number for hotel/hostel */}
          {(editingEvent.type === 'hotel' || editingEvent.type === 'hostel') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Number</label>
              <Input 
                value={editingEvent.roomNumber || ''} 
                onChange={(e) => setEditingEvent({...editingEvent, roomNumber: e.target.value})}
              />
            </div>
          )}
        </>
      )}
      
      {/* Experience Events */}
      {editingEvent.category === 'experience' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Input 
                type="datetime-local"
                value={editingEvent.startTime ? editingEvent.startTime.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent, 
                  startTime: e.target.value,
                  start: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>
              <Input 
                type="datetime-local"
                value={editingEvent.endTime ? editingEvent.endTime.slice(0, 16) : ''} 
                onChange={(e) => setEditingEvent({
                  ...editingEvent, 
                  endTime: e.target.value,
                  end: e.target.value
                })}
              />
            </div>
          </div>
          
          {/* Booking reference field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Booking Reference</label>
            <Input 
              value={editingEvent.bookingReference || ''} 
              onChange={(e) => setEditingEvent({...editingEvent, bookingReference: e.target.value})}
            />
          </div>
        </>
      )}
      
      {/* Meal Events */}
      {editingEvent.category === 'meal' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Time</label>
            <Input 
              type="datetime-local"
              value={editingEvent.time ? editingEvent.time.slice(0, 16) : ''} 
              onChange={(e) => setEditingEvent({
                ...editingEvent, 
                time: e.target.value,
                start: e.target.value,
                end: e.target.value
              })}
            />
          </div>
          
          {/* Reservation reference for restaurants */}
          {editingEvent.type === 'restaurant' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reservation Reference</label>
              <Input 
                value={editingEvent.reservationReference || ''} 
                onChange={(e) => setEditingEvent({...editingEvent, reservationReference: e.target.value})}
              />
            </div>
          )}
        </>
      )}
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea 
          value={editingEvent.notes || ''} 
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditingEvent({...editingEvent, notes: e.target.value})}
        />
      </div>
    </div>
  );
};

export const EventEditor: React.FC<EventEditorProps> = ({
  event,
  isOpen,
  onClose,
  onSave
}) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(event);
  const isDesktop = useMediaQuery('(min-width: 768px)');

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
        if (updatedEvent.checkIn?.time) {
          updatedEvent.start = updatedEvent.checkIn.time;
        }
        // Update end time from check-out time
        if (updatedEvent.checkOut?.time) {
          updatedEvent.end = updatedEvent.checkOut.time;
        }
        // Ensure top-level location is populated from checkIn.location
        if (updatedEvent.checkIn?.location) {
          updatedEvent.location = {...updatedEvent.checkIn.location};
        }
      } else if (updatedEvent.category === 'travel') {
        // Update start time from departure time
        if (updatedEvent.departure?.time) {
          updatedEvent.start = updatedEvent.departure.time;
        }
        // Update end time from arrival time
        if (updatedEvent.arrival?.time) {
          updatedEvent.end = updatedEvent.arrival.time;
        }
        // Ensure top-level location is populated from departure.location
        if (updatedEvent.departure?.location) {
          updatedEvent.location = {...updatedEvent.departure.location};
        }
      } else if (updatedEvent.category === 'experience') {
        // Update start time from startTime
        if (updatedEvent.startTime) {
          updatedEvent.start = updatedEvent.startTime;
        }
        // Update end time from endTime
        if (updatedEvent.endTime) {
          updatedEvent.end = updatedEvent.endTime;
        }
      } else if (updatedEvent.category === 'meal') {
        // For meals, use the same time for both start and end
        if (updatedEvent.time) {
          updatedEvent.start = updatedEvent.time;
          updatedEvent.end = updatedEvent.time;
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
            <DialogTitle>Edit {editingEvent.title}</DialogTitle>
            <DialogDescription>
              Make changes to this event and click Save when you're done.
            </DialogDescription>
          </DialogHeader>

          {/* Use the shared EventForm component */}
          <EventForm 
            editingEvent={editingEvent} 
            setEditingEvent={setEditingEvent} 
          />
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Changes</Button>
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
            <DrawerTitle>Edit {editingEvent.title}</DrawerTitle>
            <DrawerDescription>
              Make changes to this event and click Save Changes when you're done.
            </DrawerDescription>
          </DrawerHeader>
          
          {/* Make the content area scrollable with proper height */}
          <div className="flex-1 overflow-y-auto px-4" style={{ maxHeight: 'calc(80vh - 160px)' }}>
            {/* Use the shared EventForm component */}
            <EventForm 
              editingEvent={editingEvent} 
              setEditingEvent={setEditingEvent} 
            />
          </div>
          
          {/* Fix the footer at the bottom with proper styling */}
          <DrawerFooter className="flex-row justify-end gap-2 border-t mt-auto">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={handleSave}>Save Changes</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
}; 