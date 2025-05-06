import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy = () => {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="bg-card border border-border rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="mb-4">
            At GlobePlot, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, process, and
            safeguard information when you use our travel itinerary organization application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Processing</h2>
          <p className="mb-4">
            When you upload travel documents to GlobePlot, our system processes these documents to extract relevant travel information such as flight details,
            hotel bookings, and activity reservations.
          </p>

          <h3 className="text-xl font-medium mt-6 mb-3">Information Sanitization</h3>
          <p className="mb-4">Before processing your documents, we automatically remove sensitive information, including:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Email addresses</li>
            <li>URLs and web links</li>
            <li>Credit card numbers (full and partial, including last 4 digits)</li>
            <li>Phone numbers</li>
            <li>Social security numbers</li>
            <li>Passport and ID numbers</li>
            <li>Account numbers and loyalty program IDs</li>
          </ul>
          <p className="mb-4">
            While we make our best efforts to remove sensitive information, our automated systems may not catch every instance. We recommend reviewing any
            extracted data before saving it to your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">AI Processing</h2>
          <p className="mb-4">
            GlobePlot uses Mistral AI's services to process and extract information from your travel documents. According to{" "}
            <a
              href="https://help.mistral.ai/en/articles/156194-does-mistral-ai-exploit-users-data-to-train-its-models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Mistral AI's official policy
            </a>
            , they do not use data from their API (neither inputs nor outputs) to train their models.
          </p>
          <p className="mb-4">
            As stated in their{" "}
            <a
              href="https://mistral.ai/terms#additional-terms-for-la-plateforme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Terms of Use
            </a>
            : "We do not use Your Data to improve, enhance, or train our models or the Services or for any other purpose than to provide the Services and to
            monitor abuse."
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Storage</h2>
          <p className="mb-4">Your trip data is currently stored in your browser's local storage. This means:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Data remains on your device and is not sent to our servers for storage</li>
            <li>Clearing your browser cache or cookies will delete this data</li>
            <li>Your data is not accessible across different devices</li>
          </ul>
          <p className="mb-4">In future versions, we plan to offer optional account-based storage with additional privacy controls and cross-device access.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Updates to this Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">If you have questions about this Privacy Policy or our privacy practices, please contact us at: privacy@globeplot.com</p>
        </section>

        <div className="mt-8 pt-6 border-t border-border">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy; 