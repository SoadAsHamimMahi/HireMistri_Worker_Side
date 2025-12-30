import React, { useState } from 'react';
import { useSearchHistory } from '../hooks/useSearchHistory';

export default function SearchHistory({ onSelectSearch }) {
  const { history, clearHistory, removeSearch } = useSearchHistory();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSearchSummary = (filters) => {
    const parts = [];
    if (filters.category && filters.category !== 'All') parts.push(`Category: ${filters.category}`);
    if (filters.location && filters.location !== 'All') parts.push(`Location: ${filters.location}`);
    if (filters.budget && filters.budget !== 'All') parts.push(`Budget: ${filters.budget}`);
    if (filters.search && filters.search.trim()) parts.push(`Search: "${filters.search}"`);
    if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
      parts.push(`Skills: ${filters.skills.length}`);
    }
    if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
      parts.push(`Categories: ${filters.categories.length}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'All filters';
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-base-content hover:text-primary transition-colors"
        >
          <i className="fas fa-history"></i>
          <span className="font-semibold">Recent Searches ({history.length})</span>
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-sm`}></i>
        </button>
        {expanded && (
          <button
            onClick={clearHistory}
            className="text-xs text-error hover:text-error-focus transition-colors"
            title="Clear all"
          >
            Clear All
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
            >
              <button
                onClick={() => onSelectSearch && onSelectSearch(item.filters)}
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium text-base-content">
                  {getSearchSummary(item.filters)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(item.timestamp)}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSearch(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-error hover:text-error-focus transition-opacity"
                title="Remove"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

