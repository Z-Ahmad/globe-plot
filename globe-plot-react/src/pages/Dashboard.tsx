import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';

export const Dashboard = () => {
  const { trips } = useTripStore();
  const navigate = useNavigate();

  return (
    <main className='max-w-7xl mx-auto p-6'>
      <div className="flex justify-between items-center mb-8">
        <h1 className='text-2xl font-bold'>My Trips</h1>
        <Link 
          to="/trip/new" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
        >
          + New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary text-2xl">✈️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">No trips planned yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start by creating your first trip and adding destinations to plan your perfect journey.
          </p>
          <button 
            onClick={() => navigate('/trip/new')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => (
            <Link 
              key={trip.id} 
              to={`/trip/${trip.id}`}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{trip.name}</h2>
                <p className="text-muted-foreground text-sm flex items-center">
                  <span className="mr-2">📅</span> {trip.dateRange}
                </p>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <span className="mr-4 flex items-center">
                    <span className="mr-1">🏙️</span> {trip.stops.length} stops
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">🗓️</span> {trip.stops.reduce((acc, stop) => acc + stop.events.length, 0)} events
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gradient-to-r from-primary to-accent"></div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};
