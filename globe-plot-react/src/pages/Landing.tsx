import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary/5"></div>
          <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-chart-3/10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-6">
            From Inbox Chaos to <span className="text-primary">Effortless</span> Travel Plans
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-10">
            Globeplot helps you organize multi-stop travel itineraries in one place. Upload confirmations, track events, and share your perfect journey.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/dashboard"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-full text-md font-medium hover:bg-primary/90 transition-colors shadow-sm text-center"
            >
              Get Started
            </Link>
            <Link
              to="/demo"
              className="bg-white border border-border text-foreground px-8 py-3 rounded-full text-md font-medium hover:bg-secondary/20 transition-colors text-center"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-14">How Globeplot Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-xl">
                <span className="text-primary">✈️</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Your Trips</h3>
              <p className="text-muted-foreground text-sm">Start by creating a trip and adding multiple stops to build your perfect itinerary.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-chart-2/10 rounded-full flex items-center justify-center mb-4 text-xl">
                <span className="text-chart-2">🏨</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Add Events</h3>
              <p className="text-muted-foreground text-sm">Add flights, hotels, activities, and more to each stop of your journey.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-chart-4/10 rounded-full flex items-center justify-center mb-4 text-xl">
                <span className="text-chart-4">📤</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Share & Export</h3>
              <p className="text-muted-foreground text-sm">Generate shareable links or export your trip as a printable PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Plan Your Next Adventure?</h2>
          <p className="text-muted-foreground mb-8">Join thousands of travelers who use Globeplot to organize their multi-stop journeys.</p>
          <Link
            to="/dashboard"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full text-md font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            Start Planning Now
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">No credit card required</p>
        </div>
      </section>
    </div>
  );
} 