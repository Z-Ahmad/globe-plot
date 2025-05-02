import { useState } from "react";

// Example trip data
const tripData = {
  name: "European Adventure",
  dateRange: "Jun 15 - Jul 3, 2024",
  stops: [
    {
      id: 1,
      name: "London",
      dateRange: "Jun 15 - Jun 20",
      events: [
        { id: 1, type: "flight", title: "Flight to London", time: "Jun 15, 8:30 AM", notes: "British Airways BA112" },
        { id: 2, type: "hotel", title: "Check-in: Park Plaza Westminster", time: "Jun 15, 3:00 PM", notes: "Confirmation #12345" },
        { id: 3, type: "activity", title: "Tower of London Tour", time: "Jun 16, 10:00 AM", notes: "Skip the line tickets" },
        { id: 4, type: "meal", title: "Dinner at The Ivy", time: "Jun 17, 7:30 PM", notes: "Reservation confirmed" },
        { id: 5, type: "transit", title: "London Eye", time: "Jun 18, 4:00 PM", notes: "Sunset viewing" },
      ]
    },
    {
      id: 2,
      name: "Paris",
      dateRange: "Jun 20 - Jun 25",
      events: [
        { id: 6, type: "transit", title: "Eurostar to Paris", time: "Jun 20, 10:15 AM", notes: "Business Class, Coach 8" },
        { id: 7, type: "hotel", title: "Check-in: Hotel de Ville", time: "Jun 20, 2:00 PM", notes: "Confirmation #67890" },
      ]
    }
  ]
};

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

export function Demo() {
  const [activeStop, setActiveStop] = useState(tripData.stops[0].id);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Trip Overview */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border border-border mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2">{tripData.name}</h2>
            <p className="text-muted-foreground">{tripData.dateRange}</p>
          </div>
          <div className="flex space-x-2">
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">Share</button>
            <button className="border border-border text-foreground px-4 py-2 rounded-md hover:bg-secondary transition-colors">Export</button>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3 bg-sidebar border border-sidebar-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-sidebar-primary text-sidebar-primary-foreground">
            <h3 className="font-semibold">Stops</h3>
          </div>
          <div className="p-2">
            {tripData.stops.map((stop) => (
              <button
                key={stop.id}
                className={`w-full text-left p-3 rounded-md mb-1 font-medium transition-colors ${
                  activeStop === stop.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted"
                }`}
                onClick={() => setActiveStop(stop.id)}
              >
                {stop.name}
                <span className="text-muted-foreground text-sm ml-2">{stop.dateRange}</span>
              </button>
            ))}
            <button className="w-full text-left p-3 rounded-md text-muted-foreground hover:bg-muted mt-2 flex items-center">
              <span className="mr-2">+</span> Add Stop
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-9 bg-card border border-border rounded-lg shadow-sm p-6">
          {tripData.stops.map(
            (stop) =>
              activeStop === stop.id && (
                <div key={stop.id}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{stop.name}</h2>
                    <div className="text-muted-foreground">{stop.dateRange}</div>
                  </div>

                  {/* Events */}
                  <div className="space-y-4">
                    {stop.events.map((event) => (
                      <div
                        key={event.id}
                        className="flex p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
                        style={{ borderLeftWidth: "4px", borderLeftColor: typeColors[event.type] }}
                      >
                        <div className="mr-4 text-2xl" style={{ color: typeColors[event.type] }}>
                          {typeIcons[event.type]}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <h3 className="font-semibold">{event.title}</h3>
                            <span className="text-muted-foreground">{event.time}</span>
                          </div>
                          <p className="text-muted-foreground text-sm">{event.notes}</p>
                        </div>
                      </div>
                    ))}

                    <button className="w-full p-3 border border-dashed border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center">
                      <span className="mr-2">+</span> Add Event
                    </button>
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
} 