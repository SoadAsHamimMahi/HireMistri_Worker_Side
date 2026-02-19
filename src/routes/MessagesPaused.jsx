import { Link } from 'react-router-dom';

export default function MessagesPaused() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card bg-base-200 shadow-lg border border-base-300 max-w-md w-full">
        <div className="card-body text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <i className="fas fa-phone-alt text-2xl text-primary"></i>
          </div>
          <h2 className="card-title justify-center text-xl">Messaging is Paused</h2>
          <p className="text-base-content/70">
            Please use the client&apos;s phone number to call directly. Contact information is shown on their profile and in your Applications.
          </p>
          <div className="card-actions justify-center mt-4 gap-2">
            <Link to="/applications" className="btn btn-primary">
              <i className="fas fa-briefcase mr-2"></i>
              View Applications
            </Link>
            <Link to="/" className="btn btn-outline">
              <i className="fas fa-home mr-2"></i>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
