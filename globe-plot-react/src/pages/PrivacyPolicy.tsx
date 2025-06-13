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
          <p className="mb-4">When signed in, your trip data is securely stored using Firebase, Google's cloud-based platform. Here's how your data is handled:</p>
          
          <h3 className="text-xl font-medium mt-6 mb-3">Authentication & Account Data</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>We use Google Firebase Authentication for secure sign-in</li>
            <li>Your Google account information (email, name, profile picture) is used for authentication only</li>
            <li>Authentication is handled entirely by Google's secure infrastructure</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">Trip Data Storage</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Your trip data (events, itineraries) is stored in Firebase Firestore, a secure NoSQL database</li>
            <li>All data is encrypted in transit and at rest using industry-standard encryption</li>
            <li>Data is accessible across all your devices when signed in to your account</li>
            <li>You have full control over your data and can delete trips or your entire account at any time</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">Document Storage</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Uploaded documents (PDFs, emails, images) are stored in Firebase Storage</li>
            <li>Documents are associated with your account and accessible only to you and your collaborators</li>
            <li>You can delete uploaded documents at any time</li>
            <li>Documents are automatically deleted when you delete the associated trip or your account</li>
          </ul>

          <p className="mb-4">
            <strong>Data Location:</strong> Your data is stored in Google's secure data centers. Firebase complies with major privacy regulations including GDPR and CCPA.
            For more information about Firebase's security and privacy practices, visit{" "}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Firebase Privacy and Security
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Data Rights</h2>
          <p className="mb-4">You have full control over your data:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Access:</strong> You can view all your trip data through the application interface</li>
            <li><strong>Modify:</strong> You can edit or update your trip information at any time</li>
            <li><strong>Delete:</strong> You can delete individual trips, documents, or your entire account</li>
            <li><strong>Export:</strong> You can export your itineraries as PDFs</li>
            <li><strong>Data Portability:</strong> Contact us if you need your data in a machine-readable format</li>
          </ul>
          <p className="mb-4">
            To exercise any of these rights or if you have questions about your data, you can manage everything through your account dashboard 
            or contact us directly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Updates to this Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
          </p>
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