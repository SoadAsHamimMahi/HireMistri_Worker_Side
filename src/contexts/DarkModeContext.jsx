import React, { createContext, useContext, useEffect, useState } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then default to dark (dark-first approach)
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Default to dark mode (dark-first)
    return true;
  });

  useEffect(() => {
    // Update localStorage when theme changes
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Update document class for Tailwind dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update data-theme attribute for DaisyUI
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Set initial theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const themeToApply = saved || 'dark'; // Default to dark mode (dark-first)
    
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Set data-theme attribute for DaisyUI
    document.documentElement.setAttribute('data-theme', themeToApply);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Also provide toggleTheme for consistency
  const toggleTheme = toggleDarkMode;

  const value = {
    isDarkMode,
    toggleDarkMode,
    toggleTheme, // Alias for consistency
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};
