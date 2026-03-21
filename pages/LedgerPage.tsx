import React, { useState, useEffect } from 'react';
import { Company, LedgerEntry } from '../types';
import * as db from '../services/db';
import { Card } from '../components/Shared';

interface LedgerPageProps { company: Company; }

type Filter = 'all' | 'sale' | 'expense';

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const LedgerPage: React.FC<LedgerPageProps> = ({ company }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [all, setAll] = useState<LedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    setLoadingEntries(true);
    db.getLedgers(company.id)
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoadingEntries(false));
  }, [company.id]);
  const filtered = all
    .filter(e => filter === 'all' || e.type === filter)
    .filter(e => !search || e.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome  = all.filter(e => e.type === 'sale').reduce((s, e) => s + e.amount, 0);
  const totalExpense = all.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalVAT     = all.filter(e => e.type === 'sale').reduce((s, e) => s + e.taxAmount, 0);
  const totalWHT     = all.filter(e => e.type === 'expense').reduce((s, e) => s + e.taxAmount, 0);
  const netPosition  = totalIncome - totalExpense;

  if (loadingEntries) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span></div>
        <p className="text-slate-500 text-sm">Loading transactions...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Transactions Ledger</h1>
        <p className="text-slate-500 text-sm">{company.name} · All recorded income and expenses</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Income"    value={fmt(totalIncome)}   color="text-cac-green"  bg="bg-green-50"  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <SummaryCard label="Total Expenses"  value={fmt(totalExpense)}  color="text-orange-600" bg="bg-orange-50" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>} />
        <SummaryCard label="VAT Collected"   value={fmt(totalVAT)}      color="text-blue-600"   bg="bg-blue-50"   icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>} />
        <SummaryCard label="WHT Deducted"    value={fmt(totalWHT)}      color="text-purple-600" bg="bg-purple-50" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>} />
      </div>

      {/* Net position banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between ${netPosition >= 0 ? 'bg-cac-green text-white' : 'bg-red-500 text-white'}`}>
        <div>
          <p className="text-xs font-black uppercase opacity-70 tracking-wider">Net Position (Income − Expenses)</p>
          <p className="text-2xl font-extrabold mt-0.5">{fmt(Math.abs(netPosition))}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl">{netPosition >= 0 ? (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>) : (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg></span>)}</p>
          <p className="text-xs opacity-70 mt-1">{netPosition >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
      </div>

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {(['all', 'sale', 'expense'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-white text-cac-green shadow' : 'text-slate-500'}`}
            >
              {f === 'all' ? 'All' : f === 'sale' ? '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Income' : '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg></span> Expenses'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/20 focus:border-cac-green"
        />
      </div>

      {/* Transactions list */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-4xl mb-3"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></span></p>
          <p className="font-bold text-slate-700">
            {all.length === 0 ? 'No transactions yet' : 'No transactions match your filter'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {all.length === 0 ? 'Use Add Sale, Add Expense or Import Bank Statement from the dashboard' : 'Try adjusting your search or filter'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Group by month */}
          {groupByMonth(filtered).map(({ month, entries }) => (
            <div key={month}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 mt-4 px-1">{month}</p>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-white border border-slate-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:border-slate-200 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${entry.type === 'sale' ? 'bg-green-50' : 'bg-orange-50'}`}>
                    {entry.type === 'sale' ? (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>) : (<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg></span>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{entry.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {entry.taxAmount > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.type === 'sale' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {entry.type === 'sale' ? `VAT: ${fmt(entry.taxAmount)}` : `WHT: ${fmt(entry.taxAmount)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-extrabold ${entry.type === 'sale' ? 'text-cac-green' : 'text-orange-600'}`}>
                      {entry.type === 'sale' ? '+' : '-'}{fmt(entry.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{entry.type}</p>
                  </div>
                </div>
              ))}
              {/* Month subtotal */}
              <div className="flex justify-between text-xs font-bold px-4 py-2 text-slate-400">
                <span>
                  {entries.filter(e => e.type === 'sale').length} income &nbsp;·&nbsp; {entries.filter(e => e.type === 'expense').length} expense
                </span>
                <span>
                  Net: <span className={entries.reduce((s,e) => s + (e.type === 'sale' ? e.amount : -e.amount), 0) >= 0 ? 'text-cac-green' : 'text-red-500'}>
                    {fmt(Math.abs(entries.reduce((s,e) => s + (e.type === 'sale' ? e.amount : -e.amount), 0)))}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pb-4">
        Showing {filtered.length} of {all.length} transactions
      </p>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: string }> = ({ label, value, color, bg, icon }) => (
  <div className={`${bg} rounded-2xl p-4`}>
    <p className="text-xl mb-2">{icon}</p>
    <p className={`text-lg font-extrabold ${color}`}>{value}</p>
    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-0.5">{label}</p>
  </div>
);

const groupByMonth = (entries: LedgerEntry[]) => {
  const map = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    const key = d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).map(([month, entries]) => ({ month, entries }));
};
