import React, { useState } from 'react';
import { signInEmail, signUpEmail } from '../services/auth';

type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        if (!fullName) { setError('Please enter your full name.'); setLoading(false); return; }
        await signUpEmail(email, password, fullName);
        setMessage('Account created! Check your email to confirm, then sign in.');
        setMode('login');
        setPassword('');
      } else {
        await signInEmail(email, password);
        // onAuthStateChange in App.tsx handles the rest
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address first.'); return; }
    const { supabase } = await import('../services/supabaseClient');
    await supabase.auth.resetPasswordForEmail(email);
    setMessage('Password reset email sent!');
  };

  const EyeIcon = () => showPassword ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-10 w-auto mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nigeria's smart tax compliance platform</p>
          <span className="inline-block mt-2 bg-cac-green text-white text-[10px] font-black px-3 py-1 rounded-full tracking-wide">
            NTA 2025 COMPLIANT
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setMessage(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  mode === m ? 'text-cac-green border-b-2 border-cac-green' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">

            {/* Alerts */}
            {error   && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-semibold">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-cac-green font-semibold">{message}</div>}

            {/* Full name (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Chidi Okonkwo" autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white transition-all"
              />
            </div>

            {/* Password with eye toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            {/* Promo code (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Promo Code <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                <input
                  type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)}
                  placeholder="Enter code if you have one"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white transition-all font-mono tracking-wider uppercase"
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-cac-green text-white py-3.5 rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 transition-colors"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Forgot password */}
            {mode === 'login' && (
              <p className="text-center text-xs text-slate-400">
                Forgot your password?{' '}
                <button onClick={handleForgotPassword} className="text-cac-green font-bold hover:underline">
                  Reset it
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Your data is encrypted and stored securely.<br />TaxPulse NG never sells your information.
        </p>
      </div>
    </div>
  );
};
