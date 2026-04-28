import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import BookmarkButton from '../components/BookmarkButton';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function SavedJobs() {
  const { user } = useContext(AuthContext);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchSavedJobs = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_BASE}/api/saved-jobs/${user.uid}`);
        setSavedJobs(response.data || []);
      } catch (err) {
        console.error('Failed to fetch saved jobs:', err);
        setError('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [user?.uid]);

  const handleUnsave = (savedJobId) => {
    // Remove from local state when unsaved
    setSavedJobs(prev => prev.filter(job => job.savedJobId !== savedJobId));
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content opacity-70">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg selection:bg-primary/20">
      <div className="w-full max-w-[83.333%] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Header */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl lg:text-5xl font-heading font-black text-base-content mb-4 tracking-tight">
            Saved Jobs
          </h1>
          <div className="flex items-center gap-3">
             <span className="w-1.5 h-6 bg-primary rounded-full"></span>
             <p className="text-base-content/40 font-black uppercase tracking-widest text-xs">
               {savedJobs.length} {savedJobs.length === 1 ? 'Opportunity' : 'Opportunities'} Bookmarked
             </p>
          </div>
        </div>

        {/* Jobs Grid */}
        {savedJobs.length === 0 ? (
          <div className="text-center py-24 bg-base-200/50 rounded-[3rem] border-2 border-dashed border-base-300 animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-base-300 rounded-3xl flex items-center justify-center mx-auto mb-6 text-base-content/20 shadow-inner">
               <i className="far fa-bookmark text-4xl"></i>
            </div>
            <h3 className="text-2xl font-heading font-black mb-3 text-base-content tracking-tight">No saved jobs yet</h3>
            <p className="text-base-content/40 font-medium mb-10 max-w-sm mx-auto uppercase tracking-widest text-[10px] leading-relaxed">
              Start building your future. Save high-potential jobs to track them here later.
            </p>
            <Link
              to="/jobs"
              className="btn btn-primary btn-lg rounded-2xl shadow-xl shadow-primary/10 font-black uppercase tracking-widest text-xs px-10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              Browse Open Jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedJobs.map((job, index) => {
              const jobId = (typeof job._id === 'string' && job._id) ||
                           (job._id && job._id.$oid) ||
                           job.id;

              return (
                <div
                  key={jobId}
                  className="bg-base-100 border border-base-300 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-500 group relative animate-in fade-in slide-in-from-bottom-4 duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-4 right-4 z-20 scale-110">
                    <BookmarkButton jobId={jobId} />
                  </div>
                  
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={job.images?.[0] || 'https://via.placeholder.com/600x400'}
                      alt={job.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-4 left-6">
                       <span className="bg-primary text-black font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg">
                          ৳{job.budget?.toLocaleString()}
                       </span>
                    </div>
                  </div>

                  <div className="p-8 flex flex-col gap-6">
                    <div>
                        <h3 className="text-xl font-heading font-black text-base-content leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                           <p className="text-[10px] font-black text-base-content/40 uppercase tracking-widest flex items-center gap-1.5">
                              <i className="fas fa-map-marker-alt text-primary/50 text-xs"></i> {job.location}
                           </p>
                           <p className="text-[10px] font-black text-base-content/40 uppercase tracking-widest flex items-center gap-1.5">
                              <i className="fas fa-layer-group text-primary/50 text-xs"></i> {job.category}
                           </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-base-200">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-base-content/30 uppercase tracking-[0.2em] mb-1">Posted On</span>
                              <span className="text-xs font-black text-base-content/70">
                                 {job.date || (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A')}
                              </span>
                           </div>
                           {job.savedAt && (
                              <div className="flex flex-col text-right">
                                 <span className="text-[9px] font-black text-base-content/30 uppercase tracking-[0.2em] mb-1">Saved At</span>
                                 <span className="text-xs font-black text-primary/70">
                                    {new Date(job.savedAt).toLocaleDateString()}
                                 </span>
                              </div>
                           )}
                        </div>

                        <Link
                          to={`/jobs/${jobId}`}
                          className="btn btn-primary w-full rounded-2xl shadow-lg shadow-primary/5 font-black uppercase tracking-widest text-[10px] py-4 h-auto group-hover:bg-primary group-hover:border-primary transition-all active:scale-95"
                        >
                          View Opportunity <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                        </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

