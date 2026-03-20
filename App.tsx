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
import { BankImport } from './pages/BankImport';
import { AuthPage } from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import { Paywall } from './pages/Paywall';
import { PayslipGenerator } from './pages/PayslipGenerator';
import { InvoiceGenerator } from './pages/InvoiceGenerator';
import { SalarySimulator, AnnualTaxPlanner, TCCTracker, PayrollCSVExport } from './pages/Phase2Tools';
import { AccountantView } from './pages/AccountantShare';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Company } from './types';
import { UserProfile, getProfile, isPro, signOut } from './services/auth';
import * as db from './services/db';
import { generateObligations } from './utils/taxEngine';
import { supabase } from './services/supabaseClient';

export type AppView =
  | 'dashboard' | 'onboarding' | 'calculators' | 'pit'
  | 'ledger' | 'settings' | 'ai' | 'vault' | 'penalties' | 'export' | 'import' | 'payslip' | 'invoice'
  | 'salary' | 'planner' | 'tcc' | 'payroll-csv';

const PRO_VIEWS: AppView[] = ['ai', 'vault', 'export', 'import', 'payslip', 'invoice'];

const LockedFeature: React.FC<{ name: string; onUpgrade: () => void }> = ({ name, onUpgrade }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-5">
    <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center text-4xl">🔒</div>
    <div>
      <h2 className="text-xl font-extrabold text-slate-900">{name} is a Pro feature</h2>
      <p className="text-slate-500 text-sm mt-2 max-w-sm">Upgrade to TaxPulse Pro to unlock AI assistance, PDF exports, Evidence Vault and unlimited companies.</p>
    </div>
    <button onClick={onUpgrade} className="bg-cac-green text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-cac-dark transition-colors">
      Upgrade to Pro -- ₦5,000/month
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

// Three possible states -- loading hides everything until we know what to show
type AppState = 'loading' | 'unauthenticated' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState]           = useState<AppState>('loading');
  const [seedingSchedule, setSeedingSchedule] = useState(false);
  const [showLanding, setShowLanding]       = useState(true);
  const [userId, setUserId]               = useState<string | null>(null);
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [showPaywall, setShowPaywall]     = useState(false);
  const [companies, setCompanies]         = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [view, setView]                   = useState<AppView>('dashboard');

  useEffect(() => {
    let handled = false;

    // Fallback: if onAuthStateChange doesn't fire within 3s, check session manually
    const fallback = setTimeout(async () => {
      if (handled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        handled = true;
        await loadUserData(session.user.id);
      } else {
        handled = true;
        setAppState('unauthenticated');
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // IMPORTANT: Do NOT await inside this callback -- it holds Supabase auth lock
        // Use setTimeout(..., 0) to run async work after lock is released
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          clearTimeout(fallback);
          handled = true;
          if (session?.user) {
            const uid = session.user.id;
            // TOKEN_REFRESHED fires SIGNED_IN again -- only load if not already ready
            setTimeout(() => {
              setAppState(prev => {
                if (prev !== 'ready') { loadUserData(uid); }
                return prev;
              });
            }, 0);
          } else {
            setAppState('unauthenticated');
          }
        }
        if (event === 'SIGNED_OUT') {
          clearTimeout(fallback);
          setUserId(null);
          setProfile(null);
          setCompanies([]);
          setActiveCompany(null);
          setAppState('unauthenticated');
        }
      }
    );
    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  const loadUserData = async (uid: string) => {
    (window as any).__taxpulse_uid = uid;
    setUserId(uid);
    try {
        const prof = await getProfile(uid);
  
        const list = await db.getCompanies();
  
      setProfile(prof);
      setCompanies(list);
      if (list.length > 0) {
        setActiveCompany(list[0]);
        setView('dashboard');
      } else {
        setView('onboarding');
      }
    } catch (err) {
      console.error('loadUserData error:', err);
      setView('onboarding');
    }
    setAppState('ready');
  };

  const handleNavigate = (v: AppView) => {
    if (PRO_VIEWS.includes(v) && !isPro(profile)) { setShowPaywall(true); return; }
    setView(v);
  };

  const handleCompanyAdded = async (company: Company) => {
    if (companies.length >= 1 && !isPro(profile)) { setShowPaywall(true); return; }
    try {
      // 1. Save company first -- DB returns real UUID
      const saved = await db.addCompany(company);
      // 2. Show seeding overlay, seed obligations with real company ID
      setSeedingSchedule(true);
      const obligations = generateObligations({ ...company, id: saved.id });
      for (const ob of obligations) {
        await db.addObligation({ ...ob, id: '' }).catch(() => {});
      }
      setCompanies(prev => [...prev, saved]);
      setActiveCompany(saved);
      setView('dashboard');
    } catch (e: any) { alert('Error saving company: ' + e.message); }
    finally { setSeedingSchedule(false); }
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

  // Always show spinner until we know the auth state AND data is loaded
  // Handle accountant share link (?share=TOKEN)
  const shareToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('share')
    : null;
  if (shareToken) return <AccountantView token={shareToken} />;

  if (appState === 'loading')         return <Spinner msg="Starting TaxPulse NG..." />;
  if (seedingSchedule) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50">
      <div className="text-center space-y-5 px-6">
        <div className="w-20 h-20 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto" />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Building your tax calendar</h2>
          <p className="text-slate-500 text-sm mt-2">Creating 12 months of obligations based on your company profile...</p>
        </div>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {['VAT deadlines (monthly, 21st)', 'PAYE schedule (monthly, 10th)', 'WHT remittance (monthly, 21st)', 'CIT filing (annual)'].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-4 h-4 bg-cac-green rounded-full flex items-center justify-center text-white text-xs">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (appState === 'unauthenticated') {
    if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    return <AuthPage />;
  }
  if (showPaywall) return (
    <Paywall profile={profile!} onUpgraded={handleUpgraded} onContinueFree={() => setShowPaywall(false)} />
  );

  // No company yet -- show onboarding with header
  if (companies.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <img src="/logo-full.png" alt="TaxPulse NG" className="h-9 w-auto" />
        <button onClick={async () => { await signOut(); }} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
      </header>
      <div className="flex-1 p-4">
        <Onboarding onComplete={handleCompanyAdded} />
      </div>
    </div>
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
      {view === 'import'   && (proUser ? <BankImport company={activeCompany!} onNavigate={handleNavigate} /> : <LockedFeature name="Bank Import" onUpgrade={() => setShowPaywall(true)} />)}
      {view === 'payslip'  && (proUser ? <PayslipGenerator company={activeCompany!} /> : <LockedFeature name="Payslip Generator" onUpgrade={() => setShowPaywall(true)} />)}
      {view === 'invoice'     && (proUser ? <InvoiceGenerator company={activeCompany!} /> : <LockedFeature name="Invoice Generator" onUpgrade={() => setShowPaywall(true)} />)}
      {view === 'salary'      && <SalarySimulator />}
      {view === 'planner'     && activeCompany && <AnnualTaxPlanner company={activeCompany} />}
      {view === 'tcc'         && activeCompany && <TCCTracker company={activeCompany} />}
      {view === 'payroll-csv' && activeCompany && <PayrollCSVExport company={activeCompany} />}
    </Layout>
  );
};

const AppWithBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;
