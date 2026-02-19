import { Link } from 'react-router-dom';

export default function JobDetailsCard({ 
  job, 
  compact = false,
  onClick 
}) {
  if (!job) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      'on-hold': 'badge-warning',
      cancelled: 'badge-error',
      completed: 'badge-info'
    };
    return badges[status] || 'badge-ghost';
  };

  if (compact) {
    return (
      <div 
        className={`bg-base-200 p-3 rounded-lg border border-base-300 ${onClick ? 'cursor-pointer hover:bg-base-300' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-base-content truncate">
                {job.title}
              </span>
              <span className={`badge badge-xs ${getStatusBadge(job.status)}`}>
                {job.status || 'active'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-base-content/70">
              {job.category && (
                <span className="badge badge-outline badge-xs">{job.category}</span>
              )}
              {job.budget && (
                <span>{job.budget} {job.currency || 'BDT'}</span>
              )}
              {job.location && (
                <span className="truncate">{job.location}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-base-content">{job.title}</h3>
            <span className={`badge ${getStatusBadge(job.status)}`}>
              {job.status || 'active'}
            </span>
            {job.isPrivate && (
              <span className="badge badge-info badge-sm">
                <i className="fas fa-lock mr-1"></i>
                Private
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70 mb-2">
            {job.category && (
              <span className="badge badge-outline">
                <i className="fas fa-folder mr-1"></i>
                {job.category}
              </span>
            )}
            {job.budget && (
              <span>
                <i className="fas fa-money-bill-wave mr-1"></i>
                {job.budget} {job.currency || 'BDT'}
              </span>
            )}
            {job.location && (
              <span>
                <i className="fas fa-map-marker-alt mr-1"></i>
                {job.location}
              </span>
            )}
            {job.createdAt && (
              <span>
                <i className="fas fa-calendar mr-1"></i>
                {formatDate(job.createdAt)}
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-base-content/80 line-clamp-3">
              {job.description}
            </p>
          )}
        </div>
      </div>

      {job._id && (
        <div className="flex justify-end pt-2 border-t border-base-300">
          <Link
            to={`/job/${job._id}`}
            className="btn btn-sm btn-primary"
            onClick={(e) => {
              if (onClick) {
                e.preventDefault();
                onClick();
              }
            }}
          >
            View Full Details
          </Link>
        </div>
      )}
    </div>
  );
}
