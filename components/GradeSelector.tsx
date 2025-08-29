import React, { useState, useRef, useEffect } from 'react';
import { GRADE_LEVELS } from '../constants';
import type { GradeLevel } from '../types';

interface GradeSelectorProps {
  selectedGrade: GradeLevel | null;
  onSelectGrade: (grade: GradeLevel) => void;
  isDisabled?: boolean;
}

const GradeSelector: React.FC<GradeSelectorProps> = ({ selectedGrade, onSelectGrade, isDisabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (grade: GradeLevel) => {
    onSelectGrade(grade);
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

  const selectedOption = GRADE_LEVELS.find(g => g.grade === selectedGrade);

  return (
    <div className="w-full">
      {/* Enhanced Header */}
      <div className="relative mb-4">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1 right-3 w-3 h-3 border border-purple-400/30 rounded-full"></div>
          <div className="absolute top-0 right-10 w-2 h-2 bg-purple-400/20 rounded-full"></div>
          <div className="absolute bottom-1 left-6 w-2.5 h-2.5 border border-indigo-400/30 rounded-lg rotate-45"></div>
        </div>
        
        <div className="relative flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-purple-600/10 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              <span className="text-purple-400">2.</span> Select Your Grade Level
            </h2>
            <p className="text-purple-300/70 text-sm">Choose your academic level</p>
          </div>
        </div>
      </div>
      
      <div className={`relative ${isDisabled ? 'opacity-50' : ''}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          disabled={isDisabled}
          className="group w-full flex items-center justify-between pl-5 pr-4 py-4 text-lg bg-gradient-to-br from-gray-900/60 via-purple-900/20 to-gray-900/60 backdrop-blur-sm text-white rounded-2xl border border-purple-500/20 focus:outline-none outline-none active:outline-none hover:outline-none focus-visible:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/60 transition-all duration-500 ease-in-out cursor-pointer hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 disabled:cursor-not-allowed hover:bg-gradient-to-br hover:from-gray-800/70 hover:via-purple-800/30 hover:to-gray-800/70"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-4">
            {selectedOption && (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <span className="text-purple-300 font-bold text-sm">{selectedOption.grade}</span>
              </div>
            )}
            <span className={`font-medium transition-colors duration-300 ${
              selectedOption 
                ? 'text-white group-hover:text-purple-200' 
                : 'text-gray-400 group-hover:text-gray-300'
            }`}>
              {selectedOption ? `${selectedOption.label} - ${selectedOption.description}` : '-- Choose your grade --'}
            </span>
          </div>
          <div className="relative">
            <svg
              className={`w-5 h-5 text-purple-400 transition-all duration-500 ease-in-out group-hover:text-purple-300 ${
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
          className={`absolute top-full right-0 left-0 mt-3 z-10 transition-all duration-500 ease-out origin-top ${
            isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'
          }`}
        >
          {/* Enhanced Dropdown with Animated Background */}
          <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden">
            {/* Animated Background Particles */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 right-3 w-1 h-1 bg-purple-400/60 rounded-full animate-pulse"></div>
              <div className="absolute top-6 left-4 w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute bottom-4 right-6 w-1 h-1 bg-pink-400/60 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            <ul
              className="relative max-h-80 overflow-y-auto py-2"
              role="listbox"
            >
              {GRADE_LEVELS.map((gradeOption, index) => (
                <li
                  key={gradeOption.grade}
                  onClick={() => handleSelect(gradeOption.grade)}
                  className={`grade-selector-item group relative mx-2 mb-1 last:mb-2 p-4 cursor-pointer rounded-xl transition-all duration-300 ${[
                    'focus:outline-none',
                    'outline-none',
                    'active:outline-none', 
                    'hover:outline-none',
                    'focus-visible:outline-none',
                    '!outline-0',
                    '!border-0',
                    'focus:!outline-0',
                    'hover:!outline-0'
                  ].join(' ')} ${
                    selectedGrade === gradeOption.grade
                      ? 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border border-purple-400/30 shadow-lg shadow-purple-500/20'
                      : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 hover:border hover:border-purple-500/20 hover:shadow-md hover:shadow-purple-500/10'
                  }`}
                  role="option"
                  aria-selected={selectedGrade === gradeOption.grade}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    outline: 'none !important',
                    border: selectedGrade !== gradeOption.grade ? 'none' : undefined,
                    boxShadow: selectedGrade === gradeOption.grade ? undefined : 'none'
                  }}
                  tabIndex={-1}
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.border = selectedGrade !== gradeOption.grade ? 'none' : e.currentTarget.style.border;
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                  }}
                  onFocus={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.blur(); // Immediately remove focus
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                      selectedGrade === gradeOption.grade
                        ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-400/40 shadow-lg'
                        : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20 group-hover:border-purple-400/30 group-hover:bg-gradient-to-br group-hover:from-purple-500/20 group-hover:to-indigo-500/20'
                    }`}>
                      <span className={`font-bold text-lg transition-colors duration-300 ${
                        selectedGrade === gradeOption.grade ? 'text-purple-200' : 'text-purple-300 group-hover:text-purple-200'
                      }`}>{gradeOption.grade}</span>
                    </div>
                    <div className="flex-grow">
                      <div className={`font-semibold text-lg transition-colors duration-300 ${
                        selectedGrade === gradeOption.grade ? 'text-white' : 'text-gray-200 group-hover:text-white'
                      }`}>{gradeOption.label}</div>
                      <div className={`text-sm transition-colors duration-300 ${
                        selectedGrade === gradeOption.grade ? 'text-purple-200' : 'text-gray-400 group-hover:text-purple-300'
                      }`}>{gradeOption.description}</div>
                    </div>
                    {selectedGrade === gradeOption.grade && (
                      <div className="relative">
                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <div className="absolute -inset-1 bg-purple-400/20 rounded-full blur animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeSelector;