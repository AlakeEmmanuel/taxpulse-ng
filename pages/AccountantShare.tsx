import React, { useState, useEffect } from 'react';
import { Company, TaxObligation, LedgerEntry, TaxStatus } from '../types';
import { Card } from '../components/Shared';
import * as db from '../services/db';

const fmt = (n: number) => '₦' + (n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

// ── AccountantShareManager -- shown to the business owner in Settings ──────────
interface ShareManagerProps { company: Company; }

export const AccountantShareManager: React.FC<ShareManagerProps> = ({ company }) => {
  const [token, setToken]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied]     = useState(false);

  const shareUrl = token
    ? `${window.location.origin}/app?share=${token}`
    : null;

  useEffect(() => {
    db.getShareToken(company.id)
      .then(t => setToken(t))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [company.id]);

  const createLink = async () => {
    setCreating(true);
    try {
      const t = await db.createShareToken(company.id, 30);
      setToken(t);
    } catch (e: any) {
      alert('Failed to create share link: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async () => {
    if (!confirm('Revoke this link? Your accountant will lose access immediately.')) return;
    await db.revokeShareToken(company.id).catch(() => {});
    setToken(null);
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  if (loading) return (
    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-400">Loading share status...</div>
  );

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-800 text-sm">Accountant Share Link</h2>
        <p className="text-xs text-slate-500 mt-1">
          Give your accountant read-only access to your tax data -- obligations, ledger, and financial summary. No login required on their end. Link expires in 30 days.
        </p>
      </div>

      {token ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-green-800"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> Share link is active (expires in 30 days)</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl || ''}
                className="flex-1 px-3 py-2 rounded-xl border border-green-200 text-xs bg-white text-slate-700 font-mono"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  copied ? 'bg-cac-green text-white' : 'bg-white text-cac-green border border-cac-green hover:bg-cac-green/5'
                }`}
              >
                {copied ? '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
            <p className="font-bold">What your accountant can see:</p>
            <p>• All tax obligations and their status</p>
            <p>• Full ledger (income and expenses)</p>
            <p>• Financial summary (revenue, expenses, VAT, WHT)</p>
            <p>• Company profile (name, TIN, RC number)</p>
            <p className="text-amber-600 font-semibold mt-1">They CANNOT: edit data, mark obligations as filed, or access your login.</p>
          </div>

          <button
            onClick={revokeLink}
            className="w-full py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
          >
            <span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Revoke Link -- Remove Access
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center space-y-2">
            <p className="text-3xl"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span></p>
            <p className="text-sm font-bold text-slate-700">No share link active</p>
            <p className="text-xs text-slate-400">Create a link to give your accountant read-only access to your data without sharing your password.</p>
          </div>
          <button
            onClick={createLink}
            disabled={creating}
            className="w-full py-3 bg-cac-green text-white rounded-xl text-sm font-bold hover:bg-cac-dark transition-all disabled:opacity-60"
          >
            {creating ? 'Creating...' : '<span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> Create Accountant Share Link (30 days)'}
          </button>
        </div>
      )}
    </Card>
  );
};

// ── AccountantView -- shown when someone opens a share link ───────────────────
interface AccountantViewProps { token: string; }

export const AccountantView: React.FC<AccountantViewProps> = ({ token }) => {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [company, setCompany]         = useState<Company | null>(null);
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [ledger, setLedger]           = useState<LedgerEntry[]>([]);

  useEffect(() => {
    db.getDataByToken(token)
      .then(data => {
        if (!data) { setError('This link is invalid or has expired. Please ask the business for a new link.'); return; }
        setCompany(data.company);
        setObligations(data.obligations);
        setLedger(data.ledger);
      })
      .catch(() => setError('Failed to load data. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm">Loading shared data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-slate-100 shadow-lg">
        <p className="text-5xl mb-4"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span></p>
        <h2 className="font-bold text-slate-800 mb-2">Link Expired or Invalid</h2>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!company) return null;

  const totalRevenue  = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatCollected  = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const whtDeducted   = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);
  const filed         = obligations.filter(o => o.status === TaxStatus.FILED);
  const overdue       = obligations.filter(o => o.status === TaxStatus.OVERDUE);
  const due           = obligations.filter(o => o.status === TaxStatus.DUE);

  const statusColor = (s: string) =>
    s === 'Filed'   ? 'bg-green-100 text-green-700' :
    s === 'Overdue' ? 'bg-red-100 text-red-700' :
    s === 'Due'     ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-cac-green text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs font-bold uppercase tracking-wider">TaxPulse NG -- Read-Only Accountant View</p>
            <h1 className="text-xl font-bold mt-0.5">{company.name}</h1>
            <p className="text-green-200 text-sm mt-0.5">
              {company.entityType} · {company.state}
              {company.tin && ` · TIN: ${company.tin}`}
              {company.rcNumber && ` · RC: ${company.rcNumber}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">Compliance Score</p>
            <p className="text-3xl font-extrabold">{company.complianceScore}%</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Read-only notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
          <span className="text-base"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span></span>
          <span>You are viewing <strong>{company.name}</strong>'s tax data in read-only mode. This link expires in 30 days from creation. Data generated by TaxPulse NG -- NTA 2025.</span>
        </div>

        {/* Financial summary */}
        <div>
          <h2 className="font-bold text-slate-800 mb-3">Financial Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue",    value: fmt(totalRevenue),  color: 'text-cac-green' },
              { label: "Total Expenses",   value: fmt(totalExpenses), color: 'text-slate-700' },
              { label: "VAT Collected",    value: fmt(vatCollected),  color: 'text-amber-600' },
              { label: "WHT Deducted",     value: fmt(whtDeducted),   color: 'text-purple-600' },
            ].map(s => (
              <Card key={s.label} className="text-center">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`font-extrabold text-lg ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Obligation status overview */}
        <div>
          <h2 className="font-bold text-slate-800 mb-3">Tax Obligations Overview</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Filed", count: filed.length,   color: 'bg-green-50 border-green-200 text-green-700' },
              { label: "Due / Overdue", count: due.length + overdue.length, color: 'bg-red-50 border-red-200 text-red-700' },
              { label: "Total", count: obligations.length, color: 'bg-slate-50 border-slate-200 text-slate-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 text-center border ${s.color}`}>
                <p className="text-2xl font-extrabold">{s.count}</p>
                <p className="text-xs font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Tax', 'Period', 'Due Date', 'Amount', 'Status', 'Filed On'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {obligations.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{o.type}</td>
                    <td className="px-4 py-3 text-slate-600">{o.period}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(o.dueDate)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{fmt(o.actualAmount || o.estimatedAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(o.status)}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{o.paymentDate ? fmtDate(o.paymentDate) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger */}
        <div>
          <h2 className="font-bold text-slate-800 mb-3">Ledger ({ledger.length} entries)</h2>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {['Date', 'Type', 'Description', 'Amount', 'Tax Amount'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledger.slice(0, 100).map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{fmtDate(l.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${l.type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.type === 'sale' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{l.description}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{fmt(l.amount)}</td>
                    <td className="px-4 py-2.5 text-amber-600">{fmt(l.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length > 100 && (
              <div className="px-4 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
                Showing first 100 of {ledger.length} entries
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Generated by TaxPulse NG · NTA 2025 Compliant · Read-only view · {new Date().toLocaleDateString('en-NG')}
        </p>
      </div>
    </div>
  );
};
