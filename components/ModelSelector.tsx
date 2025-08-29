
import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS } from '../constants';
import { getModelInfo } from '../services/aiService';
import type { AiModel } from '../types';
import CheckIcon from './icons/CheckIcon';
import CogIcon from './icons/CogIcon';
import ModelIcon from './ModelIcon';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isSessionActive: boolean;
  isCurrentModelKeySet: boolean;
  onConfigureCollaboration: () => void;
}


const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel, isSessionActive, isCurrentModelKeySet, onConfigureCollaboration }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedModelInfo = getModelInfo(selectedModel);

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    setIsOpen(false);
  };

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
    <div className="mb-6">
        {/* Enhanced Header */}
        <div className="relative mb-4">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1 right-2 w-3 h-3 border border-purple-400/30 rounded-full"></div>
                <div className="absolute top-0 right-8 w-2 h-2 bg-purple-400/20 rounded-full"></div>
                <div className="absolute bottom-1 left-4 w-2.5 h-2.5 border border-indigo-400/30 rounded-lg rotate-45"></div>
            </div>
            
            <div className="relative flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-purple-600/10 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                        AI Model Selection
                    </h3>
                    <p className="text-purple-300/70 text-sm">Choose your preferred AI model</p>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className={`relative flex-grow ${isSessionActive ? 'opacity-50' : ''}`} ref={dropdownRef}>
                <button
                type="button"
                onClick={() => !isSessionActive && setIsOpen(!isOpen)}
                disabled={isSessionActive}
                className="group w-full flex items-center justify-between pl-5 pr-4 py-4 text-lg bg-gradient-to-br from-gray-900/60 via-purple-900/20 to-gray-900/60 backdrop-blur-sm text-white rounded-2xl border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/60 transition-all duration-500 ease-in-out cursor-pointer hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 disabled:cursor-not-allowed hover:bg-gradient-to-br hover:from-gray-800/70 hover:via-purple-800/30 hover:to-gray-800/70"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                >
                <div className="flex items-center gap-4">
                    {selectedModelInfo && (
                        <div className="relative">
                            <ModelIcon model={selectedModelInfo} />
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    )}
                    <span className={`font-medium transition-colors duration-300 ${
                        selectedModelInfo 
                            ? 'text-white group-hover:text-purple-200' 
                            : 'text-gray-400 group-hover:text-gray-300'
                    }`}>
                        {selectedModelInfo ? selectedModelInfo.name : '-- Select a model --'}
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
                    className={`absolute top-full right-0 left-0 mt-3 z-20 transition-all duration-500 ease-in-out origin-top ${
                        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
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
                        
                        <ul className="relative max-h-80 overflow-y-auto py-2">
                            {AI_MODELS.map((model, index) => (
                                <li key={model.id} className="relative mx-2 mb-1 last:mb-2">
                                    <button
                                        onClick={() => handleSelectModel(model.id)}
                                        disabled={!model.isAvailable}
                                        className={`group w-full text-left p-4 flex items-center justify-between rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${
                                            selectedModel === model.id
                                                ? 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border border-purple-400/30 shadow-lg shadow-purple-500/20'
                                                : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 hover:border hover:border-purple-500/20 hover:shadow-md hover:shadow-purple-500/10'
                                        }`}
                                        style={{animationDelay: `${index * 50}ms`}}
                                    >
                                        <div className="flex items-center gap-4 flex-grow overflow-hidden">
                                            <div className="relative">
                                                <ModelIcon model={model} />
                                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className={`font-semibold truncate transition-colors duration-300 ${
                                                    selectedModel === model.id ? 'text-white' : 'text-gray-200 group-hover:text-white'
                                                }`}>{model.name}</p>
                                                <p className={`text-xs truncate transition-colors duration-300 ${
                                                    selectedModel === model.id ? 'text-purple-200' : 'text-gray-400 group-hover:text-purple-300'
                                                }`}>{model.description}</p>
                                            </div>
                                        </div>
                                        {selectedModel === model.id && (
                                            <div className="relative">
                                                <CheckIcon className="w-5 h-5 text-purple-300 ml-3 flex-shrink-0" />
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
            {selectedModel === 'ai-advanced-analysis' && !isSessionActive && (
                 <button 
                    onClick={onConfigureCollaboration}
                    className="group relative p-4 bg-gradient-to-br from-gray-900/60 via-purple-900/20 to-gray-900/60 backdrop-blur-sm rounded-2xl border border-purple-500/20 hover:border-purple-400/50 hover:bg-gradient-to-br hover:from-gray-800/70 hover:via-purple-800/30 hover:to-gray-800/70 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-500"
                    aria-label="Configure AI collaboration"
                    title="Configure AI collaboration"
                 >
                    <div className="relative">
                        <CogIcon className="w-6 h-6 text-purple-400 group-hover:text-purple-300 group-hover:rotate-90 transition-all duration-500" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                 </button>
            )}
        </div>
    </div>
  );
};

export default ModelSelector;
