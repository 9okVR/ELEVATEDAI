import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { AI_MODELS } from '../constants';
import GeminiLogo from './icons/GeminiLogo';
import ElevatedAILogo from './icons/ElevatedAILogo';

interface AIInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  logoType?: 'gemini' | 'elevated' | 'custom';
  customLogo?: React.ReactNode;
}

const AIInfoModal: React.FC<AIInfoModalProps> = ({ 
  isOpen, 
  onClose, 
  logoType = 'gemini',
  customLogo 
}) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const animationDuration = prefersReducedMotion ? 150 : 400;
  const delayDuration = prefersReducedMotion ? 50 : 100;

  // Focus trap implementation
  const focusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
  }, []);

  const trapFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const focusable = focusableElements();
    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [focusableElements]);

  // ESC key handling and body scroll lock
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Animation and focus management
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => {
        setShow(true);
        // Focus first focusable element or close button
        setTimeout(() => {
          const focusable = focusableElements();
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            closeButtonRef.current?.focus();
          }
        }, delayDuration);
      }, delayDuration);
    } else {
      setShow(false);
      setTimeout(() => setShouldRender(false), animationDuration);
    }
  }, [isOpen, animationDuration, delayDuration, focusableElements]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderLogo = () => {
    if (customLogo) return customLogo;
    
    switch (logoType) {
      case 'elevated':
        return <ElevatedAILogo className="w-8 h-8" showText={false} />;
      case 'gemini':
      default:
        return <GeminiLogo className="w-8 h-8" animated={true} />;
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-all ease-out ${
        prefersReducedMotion ? 'duration-150' : 'duration-400'
      } ${
        show 
          ? 'backdrop-blur-2xl bg-black/40 opacity-100' 
          : 'backdrop-blur-none bg-black/0 opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        ref={modalRef}
        className={`
          relative w-full max-w-5xl max-h-[90vh] max-h-[90dvh] 
          bg-white/[0.02] backdrop-blur-3xl 
          border border-white/20 
          rounded-3xl shadow-2xl 
          transition-all ease-out 
          overflow-hidden
          ${prefersReducedMotion ? 'duration-150' : 'duration-400'}
          ${show 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4'
          }
          before:absolute before:inset-0 
          before:bg-gradient-to-br before:from-white/[0.08] before:via-white/[0.03] before:to-transparent 
          before:rounded-3xl before:pointer-events-none
          after:absolute after:inset-0
          after:bg-gradient-to-t after:from-black/20 after:via-transparent after:to-white/5
          after:rounded-3xl after:pointer-events-none
          shadow-[0_32px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
        `}
        onKeyDown={trapFocus}
      >
        {/* Enhanced glassmorphism background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-blue-900/30 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/[0.02] rounded-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.1),transparent_50%)] rounded-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)] rounded-3xl" />
        {/* Header */}
        <div className="relative p-8 pb-6 border-b border-white/20 bg-gradient-to-r from-white/[0.08] to-white/[0.03] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="
                p-3 
                bg-gradient-to-br from-white/20 to-white/[0.05] 
                backdrop-blur-sm 
                border border-white/30 
                rounded-2xl 
                shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                transition-all duration-300
                hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]
                hover:border-white/40
              ">
                {renderLogo()}
              </div>
              <div>
                <h1 
                  id="modal-title"
                  className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-sm"
                >
                  How Our AI Works
                </h1>
                <p 
                  id="modal-description"
                  className="text-white/80 mt-1 font-medium text-sm tracking-wide"
                >
                  Advanced Educational Intelligence Platform
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="
                group p-3 
                text-white/60 hover:text-white 
                transition-all duration-300 
                rounded-xl 
                hover:bg-white/15 
                focus:outline-none 
                focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent
                hover:scale-110
                active:scale-95
                border border-transparent hover:border-white/20
                shadow-lg hover:shadow-xl
              "
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 transition-transform group-hover:rotate-90 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-8 overflow-y-auto max-h-[calc(90vh-140px)] max-h-[calc(90dvh-140px)] custom-scrollbar">
          <div className="space-y-8">
            {/* Process Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  number: 1,
                  title: "Select Model",
                  description: "Choose from our advanced AI models, powered by Google's Gemini 2.5 Pro technology, designed for educational excellence.",
                  gradient: "from-purple-500/30 to-indigo-500/20",
                  border: "border-purple-400/40",
                  numberGradient: "from-purple-600 to-indigo-600",
                  shadowColor: "shadow-purple-500/20"
                },
                {
                  number: 2,
                  title: "Choose Grade Level",
                  description: "Select your academic level to ensure content complexity and language are perfectly tailored to your learning needs.",
                  gradient: "from-indigo-500/30 to-blue-500/20",
                  border: "border-indigo-400/40",
                  numberGradient: "from-indigo-600 to-blue-600",
                  shadowColor: "shadow-indigo-500/20"
                },
                {
                  number: 3,
                  title: "AI Processing",
                  description: "Our advanced AI employs sophisticated prompt engineering and pedagogical frameworks to generate optimal learning content.",
                  gradient: "from-blue-500/30 to-teal-500/20",
                  border: "border-blue-400/40",
                  numberGradient: "from-blue-600 to-teal-600",
                  shadowColor: "shadow-blue-500/20"
                }
              ].map((step, index) => (
                <div 
                  key={step.number}
                  className={`
                    group
                    bg-gradient-to-br ${step.gradient}
                    backdrop-blur-md
                    p-6 rounded-2xl 
                    border ${step.border}
                    transition-all duration-500
                    hover:scale-[1.02] hover:${step.shadowColor} hover:shadow-xl
                    hover:bg-white/10
                    hover:border-white/30
                    relative overflow-hidden
                    before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300
                    hover:before:opacity-100
                  `}
                  style={{
                    animationDelay: prefersReducedMotion ? '0ms' : `${index * 150}ms`
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`
                        w-10 h-10 
                        bg-gradient-to-br ${step.numberGradient}
                        rounded-xl 
                        flex items-center justify-center 
                        text-white font-bold text-lg
                        shadow-lg
                        group-hover:scale-110
                        transition-all duration-300
                        border border-white/20
                        shadow-black/20
                      `}>
                        {step.number}
                      </div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-white/95 transition-colors duration-300">{step.title}</h3>
                    </div>
                    <p className="text-white/85 leading-relaxed text-sm group-hover:text-white/90 transition-colors duration-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}"
            </div>

            {/* Advanced Features */}
            <div className="bg-gradient-to-br from-gray-900/60 to-purple-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-[0_16px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-purple-500/10 rounded-3xl" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  Advanced AI Capabilities
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Top-Tier Prompt Engineering</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Utilizes cutting-edge prompt optimization techniques to maximize AI comprehension and response quality.
                        </p>
                      </div>
                    </div>

                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Adaptive Learning Context</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Dynamically adjusts content complexity, vocabulary, and examples based on selected grade level.
                        </p>
                      </div>
                    </div>

                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Multi-Modal Content Processing</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Processes text documents, PDFs, and images to extract comprehensive educational insights.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Pedagogical Framework Integration</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Incorporates proven educational methodologies to ensure content follows best learning practices.
                        </p>
                      </div>
                    </div>

                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Structured Output Generation</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Generates organized topics, interactive flashcards, comprehensive quizzes, and personalized tutoring sessions.
                        </p>
                      </div>
                    </div>

                    <div className="group flex items-start gap-4 p-5 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform duration-300"></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-white/95">Real-Time Adaptive Responses</h4>
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200">
                          Provides contextual explanations and maintains conversation continuity throughout learning sessions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-gradient-to-br from-gray-900/60 to-indigo-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-[0_16px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-indigo-500/10 rounded-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-radial from-indigo-500/10 to-transparent rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Technical Excellence
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="group flex items-center gap-4 p-4 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/15 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.02]">
                      <div className="p-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        <GeminiLogo className="w-6 h-6" animated={true} />
                      </div>
                      <span className="text-white font-medium group-hover:text-white/95">Google Gemini 2.5 Pro Integration</span>
                    </div>
                    
                    <div className="space-y-3 ml-4">
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Advanced Natural Language Processing</span>
                      </div>
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Context-Aware Response Generation</span>
                      </div>
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Optimized Temperature Settings (0.7)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Enhanced Error Handling & Fallbacks</span>
                      </div>
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Intelligent Content Extraction</span>
                      </div>
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-teal-500 to-green-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Markdown-Formatted Output</span>
                      </div>
                      <div className="group flex items-center gap-3 p-3 bg-white/[0.05] backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20">
                        <div className="w-3 h-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <span className="text-gray-300 group-hover:text-gray-200 text-sm">Real-Time Processing Pipeline</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="relative text-center p-8 bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-purple-900/50 backdrop-blur-md rounded-3xl border border-purple-500/30 shadow-[0_16px_32px_rgba(139,92,246,0.2)] overflow-hidden">
              {/* Background decorations */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-purple-500/10 rounded-3xl" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-32 bg-gradient-radial from-purple-500/20 to-transparent blur-2xl" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-100 to-indigo-200 bg-clip-text text-transparent">
                  Ready to Experience Advanced AI Learning?
                </h3>
                <p className="text-purple-200/90 mb-6 text-lg leading-relaxed max-w-2xl mx-auto">
                  Upload your study materials and let our sophisticated AI system create personalized learning experiences tailored to your academic level.
                </p>
                <button
                  ref={lastFocusableRef}
                  onClick={onClose}
                  className="
                    group px-10 py-4 
                    bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 
                    hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 
                    text-white font-semibold text-lg
                    rounded-2xl 
                    transition-all duration-300 
                    shadow-[0_8px_32px_rgba(139,92,246,0.4)] 
                    hover:shadow-[0_12px_40px_rgba(139,92,246,0.6)] 
                    border border-white/20 
                    hover:border-white/30
                    backdrop-blur-sm
                    hover:scale-105
                    active:scale-95
                    transform-gpu
                    relative overflow-hidden
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0
                    before:translate-x-[-100%] before:transition-transform before:duration-500
                    hover:before:translate-x-[100%]
                  "
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Begin Your Learning Journey
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInfoModal;
