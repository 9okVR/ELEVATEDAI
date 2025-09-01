import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { saveUserApiKey } from '../services/proxyService';
import { useSettings, FontSize, ColorScheme, LayoutMode } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'layout' | 'advanced' | 'account';
}

type Tab = 'appearance' | 'layout' | 'advanced' | 'account';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'appearance' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { fontSize, setFontSize, colorScheme, setColorScheme, layoutMode, setLayoutMode, resetToDefaults } = useSettings();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { if (isOpen) setActiveTab(initialTab); }, [isOpen, initialTab]);

  // Supabase session state
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user?.email ?? null);
      const sub = supabase.auth.onAuthStateChange((_evt, sess) => setSessionEmail(sess?.user?.email ?? null));
      unsub = sub.data.subscription.unsubscribe;
    })();
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  // Body scroll lock + focus trap
  useBodyScrollLock(isOpen);
  useFocusTrap(containerRef, isOpen);

  if (!isOpen) return null;

  const fontSizeOptions: { value: FontSize; label: string }[] = useMemo(() => ([
    { value: 'small', label: 'Compact' },
    { value: 'medium', label: 'Comfortable' },
    { value: 'large', label: 'Spacious' },
    { value: 'extra-large', label: 'Accessibility' },
  ]), []);

  const colorOptions: { value: ColorScheme; label: string }[] = useMemo(() => ([
    { value: 'purple', label: 'Purple' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'pink', label: 'Pink' },
    { value: 'cyan', label: 'Cyan' },
  ]), []);

  const layoutOptions: { value: LayoutMode; label: string }[] = useMemo(() => ([
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
  ]), []);

  const TabButton: React.FC<{ tab: Tab; label: string; isActive: boolean }> = ({ tab, label, isActive }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-xl font-medium transition-all border ${isActive ? 'bg-white/15 text-white border-white/30' : 'text-white/70 border-transparent hover:bg-white/10'}`}
      aria-selected={isActive}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

      <div ref={containerRef} className="relative w-full max-w-5xl max-h-[90vh] max-h-[90dvh] overflow-hidden rounded-2xl border border-white/15 bg-gray-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div>
            <h2 id="settings-title" className="text-2xl font-bold text-white">Customize Experience</h2>
            <p className="text-white/60">Personalize your interface and account</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20" aria-label="Close settings">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-white/10 overflow-x-auto hide-scrollbar">
          <TabButton tab="appearance" label="Appearance" isActive={activeTab==='appearance'} />
          <TabButton tab="layout" label="Layout" isActive={activeTab==='layout'} />
          <TabButton tab="advanced" label="Advanced" isActive={activeTab==='advanced'} />
          <TabButton tab="account" label="Account" isActive={activeTab==='account'} />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar max-h-[calc(90vh-160px)] max-h-[calc(90dvh-160px)] text-white">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Theme</h3>
                  <p className="text-white/70 text-sm">Switch between light and dark</p>
                </div>
                <button onClick={toggleTheme} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Color Scheme</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {colorOptions.map(o => (
                    <button key={o.value} onClick={() => setColorScheme(o.value)} className={`p-4 rounded-xl border transition ${colorScheme===o.value ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Font Size</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fontSizeOptions.map(o => (
                    <button key={o.value} onClick={() => setFontSize(o.value)} className={`p-4 rounded-xl border transition ${fontSize===o.value ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Layout Density</h3>
                <div className="grid grid-cols-3 gap-3">
                  {layoutOptions.map(o => (
                    <button key={o.value} onClick={() => setLayoutMode(o.value)} className={`p-4 rounded-xl border transition ${layoutMode===o.value ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-2 text-white/80">
              <h3 className="text-xl font-semibold">Advanced Settings</h3>
              <p>Additional customization will be available soon.</p>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Account</h3>
              {sessionEmail ? (
                <>
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
                    <button onClick={async () => { try { await supabase?.auth.signOut(); setApiKeyInput(''); setAccountMsg('Signed out'); } catch {} }} className="px-4 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20">Sign Out</button>
                  </div>
                  {accountMsg && <p className="text-sm text-purple-300">{accountMsg}</p>}
                </>
              ) : (
                <p className="text-white/80">Use the Account button to sign in or sign up. Once signed in, you can save your Gemini API key here.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-white/60 text-sm">Changes are saved automatically</p>
          <button onClick={resetToDefaults} className="px-4 py-2 rounded-xl border border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20">Reset to Defaults</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
