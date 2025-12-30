import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hiremistri_search_history';
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      setHistory([]);
    }
  }, []);

  // Save search to history
  const saveSearch = (filters) => {
    try {
      // Only save if at least one filter is active
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === 'status' && value === 'active') return false; // Default status
        if (key === 'category' && value === 'All') return false;
        if (key === 'location' && value === 'All') return false;
        if (key === 'budget' && value === 'All') return false;
        if (key === 'applicants' && value === 'All') return false;
        if (key === 'sortBy' && value === 'newest') return false; // Default sort
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'string' && !value.trim()) return false;
        return true;
      });

      if (!hasActiveFilters) return;

      const newSearch = {
        id: Date.now(),
        filters: { ...filters },
        timestamp: new Date().toISOString(),
      };

      setHistory(prev => {
        // Remove duplicates (same filters)
        const filtered = prev.filter(item => 
          JSON.stringify(item.filters) !== JSON.stringify(newSearch.filters)
        );
        
        // Add new search at the beginning
        const updated = [newSearch, ...filtered].slice(0, MAX_HISTORY);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        
        return updated;
      });
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // Clear all history
  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // Remove a specific search
  const removeSearch = (id) => {
    try {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove search:', error);
    }
  };

  return {
    history,
    saveSearch,
    clearHistory,
    removeSearch,
  };
}

