import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      {/* Beta Badge */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-lg rounded-full animate-pulse"></div>
        <div className="relative flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 backdrop-blur-md border border-purple-400/30 rounded-full shadow-lg">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
            <span className="text-xs font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent tracking-wide">
              BETA
            </span>
          </div>
          {/* Version Indicator */}
          <div className="w-px h-3 bg-purple-400/40"></div>
          <span className="text-xs font-medium text-purple-300/80 tracking-wider">
            v2.5
          </span>
        </div>
        
        {/* Tooltip on Hover */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
          <div className="px-2 py-1 bg-gray-900/95 backdrop-blur-sm text-purple-200 text-xs rounded-lg border border-purple-500/30 whitespace-nowrap shadow-xl">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 border-l border-t border-purple-500/30 rotate-45"></div>
            Preview Release • Advanced AI Platform
          </div>
        </div>
      </div>
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <div className="relative w-6 h-6">
          <div className={`absolute inset-0 transition-all duration-300 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-180'}`}>
            <SunIcon className="w-6 h-6 text-yellow-400" />
          </div>
          <div className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-180'}`}>
            <MoonIcon className="w-6 h-6 text-blue-300" />
          </div>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;