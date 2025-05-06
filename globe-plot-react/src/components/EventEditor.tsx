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

import { useMediaQuery } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getEventStyle, eventStyleMap, categoryStyleMap } from '@/styles/eventStyles';
import { EventType } from '@/types/trip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventEditorProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Event) => void;
}

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
    
    // Preserve common fields (title, city, country, notes) but reset category-specific fields
    const updatedEvent = {
      ...editingEvent,
      category: newCategory,
      type: defaultType,
      // Reset category-specific fields but keep common fields
      departure: (newCategory === 'travel') ? editingEvent.departure : undefined,
      arrival: (newCategory === 'travel') ? editingEvent.arrival : undefined,
      airline: (newCategory === 'travel') ? editingEvent.airline : undefined,
      flightNumber: (newCategory === 'travel') ? editingEvent.flightNumber : undefined,
      checkIn: (newCategory === 'accommodation') ? editingEvent.checkIn : undefined,
      checkOut: (newCategory === 'accommodation') ? editingEvent.checkOut : undefined,
      placeName: (newCategory === 'accommodation') ? editingEvent.placeName : undefined,
      startTime: (newCategory === 'experience') ? editingEvent.startTime : undefined,
      endTime: (newCategory === 'experience') ? editingEvent.endTime : undefined,
      time: (newCategory === 'meal') ? editingEvent.time : undefined,
      location: (newCategory === 'experience' || newCategory === 'meal') ? editingEvent.location : undefined,
    } as Event;
    
    setEditingEvent(updatedEvent);
  };

  // Handler for type change
  const handleTypeChange = (newType: string) => {
    // Create a new object with the new type
    // This ensures TypeScript understands we're maintaining category-specific type constraints
    const updatedEvent = {
      ...editingEvent,
      type: newType
    } as Event; // Cast to Event type to ensure TypeScript correctly processes the type relationship
    
    setEditingEvent(updatedEvent);
  };

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
      } else if (updatedEvent.category === 'travel') {
        // Update start time from departure time
        if (updatedEvent.departure?.time) {
          updatedEvent.start = updatedEvent.departure.time;
        }
        // Update end time from arrival time
        if (updatedEvent.arrival?.time) {
          updatedEvent.end = updatedEvent.arrival.time;
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
      
      onSave(updatedEvent);
    }
  };

  // Get available types for the current category
  const availableTypes = getTypesForCategory(editingEvent.category);

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${bgColor}`}>
          <DialogHeader>
            <DialogTitle>Edit {editingEvent.title}</DialogTitle>
            <DialogDescription>
              Make changes to this event and click Save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={editingEvent.title} 
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
              />
            </div>
            
            {/* Category and Type selectors side by side on desktop*/}
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input 
                  value={editingEvent.country} 
                  onChange={(e) => setEditingEvent({...editingEvent, country: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input 
                  value={editingEvent.city} 
                  onChange={(e) => setEditingEvent({...editingEvent, city: e.target.value})}
                />
              </div>
            </div>
            
            {/* Category-specific fields */}
            {editingEvent.category === 'travel' && (
              <>
                {/* Flight-specific fields */}
                {editingEvent.type === 'flight' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
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
                  </>
                )}
                
                {/* Departure - for all travel types */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departure</label>
                  <Input 
                    type="datetime-local"
                    value={editingEvent.departure?.time ? editingEvent.departure.time.slice(0, 16) : ''} 
                    onChange={(e) => {
                      const updatedEvent = {
                        ...editingEvent, 
                        departure: {
                          ...editingEvent.departure,
                          time: e.target.value
                        },
                        // Also update start time
                        start: e.target.value
                      };
                      setEditingEvent(updatedEvent);
                    }}
                  />
                </div>
                
                {/* Arrival - for all travel types */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Arrival</label>
                  <Input 
                    type="datetime-local"
                    value={editingEvent.arrival?.time ? editingEvent.arrival.time.slice(0, 16) : ''} 
                    onChange={(e) => {
                      const updatedEvent = {
                        ...editingEvent, 
                        arrival: {
                          ...editingEvent.arrival,
                          time: e.target.value
                        },
                        // Also update end time
                        end: e.target.value
                      };
                      setEditingEvent(updatedEvent);
                    }}
                  />
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
                      onChange={(e) => {
                        const updatedEvent = {
                          ...editingEvent, 
                          checkIn: {
                            ...editingEvent.checkIn,
                            time: e.target.value
                          },
                          // Also update start time automatically
                          start: e.target.value
                        };
                        setEditingEvent(updatedEvent);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check-out</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.checkOut?.time ? editingEvent.checkOut.time.slice(0, 16) : ''} 
                      onChange={(e) => {
                        const updatedEvent = {
                          ...editingEvent, 
                          checkOut: {
                            ...editingEvent.checkOut,
                            time: e.target.value
                          },
                          // Also update end time automatically
                          end: e.target.value
                        };
                        setEditingEvent(updatedEvent);
                      }}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Name</label>
                  <Input 
                    value={editingEvent.location?.name || ''} 
                    onChange={(e) => setEditingEvent({
                      ...editingEvent, 
                      location: {
                        ...editingEvent.location,
                        name: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.startTime ? editingEvent.startTime.slice(0, 16) : ''} 
                      onChange={(e) => {
                        setEditingEvent({
                          ...editingEvent, 
                          startTime: e.target.value,
                          start: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.endTime ? editingEvent.endTime.slice(0, 16) : ''} 
                      onChange={(e) => {
                        setEditingEvent({
                          ...editingEvent, 
                          endTime: e.target.value,
                          end: e.target.value
                        });
                      }}
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
                  <label className="text-sm font-medium">Location Name</label>
                  <Input 
                    value={editingEvent.location?.name || ''} 
                    onChange={(e) => setEditingEvent({
                      ...editingEvent, 
                      location: {
                        ...editingEvent.location,
                        name: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <Input 
                    type="datetime-local"
                    value={editingEvent.time ? editingEvent.time.slice(0, 16) : ''} 
                    onChange={(e) => {
                      setEditingEvent({
                        ...editingEvent, 
                        time: e.target.value,
                        start: e.target.value,
                        end: e.target.value
                      });
                    }}
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
            <div className="space-y-4 pb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  value={editingEvent.title} 
                  onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                />
              </div>
            
              {/* Category and Type selectors one above the other on mobile */}
              <div className="space-y-2">
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
              
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input 
                    value={editingEvent.country} 
                    onChange={(e) => setEditingEvent({...editingEvent, country: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input 
                    value={editingEvent.city} 
                    onChange={(e) => setEditingEvent({...editingEvent, city: e.target.value})}
                  />
                  </div>
              </div>
              
              {/* Category-specific fields */}
              {editingEvent.category === 'travel' && (
                <>
                  {/* Flight-specific fields */}
                  {editingEvent.type === 'flight' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
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
                    </>
                  )}
                  
                  {/* Departure - for all travel types */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Departure</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.departure?.time ? editingEvent.departure.time.slice(0, 16) : ''} 
                      onChange={(e) => {
                        const updatedEvent = {
                          ...editingEvent, 
                          departure: {
                            ...editingEvent.departure,
                            time: e.target.value
                          },
                          // Also update start time
                          start: e.target.value
                        };
                        setEditingEvent(updatedEvent);
                      }}
                    />
                  </div>
                  
                  {/* Arrival - for all travel types */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Arrival</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.arrival?.time ? editingEvent.arrival.time.slice(0, 16) : ''} 
                      onChange={(e) => {
                        const updatedEvent = {
                          ...editingEvent, 
                          arrival: {
                            ...editingEvent.arrival,
                            time: e.target.value
                          },
                          // Also update end time
                          end: e.target.value
                        };
                        setEditingEvent(updatedEvent);
                      }}
                    />
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
                        onChange={(e) => {
                          const updatedEvent = {
                            ...editingEvent, 
                            checkIn: {
                              ...editingEvent.checkIn,
                              time: e.target.value
                            },
                            // Also update start time automatically
                            start: e.target.value
                          };
                          setEditingEvent(updatedEvent);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Check-out</label>
                      <Input 
                        type="datetime-local"
                        value={editingEvent.checkOut?.time ? editingEvent.checkOut.time.slice(0, 16) : ''} 
                        onChange={(e) => {
                          const updatedEvent = {
                            ...editingEvent, 
                            checkOut: {
                              ...editingEvent.checkOut,
                              time: e.target.value
                            },
                            // Also update end time automatically
                            end: e.target.value
                          };
                          setEditingEvent(updatedEvent);
                        }}
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location Name</label>
                    <Input 
                      value={editingEvent.location?.name || ''} 
                      onChange={(e) => setEditingEvent({
                        ...editingEvent, 
                        location: {
                          ...editingEvent.location,
                          name: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time</label>
                      <Input 
                        type="datetime-local"
                        value={editingEvent.startTime ? editingEvent.startTime.slice(0, 16) : ''} 
                        onChange={(e) => {
                          setEditingEvent({
                            ...editingEvent, 
                            startTime: e.target.value,
                            start: e.target.value
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time</label>
                      <Input 
                        type="datetime-local"
                        value={editingEvent.endTime ? editingEvent.endTime.slice(0, 16) : ''} 
                        onChange={(e) => {
                          setEditingEvent({
                            ...editingEvent, 
                            endTime: e.target.value,
                            end: e.target.value
                          });
                        }}
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
                    <label className="text-sm font-medium">Location Name</label>
                    <Input 
                      value={editingEvent.location?.name || ''} 
                      onChange={(e) => setEditingEvent({
                        ...editingEvent, 
                        location: {
                          ...editingEvent.location,
                          name: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Input 
                      type="datetime-local"
                      value={editingEvent.time ? editingEvent.time.slice(0, 16) : ''} 
                      onChange={(e) => {
                        setEditingEvent({
                          ...editingEvent, 
                          time: e.target.value,
                          start: e.target.value,
                          end: e.target.value
                        });
                      }}
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