import React, { useState, useEffect } from 'react';
import ClockIcon from './icons/ClockIcon';
import TrashIcon from './icons/TrashIcon';

interface StudyTimerProps {
  isActive: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const StudyTimer: React.FC<StudyTimerProps> = ({ isActive, onTimeUpdate }) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);

  // Load total study time from localStorage on mount
  useEffect(() => {
    const savedTime = localStorage.getItem('elevated-ai-total-study-time');
    if (savedTime) {
      setTotalStudyTime(parseInt(savedTime, 10));
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        setSessionTime(time => {
          const newTime = time + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, 1000);
    } else {
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, onTimeUpdate]);

  // Save session time to total when session ends
  useEffect(() => {
    if (!isActive && sessionTime > 0) {
      const newTotal = totalStudyTime + sessionTime;
      setTotalStudyTime(newTotal);
      localStorage.setItem('elevated-ai-total-study-time', newTotal.toString());
      setSessionTime(0);
    }
  }, [isActive, sessionTime, totalStudyTime]);

  // Reset total study time function
  const resetTotalTime = () => {
    setTotalStudyTime(0);
    localStorage.removeItem('elevated-ai-total-study-time');
  };

  if (!isActive && sessionTime === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-40 bg-gray-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-400">
            <ClockIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Total: {formatTime(totalStudyTime)}</span>
          </div>
          {totalStudyTime > 0 && (
            <button
              onClick={resetTotalTime}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors group"
              title="Reset total study time"
              aria-label="Reset total study time"
            >
              <TrashIcon className="w-4 h-4 text-red-400 group-hover:text-red-300" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-gray-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Session</span>
          </div>
          {totalStudyTime > 0 && (
            <button
              onClick={resetTotalTime}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors group"
              title="Reset total study time"
              aria-label="Reset total study time"
            >
              <TrashIcon className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
            </button>
          )}
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {formatTime(sessionTime)}
        </div>
        {totalStudyTime > 0 && (
          <div className="text-xs text-gray-400 border-t border-white/10 pt-2 flex items-center justify-between">
            <span>Total: {formatTime(totalStudyTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyTimer;