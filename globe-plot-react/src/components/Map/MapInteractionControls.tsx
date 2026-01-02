import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, RefreshCw, Scan } from 'lucide-react';

interface MapInteractionControlsProps {
  onPrevEvent: () => void;
  onNextEvent: () => void;
  onViewAllLocations: () => void;
  onRefreshCoordinates: () => void;
  isNavigationDisabled: boolean;
  isRefreshing: boolean;
  isRefreshOnCooldown: boolean;
  cooldownRemaining: string;
}

export const MapInteractionControls: React.FC<MapInteractionControlsProps> = ({
  onPrevEvent,
  onNextEvent,
  onViewAllLocations,
  onRefreshCoordinates,
  isNavigationDisabled,
  isRefreshing,
  isRefreshOnCooldown,
  cooldownRemaining
}) => {
  return (
    <div className="map-navigation-controls absolute bottom-10 right-4 z-50 flex space-x-2">
      <Button 
        variant="secondary" 
        size="icon" 
        onClick={onPrevEvent}
        disabled={isNavigationDisabled}
        className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
        title="Previous location"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <Button
        variant="secondary"
        size="icon"
        onClick={onViewAllLocations}
        disabled={isNavigationDisabled}
        className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
        title="View all locations"
      >
        <Scan className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="secondary" 
        size="icon"
        onClick={onNextEvent}
        disabled={isNavigationDisabled}
        className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white"
        title="Next location"
      >
        <ArrowRight className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="secondary" 
        size="icon"
        onClick={onRefreshCoordinates}
        disabled={isRefreshing || isRefreshOnCooldown}
        className="rounded-full h-10 w-10 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white disabled:opacity-50"
        title={
          isRefreshOnCooldown 
            ? `Refresh on cooldown (${cooldownRemaining} remaining)` 
            : "Refresh all coordinates"
        }
      >
        <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}; 