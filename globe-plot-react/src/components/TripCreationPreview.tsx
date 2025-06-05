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

      // Clear any existing events at the start
      setVisibleEvents([]);

      // Stage 1: Upload (3s)
      setCurrentStage('upload');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stage 2: Processing (2s)
      setCurrentStage('processing');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stage 3: Events appearing one by one (3s total)
      setCurrentStage('events');
      setVisibleEvents([]);
      
      for (let i = 0; i < fakeEvents.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setVisibleEvents(fakeEvents.slice(0, i + 1));
      }

      // Stage 4: Map view (4s)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStage('map');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Reset and loop
      setVisibleEvents([]);
      setIsLooping(false);
    };

    const interval = setInterval(runDemo, 14000); // 14 second cycle
    runDemo(); // Start immediately

    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

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

  return (
    <div className={`w-full h-full bg-white shadow-xl overflow-hidden border border-slate-200 ${
      isMobile 
        ? 'max-w-xs mx-auto rounded-3xl bg-black p-2' 
        : 'rounded-2xl'
    }`}>
      {isMobile && (
        /* Mobile device outer frame */
        <div className="w-full h-full bg-white rounded-2xl shadow-inner overflow-hidden">
          {/* Status bar */}
          <div className="bg-white px-4 py-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-black">{ new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-black rounded-sm">
                <div className="w-full h-full bg-green-500 rounded-sm"></div>
              </div>
            </div>
          </div>
          
          {/* Browser bar */}
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 rounded-sm">
            <div className="bg-slate-300 rounded-full px-3 py-1 text-center">
              <div className="text-xs text-slate-600 font-mono">{frameUrl}</div>
            </div>
          </div>

          <div className={`${containerHeight} relative overflow-hidden`}>
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
                    className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4"
                  >
                    <FileText className="w-6 h-6 text-red-600" />
                  </motion.div>

                  <p className="text-sm font-medium text-slate-700">Booking confirmation uploaded</p>
                  <p className="text-xs text-slate-500 mt-1">paris-hotel-booking.pdf</p>

                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center my-4"
                  >
                    <Upload className="w-8 h-8 text-blue-600" />
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                  >
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </motion.div>

                  <p className="text-sm font-medium text-slate-700 mb-2">AI extracting events...</p>

                  <motion.div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
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
                <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Events Found</h3>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                      <AnimatePresence>
                        {visibleEvents.map((event, index) => {
                          const Icon = getEventIcon(event.category);
                          return (
                            <motion.div
                              key={`events-${event.id}-${cycleId}`}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className={`w-8 h-8 ${event.color} rounded-full flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{event.title}</p>
                                <p className="text-xs text-slate-500">{event.date}</p>
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
                  {/* Map-like background */}
                  <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                    {/* Street grid pattern */}
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Map areas (parks, water, etc.) */}
                    <div className="absolute top-12 left-8 w-20 h-16 bg-green-200 rounded-lg opacity-60"></div>
                    <div className="absolute bottom-20 right-12 w-24 h-12 bg-blue-200 rounded-full opacity-60"></div>
                    <div className="absolute top-20 right-8 w-16 h-20 bg-green-200 rounded-lg opacity-60"></div>

                    {/* Main roads */}
                    <div className="absolute top-0 left-1/3 w-1 h-full bg-gray-300"></div>
                    <div className="absolute top-0 right-1/3 w-1 h-full bg-gray-300"></div>
                    <div className="absolute top-1/3 left-0 w-full h-1 bg-gray-300"></div>
                    <div className="absolute bottom-1/3 left-0 w-full h-1 bg-gray-300"></div>

                    {/* Animated event pins */}
                    <AnimatePresence>
                      {fakeEvents.map((event, index) => {
                        const Icon = getEventIcon(event.category);
                        return (
                          <motion.div
                            key={`map-${event.id}-${cycleId}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1
                            }}
                            transition={{
                              delay: index * 0.4,
                              duration: 0.5,
                              ease: "backOut"
                            }}
                            className="absolute z-30"
                            style={{
                              left: `${event.location.x}%`,
                              top: `${event.location.y}%`,
                              transform: "translate(-50%, -50%)"
                            }}
                          >
                            <div className={`w-10 h-10 ${event.color} rounded-full flex items-center justify-center shadow-lg border-3 border-white relative`}>
                              <Icon className="w-5 h-5 text-white" />

                              {/* Pin shadow */}
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-black/20 rounded-full blur-sm"></div>
                            </div>

                            {/* Subtle pulse effect */}
                            <motion.div
                              className={`absolute inset-0 ${event.color} rounded-full opacity-20`}
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.2, 0, 0.2]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: index * 0.4 + 1
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Map overlay info */}
                    <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow-md border border-slate-200">
                      <p className="text-xs font-semibold text-slate-800">Paris, France</p>
                      <p className="text-xs text-slate-600">{fakeEvents.length} events</p>
                    </div>

                    {/* Zoom controls (decorative) */}
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md border border-slate-200">
                      <div className="p-2 border-b border-slate-200">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-600 text-lg font-bold">+</div>
                      </div>
                      <div className="p-2">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-600 text-lg font-bold">−</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {!isMobile && (
        <>
          {/* Mock device frame */}
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {/* Desktop browser style */}
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div className="ml-4 text-xs text-slate-500 font-mono">{frameUrl}</div>
            </div>
          </div>

          <div className={`${containerHeight} relative overflow-hidden`}>
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
                    className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4"
                  >
                    <FileText className="w-6 h-6 text-red-600" />
                  </motion.div>

                  <p className="text-sm font-medium text-slate-700">Booking confirmation uploaded</p>
                  <p className="text-xs text-slate-500 mt-1">paris-hotel-booking.pdf</p>

                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center my-4"
                  >
                    <Upload className="w-8 h-8 text-blue-600" />
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                  >
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </motion.div>

                  <p className="text-sm font-medium text-slate-700 mb-2">AI extracting events...</p>

                  <motion.div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
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
                <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Events Found</h3>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                      <AnimatePresence>
                        {visibleEvents.map((event, index) => {
                          const Icon = getEventIcon(event.category);
                          return (
                            <motion.div
                              key={`events-${event.id}-${cycleId}`}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className={`w-8 h-8 ${event.color} rounded-full flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{event.title}</p>
                                <p className="text-xs text-slate-500">{event.date}</p>
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
                  {/* Map-like background */}
                  <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                    {/* Street grid pattern */}
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Map areas (parks, water, etc.) */}
                    <div className="absolute top-12 left-8 w-20 h-16 bg-green-200 rounded-lg opacity-60"></div>
                    <div className="absolute bottom-20 right-12 w-24 h-12 bg-blue-200 rounded-full opacity-60"></div>
                    <div className="absolute top-20 right-8 w-16 h-20 bg-green-200 rounded-lg opacity-60"></div>

                    {/* Main roads */}
                    <div className="absolute top-0 left-1/3 w-1 h-full bg-gray-300"></div>
                    <div className="absolute top-0 right-1/3 w-1 h-full bg-gray-300"></div>
                    <div className="absolute top-1/3 left-0 w-full h-1 bg-gray-300"></div>
                    <div className="absolute bottom-1/3 left-0 w-full h-1 bg-gray-300"></div>

                    {/* Animated event pins */}
                    <AnimatePresence>
                      {fakeEvents.map((event, index) => {
                        const Icon = getEventIcon(event.category);
                        return (
                          <motion.div
                            key={`map-${event.id}-${cycleId}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1
                            }}
                            transition={{
                              delay: index * 0.4,
                              duration: 0.5,
                              ease: "backOut"
                            }}
                            className="absolute z-30"
                            style={{
                              left: `${event.location.x}%`,
                              top: `${event.location.y}%`,
                              transform: "translate(-50%, -50%)"
                            }}
                          >
                            <div className={`w-10 h-10 ${event.color} rounded-full flex items-center justify-center shadow-lg border-3 border-white relative`}>
                              <Icon className="w-5 h-5 text-white" />

                              {/* Pin shadow */}
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-black/20 rounded-full blur-sm"></div>
                            </div>

                            {/* Subtle pulse effect */}
                            <motion.div
                              className={`absolute inset-0 ${event.color} rounded-full opacity-20`}
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.2, 0, 0.2]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: index * 0.4 + 1
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Map overlay info */}
                    <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow-md border border-slate-200">
                      <p className="text-xs font-semibold text-slate-800">Paris, France</p>
                      <p className="text-xs text-slate-600">{fakeEvents.length} events</p>
                    </div>

                    {/* Zoom controls (decorative) */}
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md border border-slate-200">
                      <div className="p-2 border-b border-slate-200">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-600 text-lg font-bold">+</div>
                      </div>
                      <div className="p-2">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-600 text-lg font-bold">−</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}; 