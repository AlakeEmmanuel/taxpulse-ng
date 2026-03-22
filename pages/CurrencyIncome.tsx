import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { calcPAYE } from '../utils/taxEngine';

interface Props { company: Company; }

interface FxRates { [key: string]: number; }

interface IncomeEntry {
  id: string;
  date: string;
  source: string;
  description: string;
  foreignAmount: number;
  currency: string;
  rateUsed: number;
  ngnAmount: number;
  taxEstimate: number;
  setAside: number;
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',          flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound',      flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro',               flag: '🇪🇺' },
  { code: 'CAD', name: 'Canadian Dollar',    flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar',  flag: '🇦🇺' },
  { code: 'USDT', name: 'Tether (Crypto)',   flag: '🔵' },
  { code: 'NGN', name: 'Nigerian Naira',     flag: '🇳🇬' },
];

const INCOME_SOURCES = [
  { label: 'YouTube AdSense',          category: 'Creator' },
  { label: 'TikTok Creator Fund',      category: 'Creator' },
  { label: 'Instagram Reels Bonus',    category: 'Creator' },
  { label: 'Fiverr',                   category: 'Freelance' },
  { label: 'Upwork',                   category: 'Freelance' },
  { label: 'Toptal',                   category: 'Freelance' },
  { label: 'Direct Client Payment',    category: 'Freelance' },
  { label: 'Brand Deal / Sponsorship', category: 'Creator' },
  { label: 'Substack / Newsletter',    category: 'Creator' },
  { label: 'Patreon / Memberships',    category: 'Creator' },
  { label: 'Consulting / Retainer',    category: 'Freelance' },
  { label: 'Remote Salary',            category: 'Employment' },
  { label: 'App Store Revenue',        category: 'Product' },
  { label: 'Play Store Revenue',       category: 'Product' },
  { label: 'Affiliate Commissions',    category: 'Creator' },
  { label: 'Amazon Associates',        category: 'Creator' },
  { label: 'Crypto Payment (USDT)',    category: 'Crypto' },
  { label: 'Ko-fi / Buy Me a Coffee',  category: 'Creator' },
  { label: 'Gumroad / Digital Products', category: 'Product' },
  { label: 'Other Foreign Income',     category: 'Other' },
];

const STORAGE_KEY = 'taxpulse_fx_income';
const fmt = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const fmtFx = (n: number, cur: string) => cur + ' ' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CurrencyIncome: React.FC<Props> = ({ company }) => {
  const [rates, setRates]             = useState<FxRates>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError]   = useState('');
  const [entries, setEntries]         = useState<IncomeEntry[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterSource, setFilterSource]     = useState('all');

  // Form state
  const [fDate, setFDate]         = useState(new Date().toISOString().slice(0, 10));
  const [fSource, setFSource]     = useState(INCOME_SOURCES[0].label);
  const [fDesc, setFDesc]         = useState('');
  const [fAmount, setFAmount]     = useState('');
  const [fCurrency, setFCurrency] = useState('USD');
  const [fRate, setFRate]         = useState('');
  const [fRateOverride, setFRateOverride] = useState(false);

  const annualIncome = company.annualIncome || 0;

  // Load saved entries
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_' + company.id);
    if (saved) setEntries(JSON.parse(saved));
  }, [company.id]);

  const save = (updated: IncomeEntry[]) => {
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY + '_' + company.id, JSON.stringify(updated));
  };

  // Fetch live FX rates
  useEffect(() => {
    setRatesLoading(true);
    fetch('https://api.exchangerate-api.com/v4/latest/NGN')
      .then(r => r.json())
      .then(data => {
        // Rates are NGN per 1 unit of foreign currency (inverted)
        const r: FxRates = {};
        Object.entries(data.rates).forEach(([k, v]) => {
          if (v && typeof v === 'number' && v > 0) {
            r[k] = 1 / v; // NGN per 1 unit of foreign currency
          }
        });
        r['USDT'] = r['USD'] || 1600; // Tether pegged to USD
        r['NGN'] = 1;
        setRates(r);
        setRatesLoading(false);
      })
      .catch(() => {
        // Fallback to approximate parallel market rates if API fails
        setRates({ USD: 1600, GBP: 2020, EUR: 1720, CAD: 1180, AUD: 1020, USDT: 1600, NGN: 1 });
        setRatesError('Using estimated rates — API unavailable');
        setRatesLoading(false);
      });
  }, []);

  // Update rate when currency changes in form
  useEffect(() => {
    if (!fRateOverride && rates[fCurrency]) {
      setFRate(rates[fCurrency].toFixed(2));
    }
  }, [fCurrency, rates, fRateOverride]);

  const getLiveRate = (currency: string) => rates[currency] || 0;

  const addEntry = () => {
    const foreignAmt = parseFloat(fAmount) || 0;
    const rate = parseFloat(fRate) || getLiveRate(fCurrency);
    const ngnAmt = foreignAmt * rate;

    // Estimate marginal tax on this income
    const currentTotalNGN = entries.reduce((s, e) => s + e.ngnAmount, 0) + (annualIncome || 0);
    const pitBefore = calcPAYE({ grossAnnual: currentTotalNGN }).annual;
    const pitAfter  = calcPAYE({ grossAnnual: currentTotalNGN + ngnAmt }).annual;
    const marginalTax = Math.max(0, pitAfter - pitBefore);
    const setAside = marginalTax;

    const entry: IncomeEntry = {
      id: Date.now().toString(),
      date: fDate,
      source: fSource,
      description: fDesc,
      foreignAmount: foreignAmt,
      currency: fCurrency,
      rateUsed: rate,
      ngnAmount: ngnAmt,
      taxEstimate: marginalTax,
      setAside,
    };

    save([entry, ...entries]);
    setShowForm(false);
    setFAmount('');
    setFDesc('');
    setFRateOverride(false);
  };

  const deleteEntry = (id: string) => {
    if (window.confirm('Remove this income entry?')) {
      save(entries.filter(e => e.id !== id));
    }
  };

  const exportCSV = () => {
    const header = 'Date,Source,Description,Foreign Amount,Currency,Rate (NGN),NGN Amount,Tax Set-Aside\n';
    const rows = entries.map(e =>
      `${e.date},"${e.source}","${e.description}",${e.foreignAmount},${e.currency},${e.rateUsed.toFixed(2)},${Math.round(e.ngnAmount)},${Math.round(e.setAside)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foreign-income-' + company.name + '.csv';
    a.click();
  };

  // Filtered entries
  const filtered = entries.filter(e => {
    if (filterCurrency !== 'all' && e.currency !== filterCurrency) return false;
    if (filterSource !== 'all' && e.source !== filterSource) return false;
    return true;
  });

  // Totals
  const totalNGN      = entries.reduce((s, e) => s + e.ngnAmount, 0);
  const totalSetAside = entries.reduce((s, e) => s + e.setAside, 0);
  const totalBySource = INCOME_SOURCES.map(src => ({
    ...src,
    total: entries.filter(e => e.source === src.label).reduce((s, e) => s + e.ngnAmount, 0),
  })).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    ngn: entries.filter(e => new Date(e.date).getMonth() === i && new Date(e.date).getFullYear() === new Date().getFullYear()).reduce((s, e) => s + e.ngnAmount, 0),
  }));
  const maxMonth = Math.max(...monthlyTotals.map(m => m.ngn), 1);
  const MONTHS_SHORT = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Foreign Income Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Track income in any currency — auto-converted to NGN for tax calculation</p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button onClick={exportCSV}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
              Export CSV
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all">
            + Add Income
          </button>
        </div>
      </div>

      {/* Live rates banner */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${ratesError ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
        <span className="text-lg">{ratesLoading ? '⏳' : ratesError ? '⚠️' : '🟢'}</span>
        <div className="flex-1">
          {ratesLoading ? (
            <span className="text-slate-500">Fetching live exchange rates...</span>
          ) : ratesError ? (
            <span className="text-amber-700">{ratesError}</span>
          ) : (
            <div className="flex flex-wrap gap-3">
              {CURRENCIES.filter(c => c.code !== 'NGN').map(c => (
                <span key={c.code} className="text-slate-600">
                  {c.flag} <span className="font-bold">{c.code}</span> = {fmt(getLiveRate(c.code))}
                </span>
              ))}
            </div>
          )}
        </div>
        {!ratesLoading && !ratesError && (
          <span className="text-xs text-green-600 font-semibold">Live rates</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Foreign Income</p>
          <p className="text-2xl font-extrabold text-cac-green">{fmt(totalNGN)}</p>
          <p className="text-xs text-slate-400 mt-1">{entries.length} transactions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Tax Set-Aside</p>
          <p className="text-2xl font-extrabold text-red-600">{fmt(totalSetAside)}</p>
          <p className="text-xs text-slate-400 mt-1">Estimated PIT on foreign income</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">You Keep</p>
          <p className="text-2xl font-extrabold text-slate-900">{fmt(Math.max(0, totalNGN - totalSetAside))}</p>
          <p className="text-xs text-slate-400 mt-1">After estimated tax</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Top Source</p>
          <p className="text-lg font-extrabold text-slate-900 truncate">
            {totalBySource[0]?.label?.split('/')[0]?.trim() || '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{totalBySource[0] ? fmt(totalBySource[0].total) : 'No income yet'}</p>
        </div>
      </div>

      {/* Add income form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-lg">Add Foreign Income</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Currency</label>
                <select value={fCurrency} onChange={e => { setFCurrency(e.target.value); setFRateOverride(false); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 bg-white">
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Income Source</label>
              <select value={fSource} onChange={e => setFSource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 bg-white">
                {['Creator', 'Freelance', 'Employment', 'Product', 'Crypto', 'Other'].map(cat => (
                  <optgroup key={cat} label={cat}>
                    {INCOME_SOURCES.filter(s => s.category === cat).map(s => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Description (optional)</label>
              <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                placeholder="e.g. March AdSense payment, Brand deal with XYZ"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Amount ({fCurrency})
                </label>
                <input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Rate (NGN per {fCurrency})
                  {!fRateOverride && <span className="ml-1 text-green-600 font-normal">Live</span>}
                </label>
                <input type="number" value={fRate}
                  onChange={e => { setFRate(e.target.value); setFRateOverride(true); }}
                  placeholder="Exchange rate"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30 ${fRateOverride ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`} />
                {fRateOverride && (
                  <button onClick={() => { setFRateOverride(false); setFRate((rates[fCurrency] || 0).toFixed(2)); }}
                    className="text-xs text-cac-green mt-1 hover:underline">Reset to live rate</button>
                )}
              </div>
            </div>

            {/* Preview */}
            {fAmount && parseFloat(fAmount) > 0 && fRate && parseFloat(fRate) > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">NGN Equivalent</span>
                  <span className="font-bold text-slate-900">{fmt(parseFloat(fAmount) * parseFloat(fRate))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Estimated Tax (marginal)</span>
                  <span className="font-bold text-red-600">
                    {(() => {
                      const ngnAmt = parseFloat(fAmount) * parseFloat(fRate);
                      const base = entries.reduce((s, e) => s + e.ngnAmount, 0) + (annualIncome || 0);
                      const before = calcPAYE({ grossAnnual: base }).annual;
                      const after  = calcPAYE({ grossAnnual: base + ngnAmt }).annual;
                      return fmt(Math.max(0, after - before));
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-700">You Keep</span>
                  <span className="font-extrabold text-cac-green">
                    {(() => {
                      const ngnAmt = parseFloat(fAmount) * parseFloat(fRate);
                      const base = entries.reduce((s, e) => s + e.ngnAmount, 0) + (annualIncome || 0);
                      const before = calcPAYE({ grossAnnual: base }).annual;
                      const after  = calcPAYE({ grossAnnual: base + ngnAmt }).annual;
                      return fmt(Math.max(0, ngnAmt - (after - before)));
                    })()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={addEntry} disabled={!fAmount || parseFloat(fAmount) <= 0}
                className="flex-1 py-3 bg-cac-green text-white rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 transition-all">
                Add Income
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly chart */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Monthly Foreign Income ({new Date().getFullYear()})</h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1 h-24">
              {monthlyTotals.map(({ month, ngn }) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-cac-green/80 rounded-t-sm"
                    style={{ height: (ngn / maxMonth * 80) + 'px', minHeight: ngn > 0 ? '3px' : '0' }} />
                  <span className="text-[9px] text-slate-400">{MONTHS_SHORT[month]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Income by source */}
      {totalBySource.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Income by Source</h2>
          </div>
          <div className="p-5 space-y-3">
            {totalBySource.map(src => (
              <div key={src.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">{src.label}</span>
                  <span className="text-slate-500">{fmt(src.total)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cac-green rounded-full"
                    style={{ width: (src.total / totalNGN * 100) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-slate-800">All Transactions</h2>
          <div className="flex gap-2">
            <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">All currencies</option>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">All sources</option>
              {INCOME_SOURCES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-slate-500 font-semibold">No foreign income recorded yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "Add Income" to track your first payment</p>
            <button onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-2.5 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all">
              Add your first income
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Date', 'Source', 'Amount', 'Rate', 'NGN Value', 'Tax Set-Aside', 'You Keep', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-xs">{e.source}</p>
                      {e.description && <p className="text-xs text-slate-400 truncate max-w-[140px]">{e.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {CURRENCIES.find(c => c.code === e.currency)?.flag} {fmtFx(e.foreignAmount, e.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {Math.round(e.rateUsed).toLocaleString('en-NG')}
                    </td>
                    <td className="px-4 py-3 font-bold text-cac-green whitespace-nowrap">{fmt(e.ngnAmount)}</td>
                    <td className="px-4 py-3 font-bold text-red-500 whitespace-nowrap">- {fmt(e.setAside)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{fmt(Math.max(0, e.ngnAmount - e.setAside))}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteEntry(e.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Total ({filtered.length} entries)</td>
                  <td className="px-4 py-3 font-extrabold text-cac-green">{fmt(filtered.reduce((s, e) => s + e.ngnAmount, 0))}</td>
                  <td className="px-4 py-3 font-extrabold text-red-500">- {fmt(filtered.reduce((s, e) => s + e.setAside, 0))}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{fmt(filtered.reduce((s, e) => s + Math.max(0, e.ngnAmount - e.setAside), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Tax tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-bold text-amber-800 mb-2">Tax tip for foreign income</h3>
        <ul className="text-xs text-amber-700 space-y-1.5">
          <li>All foreign income earned by Nigerian residents is taxable — even if paid abroad</li>
          <li>Use the exchange rate on the date you received the payment (CBN or bank rate)</li>
          <li>If clients deduct WHT (5-10%), keep the credit note — it offsets your PIT</li>
          <li>Self-employed? Pay PIT in 4 quarterly instalments to your State IRS</li>
          <li>Keep records of all foreign transactions for at least 6 years</li>
        </ul>
      </div>
    </div>
  );
};
