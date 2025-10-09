import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { saveUserApiKey, getUserApiKey } from '../services/proxyService';
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
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { fontSize, setFontSize, colorScheme, setColorScheme, layoutMode, setLayoutMode, enableQuizFeedback, setEnableQuizFeedback, resetToDefaults } = useSettings();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { if (isOpen) setActiveTab(initialTab); }, [isOpen, initialTab]);

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

  useEffect(() => {
    const fetchKey = async () => {
      try {
        if (!isOpen || activeTab !== 'account' || !sessionEmail) return;
        const res = await getUserApiKey({ reveal: true });
        if (res.ok) {
          setHasServerKey(res.hasKey);
          if (res.apiKey) setApiKeyInput(res.apiKey);
        }
      } catch {}
    };
    fetchKey();
    if (!isOpen) {
      setApiKeyInput('');
      setApiKeyVisible(false);
      setHasServerKey(null);
    }
  }, [isOpen, activeTab, sessionEmail]);

  useBodyScrollLock(isOpen);
  useFocusTrap(containerRef, isOpen);

  const fontSizeOptions: { value: FontSize; label: string }[] = useMemo(() => ([
    { value: 'small', label: 'Compact' },
    { value: 'medium', label: 'Comfortable' },
    { value: 'large', label: 'Spacious' },
    { value: 'extra-large', label: 'Accessibility' },
  ]), []);

  const colorOptions: { value: ColorScheme; label: string; accent: string }[] = useMemo(() => ([
    { value: 'purple', label: 'Purple Aurora', accent: 'from-purple-500 via-indigo-500 to-pink-500' },
    { value: 'blue', label: 'Glacial Blue', accent: 'from-sky-500 via-blue-500 to-indigo-500' },
    { value: 'green', label: 'Emerald Bloom', accent: 'from-emerald-400 via-teal-400 to-green-500' },
    { value: 'orange', label: 'Solar Ember', accent: 'from-orange-500 via-amber-500 to-rose-500' },
    { value: 'pink', label: 'Neon Bloom', accent: 'from-fuchsia-500 via-pink-500 to-rose-500' },
    { value: 'cyan', label: 'Arctic Wave', accent: 'from-cyan-400 via-blue-400 to-sky-500' },
  ]), []);

  const layoutOptions: { value: LayoutMode; label: string; helper: string }[] = useMemo(() => ([
    { value: 'compact', label: 'Compact', helper: 'Tight spacing for information-dense workspaces.' },
    { value: 'comfortable', label: 'Comfortable', helper: 'Balanced spacing for focused study sessions.' },
    { value: 'spacious', label: 'Spacious', helper: 'Generous breathing room and larger touch targets.' },
  ]), []);

  const tabs: Array<{ id: Tab; label: string; blurb: string }> = useMemo(() => ([
    { id: 'appearance', label: 'Appearance', blurb: 'Tune colors, gradients, and atmosphere.' },
    { id: 'layout', label: 'Layout', blurb: 'Adjust density and reading comfort.' },
    { id: 'advanced', label: 'Advanced', blurb: 'Control intelligent feedback features.' },
    { id: 'account', label: 'Account', blurb: 'Manage your profile and API credentials.' },
  ]), []);

  if (!isOpen) return null;

  const renderTabContent = () => {
    if (activeTab === 'appearance') {
      return (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/70 via-purple-950/60 to-slate-950/70 p-6 shadow-[0_18px_60px_rgba(17,17,36,0.55)]">
              <div className="absolute -top-24 -right-14 h-48 w-48 rounded-full bg-purple-500/25 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/55">Theme Engine</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Light or dark on demand</h3>
                  <p className="mt-2 text-sm text-white/60 max-w-lg">Switch between modes instantly. Elevated AI remembers your choice across devices.</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="group relative inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/15 hover:border-white/25"
                >
                  <span className={`inline-flex h-5 w-10 items-center rounded-full border border-white/15 transition ${theme === 'dark' ? 'bg-purple-500/70' : 'bg-white/20'}`}>
                    <span
                      className="h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300"
                      style={{ transform: theme === 'dark' ? 'translateX(1.75rem)' : 'translateX(0.25rem)' }}
                    />
                  </span>
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/75 via-slate-950/70 to-slate-900/75 p-6">
              <div className="absolute -inset-16 opacity-35" style={{ background: 'radial-gradient(circle at center, rgba(148,163,184,0.45), transparent 60%)' }}></div>
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.35em] text-white/55">Live Preview</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Current palette</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 opacity-80" />
                    <span className="text-xs text-white/50">Primary accent</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    Elevated AI adapts typography, glows, and surface gradients based on the active scheme. Explore options to match your workspace energy.
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Color schemes</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {colorOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setColorScheme(option.value)}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${colorScheme === option.value ? 'border-white/35 bg-white/12 shadow-[0_15px_45px_rgba(124,58,237,0.25)]' : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'}`}
                >
                  <div className={`absolute -top-20 right-0 h-32 w-32 rounded-full bg-gradient-to-br ${option.accent} opacity-30 blur-3xl`} />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="mt-1 text-xs text-white/55">Curated to complement Elevated AI’s glassmorphism shell.</p>
                    </div>
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br ${option.accent} text-white shadow-lg transition-transform duration-300 ${colorScheme === option.value ? 'scale-110' : 'scale-100 group-hover:scale-105'}`}>
                      ?
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === 'layout') {
      return (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/70 to-slate-900/70 p-6 shadow-[0_18px_45px_rgba(17,17,34,0.45)]">
            <h3 className="text-lg font-semibold text-white">Font size</h3>
            <p className="mt-1 text-sm text-white/60">Keep long-form responses legible on any display.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fontSizeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${fontSize === option.value ? 'border-white/40 bg-white/12 shadow-[0_12px_30px_rgba(124,58,237,0.2)]' : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'}`}
                >
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-1 text-xs text-white/50">Preview</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/70 via-purple-950/60 to-slate-950/70 p-6">
            <h3 className="text-lg font-semibold text-white">Layout density</h3>
            <p className="mt-1 text-sm text-white/60">Adjust spacing across cards, tabs, and feed elements.</p>
            <div className="mt-4 space-y-3">
              {layoutOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setLayoutMode(option.value)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${layoutMode === option.value ? 'border-white/40 bg-white/12 shadow-[0_12px_34px_rgba(79,70,229,0.25)]' : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">{option.helper}</p>
                    </div>
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs font-semibold transition ${layoutMode === option.value ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-500 text-white' : 'bg-white/5 text-white/50'}`}>
                      {layoutMode === option.value ? 'Active' : 'Select'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === 'advanced') {
      return (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/60 via-indigo-950/65 to-slate-950/70 p-6 shadow-[0_18px_45px_rgba(17,17,34,0.55)]">
          <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-white/55">Intelligent assist</p>
              <h3 id="ai-quiz-feedback-label" className="mt-2 text-xl font-semibold text-white">AI Quiz Feedback</h3>
              <p className="mt-2 text-sm text-white/60">Let Elevated AI analyze quiz results and craft targeted revision tips. Disable to conserve API usage or stay exam-neutral.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enableQuizFeedback}
              aria-labelledby="ai-quiz-feedback-label"
              onClick={() => setEnableQuizFeedback(!enableQuizFeedback)}
              className={`relative inline-flex h-12 w-24 items-center rounded-full border border-white/10 transition-all duration-300 ${enableQuizFeedback ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 shadow-[0_10px_32px_rgba(124,58,237,0.45)]' : 'bg-white/10'}`}
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300"
                style={{ transform: enableQuizFeedback ? 'translateX(2.8rem)' : 'translateX(0.2rem)' }}
              >
                {enableQuizFeedback ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                )}
              </span>
            </button>
          </div>
        </section>
      );
    }

    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/70 to-slate-900/70 p-6 shadow-[0_18px_45px_rgba(17,17,34,0.55)]">
          <h3 className="text-lg font-semibold text-white">Account status</h3>
          {sessionEmail ? (
            <p className="mt-2 text-sm text-white/70">Signed in as <span className="font-semibold text-white">{sessionEmail}</span></p>
          ) : (
            <p className="mt-2 text-sm text-white/70">Not signed in. Use the Account button to authenticate and sync settings across devices.</p>
          )}
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/70 via-purple-950/60 to-slate-950/70 p-6">
          <div className="absolute -top-16 left-0 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Gemini API key</h4>
              <p className="mt-1 text-sm text-white/60">Store your key securely so Elevated AI can orchestrate Gemini calls on your behalf.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key"
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-mono tracking-[0.35em] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${apiKeyVisible ? 'border-white/25 bg-slate-900/70 text-white/90' : 'border-white/10 bg-[rgba(8,8,15,0.92)] text-white/70'}`}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setApiKeyVisible(v => !v)}
                  aria-pressed={apiKeyVisible}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 transition-all duration-200 hover:bg-white/15"
                  title={apiKeyVisible ? 'Hide API key' : 'Show API key'}
                  aria-label={apiKeyVisible ? 'Hide API key' : 'Show API key'}
                >
                  {apiKeyVisible ? 'Hide' : 'Reveal'}
                </button>
                <button
                  onClick={async () => {
                    setAccountMsg(null);
                    const res = await saveUserApiKey(apiKeyInput.trim());
                    setAccountMsg(res.ok ? 'API key saved to your account' : `Failed to save: ${res.error}`);
                    if (res.ok) setHasServerKey(true);
                  }}
                  className="rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_12px_30px_rgba(124,58,237,0.45)] transition-transform duration-200 hover:translate-y-[-1px]"
                >
                  Save key
                </button>
                <button
                  onClick={async () => {
                    try {
                      await supabase?.auth.signOut();
                      setApiKeyInput('');
                      setAccountMsg('Signed out');
                    } catch {}
                  }}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition-all duration-200 hover:bg-white/15"
                >
                  Sign out
                </button>
              </div>
            </div>
            {accountMsg && <p className="text-sm text-purple-200">{accountMsg}</p>}
            {hasServerKey && !accountMsg && (
              <p className="text-xs text-white/55">Key stored securely on the server. We never persist it in your browser.</p>
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl" onClick={onClose} />

      <div ref={containerRef} className="relative w-full max-w-5xl max-h-[90vh] max-h-[90dvh] overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/95 via-indigo-950/90 to-slate-950/95 shadow-[0_25px_90px_rgba(10,10,26,0.65)]">
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at top left, rgba(124,58,237,0.25), transparent 55%)' }}></div>
        <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at bottom right, rgba(56,189,248,0.25), transparent 60%)' }}></div>

        <div className="relative flex h-full flex-col">
          <header className="flex flex-col gap-4 border-b border-white/10 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Control center
              </div>
              <h2 id="settings-title" className="mt-3 text-3xl font-black text-white tracking-tight">Elevated AI Settings</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/60">Shape the platform around your learning style. Changes apply instantly and sync across sessions.</p>
            </div>
            <button onClick={onClose} className="self-start rounded-full border border-white/15 bg-white/10 p-3 text-white/80 transition hover:bg-white/20" aria-label="Close settings">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </header>

          <nav className="border-b border-white/10 px-4 pb-4 pt-3 sm:px-6" role="tablist">
            <div className="flex flex-wrap gap-2">
              {tabs.map(tab => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:min-w-[10rem] ${isActive ? 'border-white/35 bg-white/12 shadow-[0_12px_35px_rgba(124,58,237,0.25)]' : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'}`}
                    aria-selected={isActive}
                  >
                    <span className="block text-sm font-semibold text-white">{tab.label}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-white/55">{tab.blurb}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="relative flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar px-4 py-6 sm:px-6" style={{ WebkitOverflowScrolling: "touch" }}>
              {renderTabContent()}
            </div>
          </main>

          <footer className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-white/55">All changes are saved automatically. Restoring defaults clears local preferences.</p>
            <button onClick={resetToDefaults} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7l1-4h10l1 4M6 10v10a1 1 0 001 1h10a1 1 0 001-1V10"/></svg>
              Reset to defaults
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;


