import React, { useState, useRef, useEffect } from 'react';

interface QuantitySelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: number[];
  id: string;
  className?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ label, value, onChange, options, id, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (selectedValue: number) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <label htmlFor={id} className="text-purple-300 font-semibold whitespace-nowrap text-lg flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
        {label}:
      </label>
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center justify-between pl-4 pr-3 py-3 min-w-[80px] bg-gradient-to-br from-gray-900/60 via-purple-900/20 to-gray-900/60 backdrop-blur-sm text-white rounded-xl border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/60 transition-all duration-500 ease-in-out cursor-pointer hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 hover:bg-gradient-to-br hover:from-gray-800/70 hover:via-purple-800/30 hover:to-gray-800/70"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
              <span className="text-purple-300 font-bold text-sm">{value}</span>
            </div>
          </div>
          <div className="relative ml-2">
            <svg
              className={`w-4 h-4 text-purple-400 transition-all duration-500 ease-in-out group-hover:text-purple-300 ${
                isOpen ? 'rotate-180 scale-110' : 'group-hover:scale-110'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </button>

        <div
          className={`absolute top-full right-0 left-0 mt-2 z-20 transition-all duration-500 ease-in-out origin-top ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* Enhanced Dropdown with Animated Background */}
          <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-2xl border border-purple-500/30 rounded-xl shadow-2xl shadow-purple-500/10 overflow-hidden">
            {/* Animated Background Particles */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1 right-2 w-1 h-1 bg-purple-400/60 rounded-full animate-pulse"></div>
              <div className="absolute bottom-1 left-2 w-1 h-1 bg-indigo-400/60 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            </div>
            
            <ul className="relative max-h-48 overflow-y-auto py-1">
              {options.map((option, index) => (
                <li key={option} className="relative mx-1 mb-0.5 last:mb-1">
                  <button
                    onClick={() => handleSelect(option)}
                    className={`group w-full text-left p-3 flex items-center justify-center rounded-lg transition-all duration-300 focus:outline-none ${
                      value === option
                        ? 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border border-purple-400/30 shadow-lg shadow-purple-500/20'
                        : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 hover:border hover:border-purple-500/20 hover:shadow-md hover:shadow-purple-500/10'
                    }`}
                    style={{animationDelay: `${index * 30}ms`}}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                      value === option
                        ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-400/40'
                        : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20 group-hover:border-purple-400/30 group-hover:bg-gradient-to-br group-hover:from-purple-500/20 group-hover:to-indigo-500/20'
                    }`}>
                      <span className={`font-bold text-lg transition-colors duration-300 ${
                        value === option ? 'text-purple-200' : 'text-purple-300 group-hover:text-purple-200'
                      }`}>{option}</span>
                    </div>
                    {value === option && (
                      <div className="absolute right-2 flex items-center">
                        <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <div className="absolute -inset-1 bg-purple-400/20 rounded-full blur animate-pulse"></div>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantitySelector;