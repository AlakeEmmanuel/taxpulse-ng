import React, { useState } from 'react';
import { Company } from '../types';
import { AppView } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  activeCompany: Company | null;
  currentView: AppView;
  onSelectCompany: (c: Company) => void;
  onAddCompany: () => void;
  companies?: Company[];
  onNavigate: (view: AppView) => void;
  isPro?: boolean;
  onSignOut?: () => void;
  onUpgrade?: () => void;
}

const MAIN_NAV: { icon: string; label: string; view: AppView }[] = [
  { icon: '🏠', label: 'Home',        view: 'dashboard' },
  { icon: '📊', label: 'Calculators', view: 'calculators' },
  { icon: '👤', label: 'Income Tax',  view: 'pit' },
  { icon: '📒', label: 'Ledger',      view: 'ledger' },
  { icon: '🤖', label: 'AI Help',     view: 'ai' },
];

const TOOLS_NAV: { icon: string; label: string; view: AppView }[] = [
  { icon: '🗄️',  label: 'Evidence Vault', view: 'vault' },
  { icon: '⚠️',  label: 'Penalties',      view: 'penalties' },
  { icon: '📄',  label: 'PDF Export',     view: 'export' },
  { icon: '🏦',  label: 'Bank Import',    view: 'import' },
  { icon: '🧾',  label: 'Payslips',        view: 'payslip' },
];

// Mobile shows only the 5 most-used + settings
const MOBILE_NAV: { icon: string; label: string; view: AppView }[] = [
  { icon: '🏠', label: 'Home',    view: 'dashboard' },
  { icon: '📒', label: 'Ledger',  view: 'ledger' },
  { icon: '🗄️', label: 'Vault',   view: 'vault' },
  { icon: '🤖', label: 'AI Help', view: 'ai' },
  { icon: '⚙️', label: 'More',    view: 'settings' },
];

const Layout: React.FC<LayoutProps> = ({
  children, activeCompany, currentView, companies = [],
  onSelectCompany, onAddCompany, onNavigate,
  isPro = false, onSignOut, onUpgrade
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-9 w-auto" />
        </button>

        <div className="flex items-center gap-2">
<div className="flex items-center gap-1.5">
            {isPro && <span className="hidden sm:block bg-amber-400 text-amber-900 text-[9px] font-black px-2.5 py-1 rounded-full">PRO</span>}
            {!isPro && onUpgrade && <button onClick={onUpgrade} className="hidden sm:block text-[10px] font-black text-cac-green border border-cac-green/30 px-2.5 py-1 rounded-full hover:bg-green-50">Upgrade</button>}
            <button onClick={() => onNavigate('settings')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${currentView === 'settings' ? 'bg-cac-green text-white' : 'text-slate-400 hover:bg-slate-100'}`} title="Settings">⚙️</button>
            {onSignOut && <button onClick={onSignOut} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" title="Sign out"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>}
          </div>

          {activeCompany && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 bg-cac-green rounded-lg flex items-center justify-center text-white font-black text-sm">
                {activeCompany.name.charAt(0)}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{activeCompany.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate max-w-[120px]">{activeCompany.state}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-slate-400" viewBox="0 0 16 16">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Company Switcher Dropdown */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end pt-16 px-4 bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-4 mt-1"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Switch Business</h3>
            <div className="space-y-1">
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => { onSelectCompany(c); setIsMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeCompany?.id === c.id ? 'bg-cac-green/10 border border-cac-green/20' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm ${activeCompany?.id === c.id ? 'bg-cac-green' : 'bg-slate-300'}`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.state} · {c.entityType.split(' ')[0]}</p>
                  </div>
                  {activeCompany?.id === c.id && <span className="ml-auto text-cac-green text-xs font-black">✓</span>}
                </button>
              ))}
              <button
                onClick={() => { onAddCompany(); setIsMenuOpen(false); }}
                className="w-full mt-2 flex items-center justify-center gap-2 p-3 text-cac-green font-bold text-sm border-2 border-dashed border-cac-green/30 rounded-xl hover:bg-green-50 transition-colors"
              >
                + Add New Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Side Navigation */}
      <div className="hidden md:flex fixed left-0 top-[65px] bottom-0 w-56 bg-white border-r border-slate-100 flex-col py-4 px-3 z-30 overflow-y-auto">
        {/* Main nav */}
        <nav className="space-y-1">
          {MAIN_NAV.map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === item.view
                  ? 'bg-cac-green text-white shadow-lg shadow-cac-green/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Tools section */}
        <div className="mt-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">Tools</p>
          <nav className="space-y-1">
            {TOOLS_NAV.map(item => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  currentView === item.view
                    ? 'bg-cac-green text-white shadow-lg shadow-cac-green/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom: Settings + NTA badge */}
        <div className="mt-auto space-y-2 pt-4">
          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'settings' ? 'bg-cac-green text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">⚙️</span>
            Settings
          </button>
          <div className={`px-3 py-3 rounded-xl border ${isPro ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${isPro ? 'text-amber-700' : 'text-cac-green'}`}>{isPro ? '⭐ Pro Plan' : 'Free Plan'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{isPro ? 'Full access · NTA 2025 ✓' : '1 company · Upgrade for more'}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:pl-64 md:p-8 md:pb-8 max-w-5xl md:max-w-none w-full mx-auto md:mx-0">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around py-2 z-40 md:hidden">
        {MOBILE_NAV.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-0.5 px-2 transition-colors ${
              currentView === item.view ? 'text-cac-green' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
