import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { saveUserApiKey } from '../services/proxyService';
import { useSettings, FontSize, ColorScheme, LayoutMode } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'layout' | 'advanced' | 'account';
}

type TabType = 'appearance' | 'layout' | 'advanced' | 'account';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'appearance');
  const [previewMode, setPreviewMode] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  // Auth handled in separate AuthModal; keep only API key management here
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  
  const { 
    fontSize, setFontSize, 
    colorScheme, setColorScheme, 
    layoutMode, setLayoutMode, 
    resetToDefaults 
  } = useSettings();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab ?? 'appearance');
      setShouldRender(true);
      const timer = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      const timer = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTab]);

  // Supabase session tracking
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const init = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user?.email ?? null);
      const sub = supabase.auth.onAuthStateChange((_evt, sess) => {
        setSessionEmail(sess?.user?.email ?? null);
      });
      unsub = sub.data.subscription.unsubscribe;
    };
    init();
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'Tab':
          // Enhanced tab navigation will be handled by proper tabindex
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open (mobile fix)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!shouldRender) return null;

  const fontSizeOptions: { value: FontSize; label: string; description: string; preview: string }[] = [
    { value: 'small', label: 'Compact', description: 'More content, less space', preview: 'Aa' },
    { value: 'medium', label: 'Comfortable', description: 'Balanced reading experience', preview: 'Aa' },
    { value: 'large', label: 'Spacious', description: 'Easier to read, larger text', preview: 'Aa' },
    { value: 'extra-large', label: 'Accessibility', description: 'Maximum readability', preview: 'Aa' },
  ];

  const colorSchemeOptions: { 
    value: ColorScheme; 
    label: string; 
    description: string;
    gradient: string;
    accent: string;
  }[] = [
    { 
      value: 'purple', 
      label: 'Mystic Purple', 
      description: 'Classic elegance with deep purples',
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      accent: 'bg-purple-500'
    },
    { 
      value: 'blue', 
      label: 'Ocean Blue', 
      description: 'Calm and professional blue tones',
      gradient: 'from-blue-600 via-sky-600 to-cyan-600',
      accent: 'bg-blue-500'
    },
    { 
      value: 'green', 
      label: 'Forest Green', 
      description: 'Natural and refreshing greens',
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      accent: 'bg-green-500'
    },
    { 
      value: 'orange', 
      label: 'Sunset Orange', 
      description: 'Warm and energetic orange hues',
      gradient: 'from-orange-600 via-amber-600 to-yellow-600',
      accent: 'bg-orange-500'
    },
  ];

  const layoutModeOptions: { 
    value: LayoutMode; 
    label: string; 
    description: string;
    icon: React.ReactNode;
  }[] = [
    { 
      value: 'compact', 
      label: 'Compact', 
      description: 'Dense layout for power users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    },
    { 
      value: 'comfortable', 
      label: 'Comfortable', 
      description: 'Balanced spacing for daily use',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      )
    },
    { 
      value: 'spacious', 
      label: 'Spacious', 
      description: 'Generous spacing for relaxed reading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
        </svg>
      )
    },
  ];

  const TabButton: React.FC<{ tab: TabType; label: string; icon: React.ReactNode; isActive: boolean }> = ({ 
    tab, label, icon, isActive 
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`
        flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all duration-300
        ${isActive 
          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30' 
          : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
        }
      `}
      aria-selected={isActive}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );

  return (
    <div 
      className={`
        fixed inset-0 z-[60] flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain
        transition-all duration-400 ease-out
        ${show ? 'opacity-100' : 'opacity-0'}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      {/* Enhanced Backdrop */}
      <div 
        className={`
          absolute inset-0 transition-all duration-400 ease-out
          bg-black/60 backdrop-blur-xl
          ${show ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={`
          relative w-full max-w-[92vw] sm:max-w-5xl max-h-[90vh] max-h-[90dvh]
          transform transition-all duration-400 ease-out
          ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'}
        `}
      >
        {/* Enhanced Glassmorphism Container */}
        <div className="
          relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95
          backdrop-blur-2xl border border-white/20
          shadow-[0_32px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
        ">
          {/* Animated Background Effects */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}} />
          </div>
          {/* Header */}
          <div className="relative p-4 sm:p-8 pb-4 sm:pb-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="
                  p-4 rounded-2xl 
                  bg-gradient-to-br from-white/20 to-white/5
                  backdrop-blur-sm border border-white/30
                  shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                ">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 id="settings-title" className="text-3xl font-bold text-white mb-1">
                    Customize Experience
                  </h2>
                  <p className="text-white/70 text-lg">
                    Personalize your interface for the perfect study environment
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Preview Mode Toggle */}
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`
                    px-4 py-2 rounded-xl font-medium transition-all duration-300
                    ${previewMode 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }
                  `}
                >
                  {previewMode ? 'Live Preview ON' : 'Live Preview OFF'}
                </button>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="
                    p-3 rounded-xl 
                    bg-white/10 hover:bg-white/20 
                    border border-white/20 hover:border-white/30
                    text-white/70 hover:text-white
                    transition-all duration-300
                    focus:outline-none focus:ring-2 focus:ring-white/30
                  "
                  aria-label="Close settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Enhanced Tab Navigation */}
            <div className="flex gap-2 mt-6 sm:mt-8 overflow-x-auto hide-scrollbar -mx-2 px-2" role="tablist">
              <TabButton 
                tab="appearance" 
                label="Appearance"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                }
                isActive={activeTab === 'appearance'}
              />
              <TabButton 
                tab="layout" 
                label="Layout"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                }
                isActive={activeTab === 'layout'}
              />
              <TabButton 
                tab="advanced" 
                label="Advanced"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                isActive={activeTab === 'advanced'}
              />
              <TabButton 
                tab="account" 
                label="Account"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10.97 10.97 0 0112 15c2.5 0 4.847.858 6.879 2.304M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                isActive={activeTab === 'account'}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="relative p-3 sm:p-8 custom-scrollbar overflow-y-auto max-h-[70vh] sm:max-h-[60vh] max-h-[70dvh] sm:max-h-[60dvh]">
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 sm:space-y-10">
                {/* Theme Toggle */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Theme Mode</h3>
                      <p className="text-white/70 text-sm sm:text-base">Switch between light and dark themes</p>
                      </div>
                    <button
                      onClick={toggleTheme}
                      className={`
                        relative w-16 h-8 sm:w-20 sm:h-10 rounded-full transition-all duration-300
                        ${theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-yellow-400 hover:bg-yellow-300'
                        }
                        focus:outline-none focus:ring-2 focus:ring-white/30
                      `}
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                    >
                      <div className={`
                        absolute top-1 w-8 h-8 rounded-full transition-all duration-300
                        ${theme === 'dark' 
                          ? 'left-1 bg-gray-300' 
                          : 'left-11 bg-white'
                        }
                        flex items-center justify-center
                      `}>
                        {theme === 'dark' ? (
                          <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
                {/* Color Schemes */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Color Scheme</h3>
                    <p className="text-white/70 text-sm sm:text-base">Choose your preferred accent colors</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {colorSchemeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setColorScheme(option.value)}
                        className={`
                          group relative p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left
                          backdrop-blur-sm overflow-hidden
                          ${colorScheme === option.value
                            ? 'border-white/40 bg-white/10 shadow-lg transform scale-105'
                            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }
                          focus:outline-none focus:ring-2 focus:ring-white/30
                        `}
                      >
                        {/* Animated Gradient Background */}
                        <div className={`
                          absolute inset-0 opacity-20 bg-gradient-to-br ${option.gradient}
                          transition-opacity duration-300 group-hover:opacity-30
                        `} />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`
                              w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${option.gradient}
                              shadow-lg transition-transform duration-300
                              ${colorScheme === option.value ? 'scale-110' : 'group-hover:scale-105'}
                            `} />
                            <div>
                              <h4 className="text-xl font-bold text-white">{option.label}</h4>
                              <p className="text-white/70 text-sm">{option.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selection Indicator */}
                        {colorScheme === option.value && (
                          <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div className="space-y-6 sm:space-y-10">
                {/* Font Size */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Font Size</h3>
                    <p className="text-white/70 text-sm sm:text-base">Adjust text size for optimal reading</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    {fontSizeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFontSize(option.value)}
                        className={`
                          group p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-center
                          backdrop-blur-sm
                          ${fontSize === option.value
                            ? 'border-white/40 bg-white/10 shadow-lg transform scale-105'
                            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }
                          focus:outline-none focus:ring-2 focus:ring-white/30
                        `}
                      >
                        <div className={`
                          text-3xl sm:text-4xl font-bold text-white mb-2 sm:mb-3 transition-all duration-300
                          ${option.value === 'small' ? 'text-2xl sm:text-3xl' :
                            option.value === 'medium' ? 'text-3xl sm:text-4xl' :
                            option.value === 'large' ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'
                          }
                          ${fontSize === option.value ? 'scale-110' : 'group-hover:scale-105'}
                        `}>
                          {option.preview}
                        </div>
                      <h4 className="text-base sm:text-lg font-bold text-white mb-1">{option.label}</h4>
                      <p className="text-white/70 text-xs sm:text-sm">{option.description}</p>
                        
                        {fontSize === option.value && (
                          <div className="mt-3 flex justify-center">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Density */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Layout Density</h3>
                    <p className="text-white/70">Control spacing and content density</p>
                  </div>
                  <div className="space-y-4">
                    {layoutModeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setLayoutMode(option.value)}
                    className={`
                          group w-full p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left
                          backdrop-blur-sm
                          ${layoutMode === option.value
                            ? 'border-white/40 bg-white/10 shadow-lg transform scale-105'
                            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }
                          focus:outline-none focus:ring-2 focus:ring-white/30
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`
                              p-3 rounded-xl text-white transition-transform duration-300
                              ${layoutMode === option.value ? 'bg-white/20 scale-110' : 'bg-white/10 group-hover:scale-105'}
                            `}>
                              {option.icon}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-white mb-1">{option.label}</h4>
                              <p className="text-white/70">{option.description}</p>
                            </div>
                          </div>
                          
                          {layoutMode === option.value && (
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-10">
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6m5.66-4L16 6.34M23 12h-6m4 5.66L17.66 16M12 23v-6m-5.66 4L8 17.66M1 12h6m-4-5.66L6.34 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Advanced Settings</h3>
                  <p className="text-white/70 text-lg mb-8">Coming soon - More customization options</p>
                  <div className="text-sm text-white/50">
                    Advanced features like custom themes, animations preferences, and accessibility options will be available in future updates.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-2">Account</h3>
                {sessionEmail ? (
                  <div className="space-y-4">
                    <p className="text-white/80">Signed in as <span className="font-semibold">{sessionEmail}</span></p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your Gemini API Key"
                        className="flex-1 bg-white/5 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                      <button
                        onClick={async () => {
                          setAccountMsg(null);
                          const res = await saveUserApiKey(apiKeyInput.trim());
                          setAccountMsg(res.ok ? 'API key saved to your account' : `Failed to save: ${res.error}`);
                        }}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold"
                      >
                        Save Key
                      </button>
                      <button
                        onClick={async () => { try { await supabase?.auth.signOut(); setApiKeyInput(''); setAccountMsg('Signed out'); } catch {} }}
                        className="px-4 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20"
                      >
                        Sign Out
                      </button>
                    </div>
                    {accountMsg && <p className="text-sm text-purple-300">{accountMsg}</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white/80">Use the Account button to sign in or sign up. Once signed in, you can save your Gemini API key here.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Reset Button */}
          <div className="relative p-8 pt-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="text-white/70">
                <p className="text-sm">Changes are saved automatically</p>
              </div>
              <button
                onClick={resetToDefaults}
                className="
                  px-6 py-3 rounded-xl font-medium transition-all duration-300
                  bg-red-500/20 hover:bg-red-500/30
                  border border-red-500/30 hover:border-red-500/50
                  text-red-300 hover:text-red-200
                  focus:outline-none focus:ring-2 focus:ring-red-500/30
                  transform hover:scale-105
                "
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
