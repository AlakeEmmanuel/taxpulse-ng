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
import { Company } from './types';
import * as db from './services/db';

export type AppView =
  | 'dashboard' | 'onboarding' | 'calculators' | 'pit'
  | 'ledger' | 'settings' | 'ai' | 'vault' | 'penalties' | 'export';

const Spinner = ({ msg = 'Loading...' }: { msg?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-600 font-bold">{msg}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    db.getCompanies()
      .then(list => {
        setCompanies(list);
        if (list.length > 0) {
          setActiveCompany(list[0]);
          setView('dashboard');
        } else {
          setView('onboarding');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCompanyAdded = async (company: Company) => {
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

  if (loading) return <Spinner msg="TaxPulse NG" />;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <p className="font-bold text-slate-900">Database connection error</p>
        <p className="text-sm text-slate-500 font-mono bg-slate-50 p-3 rounded-lg">{error}</p>
        <p className="text-xs text-slate-400">Check your <strong>.env.local</strong> Supabase keys</p>
        <button onClick={() => window.location.reload()}
          className="bg-cac-green text-white px-6 py-2.5 rounded-xl font-bold text-sm">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <Layout
      companies={companies}
      activeCompany={activeCompany}
      currentView={view}
      onNavigate={setView}
      onSelectCompany={(c) => { setActiveCompany(c); setView('dashboard'); }}
      onAddCompany={() => setView('onboarding')}
    >
      {view === 'onboarding'  && <Onboarding onComplete={handleCompanyAdded} />}
      {view === 'dashboard'   && activeCompany && <Dashboard company={activeCompany} onNavigate={setView} />}
      {view === 'calculators' && <CalculatorsPage />}
      {view === 'pit'         && <PITCalculator />}
      {view === 'ledger'      && activeCompany && <LedgerPage company={activeCompany} />}
      {view === 'penalties'   && <PenaltyCalculator />}
      {view === 'settings'    && activeCompany && <SettingsPage company={activeCompany} onCompanyUpdate={handleCompanySaved} />}
      {view === 'ai'          && activeCompany && <AIAssistant company={activeCompany} />}
      {view === 'vault'       && activeCompany && <EvidenceVault company={activeCompany} />}
      {view === 'export'      && activeCompany && <TaxExport company={activeCompany} />}
    </Layout>
  );
};

export default App;
