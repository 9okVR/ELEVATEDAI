import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setShow(true), 20);
      return () => clearTimeout(t);
    } else {
      setShow(false);
      const t = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!shouldRender) return null;

  const doAuth = async () => {
    setMessage(null);
    try {
      if (!supabase) { setMessage('Supabase not configured'); return; }
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMessage(error ? error.message : 'Signed in');
        if (!error) onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        setMessage(error ? error.message : 'Check your email to confirm');
        if (!error) onClose();
      }
    } catch (e) {
      setMessage('Authentication failed');
    }
  };

  const signInWithDiscord = async () => {
    setMessage(null);
    try {
      if (!supabase) { setMessage('Supabase not configured'); return; }
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
          scopes: 'identify email',
        },
      });
    } catch {
      setMessage('Discord sign-in failed');
    }
  };

  const signInWithApple = async () => {
    setMessage(null);
    try {
      if (!supabase) { setMessage('Supabase not configured'); return; }
      await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
          scopes: 'name email',
        },
      });
    } catch {
      setMessage('Apple sign-in failed');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain ${show ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-xl ${show ? 'opacity-100' : 'opacity-0'} transition-opacity`} onClick={onClose} />
      <div ref={modalRef} className={`relative w-full max-w-md bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'} transition-all`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20" aria-label="Close">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          {/* SSO Providers */}
          <div className="space-y-2">
            <button
              onClick={signInWithApple}
              className="w-full py-3 rounded-xl bg-white/90 text-black font-semibold hover:bg-white transition-colors"
            >
              Continue with Apple
            </button>
            <button
              onClick={signInWithDiscord}
              className="w-full py-3 rounded-xl bg-[#5865F2] text-white font-semibold hover:brightness-110 transition"
            >
              Continue with Discord
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-white/40 text-xs select-none">
            <div className="flex-1 h-px bg-white/10" />
            <span>or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/password */}
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full bg-white/5 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          {message && <p className="text-sm text-purple-300">{message}</p>}
          <button onClick={doAuth} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</button>
          <button onClick={()=>setMode(mode==='signin'?'signup':'signin')} className="w-full py-2 text-white/70 hover:text-white text-sm">
            {mode==='signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
