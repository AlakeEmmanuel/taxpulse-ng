import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { calcSalaryScenario, projectAnnualTax, getStateIRS, NRS_PORTALS, SalaryScenario } from '../utils/taxEngine';
import { Card, Input, Button } from '../components/Shared';
import * as db from '../services/db';

const fmt  = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const fmtD = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });

// ─────────────────────────────────────────────────────────────────────────────
//  SALARY CHANGE SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
export const SalarySimulator: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [proposed, setProposed] = useState('');
  const [rent, setRent] = useState('');

  const cGross = parseFloat(current)  || 0;
  const pGross = parseFloat(proposed) || 0;
  const annualRent = parseFloat(rent) || 0;

  const cCalc = cGross  > 0 ? calcSalaryScenario(cGross,  annualRent) : null;
  const pCalc = pGross  > 0 ? calcSalaryScenario(pGross,  annualRent) : null;

  const diff = (field: keyof typeof cCalc) =>
    cCalc && pCalc ? (pCalc[field] as number) - (cCalc[field] as number) : 0;

  const diffColor = (n: number, inverse = false) =>
    n === 0 ? 'text-slate-400' : (inverse ? n < 0 : n > 0) ? 'text-cac-green font-bold' : 'text-red-600 font-bold';

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-black text-sm">S</span>
        <div>
          <h3 className="font-bold text-slate-800">Salary Change Simulator</h3>
          <p className="text-xs text-slate-400">Compare net pay impact before and after a salary change</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input label="Current Gross Monthly (₦)" type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="e.g. 400000" />
        <Input label="Proposed Gross Monthly (₦)" type="number" value={proposed} onChange={e => setProposed(e.target.value)} placeholder="e.g. 500000" />
        <Input label="Annual Rent Paid (₦)" type="number" value={rent} onChange={e => setRent(e.target.value)} placeholder="e.g. 600000" />
      </div>

      {cCalc && pCalc && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-slate-400 uppercase">Current</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-slate-400 uppercase">Proposed</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-slate-400 uppercase">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { label: 'Gross Salary',        field: 'gross',            inverse: false },
                  { label: 'PAYE (NTA 2025)',      field: 'paye',             inverse: true  },
                  { label: 'Pension (8%)',          field: 'pension',          inverse: true  },
                  { label: 'NHIS (1.5%)',           field: 'nhis',             inverse: true  },
                  { label: 'NHF (2.5% basic)',      field: 'nhf',              inverse: true  },
                  { label: 'NET TAKE-HOME',         field: 'netPay',           inverse: false },
                  { label: 'Employer Pension (10%)',field: 'employerPension',  inverse: true  },
                  { label: 'NSITF (1%)',            field: 'nsitf',            inverse: true  },
                  { label: 'Total Employer Cost',   field: 'totalEmployerCost', inverse: true },
                ].map(({ label, field, inverse }) => {
                  const cv = cCalc[field as keyof typeof cCalc] as number;
                  const pv = pCalc[field as keyof typeof pCalc] as number;
                  const d  = pv - cv;
                  const isHighlight = field === 'netPay' || field === 'totalEmployerCost';
                  return (
                    <tr key={field} className={isHighlight ? 'bg-green-50/50' : ''}>
                      <td className={`px-3 py-2.5 text-slate-600 ${isHighlight ? 'font-bold text-slate-800' : ''}`}>{label}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{fmt(cv)}</td>
                      <td className={`px-3 py-2.5 text-right ${isHighlight ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{fmt(pv)}</td>
                      <td className={`px-3 py-2.5 text-right ${diffColor(d, inverse)}`}>
                        {d > 0 ? '+' : ''}{fmt(d)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cac-green/10 border border-cac-green/20 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Employee gains monthly</p>
              <p className="text-xl font-extrabold text-cac-green">{fmt(diff('netPay'))}</p>
              <p className="text-xs text-slate-400">additional take-home</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Extra employer cost monthly</p>
              <p className="text-xl font-extrabold text-red-600">{fmt(diff('totalEmployerCost'))}</p>
              <p className="text-xs text-slate-400">inc. pension + NSITF</p>
            </div>
          </div>
        </>
      )}

      {(!cCalc || !pCalc) && (
        <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-400">
          Enter both current and proposed gross salary to see the comparison
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-1">
        <p className="font-bold">📋 What this shows</p>
        <p>• PAYE computed using NTA 2025 bands on annualised salary with rent relief applied</p>
        <p>• Employer total cost = gross + 10% employer pension + 1% NSITF (not deducted from employee)</p>
        <p>• Use this before offering a raise to understand the true cost to your business</p>
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ANNUAL TAX PLANNER
// ─────────────────────────────────────────────────────────────────────────────
interface AnnualPlannerProps { company: Company; }

export const AnnualTaxPlanner: React.FC<AnnualPlannerProps> = ({ company }) => {
  const [monthlyRevenue,  setMonthlyRevenue]  = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [monthlyPayroll,  setMonthlyPayroll]  = useState('');

  const r = parseFloat(monthlyRevenue)  || 0;
  const e = parseFloat(monthlyExpenses) || 0;
  const w = parseFloat(monthlyPayroll)  || 0;

  const hasData = r > 0 || w > 0;

  const { months, totals } = hasData ? projectAnnualTax(
    r, e, w,
    company.collectsVat, company.hasEmployees,
    company.paysVendors, company.hasNSITF || false,
    company.hasPension || false, company.hasNHF || false,
  ) : { months: [], totals: { month: '', vatDue: 0, payeDue: 0, whtDue: 0, nsitfDue: 0, pensionDue: 0, nhfDue: 0, totalDue: 0 } };

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black text-sm">P</span>
        <div>
          <h3 className="font-bold text-slate-800">Annual Tax Planner</h3>
          <p className="text-xs text-slate-400">12-month forward projection of estimated tax obligations</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        Estimates only — based on monthly averages. Actual amounts depend on real transactions.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input label="Avg Monthly Revenue (₦)" type="number" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)} placeholder="e.g. 2000000" />
        <Input label="Avg Monthly Expenses (₦)" type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} placeholder="e.g. 800000" />
        <Input label="Monthly Payroll (₦)" type="number" value={monthlyPayroll} onChange={e => setMonthlyPayroll(e.target.value)} placeholder="e.g. 1500000" />
      </div>

      {hasData && (
        <>
          {/* Annual totals summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Annual VAT',         val: totals.vatDue,     show: company.collectsVat, color: 'text-blue-600' },
              { label: 'Annual PAYE',         val: totals.payeDue,    show: company.hasEmployees, color: 'text-purple-600' },
              { label: 'Annual WHT',          val: totals.whtDue,     show: company.paysVendors, color: 'text-amber-600' },
              { label: 'Annual Pension',      val: totals.pensionDue, show: company.hasPension, color: 'text-teal-600' },
              { label: 'Annual NSITF',        val: totals.nsitfDue,   show: company.hasNSITF, color: 'text-indigo-600' },
              { label: 'Annual NHF',          val: totals.nhfDue,     show: company.hasNHF, color: 'text-pink-600' },
              { label: 'TOTAL ANNUAL TAX',    val: totals.totalDue,   show: true, color: 'text-red-600 font-extrabold text-base' },
              { label: 'Monthly Average',     val: totals.totalDue/12, show: true, color: 'text-slate-700 font-bold' },
            ].filter(s => s.show).map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`font-bold ${s.color}`}>{fmtD(s.val)}</p>
              </div>
            ))}
          </div>

          {/* Month-by-month table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cac-green text-white">
                  <th className="px-2 py-2 text-left font-bold">Month</th>
                  {company.collectsVat  && <th className="px-2 py-2 text-right font-bold">VAT</th>}
                  {company.hasEmployees && <th className="px-2 py-2 text-right font-bold">PAYE</th>}
                  {company.paysVendors  && <th className="px-2 py-2 text-right font-bold">WHT</th>}
                  {company.hasPension   && <th className="px-2 py-2 text-right font-bold">Pension</th>}
                  {company.hasNSITF     && <th className="px-2 py-2 text-right font-bold">NSITF</th>}
                  {company.hasNHF       && <th className="px-2 py-2 text-right font-bold">NHF</th>}
                  <th className="px-2 py-2 text-right font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((m, i) => (
                  <tr key={m.month} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-2 py-2 font-semibold text-slate-700">{MONTH_LABELS[i]}</td>
                    {company.collectsVat  && <td className="px-2 py-2 text-right text-blue-600">{fmtD(m.vatDue)}</td>}
                    {company.hasEmployees && <td className="px-2 py-2 text-right text-purple-600">{fmtD(m.payeDue)}</td>}
                    {company.paysVendors  && <td className="px-2 py-2 text-right text-amber-600">{fmtD(m.whtDue)}</td>}
                    {company.hasPension   && <td className="px-2 py-2 text-right text-teal-600">{fmtD(m.pensionDue)}</td>}
                    {company.hasNSITF     && <td className="px-2 py-2 text-right text-indigo-600">{fmtD(m.nsitfDue)}</td>}
                    {company.hasNHF       && <td className="px-2 py-2 text-right text-pink-600">{fmtD(m.nhfDue)}</td>}
                    <td className="px-2 py-2 text-right font-bold text-slate-800">{fmtD(m.totalDue)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-2 py-2">ANNUAL</td>
                  {company.collectsVat  && <td className="px-2 py-2 text-right">{fmtD(totals.vatDue)}</td>}
                  {company.hasEmployees && <td className="px-2 py-2 text-right">{fmtD(totals.payeDue)}</td>}
                  {company.paysVendors  && <td className="px-2 py-2 text-right">{fmtD(totals.whtDue)}</td>}
                  {company.hasPension   && <td className="px-2 py-2 text-right">{fmtD(totals.pensionDue)}</td>}
                  {company.hasNSITF     && <td className="px-2 py-2 text-right">{fmtD(totals.nsitfDue)}</td>}
                  {company.hasNHF       && <td className="px-2 py-2 text-right">{fmtD(totals.nhfDue)}</td>}
                  <td className="px-2 py-2 text-right text-cac-green">{fmtD(totals.totalDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!hasData && (
        <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-slate-400">
          Enter your average monthly figures above to see the 12-month projection
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  TCC TRACKER
// ─────────────────────────────────────────────────────────────────────────────
interface TCCEntry {
  id:          string;
  type:        'federal' | 'state';
  issuedDate:  string;
  expiryDate:  string;
  tccNumber:   string;
  authority:   string;
  notes:       string;
}

export const TCCTracker: React.FC<{ company: Company }> = ({ company }) => {
  const [entries, setEntries] = useState<TCCEntry[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState<Omit<TCCEntry,'id'>>({
    type: 'federal', issuedDate: '', expiryDate: '', tccNumber: '', authority: '', notes: ''
  });

  // Load from localStorage (no DB table needed — simple client-side storage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`taxpulse_tcc_${company.id}`);
      if (stored) setEntries(JSON.parse(stored));
    } catch {}
  }, [company.id]);

  const save = (updated: TCCEntry[]) => {
    setEntries(updated);
    try { localStorage.setItem(`taxpulse_tcc_${company.id}`, JSON.stringify(updated)); } catch {}
  };

  const addEntry = () => {
    if (!form.expiryDate) return;
    save([...entries, { ...form, id: Date.now().toString() }]);
    setForm({ type: 'federal', issuedDate: '', expiryDate: '', tccNumber: '', authority: '', notes: '' });
    setShowAdd(false);
  };

  const remove = (id: string) => save(entries.filter(e => e.id !== id));

  const getDaysLeft = (expiry: string) => {
    const d = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    return d;
  };

  const statusInfo = (expiry: string) => {
    const d = getDaysLeft(expiry);
    if (d < 0)   return { label: 'Expired',      color: 'bg-red-100 text-red-700',    ring: 'border-red-300' };
    if (d <= 30) return { label: `${d}d left`,   color: 'bg-amber-100 text-amber-700', ring: 'border-amber-300' };
    if (d <= 60) return { label: `${d}d left`,   color: 'bg-yellow-100 text-yellow-700', ring: 'border-yellow-200' };
    return { label: 'Valid',                       color: 'bg-green-100 text-green-700', ring: 'border-green-200' };
  };

  const stateIRS = getStateIRS(company.state);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center font-black text-sm">T</span>
          <div>
            <h3 className="font-bold text-slate-800">Tax Clearance Certificate (TCC) Tracker</h3>
            <p className="text-xs text-slate-400">Monitor expiry dates — TCC needed for contracts, tenders, and travel</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-xs font-bold text-cac-green border border-cac-green rounded-xl px-3 py-1.5 hover:bg-cac-green/5"
        >
          + Add TCC
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
        <p className="font-bold">📋 About Tax Clearance Certificates</p>
        <p>• Federal TCC: Apply at NRS (taxpayerportal.nrs.gov.ng) after filing all federal taxes (VAT, WHT, CIT)</p>
        <p>• State TCC: Apply at {stateIRS.name} after filing all PAYE/PIT obligations</p>
        <p>• Required for: government contracts, tenders, loans, visa applications, immigration</p>
        <p>• Valid for: 1 year from date of issue. Apply 60 days before expiry.</p>
      </div>

      {/* Quick apply links */}
      <div className="grid grid-cols-2 gap-3">
        <a href={NRS_PORTALS.taxProMax} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 bg-cac-green/10 border border-cac-green/20 rounded-xl hover:bg-cac-green/20 transition-colors">
          <span className="text-cac-green font-bold text-xs">🌐</span>
          <div>
            <p className="text-xs font-bold text-cac-green">Apply Federal TCC</p>
            <p className="text-xs text-slate-400">NRS TaxPro Max</p>
          </div>
        </a>
        <a href={stateIRS.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
          <span className="text-blue-600 font-bold text-xs">🌐</span>
          <div>
            <p className="text-xs font-bold text-blue-700">Apply State TCC</p>
            <p className="text-xs text-slate-400">{company.state} IRS</p>
          </div>
        </a>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="font-bold text-sm text-slate-800">Add TCC Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as any}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                <option value="federal">Federal (NRS)</option>
                <option value="state">State IRS</option>
              </select>
            </div>
            <Input label="TCC Number" value={form.tccNumber} onChange={e => setForm(p=>({...p,tccNumber:e.target.value}))} placeholder="e.g. TCC/2026/001234" />
            <Input label="Issue Date" type="date" value={form.issuedDate} onChange={e => setForm(p=>({...p,issuedDate:e.target.value}))} />
            <Input label="Expiry Date *" type="date" value={form.expiryDate} onChange={e => setForm(p=>({...p,expiryDate:e.target.value}))} />
            <div className="col-span-2">
              <Input label="Notes" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. Required for NNPC contract renewal" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2 text-sm border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100">Cancel</button>
            <button onClick={addEntry} disabled={!form.expiryDate} className="flex-1 py-2 text-sm bg-cac-green text-white rounded-xl font-bold hover:bg-cac-dark disabled:opacity-50">Save TCC</button>
          </div>
        </div>
      )}

      {/* TCC list */}
      {entries.length === 0 && !showAdd && (
        <div className="text-center py-6 text-sm text-slate-400">
          <p className="text-2xl mb-2">📜</p>
          <p>No TCC records yet. Click Add TCC to track your certificates.</p>
        </div>
      )}

      <div className="space-y-3">
        {entries.sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(entry => {
          const s = statusInfo(entry.expiryDate);
          return (
            <div key={entry.id} className={`bg-white border-2 ${s.ring} rounded-xl p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-xs font-bold text-slate-600 uppercase">{entry.type === 'federal' ? 'Federal (NRS)' : `State (${company.state} IRS)`}</span>
                  </div>
                  {entry.tccNumber && <p className="text-sm font-bold text-slate-800">{entry.tccNumber}</p>}
                  <p className="text-xs text-slate-500 mt-1">
                    {entry.issuedDate && `Issued: ${new Date(entry.issuedDate).toLocaleDateString('en-NG', {day:'numeric',month:'short',year:'numeric'})}`}
                    {' · '}
                    Expires: <strong className={getDaysLeft(entry.expiryDate) <= 30 ? 'text-red-600' : 'text-slate-700'}>
                      {new Date(entry.expiryDate).toLocaleDateString('en-NG', {day:'numeric',month:'short',year:'numeric'})}
                    </strong>
                  </p>
                  {entry.notes && <p className="text-xs text-slate-400 mt-1 italic">{entry.notes}</p>}
                </div>
                <button onClick={() => remove(entry.id)} className="text-red-400 hover:text-red-600 text-sm font-bold shrink-0">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  STATE IRS PORTALS PANEL (used in Dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const StateIRSPanel: React.FC<{ state: string; taxType?: string }> = ({ state, taxType }) => {
  const irs = getStateIRS(state);
  const url = (taxType === 'PAYE' || taxType === 'PIT') && irs.paye_url ? irs.paye_url : irs.url;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs hover:bg-blue-100 transition-colors"
    >
      <span className="text-base">🌐</span>
      <div>
        <p className="font-bold text-blue-700">File with {irs.name}</p>
        <p className="text-slate-400">{url.replace('https://', '')}</p>
      </div>
      <span className="ml-auto text-blue-400">→</span>
    </a>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  PAYROLL CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export const PayrollCSVExport: React.FC<{ company: Company }> = ({ company }) => {
  const [period, setPeriod]         = useState(`${new Date().toLocaleString('en',{month:'long'})} ${new Date().getFullYear()}`);
  const [employees, setEmployees]   = useState([{ name:'', tin:'', department:'', gross:'', rent:'' }]);
  const [exported, setExported]     = useState(false);

  const addEmp = () => setEmployees(p => [...p, { name:'',tin:'',department:'',gross:'',rent:'' }]);
  const updEmp = (i:number, f:string, v:string) =>
    setEmployees(p => p.map((e,idx) => idx===i ? {...e,[f]:v} : e));

  const exportCSV = () => {
    // calcSalaryScenario is already imported at module level
    const rows = [
      ['Employee Name','TIN','Department','Gross Monthly (₦)','PAYE (₦)','Pension 8% (₦)','NHIS 1.5% (₦)','NHF 2.5% basic (₦)','Net Pay (₦)','Employer Pension 10% (₦)','NSITF 1% (₦)','Total Employer Cost (₦)'],
    ];
    employees.filter(e => e.name && e.gross).forEach(emp => {
      const c = calcSalaryScenario(parseFloat(emp.gross)||0, parseFloat(emp.rent)||0);
      rows.push([
        emp.name, emp.tin||'', emp.department||'',
        emp.gross, Math.round(c.paye).toString(), Math.round(c.pension).toString(),
        Math.round(c.nhis).toString(), Math.round(c.nhf).toString(), Math.round(c.netPay).toString(),
        Math.round(c.employerPension).toString(), Math.round(c.nsitf).toString(),
        Math.round(c.totalEmployerCost).toString(),
      ]);
    });

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_${company.name.replace(/\s+/g,'_')}_${period.replace(/\s+/g,'_')}.csv`;
    link.click();
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-green-100 text-cac-green rounded-xl flex items-center justify-center font-black text-sm">C</span>
        <div>
          <h3 className="font-bold text-slate-800">Payroll CSV Export</h3>
          <p className="text-xs text-slate-400">Export PAYE schedule as CSV for State IRS submission</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <Input label="Payroll Period" value={period} onChange={e => setPeriod(e.target.value)} />
        <div></div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employees</p>
        {employees.map((emp, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 items-center">
            <input value={emp.name} onChange={e=>updEmp(i,'name',e.target.value)} placeholder="Full Name"
              className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
            <input value={emp.tin} onChange={e=>updEmp(i,'tin',e.target.value)} placeholder="TIN"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
            <input type="number" value={emp.gross} onChange={e=>updEmp(i,'gross',e.target.value)} placeholder="Gross (₦)"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green/30"/>
            {employees.length > 1
              ? <button onClick={()=>setEmployees(p=>p.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600 font-bold">×</button>
              : <div/>}
          </div>
        ))}
        <button onClick={addEmp} className="text-xs font-bold text-cac-green hover:underline">+ Add Employee</button>
      </div>

      {exported && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-cac-green font-bold">✅ CSV downloaded! Upload to your State IRS payroll portal.</div>}

      <Button onClick={exportCSV} disabled={!employees.some(e=>e.name&&e.gross)} className="w-full">
        📊 Export Payroll CSV — {period}
      </Button>
      <p className="text-xs text-slate-400 text-center">CSV contains all statutory deductions per NTA 2025 + PRA 2014. Submit to State IRS by the 10th of the following month.</p>
    </Card>
  );
};
