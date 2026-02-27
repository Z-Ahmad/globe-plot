import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { 
  Plane, 
  Compass, 
  Luggage, 
  FileText, 
  Map, 
  MapPin,
  Calendar,
  Zap,
  CheckIcon,
  Edit,
  Play,
  CircleCheck,
  CircleX,
  Sparkles,
  Earth,
  Sailboat
} from "lucide-react";
import { TripCreationPreview } from "@/components/TripCreationPreview";
import globeplotMap from "@/assets/globeplot_map.mp4";
import globeplotItinerary from "@/assets/globeplot_itinerary.mp4";
import globeplotGeocode from "@/assets/globeplot_geocode.mp4";

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  // State for video selection in "See Your Trip Take Shape" section
  const [selectedVideo, setSelectedVideo] = useState<'map' | 'timeline' | 'geocode' | null>('map');

  // Function to select video and scroll to it
  const selectVideoAndScroll = (video: 'map' | 'timeline' | 'geocode') => {
    // Toggle the video - if clicking the same one, close it
    setSelectedVideo(selectedVideo === video ? null : video);
  };

  // Function to scroll to map section
  const scrollToMapSection = () => {
    mapSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const videoOptions = {
    map: {
      src: globeplotMap,
      title: "See Everything at Once",
      description: "Your entire journey on one beautiful map. No more wondering \"wait, where am I going next?\""
    },
    timeline: {
      src: globeplotItinerary,
      title: "Know What's When", 
      description: "Day-by-day timeline that actually makes sense. Flights, hotels, dinner reservations — all in order."
    },
    geocode: {
      src: globeplotGeocode,
      title: "Smart Address Detection",
      description: "Fuzzy hotel name? Partial address? We'll find it and put it on the map automatically."
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const bounceVariants = {
    animate: {
      y: [0, -5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Travel-themed icon watermarks */}
        <motion.div
          style={{ y, opacity: useTransform(scrollYProgress, [0, 0.5, 1], [0.1, 0.15, 0.1]) }}
          className="absolute top-10 right-4 md:top-20 md:right-20"
        >
          <Plane className="w-20 h-20 md:w-32 md:h-32 text-blue-200/60 transform rotate-12" />
        </motion.div>
        
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [30, -30]), opacity: 0.15 }}
          className="absolute bottom-32 left-4 md:bottom-20 md:left-20"
        >
          <MapPin className="w-24 h-24 md:w-40 md:h-40 text-green-200/60 transform -rotate-12" />
        </motion.div>
        
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [-20, 20]), opacity: 0.12 }}
          className="absolute top-1/4 left-2 md:top-1/3 md:left-10"
        >
          <Calendar className="w-16 h-16 md:w-28 md:h-28 text-purple-200/60 transform rotate-45" />
        </motion.div>
        
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [40, -40]), opacity: 0.18 }}
          className="absolute top-1/2 right-2 md:top-1/2 md:right-10"
        >
          <Luggage className="w-20 h-20 md:w-36 md:h-36 text-indigo-200/60 transform -rotate-6" />
        </motion.div>
        
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [-15, 15]), opacity: 0.15 }}
          className="absolute bottom-1/4 right-1/3 md:bottom-1/3 md:right-1/4"
        >
          <Sailboat className="w-14 h-14 md:w-24 md:h-24 text-blue-300/60 transform -rotate-12" />
        </motion.div>
        
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [25, -25]), opacity: 0.14 }}
          className="absolute top-3/4 left-1/4 md:top-2/3 md:left-1/3"
        >
          <Map className="w-18 h-18 md:w-32 md:h-32 text-emerald-200/60 transform -rotate-12" />
        </motion.div>
      </div>

      {/* Hero Section - Combined with Drag Drop */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Content */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center lg:text-left">
              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-800 dark:text-foreground mb-8">
                Drag, Drop, <span className="text-blue-600 dark:text-primary">Done.</span>
              </motion.h1>

              <motion.div variants={itemVariants} className="mb-12">
                <p className="text-xl md:text-2xl text-slate-600 dark:text-muted-foreground leading-relaxed mb-4">
                  Turn scattered travel bookings into an organized itinerary in seconds. No more hunting through emails or juggling apps.
                </p>
                <p className="text-lg md:text-xl text-blue-600 dark:text-primary font-medium">✨ Upload once. Travel with confidence.</p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center">
                <Link
                  to="/dashboard"
                  className="group relative px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-semibold rounded-full overflow-hidden shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                >
                  <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                    Create Your Trip →
                  </motion.span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <button
                  onClick={scrollToMapSection}
                  className="px-12 py-4 border-2 border-slate-300 dark:border-border text-slate-700 dark:text-muted-foreground text-xl font-semibold rounded-full hover:border-blue-400 dark:hover:border-primary hover:text-blue-600 dark:hover:text-primary transition-all duration-300"
                >
                  See How It Works ↓
                </button>
              </motion.div>
            </motion.div>

            {/* Right Content - Trip Creation Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              {/* Desktop Version - Hidden on small screens */}
              <div className="hidden lg:block">
                <TripCreationPreview deviceType="desktop" />
              </div>

              {/* Mobile Version - Visible on small screens */}
              <div className="lg:hidden">
                <TripCreationPreview deviceType="mobile" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Section */}
      <section className="py-40 px-6 bg-slate-900 dark:bg-slate-800/60 text-white relative">
        {/* Background watermarks for dark section */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.12 }}
            viewport={{ once: true }}
            className="absolute top-20 right-8 md:top-32 md:right-20"
          >
            <FileText className="w-16 h-16 md:w-24 md:h-24 text-slate-400/60 transform rotate-12" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.15 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-20 left-4 md:bottom-32 md:left-16"
          >
            <CheckIcon className="w-20 h-20 md:w-32 md:h-32 text-green-400/60 transform -rotate-6" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.10 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="absolute top-1/3 left-8 md:top-1/2 md:left-12"
          >
            <Edit className="w-12 h-12 md:w-20 md:h-20 text-slate-400/60 transform rotate-12" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.13 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="absolute top-2/3 right-4 md:top-1/2 md:right-8"
          >
            <Sparkles className="w-14 h-14 md:w-28 md:h-28 text-purple-400/60 transform -rotate-12" />
          </motion.div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">No More Jumping Between Tabs</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">There's a better way, we built it.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Old Way */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-red-950/50 border border-red-800/50 rounded-3xl p-8 shadow-lg shadow-red-500/10"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 1.25 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-2xl">😤</span>
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">The Old Way</h3>
                <p className="text-slate-400">How most people still plan trips</p>
              </div>

              <ul className="space-y-4">
                {[
                  "Screenshot everything, lose half of it",
                  "Copy-paste into 3 different spreadsheets",
                  "Email yourself reminders that get buried",
                  "Panic-search your inbox before departure",
                  "Print 20 pages 'just in case'",
                  "Share a mess of documents with travel partners"
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex items-start gap-3"
                  >
                    <CircleX className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* New Way */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-green-950/50 border border-green-800/50 rounded-3xl p-8 shadow-lg shadow-green-500/10"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: 270 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-8 h-8 text-green-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">The Globeplot Way</h3>
                <p className="text-slate-400">Drop files. Get organized. Travel.</p>
              </div>

              <ul className="space-y-4">
                {[
                  "Drag & drop all your booking files",
                  "Everything is automatically extracted",
                  "Edit details if needed",
                  "See your trip on a beautiful map",
                  "One stop shop for all your travel details",
                  "Export a perfect itinerary anytime"
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex items-start gap-3"
                  >
                    <CircleCheck className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center mt-16"
          >
            <p className="text-2xl font-semibold text-white mb-6">Which sounds better to you?</p>
            <Link
              to="/dashboard"
              className="inline-block px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-semibold rounded-full shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105"
            >
              Try the Better Way →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Map & Timeline Section */}
      <section ref={mapSectionRef} className="py-40 px-6 bg-slate-50 dark:bg-background text-slate-800 dark:text-foreground">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <motion.div variants={floatingVariants} animate="animate" className="inline-block mb-6">
              <Compass className="w-16 h-16 text-blue-600" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800 dark:text-foreground">From Chaos to Clarity</h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-muted-foreground mb-4 max-w-3xl mx-auto">
              No more bouncing between tabs and spreadsheets. Watch your scattered bookings transform into a beautiful, <span className="text-blue-600 dark:text-primary">organized</span> trip you can actually navigate.
            </p>
          </motion.div>

          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Interactive instruction */}
            <div className="text-center mb-8">
              <p className="text-blue-600 dark:text-primary text-sm font-medium mb-2">👇 Tap to see demos</p>
              <div className="w-12 h-0.5 bg-blue-600/50 dark:bg-primary/50 mx-auto"></div>
            </div>

            {/* Map Feature Card */}
            <div
              className={`cursor-pointer transition-all duration-500 rounded-2xl border-2 overflow-hidden ${
                selectedVideo === "map"
                  ? "bg-blue-50 dark:bg-primary/10 border-blue-400 dark:border-primary text-slate-800 dark:text-foreground shadow-lg shadow-blue-500/20"
                  : "bg-white dark:bg-card border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted/50 hover:border-slate-400 dark:hover:border-muted-foreground"
              }`}
            >
              <motion.div
                onClick={() => selectVideoAndScroll("map")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
                      <Earth className="w-8 h-8 text-blue-600 dark:text-primary" />
                    </motion.div>
                    <h3 className="text-2xl font-bold">See Everything at Once</h3>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {selectedVideo === "map" ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Play className="w-5 h-5 text-blue-600 dark:text-primary fill-current" />
                      </motion.div>
                    ) : (
                      <motion.div className="text-slate-400 dark:text-muted-foreground">
                        <Play className="w-5 h-5" />
                      </motion.div>
                    )}
                  </div>
                </div>
                <p className={`text-lg leading-relaxed ${selectedVideo === "map" ? "text-slate-700 dark:text-foreground" : "text-slate-500 dark:text-muted-foreground"}`}>
                  Your entire journey on one beautiful map. No more wondering "wait, where am I going next?"
                </p>
              </motion.div>
              
              <motion.div
                initial={false}
                animate={{ height: selectedVideo === "map" ? "auto" : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0">
                  <div className="bg-slate-800 rounded-xl overflow-hidden">
                    <video
                      src={videoOptions.map.src}
                      className="w-full h-80 object-cover bg-slate-800"
                      autoPlay
                      loop
                      muted
                      playsInline
                      aria-label="Demo of map feature"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Timeline Feature Card */}
            <div
              className={`cursor-pointer transition-all duration-500 rounded-2xl border-2 overflow-hidden ${
                selectedVideo === "timeline"
                  ? "bg-blue-50 dark:bg-primary/10 border-blue-400 dark:border-primary text-slate-800 dark:text-foreground shadow-lg shadow-blue-500/20"
                  : "bg-white dark:bg-card border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted/50 hover:border-slate-400 dark:hover:border-muted-foreground"
              }`}
            >
              <motion.div
                onClick={() => selectVideoAndScroll("timeline")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div whileHover={{ scale: 1.1, rotate: -5 }}>
                      <Calendar className="w-8 h-8 text-blue-600 dark:text-primary" />
                    </motion.div>
                    <h3 className="text-2xl font-bold">Know What's When</h3>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {selectedVideo === "timeline" ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Play className="w-5 h-5 text-blue-600 dark:text-primary fill-current" />
                      </motion.div>
                    ) : (
                      <motion.div className="text-slate-400 dark:text-muted-foreground">
                        <Play className="w-5 h-5" />
                      </motion.div>
                    )}
                  </div>
                </div>
                <p className={`text-lg leading-relaxed ${selectedVideo === "timeline" ? "text-slate-700 dark:text-foreground" : "text-slate-500 dark:text-muted-foreground"}`}>
                  Day-by-day timeline that actually makes sense. Flights, hotels, dinner reservations — all in order.
                </p>
              </motion.div>
              
              <motion.div
                initial={false}
                animate={{ height: selectedVideo === "timeline" ? "auto" : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0">
                  <div className="bg-slate-800 rounded-xl overflow-hidden">
                    <video
                      src={videoOptions.timeline.src}
                      className="w-full h-80 object-cover bg-slate-800"
                      autoPlay
                      loop
                      muted
                      playsInline
                      aria-label="Demo of timeline feature"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Geocode Feature Card */}
            <div
              className={`cursor-pointer transition-all duration-500 rounded-2xl border-2 overflow-hidden ${
                selectedVideo === "geocode"
                  ? "bg-blue-50 dark:bg-primary/10 border-blue-400 dark:border-primary text-slate-800 dark:text-foreground shadow-lg shadow-blue-500/20"
                  : "bg-white dark:bg-card border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted/50 hover:border-slate-400 dark:hover:border-muted-foreground"
              }`}
            >
              <motion.div
                onClick={() => selectVideoAndScroll("geocode")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div whileHover={{ scale: 1.1 }}>
                      <Zap className="w-8 h-8 text-blue-600 dark:text-primary" />
                    </motion.div>
                    <h3 className="text-2xl font-bold">Smart Address Detection</h3>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {selectedVideo === "geocode" ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Play className="w-5 h-5 text-blue-600 dark:text-primary fill-current" />
                      </motion.div>
                    ) : (
                      <motion.div className="text-slate-400 dark:text-muted-foreground">
                        <Play className="w-5 h-5" />
                      </motion.div>
                    )}
                  </div>
                </div>
                <p className={`text-lg leading-relaxed ${selectedVideo === "geocode" ? "text-slate-700 dark:text-foreground" : "text-slate-500 dark:text-muted-foreground"}`}>
                  Fuzzy hotel name? Partial address? We'll find it and put it on the map automatically.
                </p>
              </motion.div>
              
              <motion.div
                initial={false}
                animate={{ height: selectedVideo === "geocode" ? "auto" : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0">
                  <div className="bg-slate-800 rounded-xl overflow-hidden">
                    <video
                      src={videoOptions.geocode.src}
                      className="w-full h-80 object-cover bg-slate-800"
                      autoPlay
                      loop
                      muted
                      playsInline
                      aria-label="Demo of geocoding feature"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-40 px-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="text-5xl md:text-7xl font-bold mb-8">Ready to plot a course?</h2>
            <p className="text-2xl font-light mb-4 opacity-90">Your next adventure starts with better organization.</p>
            <p className="text-xl opacity-80 mb-16">Try it for free! No credit card required.</p>

            <div className="flex justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/dashboard"
                  className="inline-block px-16 py-6 bg-white text-blue-600 text-2xl font-bold rounded-full shadow-2xl hover:shadow-white/25 transition-all duration-300"
                >
                  Start Your First Trip →
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 