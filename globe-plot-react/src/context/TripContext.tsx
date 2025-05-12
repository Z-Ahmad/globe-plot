import React, { createContext, useContext, ReactNode } from 'react';

interface TripContextType {
  tripId: string | null;
}

const TripContext = createContext<TripContextType>({ tripId: null });

export const TripProvider: React.FC<{ children: ReactNode; tripId: string | null }> = ({ 
  children, 
  tripId 
}) => {
  return (
    <TripContext.Provider value={{ tripId }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTripContext = () => useContext(TripContext); 