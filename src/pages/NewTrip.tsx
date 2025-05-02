import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../stores/tripStore';
import { v4 as uuidv4 } from 'uuid';

export const NewTrip = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();
  const { addTrip } = useTripStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !startDate || !endDate) return;
    
    const newTrip = {
      id: uuidv4(),
      name,
      dateRange: `${startDate} - ${endDate}`,
      stops: []
    };
    
    addTrip(newTrip);
    navigate('/dashboard');
  };
  
  return (
    <main className='max-w-2xl mx-auto p-6'>
      <div className="bg-card border border-border rounded-lg p-8">
        <h1 className='text-2xl font-bold mb-6'>Create New Trip</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="name">
              Trip Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 bg-background"
              placeholder="European Adventure"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="startDate">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="endDate">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 bg-background"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button" 
              className="mr-2 px-4 py-2 border border-border rounded-full text-foreground"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full"
            >
              Create Trip
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
