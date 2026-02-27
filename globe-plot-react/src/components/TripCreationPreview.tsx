import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Plane, 
  Hotel, 
  UtensilsCrossed,
  Camera,
  Upload,
  Sparkles
} from 'lucide-react';

type PreviewStage = 'upload' | 'processing' | 'events' | 'map';

interface FakeEvent {
  id: string;
  title: string;
  category: 'travel' | 'accommodation' | 'experience' | 'meal';
  date: string;
  location: { x: number; y: number };
  color: string;
}

interface TripCreationPreviewProps {
  deviceType?: 'desktop' | 'mobile';
}

const fakeEvents: FakeEvent[] = [
  {
    id: '1',
    title: 'Flight to Paris',
    category: 'travel',
    date: 'Mar 15',
    location: { x: 20, y: 25 },
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Hotel Check-in',
    category: 'accommodation', 
    date: 'Mar 15',
    location: { x: 45, y: 40 },
    color: 'bg-purple-500'
  },
  {
    id: '3',
    title: 'Eiffel Tower Visit',
    category: 'experience',
    date: 'Mar 16',
    location: { x: 65, y: 30 },
    color: 'bg-green-500'
  },
  {
    id: '4',
    title: 'Dinner at Bistro',
    category: 'meal',
    date: 'Mar 16',
    location: { x: 35, y: 60 },
    color: 'bg-orange-500'
  }
];

const getEventIcon = (category: string) => {
  switch (category) {
    case 'travel': return Plane;
    case 'accommodation': return Hotel;
    case 'experience': return Camera;
    case 'meal': return UtensilsCrossed;
    default: return MapPin;
  }
};

export const TripCreationPreview: React.FC<TripCreationPreviewProps> = ({ 
  deviceType = 'desktop' 
}) => {
  const [currentStage, setCurrentStage] = useState<PreviewStage>('upload');
  const [visibleEvents, setVisibleEvents] = useState<FakeEvent[]>([]);
  const [isLooping, setIsLooping] = useState(false);
  const [cycleId, setCycleId] = useState(0);

  useEffect(() => {
    const runDemo = async () => {
      if (isLooping) return;
      setIsLooping(true);
      setCycleId(prev => prev + 1);

      setVisibleEvents([]);
      setCurrentStage('upload');
      await new Promise(resolve => setTimeout(resolve, 3000));

      setCurrentStage('processing');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCurrentStage('events');
      setVisibleEvents([]);
      for (let i = 0; i < fakeEvents.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setVisibleEvents(fakeEvents.slice(0, i + 1));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStage('map');
      await new Promise(resolve => setTimeout(resolve, 4000));

      setVisibleEvents([]);
      setIsLooping(false);
    };

    const interval = setInterval(runDemo, 14000);
    runDemo();

    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const isMobile = deviceType === 'mobile';
  const containerHeight = isMobile ? 'h-96' : 'h-80';
  const frameUrl = 'globeplot.com/trip/new';

  // Shared stage content — rendered identically for both mobile and desktop
  const stageContent = (
    <AnimatePresence mode="wait">
      {/* Upload Stage */}
      {currentStage === "upload" && (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute inset-0 p-6 flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4"
          >
            <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
          </motion.div>

          <p className="text-sm font-medium text-slate-700 dark:text-foreground">Booking confirmation uploaded</p>
          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">paris-hotel-booking.pdf</p>

          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center my-4"
          >
            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </motion.div>
        </motion.div>
      )}

      {/* Processing Stage */}
      {currentStage === "processing" && (
        <motion.div
          key="processing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute inset-0 p-6 flex flex-col items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4"
          >
            <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>

          <p className="text-sm font-medium text-slate-700 dark:text-foreground mb-2">Extracting event data...</p>

          <motion.div className="w-48 h-2 bg-slate-200 dark:bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Events Stage */}
      {currentStage === "events" && (
        <motion.div
          key="events"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute inset-0 p-4"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-foreground mb-2">Events Found</h3>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
              <AnimatePresence>
                {visibleEvents.map((event) => {
                  const Icon = getEventIcon(event.category);
                  return (
                    <motion.div
                      key={`events-${event.id}-${cycleId}`}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-muted/50 rounded-lg border border-slate-200 dark:border-border"
                    >
                      <div className={`w-8 h-8 ${event.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground">{event.date}</p>
                      </div>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Map Stage */}
      {currentStage === "map" && (
        <motion.div
          key="map"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute inset-0"
        >
          <div className="w-full h-full bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
            {/* Street grid pattern */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Map areas */}
            <div className="absolute top-12 left-8 w-20 h-16 bg-green-200 dark:bg-green-800/50 rounded-lg opacity-60"></div>
            <div className="absolute bottom-20 right-12 w-24 h-12 bg-blue-200 dark:bg-blue-800/50 rounded-full opacity-60"></div>
            <div className="absolute top-20 right-8 w-16 h-20 bg-green-200 dark:bg-green-800/50 rounded-lg opacity-60"></div>

            {/* Roads */}
            <div className="absolute top-0 left-1/3 w-px h-full bg-gray-300 dark:bg-slate-500"></div>
            <div className="absolute top-0 right-1/3 w-px h-full bg-gray-300 dark:bg-slate-500"></div>
            <div className="absolute top-1/3 left-0 w-full h-px bg-gray-300 dark:bg-slate-500"></div>
            <div className="absolute bottom-1/3 left-0 w-full h-px bg-gray-300 dark:bg-slate-500"></div>

            {/* Animated event pins */}
            <AnimatePresence>
              {fakeEvents.map((event, index) => {
                const Icon = getEventIcon(event.category);
                return (
                  <motion.div
                    key={`map-${event.id}-${cycleId}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.4, duration: 0.5, ease: "backOut" }}
                    className="absolute z-30"
                    style={{
                      left: `${event.location.x}%`,
                      top: `${event.location.y}%`,
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    <div className={`w-10 h-10 ${event.color} rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-600 relative`}>
                      <Icon className="w-5 h-5 text-white" />
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-black/20 rounded-full blur-sm"></div>
                    </div>
                    <motion.div
                      className={`absolute inset-0 ${event.color} rounded-full opacity-20`}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.4 + 1 }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Map overlay info */}
            <div className="absolute top-4 left-4 bg-white dark:bg-card rounded-lg px-3 py-2 shadow-md border border-slate-200 dark:border-border">
              <p className="text-xs font-semibold text-slate-800 dark:text-foreground">Paris, France</p>
              <p className="text-xs text-slate-600 dark:text-muted-foreground">{fakeEvents.length} events</p>
            </div>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 bg-white dark:bg-card rounded-lg shadow-md border border-slate-200 dark:border-border">
              <div className="p-2 border-b border-slate-200 dark:border-border">
                <div className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-muted-foreground text-lg font-bold">+</div>
              </div>
              <div className="p-2">
                <div className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-muted-foreground text-lg font-bold">−</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`w-full h-full bg-white dark:bg-card shadow-xl overflow-hidden border border-slate-200 dark:border-border ${
      isMobile 
        ? 'max-w-xs mx-auto rounded-3xl bg-black dark:bg-black p-2' 
        : 'rounded-2xl'
    }`}>
      {isMobile && (
        <div className="w-full h-full bg-white dark:bg-card rounded-2xl shadow-inner overflow-hidden">
          {/* Status bar */}
          <div className="bg-white dark:bg-card px-4 py-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-black dark:text-foreground">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-black dark:border-border rounded-sm">
                <div className="w-full h-full bg-green-500 rounded-sm"></div>
              </div>
            </div>
          </div>

          {/* Browser bar */}
          <div className="bg-slate-100 dark:bg-muted px-3 py-2 border-b border-slate-200 dark:border-border rounded-sm">
            <div className="bg-slate-300 dark:bg-muted/80 rounded-full px-3 py-1 text-center">
              <div className="text-xs text-slate-600 dark:text-muted-foreground font-mono">{frameUrl}</div>
            </div>
          </div>

          <div className={`${containerHeight} relative overflow-hidden`}>
            {stageContent}
          </div>
        </div>
      )}

      {!isMobile && (
        <>
          {/* Desktop browser bar */}
          <div className="bg-slate-100 dark:bg-muted px-4 py-3 border-b border-slate-200 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div className="ml-4 text-xs text-slate-500 dark:text-muted-foreground font-mono">{frameUrl}</div>
            </div>
          </div>

          <div className={`${containerHeight} relative overflow-hidden`}>
            {stageContent}
          </div>
        </>
      )}
    </div>
  );
};
