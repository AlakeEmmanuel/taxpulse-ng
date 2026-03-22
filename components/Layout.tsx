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
  isAdmin?: boolean;
  onSignOut?: () => void;
  onUpgrade?: () => void;
}

// ── SVG Icon set ─────────────────────────────────────────────────────────────
const Ico = ({ d, d2, type = 'path' }: { d: string; d2?: string; type?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
);

const Icons: Record<string, React.ReactNode> = {
  home:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  calc:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>,
  person:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  ledger:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  ai:         <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="13.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
  vault:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  warning:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  pdf:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  bank:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
  payslip:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  invoice:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  salary:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  planner:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  tcc:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  fx:         <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  payroll:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  signout:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  plus:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

const MAIN_NAV: { iconKey: string; label: string; view: AppView }[] = [
  { iconKey: 'home',   label: 'Home',        view: 'dashboard'  },
  { iconKey: 'calc',   label: 'Calculators', view: 'calculators'},
  { iconKey: 'person', label: 'Income Tax',  view: 'pit'        },
  { iconKey: 'ledger', label: 'Ledger',      view: 'ledger'     },
  { iconKey: 'ai',     label: 'AI Help',     view: 'ai'         },
];

const TOOLS_NAV: { iconKey: string; label: string; view: AppView }[] = [
  { iconKey: 'vault',   label: 'Evidence Vault', view: 'vault'      },
  { iconKey: 'warning', label: 'Penalties',      view: 'penalties'  },
  { iconKey: 'pdf',     label: 'PDF Export',     view: 'export'     },
  { iconKey: 'bank',    label: 'Bank Import',    view: 'import'     },
  { iconKey: 'payslip', label: 'Payslips',       view: 'payslip'    },
  { iconKey: 'invoice', label: 'Invoices',       view: 'invoice'    },
  { iconKey: 'salary',  label: 'Salary Sim',     view: 'salary'     },
  { iconKey: 'planner', label: 'Tax Planner',    view: 'planner'    },
  { iconKey: 'tcc',     label: 'TCC Tracker',    view: 'tcc'        },
  { iconKey: 'fx',      label: 'Foreign Income', view: 'fx'         },
  { iconKey: 'payroll', label: 'Payroll CSV',    view: 'payroll-csv'},
];

const MOBILE_NAV: { iconKey: string; label: string; view: AppView }[] = [
  { iconKey: 'home',     label: 'Home',    view: 'dashboard' },
  { iconKey: 'ledger',   label: 'Ledger',  view: 'ledger'    },
  { iconKey: 'vault',    label: 'Vault',   view: 'vault'     },
  { iconKey: 'ai',       label: 'AI Help', view: 'ai'        },
  { iconKey: 'settings', label: 'More',    view: 'settings'  },
];

const Layout: React.FC<LayoutProps> = ({
  children, activeCompany, currentView, companies = [],
  onSelectCompany, onAddCompany, onNavigate,
  isPro = false, isAdmin = false, onSignOut, onUpgrade
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <button onClick={() => onNavigate('dashboard')} className="flex items-center hover:opacity-80 transition-opacity">
          <img src="/logo-full.png" alt="TaxPulse NG" className="h-9 w-auto" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {isPro && <span className="hidden sm:block bg-amber-400 text-amber-900 text-[9px] font-black px-2.5 py-1 rounded-full">PRO</span>}
            {!isPro && onUpgrade && <button onClick={onUpgrade} className="hidden sm:block text-[10px] font-black text-cac-green border border-cac-green/30 px-2.5 py-1 rounded-full hover:bg-green-50">Upgrade</button>}
            <button
              onClick={() => onNavigate('settings')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${currentView === 'settings' ? 'bg-cac-green text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Settings"
            >
              {Icons.settings}
            </button>
            {isAdmin && <a href="/admin" className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors" title="Admin Panel">{Icons.settings}</a>}
            {onSignOut && (
              <button onClick={onSignOut} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" title="Sign out">
                {Icons.signout}
              </button>
            )}
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
              <span className="text-slate-400">{Icons.chevron}</span>
            </button>
          )}
        </div>
      </header>

      {/* Company Switcher Dropdown */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 px-4 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-4 mt-1" onClick={e => e.stopPropagation()}>
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
                    <p className="text-xs text-slate-400">{c.state} · {c.entityType.split('')[0]}</p>
                  </div>
                  {activeCompany?.id === c.id && <span className="ml-auto text-cac-green">{Icons.check}</span>}
                </button>
              ))}
              <button
                onClick={() => { onAddCompany(); setIsMenuOpen(false); }}
                className="w-full mt-2 flex items-center justify-center gap-2 p-3 text-cac-green font-bold text-sm border-2 border-dashed border-cac-green/30 rounded-xl hover:bg-green-50 transition-colors"
              >
                <span>{Icons.plus}</span> Add New Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Side Navigation */}
      <div className="hidden md:flex fixed left-0 top-[65px] bottom-0 w-56 bg-white border-r border-slate-100 flex-col py-4 px-3 z-30 overflow-y-auto">
        <nav className="space-y-0.5">
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
              {Icons[item.iconKey]}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">Tools</p>
          <nav className="space-y-0.5">
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
                {Icons[item.iconKey]}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'settings' ? 'bg-cac-green text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {Icons.settings}
            Settings
          </button>
          <div className={`px-3 py-3 rounded-xl border ${isPro ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${isPro ? 'text-amber-700' : 'text-cac-green'}`}>{isPro ? 'Pro Plan' : 'Free Plan'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{isPro ? 'Full access · NTA 2025' : '1 company · Upgrade for more'}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:pl-64 md:p-8 md:pb-8 max-w-5xl md:max-w-none w-full mx-auto md:mx-0">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around py-2 z-40 md:hidden pb-safe">
        {MOBILE_NAV.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
              currentView === item.view ? 'text-cac-green' : 'text-slate-400'
            }`}
          >
            {Icons[item.iconKey]}
            <span className="text-[9px] font-black uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
