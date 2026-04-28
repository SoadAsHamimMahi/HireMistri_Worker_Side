import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import JobOfferCard from '../components/JobOfferCard';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function JobOffers() {
  const { user } = useContext(AuthContext) || {};
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setOffers([]);
      return;
    }
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axios.get(`${API_BASE}/api/job-offers`, {
          params: { workerId: user.uid },
          headers: { Accept: 'application/json' },
        });
        if (!ignore) setOffers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.error || 'Failed to load job offers');
          setOffers([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [user?.uid, refreshKey]);

  const handleAccept = () => {
    setRefreshKey((k) => k + 1);
  };
  const handleReject = () => {
    setRefreshKey((k) => k + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen page-bg">
        <PageContainer>
          <p className="text-base-content/80">Please sign in to view your job offers.</p>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <PageContainer>
        <PageHeader
          title="Job Offers"
          subtitle="Private job offers sent directly to you. Accept, propose a different budget, or reject."
        />
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="ml-4 text-base-content/70">Loading job offers...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body items-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center mb-4">
                <i className="fas fa-inbox text-3xl text-base-content/50"></i>
              </div>
              <h3 className="text-lg font-semibold text-base-content">No job offers yet</h3>
              <p className="text-base-content/70 ">
                Complete your profile and services to get more offers. Clients can send you direct job offers from your profile.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {offers.map((job) => (
              <JobOfferCard
                key={job._id}
                job={job}
                workerId={user.uid}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
