import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTripStore, Stop, Event } from '../stores/tripStore';

// Type icons mapping
const typeIcons: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  activity: "🎭",
  meal: "🍽️",
  transit: "🚆"
};

// Type to color variable mapping
const typeColors: Record<string, string> = {
  flight: "var(--chart-1)",
  activity: "var(--chart-2)",
  meal: "var(--chart-3)",
  hotel: "var(--chart-4)",
  transit: "var(--chart-5)"
};

export const Trip = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips } = useTripStore();
  
  const [activeStop, setActiveStop] = useState<string | null>(null);
  
  // Find the specific trip
  const trip = trips.find(trip => trip.id === id);
  
  // Set active stop on initial load
  useEffect(() => {
    // Only try to set active stop if trip exists and has stops
    if (trip && trip.stops && trip.stops.length > 0 && !activeStop) {
      setActiveStop(trip.stops[0].id);
    }
  }, [trip, activeStop]);
  
  // Handle trip not found
  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Trip Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The trip you're looking for couldn't be found.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  const currentStop = trip.stops.find(stop => stop.id === activeStop);
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Trip Overview */}
      <div className="relative bg-gradient-to-r from-card to-card/95 text-card-foreground p-6 rounded-lg shadow-sm border border-border mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 -mr-16 -mt-16 rounded-full"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
            <p className="text-muted-foreground flex items-center">
              <span className="mr-2">📅</span> {trip.dateRange}
              <span className="mx-2 text-border">•</span>
              <span>{trip.stops.length} stops</span>
              <span className="mx-2 text-border">•</span>
              <span>{trip.stops.reduce((acc, stop) => acc + stop.events.length, 0)} events</span>
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity flex items-center shadow-sm">
              <span className="mr-2">📤</span> Share
            </button>
            <button className="bg-primary/10 text-primary px-4 py-2 rounded-full hover:bg-primary/20 transition-colors flex items-center shadow-sm">
              <span className="mr-2">📄</span> Export
            </button>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with Stops */}
        <div className="col-span-3">
          <div className="sticky top-6 bg-sidebar border border-sidebar-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-sidebar-primary text-sidebar-primary-foreground flex justify-between items-center">
              <h3 className="font-semibold">Stops</h3>
              <span className="text-xs font-medium bg-sidebar-primary-foreground/20 rounded-full px-2 py-0.5">
                {trip.stops.length}
              </span>
            </div>
            
            <div className="relative p-3">
              {trip.stops.length > 0 && (
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-muted-foreground/20 z-0"></div>
              )}
              
              {trip.stops.map((stop, index) => (
                <div key={stop.id} className="relative z-10 mb-2">
                  <button
                    className={`w-full text-left p-3 rounded-md font-medium transition-all flex items-start ${
                      activeStop === stop.id 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setActiveStop(stop.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                      activeStop === stop.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      {stop.name}
                      <div className="text-muted-foreground text-sm flex items-center mt-1">
                        <span className="text-xs">📅</span>
                        <span className="ml-1">{stop.dateRange}</span>
                      </div>
                      <div className="flex mt-2 -ml-1">
                        {Array.from(new Set(stop.events.map(event => event.type))).map(type => (
                          <div 
                            key={type} 
                            className="w-5 h-5 ml-1 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: typeColors[type], color: 'white' }}
                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                          >
                            {typeIcons[type]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
              
              <button className="w-full text-left p-3 rounded-md text-muted-foreground hover:bg-muted mt-2 flex items-center relative z-10">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center mr-3">
                  <span>+</span>
                </div>
                <span>Add Stop</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-9 bg-gradient-to-b from-card to-card/98 border border-border rounded-lg shadow-sm p-6">
          {!currentStop ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-2xl">🏙️</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">No stops added yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add your first destination to start planning your trip itinerary.
              </p>
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors">
                Add Your First Stop
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
                <div className="flex items-center">
                  <div className="bg-primary/10 text-primary p-3 rounded-full mr-4">
                    🏙️
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentStop.name}</h2>
                    <div className="text-muted-foreground flex items-center text-sm mt-1">
                      <span className="mr-1">📅</span> {currentStop.dateRange}
                      <span className="mx-2 text-border">•</span>
                      <span>{currentStop.events.length} events</span>
                    </div>
                  </div>
                </div>
                <div className="flex">
                  <button className="bg-secondary/30 text-secondary-foreground p-2 rounded-md hover:bg-secondary/50 transition-colors mr-2" title="Edit Stop">
                    ✏️
                  </button>
                  <button className="bg-muted p-2 rounded-md hover:bg-muted/80 transition-colors" title="More Options">
                    •••
                  </button>
                </div>
              </div>
              
              {/* Events section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg">Events</h3>
                  <div className="flex bg-muted/30 p-1 rounded-md">
                    {Object.keys(typeIcons).map(type => (
                      <button 
                        key={type}
                        className="p-1.5 rounded hover:bg-white/70 transition-colors"
                        title={type.charAt(0).toUpperCase() + type.slice(1)}
                      >
                        <span style={{ color: typeColors[type] }}>{typeIcons[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {currentStop.events.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg bg-card/50">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary text-xl">📋</span>
                    </div>
                    <h3 className="text-lg font-medium mb-1">No events added yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Add flights, accommodations, activities, and more to your itinerary.
                    </p>
                    <button className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm hover:bg-primary/20 transition-colors">
                      Add Your First Event
                    </button>
                  </div>
                ) : (
                  currentStop.events.map(event => (
                    <div 
                      key={event.id} 
                      className="group flex p-5 border border-border rounded-lg hover:shadow-md transition-all hover:-translate-y-0.5 bg-white"
                      style={{ borderLeftWidth: '4px', borderLeftColor: typeColors[event.type] }}
                    >
                      <div 
                        className="mr-4 p-3 rounded-full text-xl flex items-center justify-center" 
                        style={{ backgroundColor: `${typeColors[event.type]}20`, color: typeColors[event.type] }}
                      >
                        {typeIcons[event.type]}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-muted-foreground text-sm mt-1">{event.notes}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="bg-muted/50 text-muted-foreground px-2 py-1 rounded text-sm font-medium">
                              {event.time}
                            </span>
                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex">
                              <button className="p-1 hover:bg-muted rounded-md mr-1" title="Edit">✏️</button>
                              <button className="p-1 hover:bg-muted rounded-md" title="Delete">🗑️</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                <button className="w-full p-4 border border-dashed border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center bg-white/50 hover:bg-white">
                  <span className="w-8 h-8 bg-muted/30 rounded-full flex items-center justify-center mr-2">+</span>
                  Add Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 