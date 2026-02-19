import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const BrowseClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_BASE}/api/browse-clients?limit=50&sortBy=${sortBy}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch clients: ${response.status}`);
        }

        const data = await response.json();
        
        if (!ignore) {
          setClients(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch clients:', e);
        if (!ignore) {
          setError(e?.message || 'Failed to load clients');
          setClients([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [sortBy]);

  // Filter clients by search term
  const filteredClients = clients.filter(client => {
    const name = (client.displayName || '').toLowerCase();
    const location = `${client.city || ''} ${client.country || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || location.includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6 text-base-content">Browse Clients</h1>
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-4 text-base-content opacity-70">Loading clients...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6 text-base-content">Browse Clients</h1>
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <h3 className="font-bold">Error Loading Clients</h3>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-base-content">Browse Clients</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        </div>

        {/* Search and Sort */}
        <div className="card bg-base-200 shadow-sm border border-base-300 mb-6">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or location..."
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48">
                <select
                  className="select select-bordered w-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="jobs">Most Jobs Posted</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-users text-6xl text-base-content opacity-30 mb-4"></i>
            <p className="text-base-content opacity-70">
              {searchTerm ? 'No clients found matching your search.' : 'No clients found at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Link
                to={`/client/${client.uid}`}
                key={client.uid}
                className="card bg-base-200 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:ring-2 hover:ring-primary no-underline text-inherit"
              >
                {/* Profile Image */}
                <div className="h-48 w-full overflow-hidden bg-base-300 flex items-center justify-center">
                  {client.profileCover ? (
                    <img
                      src={client.profileCover}
                      alt={client.displayName}
                      className="h-48 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!client.profileCover && (
                    <i className="fas fa-user text-6xl text-base-content opacity-30"></i>
                  )}
                </div>

                <div className="card-body">
                  <h2 className="card-title text-lg md:text-xl">
                    {client.displayName}
                    {client.emailVerified && (
                      <div className="badge badge-success badge-sm">
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </h2>

                  <p className="text-sm text-base-content opacity-70">
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    {[client.city, client.country].filter(Boolean).join(', ') || 'Location not set'}
                  </p>

                  <div className="mt-2 space-y-1">
                    <p className="text-sm">
                      <span className="font-semibold">{client.stats?.totalJobsPosted || 0}</span> jobs posted
                    </p>
                    {client.stats?.clientJobsCompleted > 0 && (
                      <p className="text-sm">
                        <span className="font-semibold">{client.stats.clientJobsCompleted}</span> completed
                      </p>
                    )}
                  </div>

                  <div className="card-actions justify-end mt-3">
                    <div className="badge badge-outline">
                      <i className="fas fa-user-tie mr-1"></i>Client
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseClients;
