import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import { CalculatorsPage } from './pages/Calculators';
import { PITCalculator } from './pages/PITCalculator';
import { LedgerPage } from './pages/LedgerPage';
import { SettingsPage } from './pages/Settings';
import { AIAssistant } from './pages/AIAssistant';
import { EvidenceVault } from './pages/EvidenceVault';
import { PenaltyCalculator } from './pages/PenaltyCalculator';
import { TaxExport } from './pages/TaxExport';
import { AuthPage } from './pages/AuthPage';
import { Paywall } from './pages/Paywall';
import { Company } from './types';
import { UserProfile, getProfile, isPro, signOut } from './services/auth';
import * as db from './services/db';
import { supabase } from './services/supabaseClient';

export type AppView =
  | 'dashboard' | 'onboarding' | 'calculators' | 'pit'
  | 'ledger' | 'settings' | 'ai' | 'vault' | 'penalties' | 'export';

const PRO_VIEWS: AppView[] = ['ai', 'vault', 'export'];

const LockedFeature: React.FC<{ name: string; onUpgrade: () => void }> = ({ name, onUpgrade }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-5">
    <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center text-4xl">🔒</div>
    <div>
      <h2 className="text-xl font-extrabold text-slate-900">{name} is a Pro feature</h2>
      <p className="text-slate-500 text-sm mt-2 max-w-sm">Upgrade to TaxPulse Pro to unlock AI assistance, PDF exports, Evidence Vault and unlimited companies.</p>
    </div>
    <button onClick={onUpgrade} className="bg-cac-green text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-cac-dark transition-colors">
      Upgrade to Pro — ₦2,500/month
    </button>
  </div>
);

const Spinner = ({ msg = 'Loading...' }: { msg?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-500 text-sm">{msg}</p>
    </div>
  </div>
);

type AppState = 'loading' | 'unauthenticated' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState]       = useState<AppState>('loading');
  const [userId, setUserId]           = useState<string | null>(null);
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [view, setView]               = useState<AppView>('dashboard');

  useEffect(() => {
    // ── Single source of truth: onAuthStateChange ──────────────
    // INITIAL_SESSION fires immediately on load with current session
    // SIGNED_IN fires when user logs in
    // SIGNED_OUT fires when user logs out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await loadUserData(session.user.id);
          } else {
            setAppState('unauthenticated');
          }
        }

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user.id);
        }

        if (event === 'SIGNED_OUT') {
          setUserId(null);
          setProfile(null);
          setCompanies([]);
          setActiveCompany(null);
          setAppState('unauthenticated');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    (window as any).__taxpulse_uid = uid;
    setUserId(uid);

    let prof: UserProfile | null = null;
    let list: Company[] = [];

    try {
      prof = await Promise.race([
        getProfile(uid),
        new Promise<null>(r => setTimeout(() => r(null), 5000))
      ]);
    } catch (e) { console.error('getProfile error:', e); }

    try {
      const result = await Promise.race([
        db.getCompanies(),
        new Promise<Company[]>(r => setTimeout(() => r([]), 5000))
      ]);
      list = result || [];
    } catch (e) { console.error('getCompanies error:', e); }

    setProfile(prof);
    setCompanies(list);
    setActiveCompany(list[0] || null);
    setView(list.length > 0 ? 'dashboard' : 'onboarding');
    setAppState('ready');
  };

  const handleNavigate = (v: AppView) => {
    if (PRO_VIEWS.includes(v) && !isPro(profile)) { setShowPaywall(true); return; }
    setView(v);
  };

  const handleCompanyAdded = async (company: Company) => {
    if (!isPro(profile) && companies.length >= 1) { setShowPaywall(true); return; }
    try {
      const saved = await db.addCompany(company);
      setCompanies(prev => [...prev, saved]);
      setActiveCompany(saved);
      setView('dashboard');
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleCompanySaved = async (updated: Company) => {
    try {
      await db.updateCompany(updated);
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
      setActiveCompany(updated);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleUpgraded = async () => {
    if (userId) setProfile(await getProfile(userId));
    setShowPaywall(false);
  };

  if (appState === 'loading')          return <Spinner msg="Starting TaxPulse NG..." />;
  if (appState === 'unauthenticated')  return <AuthPage />;
  if (showPaywall) return (
    <Paywall profile={profile!} onUpgraded={handleUpgraded} onContinueFree={() => setShowPaywall(false)} />
  );

  const proUser = isPro(profile);

  return (
    <Layout
      companies={companies}
      activeCompany={activeCompany}
      currentView={view}
      onNavigate={handleNavigate}
      onSelectCompany={(c) => { setActiveCompany(c); setView('dashboard'); }}
      onAddCompany={() => setView('onboarding')}
      isPro={proUser}
      onSignOut={async () => { await signOut(); }}
      onUpgrade={() => setShowPaywall(true)}
    >
      {view === 'onboarding'  && <Onboarding onComplete={handleCompanyAdded} />}
      {view === 'dashboard'   && activeCompany && <Dashboard company={activeCompany} onNavigate={handleNavigate} />}
      {view === 'calculators' && <CalculatorsPage />}
      {view === 'pit'         && <PITCalculator />}
      {view === 'ledger'      && activeCompany && <LedgerPage company={activeCompany} />}
      {view === 'penalties'   && <PenaltyCalculator />}
      {view === 'settings'    && activeCompany && <SettingsPage company={activeCompany} onCompanyUpdate={handleCompanySaved} />}
      {view === 'ai'     && (proUser ? <AIAssistant company={activeCompany!} /> : <LockedFeature name="AI Tax Assistant" onUpgrade={() => setShowPaywall(true)} />)}
      {view === 'vault'  && (proUser ? <EvidenceVault company={activeCompany!} /> : <LockedFeature name="Evidence Vault" onUpgrade={() => setShowPaywall(true)} />)}
      {view === 'export' && (proUser ? <TaxExport company={activeCompany!} /> : <LockedFeature name="PDF Export" onUpgrade={() => setShowPaywall(true)} />)}
    </Layout>
  );
};

export default App;
